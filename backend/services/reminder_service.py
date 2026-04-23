import logging
import pytz
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from backend.database import SessionLocal
from backend.models.user_model import User
from backend.models.task_model import Task, TaskStatus
from backend.models.life_event_model import LifeEvent, LifeEventStatus
from backend.models.email_log_model import EmailLog
from backend.services.email_service import send_morning_brief, send_nudge

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Core Logic — Morning Brief (Type 1)
# ---------------------------------------------------------------------------

def run_utc_morning_brief_check():
    """
    Main job function invoked by APScheduler.
    Check all users and send morning briefs if it is ~7:30 AM in their local tz.
    """
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    log.info("Morning Brief check started at %s UTC", now_utc.isoformat())

    try:
        # 1. Broadly fetch users who have notifications enabled
        users = db.query(User).filter(User.email_notifications == True).all()
        
        for user in users:
            try:
                # 2. Check if it's 7:30 AM local
                user_tz = pytz.timezone(user.timezone or "Asia/Kolkata")
                user_local = now_utc.astimezone(user_tz)
                
                # Check if it's 7:30 AM (allow small buffer of ±15 mins from scheduler trigger frequency)
                # Scheduler runs every 30 mins, so checking if hour=7 and minute >= 30 works.
                if user_local.hour != 7 or user_local.minute < 30:
                    continue

                # 3. Check if we already sent a brief for this calendar day
                if user.last_brief_sent_at:
                    last_sent_local = user.last_brief_sent_at.astimezone(user_tz)
                    if last_sent_local.date() == user_local.date():
                        log.debug("Brief already sent today for user_id=%d", user.id)
                        continue

                # 4. Prepare data for the brief
                _process_user_brief(db, user, now_utc)

            except Exception:
                log.exception("Error processing morning brief for user_id=%d", user.id)

    finally:
        db.close()

def _process_user_brief(db: Session, user: User, now_utc: datetime):
    """Fetch user's journey data and send the brief if applicable."""
    
    # Get active life events (plans)
    active_plans = db.query(LifeEvent).filter(
        LifeEvent.user_id == user.id,
        LifeEvent.status == LifeEventStatus.active
    ).all()

    if not active_plans:
        return

    # Use the primary active plan (most recent one)
    plan = active_plans[0]
    
    # Day number calculation — strip tzinfo from both sides; DB dates are tz-naive
    start_date = plan.start_date or plan.created_at
    day_number = (now_utc.replace(tzinfo=None) - start_date.replace(tzinfo=None)).days + 1

    # Fetch all tasks to compute stats and lists
    tasks = db.query(Task).filter(Task.life_event_id == plan.id).all()
    
    if not tasks:
        return

    tasks_done = sum(1 for t in tasks if t.status == TaskStatus.completed)
    total_tasks = len(tasks)
    progress_percent = int((tasks_done / total_tasks) * 100) if total_tasks > 0 else 0

    if total_tasks > 0 and tasks_done == total_tasks:
        return # Don't send if all tasks done

    # Finding Today's Focus (highest priority pending task)
    pending_tasks = [t for t in tasks if t.status in (TaskStatus.pending, TaskStatus.in_progress)]
    if not pending_tasks:
        return

    # due_date from DB is tz-naive; use tz-naive datetime.max as fallback to avoid TypeError
    focus_task = sorted(pending_tasks, key=lambda x: (-x.priority, x.due_date if x.due_date else datetime.max))[0]
    
    # Finding Upcoming tasks (next 7 days)
    seven_days_from_now = now_utc + timedelta(days=7)
    upcoming_tasks = [
        {"title": t.title, "due_date": t.due_date.strftime("%b %d") if t.due_date else "ASAP"}
        for t in pending_tasks 
        if t.due_date and now_utc < t.due_date.replace(tzinfo=timezone.utc) <= seven_days_from_now
    ]

    # Finding Overdue / Drifted tasks
    overdue_list = [
        {"title": t.title, "days_overdue": (now_utc - t.due_date.replace(tzinfo=timezone.utc)).days}
        for t in pending_tasks 
        if t.due_date and t.due_date.replace(tzinfo=timezone.utc) < now_utc
    ]

    # Send it!
    success = send_morning_brief(
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
        plan_title=plan.title,
        day_number=day_number,
        focus_task={"title": focus_task.title, "description": focus_task.description or "Navigator's recommendation."},
        upcoming_tasks=upcoming_tasks,
        progress_percent=progress_percent,
        tasks_done=tasks_done,
        overdue_tasks=overdue_list,
        phase_warning=None, # Future: phase-specific logic
        plan_url="http://localhost:5173/#saved"
    )

    if success:
        user.last_brief_sent_at = now_utc
        # Log it
        log_entry = EmailLog(user_id=user.id, life_event_id=plan.id, email_type='morning_brief', subject=f"Day {day_number} Brief")
        db.add(log_entry)
        db.commit()

# ---------------------------------------------------------------------------
# Triggered Logic — Nudge (Type 2)
# ---------------------------------------------------------------------------

def run_nudge_check():
    """Triggered on task inactivity (Type 2)."""
    db: Session = SessionLocal()
    now_utc = datetime.now(timezone.utc)
    log.info("Nudge check started.")

    try:
        # Tasks untouched for 3+ days and due in next 7 days
        three_days_ago = now_utc - timedelta(days=3)
        seven_days_from_now = now_utc + timedelta(days=7)
        
        stale_tasks = db.query(Task).join(LifeEvent).join(User).filter(
            Task.status.notin_([TaskStatus.completed, TaskStatus.skipped]),
            Task.due_date.isnot(None),
            Task.due_date.between(now_utc, seven_days_from_now),
            Task.updated_at < three_days_ago,
            # Limit the number of nudges sent per task/user per day via user/task tracking
            or_(Task.nudge_sent_at == None, Task.nudge_sent_at < (now_utc - timedelta(days=1)))
        ).all()

        # Send max one nudge per user per day
        users_nudged_today = set()

        for task in stale_tasks:
            user = task.life_event.user
            if user.id in users_nudged_today:
                continue

            success = send_nudge(
                user_id=user.id,
                user_email=user.email,
                user_name=user.name,
                task_title=task.title,
                impact_consequence="delay your journey's next milestone",
                plan_url="http://localhost:5173/#saved"
            )

            if success:
                task.nudge_sent_at = now_utc
                users_nudged_today.add(user.id)
                log_entry = EmailLog(user_id=user.id, life_event_id=task.life_event_id, email_type='nudge', subject=f"Nudge: {task.title}")
                db.add(log_entry)
        
        db.commit()

    finally:
        db.close()
