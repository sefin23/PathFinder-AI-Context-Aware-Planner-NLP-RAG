from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime, timezone
import enum


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    skipped = "skipped"
    pending_verification = "pending_verification"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.pending, nullable=False)

    # Layer 2: integer priority scale 1 (lowest) – 5 (highest), default 3 (normal)
    priority = Column(Integer, default=3, nullable=False)

    # Layer 3.3: Logical grouping for Phase View
    phase_title = Column(String, nullable=True)
    phase_category = Column(String(50), nullable=True)  # Fixed enum: finance, legal, startup, etc.

    # Layer 2: full datetime deadline (nullable)
    due_date = Column(DateTime, nullable=True)

    # Smart scheduling: AI-suggested or user-set scheduled date
    scheduled_date = Column(DateTime, nullable=True)

    # Layer 2: user opted out of reminders for this specific task
    reminder_opt_out = Column(Boolean, default=False, nullable=False)

    # Layer 2: timestamp recorded when status transitions to 'completed'
    completed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Foreign key — every task belongs to a life event (even subtasks)
    life_event_id = Column(Integer, ForeignKey("life_events.id"), nullable=False)

    # Self-referencing foreign key — nullable means this is a top-level task
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True) # self-referential
    
    # Task Guidance
    task_type = Column(String(100), nullable=True) # e.g. "aadhaar_update"
    guide_type = Column(String(100), nullable=True) # To link with task_guides table
    
    # Portal Registry & Tracking
    portal_url = Column(String(255), nullable=True)
    prerequisites = Column(Text, nullable=True) # JSON list
    reference_id = Column(String(100), nullable=True)
    followup_date_1 = Column(DateTime, nullable=True)
    followup_date_2 = Column(DateTime, nullable=True)
    urn_pattern_key = Column(String(100), nullable=True)

    # Cost Estimation
    estimated_cost_min = Column(Integer, nullable=True)  # Minimum cost in local currency
    estimated_cost_max = Column(Integer, nullable=True)  # Maximum cost in local currency
    cost_currency = Column(String(3), default="INR", nullable=True)  # Currency code (INR, USD, etc.)

    # Email Tracking
    nudge_sent_at = Column(DateTime, nullable=True)

    # Relationships
    life_event = relationship("LifeEvent", back_populates="tasks")
    parent = relationship("Task", remote_side=[id], back_populates="subtasks")
    subtasks = relationship("Task", back_populates="parent", cascade="all, delete-orphan")
    reminder_logs = relationship("ReminderLog", back_populates="task", cascade="all, delete-orphan")

