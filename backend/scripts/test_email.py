import sys
import os

# Add the project root to sys.path so we can import 'backend'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.config import settings
from backend.services.email_service import DigestPayload, ReminderItem, send_reminder_digest

def test_email_setup():
    print("--- Pathfinder AI: Email Setup Verification ---")
    
    # Check if credentials are placeholders
    is_placeholder = "your-email@gmail.com" in settings.smtp_user or "your-app-password" in settings.smtp_password
    
    print(f"SMTP Host: {settings.smtp_host}")
    print(f"SMTP User: {settings.smtp_user}")
    print(f"SMTP Port: {settings.smtp_port}")
    print(f"Configured: {'YES' if settings.email_configured else 'NO'}")
    
    if is_placeholder:
        print("\n\u26a0\ufe0f  WARNING: You are still using placeholder credentials in .env!")
        print("    Update SMTP_USER and SMTP_PASSWORD to send real emails.")
        print("    (Falling back to console-print mode for now...)\n")

    # Create dummy payload
    payload = DigestPayload(
        user_id=1,
        user_email=settings.smtp_user if not is_placeholder else "test@example.com",
        user_name="Testing User",
        user_timezone="UTC",
        items=[
            ReminderItem(task_id=1, task_title="Verify Email Setup", reminder_type="UPCOMING", due_date_local="Today"),
            ReminderItem(task_id=2, task_title="Complete Documentation", reminder_type="OVERDUE", due_date_local="Yesterday")
        ]
    )

    print("Attempting to send test digest...")
    success = send_reminder_digest(payload)
    
    if success:
        if settings.email_configured and not is_placeholder:
            print("\n\u2705 SUCCESS: Real email sent to", payload.user_email)
        else:
            print("\n\u2139\ufe0f  INFO: Console-print succeeded. Set real credentials to send actual mail.")
    else:
        print("\n\u274c FAILED: Email delivery error. Check your .env credentials or SMTP provider.")

if __name__ == "__main__":
    test_email_setup()
