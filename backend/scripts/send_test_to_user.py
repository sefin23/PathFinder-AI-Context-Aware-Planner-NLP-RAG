import sys
import os

# Add the project root to sys.path so we can import 'backend'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.services.email_service import send_morning_brief

def send_live_test_brief():
    target_email = "sefinjose2@gmail.com"
    print(f"--- Pathfinder AI: NEW Morning Brief Test to {target_email} ---")
    
    # Matching the new Morning Brief data structure
    morning_brief_data = {
        "plan_title": "Product Analyst Career Journey",
        "day_number": 8,
        "focus_task": {
            "title": "Select Target Companies for Q2",
            "description": "Identify top 5 industry disruptors with active recruiter patterns from the Pathfinder intel library."
        },
        "upcoming_tasks": [
            {"title": "Skill Gap Analysis (Python for Data)", "due_date": "Apr 10"},
            {"title": "LinkedIn Network Warm-up Phase 1", "due_date": "Apr 12"},
            {"title": "Review AI-generated Portfolio Brief", "due_date": "Apr 15"}
        ],
        "progress_percent": 38,
        "tasks_done": 12,
        "overdue_tasks": [
            {"title": "Resume Baseline Sync", "days_overdue": 2} # This will trigger "Drifted" styling
        ],
        "phase_warning": "Most people get stuck on the networking phase in the coming days.",
        "plan_url": "http://localhost:5173/#saved"
    }

    print(f"Sending redesigned navigator brief to {target_email}...")
    success = send_morning_brief(
        user_id=1,
        user_email=target_email,
        user_name="Sefin Jose",
        **morning_brief_data
    )
    
    if success:
        print(f"\n\u2705 SUCCESS: New Morning Brief delivered to {target_email}!")
        print("Go check your inbox for the Dark Forest themed design!")
    else:
        print("\n\u274c FAILED: Check your .env setup or Gmail connection.")

if __name__ == "__main__":
    send_live_test_brief()
