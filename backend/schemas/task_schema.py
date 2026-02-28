from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
from backend.models.task_model import TaskStatus


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    # Integer 1 (lowest urgency) – 5 (highest urgency), default 3
    priority: int = 3
    due_date: Optional[datetime] = None
    life_event_id: int
    parent_id: Optional[int] = None
    reminder_opt_out: bool = False


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: int
    due_date: Optional[datetime]
    reminder_opt_out: bool
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    life_event_id: int
    parent_id: Optional[int] = None

    # Computed at query time — not stored in DB
    urgency_score: Optional[float] = None

    class Config:
        from_attributes = True


class TaskStatusUpdate(BaseModel):
    """Used by PATCH /tasks/{id}/status to update only the status field."""
    status: TaskStatus


class TaskUpdate(BaseModel):
    """Used by PATCH /tasks/{id} to update details."""
    priority: Optional[int] = None
    due_date: Optional[datetime] = None
    reminder_opt_out: Optional[bool] = None


class TaskGroup(BaseModel):
    """A named bucket of tasks, all sorted by urgency_score descending."""
    category: str
    tasks: List[TaskResponse]


class GroupedTasksResponse(BaseModel):
    """
    Structured response for GET /tasks/grouped.
    Categories always appear in urgency order even when empty.
    """
    groups: List[TaskGroup]
    total: int

