"""
APScheduler configuration for Pathfinder AI.

New Email System Redesign:
1. Morning Briefs: Fires every 30 minutes, checks if user local time is 7:30 AM.
2. Task Nudges: Checks once per day at midnight UTC for stale tasks.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.services.reminder_service import run_utc_morning_brief_check, run_nudge_check

log = logging.getLogger(__name__)

# Single shared scheduler instance — started/stopped via FastAPI lifespan.
scheduler = BackgroundScheduler(
    job_defaults={"misfire_grace_time": 3600},  # tolerate up to 1 h late start
    timezone="UTC",
)

# ---------------------------------------------------------------------------
# Job registration
# ---------------------------------------------------------------------------

# 1. Morning Brief (Daily at 7:30 AM local time, checked every 30 minutes)
# Fires at minute 0 and 30 for all timezones.
scheduler.add_job(
    run_utc_morning_brief_check,
    trigger=CronTrigger(minute='0,30', timezone="UTC"),
    id="daily_morning_brief",
    name="Morning Brief Checker",
    replace_existing=True,
)

# 2. Task Nudge (Daily at midnight UTC to check for stale tasks)
scheduler.add_job(
    run_nudge_check,
    trigger=CronTrigger(hour=0, minute=0, timezone="UTC"),
    id="stale_task_nudge",
    name="Stale Task Nudge Checker",
    replace_existing=True,
)


def start_scheduler() -> None:
    """Start the background scheduler. Called from FastAPI lifespan startup."""
    if not scheduler.running:
        scheduler.start()
        log.info("APScheduler started. Active Jobs: %s", [j.id for j in scheduler.get_jobs()])


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler. Called from FastAPI lifespan shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("APScheduler stopped.")
