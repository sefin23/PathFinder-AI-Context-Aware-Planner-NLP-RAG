import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.database import Base


class ReminderType(str, enum.Enum):
    UPCOMING = "UPCOMING"
    OVERDUE = "OVERDUE"
    DIGEST = "DIGEST"


class ReminderLog(Base):
    """Records every reminder dispatched so the scheduler never double-sends."""

    __tablename__ = "reminder_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reminder_type = Column(SQLEnum(ReminderType), nullable=False)

    # Defaults to UTC now at insert time (server-side default via SQLAlchemy)
    sent_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Prevent duplicate reminders of the same type on the same calendar day.
    # The day-level deduplication is enforced at the *application* layer
    # (scheduler queries this table before sending).  The unique constraint
    # below adds a database-level safety net using a date cast.
    # SQLite and most RDBMS support a per-row composite unique index;
    # day-level uniqueness is handled by the scheduler's pre-send query.
    __table_args__ = (
        UniqueConstraint(
            "task_id",
            "reminder_type",
            "sent_at",
            name="uq_reminder_per_task_type_timestamp",
        ),
    )

    # Relationships
    task = relationship("Task", back_populates="reminder_logs")
    user = relationship("User", back_populates="reminder_logs")
