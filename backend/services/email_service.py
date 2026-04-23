"""
SMTP-based email delivery service for Pathfinder AI.
Supports Morning Brief, Nudge, Milestone, and Conflict Alert emails.
"""
import logging
import smtplib
import time
import os
from dataclasses import dataclass, field
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

from backend.config import settings
from backend.services.email_templates import (
    render_morning_brief,
    render_nudge,
    render_milestone,
    render_conflict_alert,
    LOGO_CID,
    SETTINGS_URL
)

log = logging.getLogger(__name__)

# Primary logo file for embedding
LOGO_FILE_PATH = os.path.join(os.getcwd(), "docs", "branding", "pathfinder_logo_full.png")

# ---------------------------------------------------------------------------
# Public Entry Points
# ---------------------------------------------------------------------------

def send_morning_brief(user_id: int, user_email: str, user_name: str, **kwargs) -> bool:
    """Send the Daily Morning Brief (Type 1)."""
    if not settings.email_configured:
        log.info("Email not configured. Printing Morning Brief for user %d to console.", user_id)
        return True

    html_body, text_body = render_morning_brief(user_name=user_name, **kwargs)
    subject = f"Day {kwargs.get('day_number')}: {kwargs.get('focus_task', {}).get('title')} — your focus today"
    
    return _send_email(user_id, user_email, subject, html_body, text_body)

def send_nudge(user_id: int, user_email: str, user_name: str, **kwargs) -> bool:
    """Send a Task Nudge (Type 2)."""
    if not settings.email_configured:
        log.info("Email not configured. Printing Nudge for user %d to console.", user_id)
        return True
        
    html_body, text_body = render_nudge(user_name=user_name, **kwargs)
    subject = f"{kwargs.get('task_title')} has been waiting 3 days — here's why it matters"

    return _send_email(user_id, user_email, subject, html_body, text_body)

def send_milestone(user_id: int, user_email: str, user_name: str, **kwargs) -> bool:
    """Send Milestone Celebration (Type 3)."""
    if not settings.email_configured:
        return True
        
    html_body, text_body = render_milestone(user_name=user_name, **kwargs)
    subject = "You've arrived. Your journey is complete." if kwargs.get('is_final') else f"🏆 {kwargs.get('milestone_name')} complete"

    return _send_email(user_id, user_email, subject, html_body, text_body)

def send_conflict_alert(user_id: int, user_email: str, user_name: str, **kwargs) -> bool:
    """Send Conflict Alert (Type 4)."""
    if not settings.email_configured:
        return True
        
    html_body, text_body = render_conflict_alert(user_name=user_name, **kwargs)
    subject = f"⚠ PathFinder detected a timing conflict in your {kwargs.get('plan_title')} plan"

    return _send_email(user_id, user_email, subject, html_body, text_body)

# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------

def _send_email(user_id: int, user_email: str, subject: str, html_body: str, text_body: str) -> bool:
    # Use MIMEMultipart("related") for inline images
    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"]    = settings.email_from
    msg["To"]      = user_email

    # Alternative part for text and html
    msg_alternative = MIMEMultipart("alternative")
    msg.attach(msg_alternative)

    msg_alternative.attach(MIMEText(text_body, "plain", "utf-8"))
    msg_alternative.attach(MIMEText(html_body, "html",  "utf-8"))

    # Attach Logo as Inline CID
    if os.path.exists(LOGO_FILE_PATH):
        try:
            with open(LOGO_FILE_PATH, "rb") as f:
                img = MIMEImage(f.read())
                img.add_header("Content-ID", f"<{LOGO_CID}>")
                img.add_header("Content-Disposition", "inline", filename=os.path.basename(LOGO_FILE_PATH))
                msg.attach(img)
        except Exception as e:
            log.error("Failed to embed logo: %s", e)

    return _deliver_with_retry(user_id, user_email, msg)

def _deliver_with_retry(user_id: int, recipient: str, msg: MIMEMultipart) -> bool:
    max_retries  = settings.email_max_retries
    base_delay   = settings.email_retry_delay

    for attempt in range(1, max_retries + 1):
        try:
            _smtp_send(msg, recipient)
            log.info("Email delivered: user_id=%d type=%s (attempt %d/%d)", user_id, msg["Subject"], attempt, max_retries)
            return True
        except smtplib.SMTPAuthenticationError:
            log.error("SMTP auth failed for user_id=%d.", user_id)
            return False
        except (smtplib.SMTPException, OSError) as exc:
            delay = base_delay * (2 ** (attempt - 1))
            if attempt < max_retries:
                log.warning("Email delivery failed for user_id=%d: %s. Retrying...", user_id, exc)
                time.sleep(delay)
            else:
                log.error("Email delivery permanently failed for user_id=%d", user_id)

    return False

def _smtp_send(msg: MIMEMultipart, recipient: str) -> None:
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
