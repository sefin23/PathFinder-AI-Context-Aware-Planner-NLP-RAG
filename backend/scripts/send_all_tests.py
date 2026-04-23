
import os
import sys

# Add the project root (the folder containing 'backend') to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.services.email_service import (
    send_morning_brief,
    send_nudge,
    send_milestone,
    send_conflict_alert
)

def send_all_tests(target_email):
    print(f"\n--- Pathfinder AI: Sending ALL redesigned Premium Navigator tests to {target_email} ---\n")

    # 1. Morning Brief
    print("1. Sending Morning Brief...")
    send_morning_brief(
        user_id=1,
        user_email=target_email,
        user_name="Sefin Jose",
        plan_title="Product Analyst Career Journey",
        day_number=8,
        focus_task={"title": "Select Target Companies for Q2", "description": "Identify top 5 industry disruptors with active recruiter patterns from the Pathfinder intel library."},
        upcoming_tasks=[
            {"title": "Skill Gap Analysis (Python for Data)", "due_date": "Apr 10"},
            {"title": "LinkedIn Network Warm-up Phase 1", "due_date": "Apr 12"},
            {"title": "Review AI-generated Portfolio Brief", "due_date": "Apr 15"}
        ],
        progress_percent=38,
        tasks_done=12,
        overdue_tasks=[{"title": "Resume Baseline Sync", "days_overdue": 2}],
        phase_warning="Most people get stuck on the networking phase in the coming days.",
        plan_url="http://localhost:5173/#saved"
    )

    # 2. Nudge
    print("2. Sending Nudge...")
    send_nudge(
        user_id=1,
        user_email=target_email,
        user_name="Sefin Jose",
        task_title="Reach out to 3 Tech Recruiters",
        impact_consequence="miss the early application window for Q3 cohorts",
        plan_url="http://localhost:5173/#saved"
    )

    # 3. Milestone
    print("3. Sending Milestone (Phase 1)...")
    send_milestone(
        user_id=1,
        user_email=target_email,
        user_name="Sefin Jose",
        milestone_name="Foundational Prep",
        tasks_done=25,
        docs_collected=8,
        days_elapsed=14,
        next_phase_desc="Now that your foundations are solid, we're moving into the High-Impact Applications phase.",
        is_final=False
    )

    # 4. Conflict Alert
    print("4. Sending Conflict Alert...")
    send_conflict_alert(
        user_id=1,
        user_email=target_email,
        user_name="Sefin Jose",
        plan_title="Product Analyst Career Journey",
        conflict_explanation="The 'Portfolio Review' and 'Initial Outreach' phases are scheduled for the same 48-hour window, which exceeds your weekly 10-hour commitment.",
        resolution_snippet="Extend the Outreach phase by 3 days or move the Portfolio Review to next Tuesday.",
        plan_url="http://localhost:5173/#saved"
    )

    print(f"\n✅ All 4 redesigns delivered to {target_email}!")
    print("Check your inbox for the Morning Brief, Nudge, Milestone, and Conflict Alert.")

if __name__ == "__main__":
    email = "sefinjose2@gmail.com" # Default to user's email
    if len(sys.argv) > 1:
        email = sys.argv[1]
    send_all_tests(email)
