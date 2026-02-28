from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from backend.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)

    # IANA timezone name (e.g. "Asia/Kolkata", "America/New_York").
    # All due_date values are stored in UTC; this field is used to convert
    # them into the user's local day when evaluating deadlines and reminders.
    timezone = Column(String, nullable=False, default="UTC")

    # Relationships
    life_events = relationship("LifeEvent", back_populates="user", cascade="all, delete-orphan")
    reminder_logs = relationship("ReminderLog", back_populates="user", cascade="all, delete-orphan")


