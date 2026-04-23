from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class EmailLog(Base):
    """
    Email log table (track all sent emails vs specific users/life_events)
    Tracks: 'morning_brief', 'nudge', 'milestone', 'conflict'
    """
    __tablename__ = "email_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    life_event_id = Column(Integer, ForeignKey("life_events.id"), nullable=True, index=True)
    
    email_type = Column(String(50), nullable=False) # 'morning_brief', 'nudge', 'milestone', 'conflict'
    subject = Column(String(255), nullable=True)
    
    sent_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    # Relationships
    user = relationship("User")
    life_event = relationship("LifeEvent")
