
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import json

import os

# Create absolute path to DB file to ensure persistence regardless of CWD 
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'sql_app.db')}" 
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables, run safe migrations, and seed the default demo user."""
    from backend.models import (
        User, LifeEvent, Task, ReminderLog, KnowledgeBaseEntry,
        VaultDocument, VaultPlanLink, TaskDependency, SimulationLog, PersonalEvent,
        TaskGuide
    )
    from backend.models.plan_chat_model import PlanChatMessage  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate_task_columns()
    _migrate_user_columns()
    _seed_default_user()


def _migrate_task_columns():
    """Add new columns to the 'tasks' table if they don't exist yet."""
    new_cols = [
        ("phase_category", "TEXT"),
    ]
    with engine.connect() as conn:
        for col, col_type in new_cols:
            try:
                conn.execute(text(f"ALTER TABLE tasks ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists


def _migrate_user_columns():
    """Add user columns to existing 'users' table if they don't exist yet.

    SQLAlchemy's create_all() won't alter existing tables, so we run
    ALTER TABLE manually — wrapped in try/except so it's idempotent.
    """
    new_cols = [
        ("hashed_password", "TEXT"),
        ("auth_token", "TEXT"),
        ("token_expires_at", "TEXT"),
        ("job_city", "TEXT"),
        ("state_code", "TEXT"),
        ("email_notifications", "BOOLEAN DEFAULT 1"),
        ("last_brief_sent_at", "DATETIME"),
        ("notif_smart_alerts", "BOOLEAN DEFAULT 1"), # Default True
        ("notif_progress_checkins", "BOOLEAN DEFAULT 0"), # Default False
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
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists



def _seed_default_user():
    """Ensure user id=1 ('New User') exists."""
    from backend.models import User
    db = SessionLocal()
    try:
        user1 = db.query(User).filter(User.id == 1).first()
        if not user1:
            db.add(User(
                id=1, 
                name="New User", 
                email="user@pathfinder.ai",
                job_city=None,
                state_code=None,
                timezone="Asia/Kolkata",
                extracted_profile=json.dumps({
                    "full_name": None,
                    "mobile": None,
                    "aadhaar_number": None,
                    "dob": None,
                    "joining_date": None,
                    "employer": None
                })
            ))
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
