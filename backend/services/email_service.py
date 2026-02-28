"""
SMTP-based email delivery service for Pathfinder AI.

Public interface (unchanged from stub):
    send_reminder_digest(payload: DigestPayload) -> bool

Internal flow:
    1. Build HTML + plain-text bodies via email_templates.
    2. Compose a MIMEMultipart("alternative") message.
    3. Attempt SMTP delivery via _smtp_send().
    4. On failure, retry up to settings.email_max_retries times
       with exponential back-off.
    5. If all retries fail, log the error and return False.
    6. In development (email not configured), fall back to console output.

Credentials are read from environment variables via backend.config.settings.
Required env vars:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
Optional:
    SMTP_TLS       (default: true)
    EMAIL_FROM     (default: "Pathfinder AI <no-reply@pathfinder.ai>")
    EMAIL_MAX_RETRIES  (default: 3)
    EMAIL_RETRY_DELAY  (default: 5 seconds)
"""
import logging
import smtplib
import time
from dataclasses import dataclass, field
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.config import settings
from backend.services.email_templates import (
    TemplateItem,
    render_digest,
    render_overdue,
    render_upcoming,
)

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public data types  (callers depend on these — do not rename)
# ---------------------------------------------------------------------------
@dataclass
class ReminderItem:
    """A single task entry inside a digest email."""
    task_id: int
    task_title: str
    reminder_type: str          # "UPCOMING" | "OVERDUE"
    due_date_local: str         # human-readable, already in user's tz


@dataclass
class DigestPayload:
    """Everything needed to compose one user's daily digest email."""
    user_id: int
    user_email: str
    user_name: str
    user_timezone: str
    items: list[ReminderItem] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def send_reminder_digest(payload: DigestPayload) -> bool:
    """
    Compose and send the daily reminder digest to one user.

    Returns True on success, False if delivery failed after all retries.
    """
    if not payload.items:
        return True

    if not settings.email_configured:
        _console_fallback(payload)
        return True

    subject, html_body, text_body = _compose(payload)
    msg = _build_mime(
        to_addr=payload.user_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
    )

    return _deliver_with_retry(payload.user_id, payload.user_email, msg)


# ---------------------------------------------------------------------------
# Template selection
# ---------------------------------------------------------------------------
def _compose(payload: DigestPayload) -> tuple[str, str, str]:
    """Choose the right template and render HTML + plain-text bodies."""
    items = [
        TemplateItem(
            title=item.task_title,
            reminder_type=item.reminder_type,
            due_date_local=item.due_date_local,
        )
        for item in payload.items
    ]

    has_overdue  = any(i.reminder_type == "OVERDUE"  for i in items)
    has_upcoming = any(i.reminder_type == "UPCOMING" for i in items)

    if has_overdue and has_upcoming:
        # Mixed — use full digest template
        subject = "Your Pathfinder AI daily task digest"
        html, text = render_digest(payload.user_name, items, payload.user_timezone)
    elif has_overdue:
        overdue_items = [i for i in items if i.reminder_type == "OVERDUE"]
        n = len(overdue_items)
        subject = f"Action needed: {n} overdue task{'s' if n > 1 else ''}"
        html, text = render_overdue(payload.user_name, overdue_items, payload.user_timezone)
    else:
        upcoming_items = [i for i in items if i.reminder_type == "UPCOMING"]
        n = len(upcoming_items)
        subject = f"Reminder: {n} task{'s' if n > 1 else ''} due soon"
        html, text = render_upcoming(payload.user_name, upcoming_items, payload.user_timezone)

    return subject, html, text


# ---------------------------------------------------------------------------
# MIME construction
# ---------------------------------------------------------------------------
def _build_mime(
    to_addr: str,
    subject: str,
    html_body: str,
    text_body: str,
) -> MIMEMultipart:
    """
    Build a MIMEMultipart('alternative') message with plain-text and HTML parts.
    Email clients render the last matching MIME part they support, so HTML
    must come after plain text per RFC 2046.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = settings.email_from
    msg["To"]      = to_addr

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html",  "utf-8"))
    return msg


# ---------------------------------------------------------------------------
# SMTP delivery with retry + exponential back-off
# ---------------------------------------------------------------------------
def _deliver_with_retry(user_id: int, recipient: str, msg: MIMEMultipart) -> bool:
    """
    Attempt SMTP delivery up to settings.email_max_retries times.

    Back-off: delay * 2^attempt  (e.g. 5s, 10s, 20s)
    Returns True on first success, False after all retries exhausted.
    """
    max_retries  = settings.email_max_retries
    base_delay   = settings.email_retry_delay

    for attempt in range(1, max_retries + 1):
        try:
            _smtp_send(msg, recipient)
            log.info(
                "Email delivered: user_id=%d to=%s (attempt %d/%d)",
                user_id, recipient, attempt, max_retries,
            )
            return True

        except smtplib.SMTPAuthenticationError:
            # Auth errors won't resolve with retry — fail fast
            log.error(
                "SMTP auth failed for user_id=%d. Check SMTP_USER / SMTP_PASSWORD.",
                user_id,
            )
            return False

        except (smtplib.SMTPException, OSError) as exc:
            delay = base_delay * (2 ** (attempt - 1))
            if attempt < max_retries:
                log.warning(
                    "Email delivery failed (attempt %d/%d) for user_id=%d: %s. "
                    "Retrying in %ds...",
                    attempt, max_retries, user_id, exc, delay,
                )
                time.sleep(delay)
            else:
                log.error(
                    "Email delivery permanently failed for user_id=%d after %d attempt(s): %s",
                    user_id, max_retries, exc,
                )

    return False


def _smtp_send(msg: MIMEMultipart, recipient: str) -> None:
    """
    Open an SMTP connection, authenticate, and send the message.
    Uses STARTTLS when settings.smtp_tls is True (recommended).
    """
    if settings.smtp_tls:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
        server.ehlo()
        server.starttls()
        server.ehlo()
    else:
        server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)

    try:
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.email_from, [recipient], msg.as_string())
    finally:
        server.quit()


# ---------------------------------------------------------------------------
# Development fallback — prints digest to console when SMTP is not configured
# ---------------------------------------------------------------------------
def _console_fallback(payload: DigestPayload) -> None:
    """Used in development when SMTP env vars are absent."""
    separator = "-" * 60
    lines = [
        separator,
        "PATHFINDER AI -- Daily Reminder Digest [DEV MODE]",
        f"  To      : {payload.user_name} <{payload.user_email}>",
        f"  Timezone: {payload.user_timezone}",
        separator,
    ]
    for item in payload.items:
        tag = "[OVERDUE]" if item.reminder_type == "OVERDUE" else "[UPCOMING]"
        lines.append(f"  {tag} {item.task_title}  (due: {item.due_date_local})")
    lines.append(separator)
    print("\n".join(lines))
    log.info(
        "Dev mode: digest printed to console for user_id=%d (%d items)",
        payload.user_id, len(payload.items),
    )
