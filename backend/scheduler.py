"""
APScheduler configuration for Pathfinder AI.

Job: run_daily_reminders fires once per day at 08:00 in UTC.

Why UTC-fixed cron instead of per-user local 8 AM?
────────────────────────────────────────────────────
Running one job per user's timezone would require dynamic job registration
and creates scheduler overhead as users grow.  The correct pattern for
multi-timezone apps is:

  • Schedule ONE job at a fixed UTC time (08:00 UTC here).
  • Inside the job, check whether 08:00 local-time has passed for each user.
  • Skip users whose 8 AM has not yet come (they'll be caught by the next
    execution or a finer-grained schedule).

This gives us a simple, robust scheduler with zero per-user job churn.
The reminder_service handles the per-user timezone logic.

Upgrade path:
  To achieve exact 8 AM local for every user, change the trigger to
  run every hour and add a "local_hour == 8" gate in reminder_service.
  This file stays untouched.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.services.reminder_service import run_daily_reminders

log = logging.getLogger(__name__)

# Single shared scheduler instance — started/stopped via FastAPI lifespan.
scheduler = BackgroundScheduler(
    job_defaults={"misfire_grace_time": 3600},  # tolerate up to 1 h late start
    timezone="UTC",
)

# ---------------------------------------------------------------------------
# Job registration
# ---------------------------------------------------------------------------
# Fires at 08:00 UTC daily.  reminder_service checks each user's local hour.
scheduler.add_job(
    run_daily_reminders,
    trigger=CronTrigger(hour=8, minute=0, timezone="UTC"),
    id="daily_reminder_digest",
    name="Daily Reminder Digest",
    replace_existing=True,
)


def start_scheduler() -> None:
    """Start the background scheduler. Called from FastAPI lifespan startup."""
    if not scheduler.running:
        scheduler.start()
        log.info("APScheduler started. Jobs: %s", [j.id for j in scheduler.get_jobs()])


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler. Called from FastAPI lifespan shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("APScheduler stopped.")
