
import os
import sys
from sqlalchemy import create_engine, text

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'sql_app.db')
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    print(f"Connecting to database at: {DB_PATH}")
    
    new_cols = [
        ("hashed_password", "TEXT"),
        ("auth_token", "TEXT"),
        ("token_expires_at", "TEXT"),
        ("job_city", "TEXT"),
        ("state_code", "TEXT"),
        ("notif_smart_alerts", "BOOLEAN DEFAULT 1"),
        ("notif_progress_checkins", "BOOLEAN DEFAULT 0"),
        ("notif_phase_completions", "BOOLEAN DEFAULT 1"),
        ("notif_journey_completed", "BOOLEAN DEFAULT 1"),
        ("notif_weekly_summary", "BOOLEAN DEFAULT 0"),
        ("ai_clarification", "BOOLEAN DEFAULT 1"),
        ("ai_confidence", "BOOLEAN DEFAULT 0"),
        ("ai_badges", "BOOLEAN DEFAULT 1"),
    ]
    
    with engine.connect() as conn:
        for col, col_type in new_cols:
            try:
                print(f"Attempting to add column: {col}...")
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()
                print(f"✅ Column {col} added successfully.")
            except Exception as e:
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"ℹ️ Column {col} already exists.")
                else:
                    print(f"❌ Failed to add column {col}: {e}")

if __name__ == "__main__":
    run_migration()
