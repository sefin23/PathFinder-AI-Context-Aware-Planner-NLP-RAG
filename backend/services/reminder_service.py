"""
Reminder Service — core business logic for daily task reminders.

Responsibilities:
  1. For every active user, find tasks that need a reminder today.
  2. Classify each task as UPCOMING (due ≤ 24 h) or OVERDUE.
  3. Skip tasks where reminder_opt_out is True.
  4. Skip tasks already logged in ReminderLog for today (dedup).
  5. Batch all qualifying tasks into one digest per user.
  6. Delegate sending to email_service.
  7. Write a ReminderLog entry for every successfully sent item.

Design constraints:
  - Pure functions accept a db Session and a "now" datetime so they are
    trivially unit-testable without touching the real clock or DB.
  - No APScheduler references here — the scheduler calls run_daily_reminders().
"""
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.reminder_log_model import ReminderLog, ReminderType
from backend.models.task_model import Task, TaskStatus
from backend.models.user_model import User
from backend.services.email_service import DigestPayload, ReminderItem, send_reminder_digest
from backend.utils.timezone_utils import days_until_due, now_in_tz, utc_to_user_local

log = logging.getLogger(__name__)

# A task is "upcoming" if it is due within this many hours from now.
UPCOMING_WINDOW_HOURS = 24


# ---------------------------------------------------------------------------
# Deduplication helpers
# ---------------------------------------------------------------------------
def _already_sent_today(
    db: Session,
    task_id: int,
    user_id: int,
    reminder_type: ReminderType,
    user_tz: str,
) -> bool:
    """
    Return True if a reminder of this type was already logged for this
    task today (in the user's local calendar day).
    """
    local_today = now_in_tz(user_tz).date()
    existing = (
        db.query(ReminderLog)
        .filter(
            ReminderLog.task_id == task_id,
            ReminderLog.user_id == user_id,
            ReminderLog.reminder_type == reminder_type,
        )
        .all()
    )
    for log_entry in existing:
        sent_local = utc_to_user_local(log_entry.sent_at, user_tz)
        if sent_local.date() == local_today:
            return True
    return False


def _log_reminder(
    db: Session,
    task_id: int,
    user_id: int,
    reminder_type: ReminderType,
) -> None:
    """Insert a ReminderLog entry to mark this reminder as sent."""
    entry = ReminderLog(
        task_id=task_id,
        user_id=user_id,
        reminder_type=reminder_type,
    )
    db.add(entry)


# ---------------------------------------------------------------------------
# Task classification
# ---------------------------------------------------------------------------
def _classify_task(
    task: Task,
    user_tz: str,
    now_utc: datetime,
) -> ReminderType | None:
    """
    Decide whether a task deserves a reminder and which type.

    Returns None if the task should be skipped.
    """
    if task.reminder_opt_out:
        return None
    if task.status in (TaskStatus.completed, TaskStatus.skipped):
        return None
    if task.due_date is None:
        return None

    delta = days_until_due(task.due_date, user_tz)

    # Compute exact hours remaining for precise same-day classification.
    due_aware = task.due_date if task.due_date.tzinfo else task.due_date.replace(tzinfo=timezone.utc)
    hours_until = (due_aware - now_utc).total_seconds() / 3600

    # Past due (multi-day overdue caught by delta, same-day caught by hours_until)
    if delta < 0 or hours_until < 0:
        return ReminderType.OVERDUE

    # Due within the next 24 hours
    if hours_until <= UPCOMING_WINDOW_HOURS:
        return ReminderType.UPCOMING

    return None


# ---------------------------------------------------------------------------
# Per-user digest builder
# ---------------------------------------------------------------------------
def _build_user_digest(
    db: Session,
    user: User,
    now_utc: datetime,
) -> DigestPayload:
    """
    Collect all reminder-eligible tasks for one user into a DigestPayload.
    Performs deduplication and logs each item that will be sent.
    """
    payload = DigestPayload(
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
        user_timezone=user.timezone,
    )

    # All active tasks belonging to this user (across all life events)
    tasks = (
        db.query(Task)
        .join(Task.life_event)
        .filter(
            Task.life_event.has(user_id=user.id),
            Task.status.notin_([TaskStatus.completed, TaskStatus.skipped]),
            Task.reminder_opt_out.is_(False),
            Task.due_date.isnot(None),
        )
        .all()
    )

    for task in tasks:
        reminder_type = _classify_task(task, user.timezone, now_utc)
        if reminder_type is None:
            continue

        if _already_sent_today(db, task.id, user.id, reminder_type, user.timezone):
            log.debug(
                "Skip duplicate: task_id=%d user_id=%d type=%s",
                task.id, user.id, reminder_type.value,
            )
            continue

        due_local_str = utc_to_user_local(task.due_date, user.timezone).strftime(
            "%Y-%m-%d %H:%M %Z"
        )
        payload.items.append(
            ReminderItem(
                task_id=task.id,
                task_title=task.title,
                reminder_type=reminder_type.value,
                due_date_local=due_local_str,
            )
        )
        _log_reminder(db, task.id, user.id, reminder_type)

    return payload


# ---------------------------------------------------------------------------
# Public entry point — called by the scheduler
# ---------------------------------------------------------------------------
def run_daily_reminders() -> None:
    """
    Main job function invoked by APScheduler at 8 AM each user's local time.

    Opens its own DB session (not request-scoped) so it can run safely in
    a background thread.
    """
    log.info("Reminder job started at %s UTC", datetime.now(timezone.utc).isoformat())
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)

    try:
        users = db.query(User).all()
        sent_count = 0

        for user in users:
            try:
                payload = _build_user_digest(db, user, now_utc)

                if not payload.items:
                    log.debug("No reminders for user_id=%d", user.id)
                    continue

                success = send_reminder_digest(payload)
                if success:
                    db.commit()
                    sent_count += len(payload.items)
                    log.info(
                        "Digest sent to user_id=%d (%d items)", user.id, len(payload.items)
                    )
                else:
                    db.rollback()
                    log.warning("Digest send failed for user_id=%d — rolled back", user.id)

            except Exception:
                db.rollback()
                log.exception("Unexpected error processing user_id=%d", user.id)

        log.info("Reminder job finished. Total items sent: %d", sent_count)

    finally:
        db.close()
