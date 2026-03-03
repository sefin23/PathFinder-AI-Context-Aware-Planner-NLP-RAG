"""
Layer 3.4 — Workflow Approval Service.

Converts an approved workflow proposal into persisted Task records.

Rules enforced:
  - No LLM calls.
  - No task regeneration.
  - Only persists what the user explicitly sends.
  - due_date computed as: now_utc + timedelta(days=due_offset_days).
  - Dates stored in UTC (timezone-naive DateTime column, UTC-implicit).
  - Idempotent: tasks with the same (title, life_event_id) are skipped.
  - Subtasks are nested under their parent via parent_id.
  - No scheduler modification.
  - No reminder triggers.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from backend.models.life_event_model import LifeEvent
from backend.models.task_model import Task, TaskStatus
from backend.schemas.workflow_approval_schema import (
    ApprovedTask,
    CreatedTaskItem,
    WorkflowApprovalRequest,
    WorkflowApprovalResponse,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utc_now() -> datetime:
    """Return the current UTC time as a timezone-naive datetime (DB-compatible)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _due_date(offset_days: int, base: datetime) -> datetime:
    """Compute UTC due date from a base datetime and an offset in days."""
    return base + timedelta(days=offset_days)


def _existing_titles(db: Session, life_event_id: int) -> set[str]:
    """
    Return the set of task titles already stored under this life event.

    Used for duplicate detection (case-sensitive exact match on title).
    """
    rows = (
        db.query(Task.title)
        .filter(Task.life_event_id == life_event_id)
        .all()
    )
    return {row.title for row in rows}


def _life_event_exists(db: Session, life_event_id: int) -> bool:
    """Check if the LifeEvent record exists."""
    return db.query(LifeEvent.id).filter(LifeEvent.id == life_event_id).first() is not None


# ---------------------------------------------------------------------------
# Core service
# ---------------------------------------------------------------------------

def approve_workflow(
    db: Session,
    request: WorkflowApprovalRequest,
) -> WorkflowApprovalResponse:
    """
    Persist approved tasks (and subtasks) into the Task table.

    Pipeline:
      1. Validate life_event_id exists.
      2. Load existing task titles for this life event (duplicate guard).
      3. For each approved top-level task:
         a. Skip if title already exists (idempotent).
         b. Compute due_date = now_utc + offset_days.
         c. Create Task record; flush to get its ID.
         d. For each approved subtask:
            - Skip if title already exists.
            - Create Task with parent_id = parent task's ID.
      4. Commit all at once.
      5. Return summary.

    Args:
        db:      Active SQLAlchemy session (read + write).
        request: Validated :class:`WorkflowApprovalRequest`.

    Returns:
        :class:`WorkflowApprovalResponse` with created task IDs and skipped titles.

    Raises:
        ValueError:  If life_event_id does not exist.
        RuntimeError: If DB commit fails.
    """
    if not _life_event_exists(db, request.life_event_id):
        raise ValueError(
            f"LifeEvent with id={request.life_event_id} does not exist. "
            "Create the life event first."
        )

    base_time = _utc_now()
    existing = _existing_titles(db, request.life_event_id)

    created: list[CreatedTaskItem] = []
    skipped: list[str] = []

    try:
        for approved_task in request.approved_tasks:
            # ── Duplicate guard (top-level) ──────────────────────────────
            if approved_task.title in existing:
                logger.info(
                    "Skipping duplicate task '%s' for life_event_id=%d",
                    approved_task.title, request.life_event_id,
                )
                skipped.append(approved_task.title)
                continue

            # ── Create parent task ───────────────────────────────────────
            parent = Task(
                title=approved_task.title,
                description=approved_task.description,
                priority=approved_task.priority,
                due_date=_due_date(approved_task.due_offset_days, base_time),
                status=TaskStatus.pending,
                life_event_id=request.life_event_id,
                parent_id=None,
                reminder_opt_out=False,
            )
            db.add(parent)
            db.flush()  # populate parent.id without committing

            existing.add(approved_task.title)
            created.append(
                CreatedTaskItem(task_id=parent.id, title=parent.title, parent_task_id=None)
            )

            logger.info(
                "Created task id=%d '%s' due=%s",
                parent.id, parent.title, parent.due_date.date(),
            )

            # ── Create subtasks ──────────────────────────────────────────
            for sub in approved_task.subtasks:
                if sub.title in existing:
                    logger.info(
                        "Skipping duplicate subtask '%s' under parent_id=%d",
                        sub.title, parent.id,
                    )
                    skipped.append(sub.title)
                    continue

                child = Task(
                    title=sub.title,
                    description=None,
                    priority=sub.priority,
                    due_date=_due_date(sub.due_offset_days, base_time),
                    status=TaskStatus.pending,
                    life_event_id=request.life_event_id,
                    parent_id=parent.id,
                    reminder_opt_out=False,
                )
                db.add(child)
                db.flush()

                existing.add(sub.title)
                created.append(
                    CreatedTaskItem(
                        task_id=child.id,
                        title=child.title,
                        parent_task_id=parent.id,
                    )
                )

                logger.info(
                    "Created subtask id=%d '%s' under parent_id=%d due=%s",
                    child.id, child.title, parent.id, child.due_date.date(),
                )

        db.commit()

    except Exception as exc:
        db.rollback()
        logger.exception("Workflow approval DB write failed — rolled back.")
        raise RuntimeError(f"Failed to persist approved workflow: {exc}") from exc

    # ── Build message ────────────────────────────────────────────────────────
    total_skipped = len(skipped)
    total_created = len(created)

    if total_created == 0 and total_skipped > 0:
        message = (
            f"All {total_skipped} task(s) already exist under this life event "
            f"(idempotent — no new records created)."
        )
    elif total_skipped > 0:
        message = (
            f"{total_created} task(s) created, "
            f"{total_skipped} duplicate(s) skipped."
        )
    else:
        message = f"{total_created} task(s) created successfully."

    return WorkflowApprovalResponse(
        success=True,
        life_event_id=request.life_event_id,
        created_tasks=created,
        skipped_duplicates=skipped,
        message=message,
    )
