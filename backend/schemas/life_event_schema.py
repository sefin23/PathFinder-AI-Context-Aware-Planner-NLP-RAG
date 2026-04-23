from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from backend.models.life_event_model import LifeEventStatus


class LifeEventCreate(BaseModel):
    title: str
    display_title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    timeline: Optional[str] = None
    metadata_json: Optional[str] = None
    start_date: Optional[datetime] = None
    user_id: int


class LifeEventUpdate(BaseModel):
    title: Optional[str] = None
    display_title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[LifeEventStatus] = None
    location: Optional[str] = None
    timeline: Optional[str] = None
    metadata_json: Optional[str] = None
    start_date: Optional[datetime] = None
    requirements_json: Optional[str] = None


class LifeEventResponse(BaseModel):
    id: int
    title: str
    display_title: Optional[str]
    description: Optional[str]
    status: LifeEventStatus
    location: Optional[str]
    timeline: Optional[str]
    metadata_json: Optional[str]
    requirements_json: Optional[str] = None
    start_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    user_id: int

    class Config:
        from_attributes = True


class LifeEventWithTasksResponse(LifeEventResponse):
    """Returns a life event along with all its tasks."""
    tasks: List["TaskResponse"] = []

    class Config:
        from_attributes = True


# Avoid circular import — import TaskResponse after defining the class
from backend.schemas.task_schema import TaskResponse  # noqa: E402

LifeEventWithTasksResponse.model_rebuild()

