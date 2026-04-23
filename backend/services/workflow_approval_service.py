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
# Guide type inference — matches task titles to step-by-step guides
# ---------------------------------------------------------------------------

# Curated phrase → guide key map. Checked before keyword scoring so that
# natural-language AI-generated titles ("Renew your passport") reliably link
# to the correct guide even when keyword overlap is low.
_PHRASE_TO_TYPE: dict[str, str] = {
    # Aadhaar
    "download aadhaar": "aadhaar_download",
    "get aadhaar": "aadhaar_download",
    "aadhaar download": "aadhaar_download",
    "update aadhaar": "aadhaar_update",
    "aadhaar update": "aadhaar_update",
    "aadhaar address": "aadhaar_update",
    "change aadhaar": "aadhaar_update",
    # PAN
    "download pan": "pan_download",
    "get pan": "pan_download",
    "pan card": "pan_download",
    "pan download": "pan_download",
    # Bank account
    "open bank account": "bank_account_opening",
    "open a bank": "bank_account_opening",
    "bank account opening": "bank_account_opening",
    "open salary account": "open_salary_account",
    "salary account": "open_salary_account",
    # EPF / PF
    "transfer epf": "epf_transfer",
    "epf transfer": "epf_transfer",
    "transfer pf": "epf_transfer",
    "pf transfer": "epf_transfer",
    "transfer provident fund": "epf_transfer",
    "withdraw epf": "epf_withdrawal",
    "epf withdrawal": "epf_withdrawal",
    "withdraw pf": "epf_withdrawal",
    "pf withdrawal": "epf_withdrawal",
    "epf claim": "epf_withdrawal",
    # Passport
    "renew passport": "passport_renewal",
    "passport renewal": "passport_renewal",
    "apply for passport": "passport_renewal",
    "passport application": "passport_renewal",
    "get passport": "passport_renewal",
    # Voter ID
    "voter address": "voter_address_change",
    "update voter": "voter_address_change",
    "change voter": "voter_address_change",
    "voter id address": "voter_address_change",
    # Driving licence
    "driving licence address": "dl_address_change",
    "driving license address": "dl_address_change",
    "dl address": "dl_address_change",
    "update dl": "dl_address_change",
    "update driving licence": "dl_address_change",
    "update driving license": "dl_address_change",
    # Domicile
    "domicile certificate": "domicile_certificate",
    "get domicile": "domicile_certificate",
    "apply domicile": "domicile_certificate",
    "apply for domicile": "domicile_certificate",
    # Business
    "register business": "business_registration",
    "business registration": "business_registration",
    "register company": "business_registration",
    "register your business": "business_registration",
    "business name registration": "business_name_registration",
    "register business name": "business_name_registration",
    # HR / Onboarding
    "submit hr": "submit_hr_docs",
    "hr documents": "submit_hr_docs",
    "submit joining documents": "submit_hr_docs",
    "onboarding documents": "submit_hr_docs",
    "joining formalities": "submit_hr_docs",
    "new job documents": "submit_hr_docs",
}


def _build_guide_map(db: Session) -> list[tuple[str, list[str]]]:
    """Load all guide task_types from DB and derive keyword lists."""
    from backend.models.task_guide_model import TaskGuide
    rows = db.query(TaskGuide.task_type).all()
    return [
        (task_type, [k for k in task_type.split("_") if len(k) >= 3])
        for (task_type,) in rows
    ]


def _infer_task_type(title: str, guide_map: list[tuple[str, list[str]]]) -> Optional[str]:
    """
    Map a task title to a known guide type.

    Priority order:
      1. Curated phrase map (_PHRASE_TO_TYPE) — exact substring match, highest precision.
      2. Keyword scoring against guide type name components — requires ≥50% match.

    Returns the matched task_type string, or None if no confident match.
    """
    title_lower = title.lower()

    # Priority 1: curated phrase match
    for phrase, guide_key in _PHRASE_TO_TYPE.items():
        if phrase in title_lower:
            return guide_key

    # Priority 2: keyword scoring from guide type name split
    best_type = None
    best_score = 0.0

    for task_type, keywords in guide_map:
        if not keywords:
            continue
        matches = sum(1 for kw in keywords if kw in title_lower)
        score = matches / len(keywords)
        if matches > 0 and score > best_score:
            best_score = score
            best_type = task_type

    return best_type if best_score >= 0.5 else None


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
    life_event = db.query(LifeEvent).filter(LifeEvent.id == request.life_event_id).first()
    if not life_event:
        raise ValueError(
            f"LifeEvent with id={request.life_event_id} does not exist. "
            "Create the life event first."
        )

    base_time = _utc_now()
    if request.start_date:
        # DB consistently uses naive UTC
        base_time = request.start_date
        if base_time.tzinfo:
            base_time = base_time.astimezone(timezone.utc).replace(tzinfo=None)
        life_event.start_date = base_time
        db.add(life_event)

    if request.requirements_json:
        life_event.requirements_json = request.requirements_json
        db.add(life_event)

    existing = _existing_titles(db, request.life_event_id)
    guide_map = _build_guide_map(db)

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

            logger.info("Processing task: %s", approved_task.title)
            # ── Resolve guide type (explicit > inferred from title) ──────
            resolved_task_type = approved_task.task_type or _infer_task_type(approved_task.title, guide_map)
            if resolved_task_type and not approved_task.task_type:
                logger.info("Inferred task_type='%s' for '%s'", resolved_task_type, approved_task.title)

            # ── Create parent task ───────────────────────────────────────
            parent = Task(
                title=approved_task.title,
                description=approved_task.description,
                priority=approved_task.priority,
                due_date=_due_date(approved_task.due_offset_days, base_time),
                status=approved_task.status or TaskStatus.pending,
                life_event_id=request.life_event_id,
                parent_id=None,
                reminder_opt_out=False,
                phase_title=approved_task.phase_title,
                phase_category=approved_task.phase_category,
                task_type=resolved_task_type,
                scheduled_date=approved_task.scheduled_date,
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

                resolved_sub_type = sub.task_type or _infer_task_type(sub.title, guide_map)
                child = Task(
                    title=sub.title,
                    description=None,
                    priority=sub.priority,
                    due_date=_due_date(sub.due_offset_days, base_time),
                    status=sub.status or TaskStatus.pending,
                    life_event_id=request.life_event_id,
                    parent_id=parent.id,
                    reminder_opt_out=False,
                    task_type=resolved_sub_type,
                    scheduled_date=sub.scheduled_date,
                    phase_title=approved_task.phase_title,
                    phase_category=approved_task.phase_category,  # Inherit parent's phase/category
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
        message=f"{message} Detailed created list: { [c.title for c in created] }",
    )
