"""
Timezone conversion utilities for Pathfinder AI.

Design rule: all timestamps are stored in UTC in the database.
This module converts UTC datetimes to a user's local time before
any deadline/day boundary comparisons are made — ensuring "Due Today"
means today *in the user's city*, not UTC midnight.

Uses only the standard library `zoneinfo` (Python 3.9+).
Falls back gracefully for unknown timezone strings.
"""
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

log = logging.getLogger(__name__)

# UTC sentinel — re-exported so callers never import datetime directly
UTC = timezone.utc


def resolve_tz(tz_name: str) -> ZoneInfo:
    """
    Return a ZoneInfo object for the given IANA timezone name.

    Falls back to UTC and logs a warning if the name is invalid,
    so a bad user preference never crashes the reminder scheduler.
    """
    try:
        return ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, KeyError):
        log.warning("Unknown timezone '%s', falling back to UTC.", tz_name)
        return ZoneInfo("UTC")


def utc_to_user_local(utc_dt: datetime, tz_name: str) -> datetime:
    """
    Convert a UTC-aware datetime to the user's local timezone.

    Args:
        utc_dt:  A timezone-aware datetime (UTC).
        tz_name: IANA timezone string from User.timezone.

    Returns:
        The same instant expressed in the user's local timezone.
    """
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=UTC)
    return utc_dt.astimezone(resolve_tz(tz_name))


def now_in_tz(tz_name: str) -> datetime:
    """
    Return the current wall-clock time in the user's timezone.

    This is the value that should be compared against due_date when
    deciding whether a task is overdue, due today, etc.
    """
    return datetime.now(resolve_tz(tz_name))


def days_until_due(due_utc: datetime, tz_name: str) -> int:
    """
    Calculate the number of calendar days from *today in the user's timezone*
    to the task's due date (also expressed in the user's timezone).

    Returns:
        Negative  → overdue
        0         → due today
        Positive  → future
    """
    local_now = now_in_tz(tz_name)
    local_due = utc_to_user_local(due_utc, tz_name)
    return (local_due.date() - local_now.date()).days
