"""
Pathfinder AI — Email System Redesign
Brand-aligned, dark-themed HTML/Plain-text email templates.

Design tokens:
  Background: #0d1a15 (Dark Forest)
  Card: #1a2f26
  Accent: #d47c3f (Amber)
  Success: #5c8c75 (Sage)
  Warning: #c65d4a (Coral)
"""
from __future__ import annotations
from dataclasses import dataclass

# The logo is now embedded directly in the email via CID
LOGO_CID = "logo"
SETTINGS_URL = "http://localhost:5173/#settings"

@dataclass
class TemplateItem:
    """One task item for lists."""
    title: str
    reminder_type: str   # "UPCOMING" | "DRIFTED"
    due_date_local: str

# ---------------------------------------------------------------------------
# Reusable HTML Layout
# ---------------------------------------------------------------------------
_HTML_HEAD = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#0d1a15;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<!-- Full Bleed Header -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;border-bottom:1px solid #1e3529;">
  <tr><td align="center">
    <table width="640" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="padding:40px 20px 32px;text-align:center;">
          <img src="cid:{logo_cid}" alt="PathFinder AI" width="240" style="display:block;margin:0 auto;" />
        </td>
      </tr>
    </table>
  </td></tr>
</table>

<!-- Full Bleed Body Container -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1a15;">
  <tr><td align="center">
    <!-- Centered Content Restriction -->
    <table width="640" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="padding:48px 24px;">
        {body}
      </td></tr>
    </table>
  </td></tr>
</table>

<!-- Full Bleed Footer -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;border-top:1px solid #1e3529;">
  <tr><td align="center">
    <table width="640" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="padding:32px 24px 48px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#5c8c75;letter-spacing:0.5px;text-transform:uppercase;">
            PATHFINDER AI · YOUR NAVIGATOR
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:#4a6358;">
            You're receiving this because you have an active journey.<br><br>
            <a href="{settings_url}" style="color:#d47c3f;text-decoration:none;font-weight:bold;padding:8px 16px;border:1px solid rgba(212,124,63,0.3);border-radius:6px;display:inline-block;background:rgba(212,124,63,0.08);">
              Manage Notification Settings</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>

</body>
</html>"""

# ---------------------------------------------------------------------------
# Visual Components
# ---------------------------------------------------------------------------
def _cta_button(text: str, url: str) -> str:
    return (
        f'<table cellpadding="0" cellspacing="0" style="margin:24px 0;">'
        f'<tr><td style="background:#d47c3f;border-radius:999px;padding:12px 28px;">'
        f'<a href="{url}" style="color:#ffffff;font-size:14px;font-weight:bold;'
        f'text-decoration:none;display:inline-block;">{text}</a>'
        f'</td></tr></table>'
    )

def _badge(reminder_type: str) -> str:
    if reminder_type == "DRIFTED":
        return ("<span style='background:#2a1a18;color:#c65d4a;border:1px solid #3d2420;"
                "padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;'>"
                "DRIFTED</span>")
    return ("<span style='background:#1a2a20;color:#5c8c75;border:1px solid #243d30;"
            "padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;'>"
            "DUE SOON</span>")

def _task_table_html(items: list[TemplateItem]) -> str:
    rows = []
    for i, item in enumerate(items):
        bg = "#1a2f26" if i % 2 == 0 else "#1e3529"
        rows.append(
            f"<tr style='background:{bg};'>"
            f"  <td style='padding:12px 16px;font-size:14px;color:#e8e4dc;'>"
            f"    {item.title}</td>"
            f"  <td style='padding:12px 16px;font-size:13px;color:#b8cfc7;'>"
            f"    {item.due_date_local}</td>"
            f"  <td style='padding:12px 16px;text-align:right;'>"
            f"    {_badge(item.reminder_type)}</td>"
            f"</tr>"
        )
    
    return (
        "<table width='100%' cellpadding='0' cellspacing='0' "
        "style='border-collapse:collapse;border:1px solid #1e3529;border-radius:6px;overflow:hidden;'>"
        f"<tbody>{''.join(rows)}</tbody>"
        "</table>"
    )

# ---------------------------------------------------------------------------
# Template Implementations
# ---------------------------------------------------------------------------

def render_morning_brief(user_name, plan_title, day_number, focus_task, 
                          upcoming_tasks, progress_percent, tasks_done,
                          overdue_tasks, phase_warning, plan_url):
    """Template Type 1: Morning Brief"""
    
    subject = f"Day {day_number}: {focus_task['title']} — your focus today"
    
    # Focus task card
    focus_html = (
        f"<table width='100%' cellpadding='0' cellspacing='0' "
        f"style='margin:16px 0;'><tr>"
        f"<td style='width:4px;background:#d47c3f;border-radius:4px 0 0 4px;'></td>"
        f"<td style='background:#243d30;padding:16px 20px;border-radius:0 8px 8px 0;'>"
        f"<p style='margin:0 0 2px;font-size:11px;color:#d47c3f;font-weight:bold;"
        f"letter-spacing:0.5px;text-transform:uppercase;'>TODAY'S FOCUS</p>"
        f"<p style='margin:0;font-size:16px;color:#e8e4dc;font-weight:bold;'>"
        f"{focus_task['title']}</p>"
        f"<p style='margin:4px 0 0;font-size:13px;color:#b8cfc7;'>"
        f"{focus_task['description']}</p>"
        f"</td></tr></table>"
    )
    
    # Progress bar
    progress_html = (
        f"<table width='100%' cellpadding='0' cellspacing='0' style='margin:16px 0;'>"
        f"<tr><td style='padding:12px 16px;background:#1e3529;border-radius:8px;'>"
        f"<p style='margin:0 0 8px;font-size:11px;color:#b8cfc7;"
        f"letter-spacing:0.5px;text-transform:uppercase;'>YOUR PROGRESS</p>"
        f"<table width='100%' cellpadding='0' cellspacing='0'><tr>"
        f"<td style='height:6px;background:#0d1a15;border-radius:3px;'>"
        f"<div style='width:{progress_percent}%;height:6px;"
        f"background:#5c8c75;border-radius:3px;'></div>"
        f"</td></tr></table>"
        f"<p style='margin:6px 0 0;font-size:12px;color:#5c8c75;'>"
        f"{progress_percent}% complete · {tasks_done} tasks done</p>"
        f"</td></tr></table>"
    )
    
    # Overdue/Drifted callout
    overdue_html = ""
    if overdue_tasks:
        task = overdue_tasks[0]
        overdue_html = (
            f"<table width='100%' cellpadding='0' cellspacing='0' style='margin:16px 0;'>"
            f"<tr><td style='padding:12px 16px;background:#2a1a18;"
            f"border:1px solid #3d2420;border-radius:8px;'>"
            f"<p style='margin:0;font-size:13px;color:#c65d4a;'>"
            f"⚠ <strong>{task['title']}</strong> drifted off path — "
            f"{task['days_overdue']} days past due.</p>"
            f"</td></tr></table>"
        )

    # Heads-up Insight
    insight_html = ""
    if phase_warning:
        insight_html = (
            f"<p style='margin:24px 0 0;font-size:13px;color:#b8cfc7;line-height:1.6;'>"
            f"<strong>Heads up:</strong> {phase_warning}</p>"
        )
    
    # List of upcoming tasks
    upcoming_html = ""
    if upcoming_tasks:
        t_items = [TemplateItem(t['title'], "UPCOMING", t['due_date']) for t in upcoming_tasks[:3]]
        upcoming_html = (
            f"<p style='margin:24px 0 8px;font-size:11px;color:#b8cfc7;"
            f"letter-spacing:0.5px;text-transform:uppercase;'>Coming up this week</p>"
            f"{_task_table_html(t_items)}"
        )

    body = (
        f"<h2 style='margin:0 0 4px;font-size:20px;color:#e8e4dc;"
        f"font-weight:bold;'>Good morning, {user_name}.</h2>"
        f"<p style='margin:0 0 20px;font-size:14px;color:#b8cfc7;'>"
        f"Day {day_number} of your {plan_title}.</p>"
        f"{focus_html}"
        f"{overdue_html}"
        f"{progress_html}"
        f"{upcoming_html}"
        f"{insight_html}"
        f"{_cta_button('Open your journey →', plan_url)}"
    )
    
    html = _HTML_HEAD.format(subject=subject, body=body, logo_cid=LOGO_CID, settings_url=SETTINGS_URL)
    text = f"Good morning, {user_name}.\nDay {day_number} of your {plan_title}.\n\nFocus: {focus_task['title']}\n{focus_task['description']}\n\nProgress: {progress_percent}%"
    
    return html, text

def render_nudge(user_name, task_title, impact_consequence, plan_url):
    """Template Type 2: Nudge"""
    subject = f"Stalled: {task_title} — your journey is waiting"
    
    nudge_card = (
        f"<table width='100%' cellpadding='0' cellspacing='0' style='margin:24px 0;'>"
        f"<tr><td style='padding:20px;background:rgba(212,124,63,0.08);border:1px solid rgba(212,124,63,0.2);border-radius:12px;'>"
        f"<p style='margin:0;font-size:11px;color:#d47c3f;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;'>STALLED TASK</p>"
        f"<p style='margin:8px 0 0;font-size:18px;color:#e8e4dc;font-weight:bold;'>{task_title}</p>"
        f"<p style='margin:12px 0 0;font-size:14px;color:#b8cfc7;line-height:1.6;'>"
        f"Your navigator noticed this hasn't moved in 3 days. Without this, you might <strong>{impact_consequence}</strong>.</p>"
        f"</td></tr></table>"
    )

    body = (
        f"<h2 style='margin:0 0 16px;font-size:20px;color:#e8e4dc;font-weight:bold;'>Time to pick up the pace, {user_name}.</h2>"
        f"{nudge_card}"
        f"<p style='margin:24px 0;font-size:14px;color:#b8cfc7;line-height:1.6;'>"
        f"Small steps keep the momentum alive. Let's get this back on path.</p>"
        f"{_cta_button('Resume Journey →', plan_url)}"
    )
    
    html = _HTML_HEAD.format(subject=subject, body=body, logo_cid=LOGO_CID, settings_url=SETTINGS_URL)
    text = f"Stalled: {task_title}. Without this, you might {impact_consequence}. Resume here: {plan_url}"
    return html, text

def render_milestone(user_name, milestone_name, tasks_done, docs_collected, days_elapsed, next_phase_desc, is_final=False):
    """Template Type 3: Milestone Celebration"""
    if is_final:
        subject = "Journey Complete: You've reached the destination."
        headline = f"Well done, {user_name}."
        subheadline = "You've fully completed your journey."
    else:
        subject = f"🏆 Milestone reached: {milestone_name}"
        headline = "Milestone Achieved."
        subheadline = f"You just completed {milestone_name}."
        
    stats_html = (
        f"<table width='100%' cellpadding='0' cellspacing='0' style='margin:24px 0;'>"
        f"<tr>"
        f"<td style='padding:20px;background:#243d30;border:1px solid #2d4d3c;border-radius:12px;text-align:center;'>"
        f"<div style='font-size:32px;margin-bottom:8px;'>{'🥂' if is_final else '🏆'}</div>"
        f"<p style='margin:0;font-size:24px;color:#d47c3f;font-weight:bold;'>{tasks_done} Tasks</p>"
        f"<p style='margin:4px 0 0;font-size:13px;color:#5c8c75;text-transform:uppercase;letter-spacing:1px;'>"
        f"{docs_collected} Documents · {days_elapsed} Days</p>"
        f"</td>"
        f"</tr>"
        f"</table>"
    )
    
    body = (
        f"<h2 style='margin:0;font-size:24px;color:#e8e4dc;font-weight:bold;'>{headline}</h2>"
        f"<p style='margin:4px 0 24px;font-size:16px;color:#b8cfc7;'>{subheadline}</p>"
        f"{stats_html}"
        f"<p style='margin:24px 0;font-size:14px;color:#b8cfc7;line-height:1.6;'>"
        f"<strong>What's next:</strong> {next_phase_desc}</p>"
        f"{_cta_button('View full report →' if is_final else 'Continue Journey →', SETTINGS_URL.replace('/#settings', '/#saved'))}"
    )
    
    html = _HTML_HEAD.format(subject=subject, body=body, logo_cid=LOGO_CID, settings_url=SETTINGS_URL)
    text = f"{headline} {subheadline}. Stats: {tasks_done} tasks done, {docs_collected} docs."
    return html, text

def render_conflict_alert(user_name, plan_title, conflict_explanation, resolution_snippet, plan_url):
    """Template Type 4: Conflict Alert"""
    subject = f"Conflict: {plan_title} needs adjustment"
    
    conflict_card = (
        f"<table width='100%' cellpadding='0' cellspacing='0' style='margin:24px 0;'>"
        f"<tr><td style='padding:20px;background:rgba(198,93,74,0.08);border:1px solid rgba(198,93,74,0.2);border-radius:12px;'>"
        f"<p style='margin:0;font-size:11px;color:#c65d4a;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;'>TIMING CONFLICT</p>"
        f"<p style='margin:12px 0 0;font-size:14px;color:#e8e4dc;line-height:1.6;'>"
        f"{conflict_explanation}</p>"
        f"</td></tr></table>"
    )

    body = (
        f"<h2 style='margin:0 0 16px;font-size:20px;color:#e8e4dc;font-weight:bold;'>Heads up, {user_name}.</h2>"
        f"<p style='margin:0 0 24px;font-size:14px;color:#b8cfc7;line-height:1.6;'>"
        f"PathFinder detected overlapping timelines in your <strong>{plan_title}</strong> plan.</p>"
        f"{conflict_card}"
        f"<p style='margin:24px 0;font-size:14px;color:#e8e4dc;font-weight:bold;'>"
        f"Suggested fix: <span style='color:#b8cfc7;font-weight:normal;'>{resolution_snippet}</span></p>"
        f"{_cta_button('Resolve Conflict →', plan_url)}"
    )
    
    html = _HTML_HEAD.format(subject=subject, body=body, logo_cid=LOGO_CID, settings_url=SETTINGS_URL)
    text = f"Conflict in your {plan_title} plan. {conflict_explanation}. Fix: {resolution_snippet}"
    return html, text
