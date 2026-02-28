"""
Email templates for Pathfinder AI reminder emails.

Three template types, each with an HTML version and a plain-text fallback:
  - UPCOMING  : tasks due within the next 24 hours
  - OVERDUE   : tasks whose deadline has already passed
  - DIGEST    : daily digest containing a mix of both

Design decisions:
  - Inline CSS only (maximum email-client compatibility).
  - Templates are pure functions — no Jinja2 dependency.
  - Each function returns (html_body: str, text_body: str).
"""
from __future__ import annotations

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Shared data type
# ---------------------------------------------------------------------------
@dataclass
class TemplateItem:
    """One row in an email template table."""
    title: str
    reminder_type: str   # "UPCOMING" | "OVERDUE"
    due_date_local: str  # already formatted in user's timezone


# ---------------------------------------------------------------------------
# Shared HTML fragments
# ---------------------------------------------------------------------------
_HTML_HEAD = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#f4f6f9;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:8px;
                  box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:#1a1a2e;padding:28px 36px;">
          <p style="margin:0;font-size:22px;font-weight:bold;color:#e2c97e;
                    letter-spacing:0.5px;">Pathfinder AI</p>
          <p style="margin:6px 0 0;font-size:13px;color:#a0aec0;">
            Your personal task reminder</p>
        </td>
      </tr>

      <!-- Body -->
      <tr><td style="padding:32px 36px;">
        {body}
      </td></tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f4f6f9;padding:20px 36px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#718096;text-align:center;">
            You received this because you have active tasks in Pathfinder AI.<br>
            To stop reminders for a specific task, set reminder_opt_out on that task.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""


def _badge(reminder_type: str) -> str:
    """Inline-styled HTML badge for UPCOMING / OVERDUE."""
    if reminder_type == "OVERDUE":
        return ("<span style='background:#fff5f5;color:#c53030;border:1px solid #feb2b2;"
                "padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;'>"
                "OVERDUE</span>")
    return ("<span style='background:#fffbeb;color:#b7791f;border:1px solid #fbd38d;"
            "padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;'>"
            "UPCOMING</span>")


def _task_rows_html(items: list[TemplateItem]) -> str:
    rows = []
    for i, item in enumerate(items):
        bg = "#ffffff" if i % 2 == 0 else "#f7fafc"
        rows.append(
            f"<tr style='background:{bg};'>"
            f"  <td style='padding:12px 16px;font-size:14px;color:#2d3748;'>"
            f"    {item.title}</td>"
            f"  <td style='padding:12px 16px;font-size:13px;color:#718096;'>"
            f"    {item.due_date_local}</td>"
            f"  <td style='padding:12px 16px;text-align:right;'>"
            f"    {_badge(item.reminder_type)}</td>"
            f"</tr>"
        )
    return "\n".join(rows)


def _task_rows_text(items: list[TemplateItem]) -> str:
    lines = []
    for item in items:
        tag = "[OVERDUE]" if item.reminder_type == "OVERDUE" else "[UPCOMING]"
        lines.append(f"  {tag:<12} {item.title}  |  Due: {item.due_date_local}")
    return "\n".join(lines)


def _task_table_html(items: list[TemplateItem]) -> str:
    return (
        "<table width='100%' cellpadding='0' cellspacing='0' "
        "style='border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;'>"
        "<thead>"
        "<tr style='background:#edf2f7;'>"
        "  <th style='text-align:left;padding:10px 16px;font-size:13px;"
        "color:#4a5568;font-weight:600;'>Task</th>"
        "  <th style='text-align:left;padding:10px 16px;font-size:13px;"
        "color:#4a5568;font-weight:600;'>Due</th>"
        "  <th style='text-align:right;padding:10px 16px;font-size:13px;"
        "color:#4a5568;font-weight:600;'>Status</th>"
        "</tr></thead>"
        f"<tbody>{_task_rows_html(items)}</tbody>"
        "</table>"
    )


# ---------------------------------------------------------------------------
# Template 1: UPCOMING
# ---------------------------------------------------------------------------
def render_upcoming(
    user_name: str,
    items: list[TemplateItem],
    user_timezone: str,
) -> tuple[str, str]:
    """Render upcoming-deadline reminder. Returns (html, plain_text)."""
    subject = f"Reminder: {len(items)} task(s) due soon"
    count_label = f"{len(items)} task{'s' if len(items) > 1 else ''}"

    body_html = f"""\
<h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">
  Hi {user_name},</h2>
<p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.6;">
  You have <strong>{count_label} due within the next 24 hours</strong>
  (shown in timezone: <em>{user_timezone}</em>).
  Don't let them slip past!</p>
{_task_table_html(items)}
<p style="margin:24px 0 0;font-size:13px;color:#718096;">
  Stay on track &mdash; the Pathfinder AI Team</p>"""

    html = _HTML_HEAD.format(subject=subject, body=body_html)

    text = (
        f"Hi {user_name},\n\n"
        f"You have {count_label} due within the next 24 hours ({user_timezone}):\n\n"
        f"{_task_rows_text(items)}\n\n"
        "-- Pathfinder AI"
    )
    return html, text


# ---------------------------------------------------------------------------
# Template 2: OVERDUE
# ---------------------------------------------------------------------------
def render_overdue(
    user_name: str,
    items: list[TemplateItem],
    user_timezone: str,
) -> tuple[str, str]:
    """Render overdue-task reminder. Returns (html, plain_text)."""
    subject = f"Action needed: {len(items)} overdue task(s)"
    count_label = f"{len(items)} task{'s' if len(items) > 1 else ''}"

    body_html = f"""\
<h2 style="margin:0 0 8px;font-size:20px;color:#c53030;">
  Hi {user_name}, you have overdue tasks</h2>
<p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.6;">
  <strong>{count_label} past their deadline</strong>
  (timezone: <em>{user_timezone}</em>).
  Take a moment to update or reschedule them.</p>
{_task_table_html(items)}
<p style="margin:24px 0 0;font-size:13px;color:#718096;">
  Keep moving forward &mdash; the Pathfinder AI Team</p>"""

    html = _HTML_HEAD.format(subject=subject, body=body_html)

    text = (
        f"Hi {user_name},\n\n"
        f"You have {count_label} past their deadline ({user_timezone}):\n\n"
        f"{_task_rows_text(items)}\n\n"
        "-- Pathfinder AI"
    )
    return html, text


# ---------------------------------------------------------------------------
# Template 3: DIGEST (mixed UPCOMING + OVERDUE)
# ---------------------------------------------------------------------------
def render_digest(
    user_name: str,
    items: list[TemplateItem],
    user_timezone: str,
) -> tuple[str, str]:
    """Render daily digest with both upcoming and overdue tasks.
    Returns (html, plain_text)."""
    overdue  = [i for i in items if i.reminder_type == "OVERDUE"]
    upcoming = [i for i in items if i.reminder_type == "UPCOMING"]
    subject  = "Your Pathfinder AI daily task digest"

    sections_html = ""
    sections_text = ""

    if overdue:
        sections_html += (
            "<h3 style='margin:0 0 12px;font-size:15px;color:#c53030;'>"
            f"Overdue ({len(overdue)})</h3>"
            f"{_task_table_html(overdue)}"
            "<br>"
        )
        sections_text += f"-- OVERDUE ({len(overdue)}) --\n{_task_rows_text(overdue)}\n\n"

    if upcoming:
        sections_html += (
            "<h3 style='margin:0 0 12px;font-size:15px;color:#b7791f;'>"
            f"Due Soon ({len(upcoming)})</h3>"
            f"{_task_table_html(upcoming)}"
        )
        sections_text += f"-- DUE SOON ({len(upcoming)}) --\n{_task_rows_text(upcoming)}\n"

    body_html = f"""\
<h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">
  Good morning, {user_name}!</h2>
<p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.6;">
  Here is your daily task summary for <em>{user_timezone}</em>.</p>
{sections_html}
<p style="margin:24px 0 0;font-size:13px;color:#718096;">
  Have a productive day &mdash; the Pathfinder AI Team</p>"""

    html = _HTML_HEAD.format(subject=subject, body=body_html)

    text = (
        f"Good morning, {user_name}!\n"
        f"Daily task summary ({user_timezone}):\n\n"
        f"{sections_text}\n"
        "-- Pathfinder AI"
    )
    return html, text
