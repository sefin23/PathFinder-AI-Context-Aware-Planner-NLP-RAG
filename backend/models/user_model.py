from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from backend.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)

    # Authentication
    hashed_password = Column(String, nullable=True)
    auth_token = Column(String, nullable=True, index=True)
    token_expires_at = Column(String, nullable=True)  # ISO datetime string (UTC)

    # IANA timezone name (e.g. "Asia/Kolkata", "America/New_York").
    # All due_date values are stored in UTC; this field is used to convert
    # them into the user's local day when evaluating deadlines and reminders.
    timezone = Column(String, nullable=False, default="UTC")
    
    # Simulation Tracking (V2 Nav Promotion)
    simulation_count_last_7d = Column(Integer, default=0)
    show_sim_in_nav = Column(Boolean, default=False)
    extracted_profile = Column(Text, nullable=True) # JSON stored as text
    
    # Portal Registry fields
    job_city = Column(String(100), nullable=True)
    state_code = Column(String(10), nullable=True)

    # Notification Preferences
    email_notifications = Column(Boolean, default=True)
    last_brief_sent_at = Column(DateTime, nullable=True)
    notif_smart_alerts = Column(Boolean, default=True)
    notif_progress_checkins = Column(Boolean, default=False)
    notif_phase_completions = Column(Boolean, default=True)
    notif_journey_completed = Column(Boolean, default=True)
    notif_weekly_summary = Column(Boolean, default=False)

    # AI Behavior Preferences
    ai_clarification = Column(Boolean, default=True)
    ai_confidence = Column(Boolean, default=False)
    ai_badges = Column(Boolean, default=True)

    # Relationships
    life_events = relationship("LifeEvent", back_populates="user", cascade="all, delete-orphan")
    reminder_logs = relationship("ReminderLog", back_populates="user", cascade="all, delete-orphan")
    personal_events = relationship("PersonalEvent", back_populates="user", cascade="all, delete-orphan")
    vault_documents = relationship("VaultDocument", back_populates="user", cascade="all, delete-orphan")


