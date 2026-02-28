from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.life_event_model import LifeEvent
from backend.models.task_model import Task, TaskStatus
from backend.models.user_model import User
from backend.schemas.task_schema import (
    GroupedTasksResponse,
    TaskCreate,
    TaskGroup,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from backend.utils.timezone_utils import days_until_due, now_in_tz

router = APIRouter()

# ---------------------------------------------------------------------------
# Category labels in display/severity order (Overdue → No Deadline)
# ---------------------------------------------------------------------------
CATEGORY_ORDER = ["Overdue", "Due Today", "This Week", "Later", "No Deadline"]


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Urgency scoring
# ---------------------------------------------------------------------------
def _compute_urgency_score(task: Task, delta_days: int) -> float:
    """
    Score = priority_weight + deadline_bonus.

    Accepts pre-computed delta_days (calendar days from user's local today
    to the task's due date expressed in the same local timezone).

    priority_weight  = priority × 10   (range 10 – 50)
    deadline_bonus:
        - No due_date        →  0
        - Overdue by N days  → +50 + N*5  (heavily boosted)
        - Due today          → +40
        - Due this week      → +20
        - Due later          → +5
    """
    score = task.priority * 10.0

    if task.due_date is None:
        return score

    if delta_days < 0:
        score += 50 + abs(delta_days) * 5
    elif delta_days == 0:
        score += 40
    elif delta_days <= 7:
        score += 20
    else:
        score += 5

    return score


def _categorize(delta_days: int | None) -> str:
    """Map a pre-computed delta_days value to a display bucket name."""
    if delta_days is None:
        return "No Deadline"
    if delta_days < 0:
        return "Overdue"
    if delta_days == 0:
        return "Due Today"
    if delta_days <= 7:
        return "This Week"
    return "Later"


def _task_to_response(task: Task, score: float) -> TaskResponse:
    """Build a TaskResponse, injecting the computed urgency_score."""
    data = TaskResponse.model_validate(task)
    data.urgency_score = round(score, 2)
    return data


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post("/", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task under a life event. Pass parent_id to create a subtask."""
    life_event = db.query(LifeEvent).filter(LifeEvent.id == task.life_event_id).first()
    if not life_event:
        raise HTTPException(status_code=404, detail="Life event not found")

    if task.parent_id is not None:
        parent_task = db.query(Task).filter(Task.id == task.parent_id).first()
        if not parent_task:
            raise HTTPException(status_code=404, detail="Parent task not found")
        if parent_task.life_event_id != task.life_event_id:
            raise HTTPException(
                status_code=400,
                detail="Parent task belongs to a different life event",
            )

    db_task = Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        reminder_opt_out=task.reminder_opt_out,
        life_event_id=task.life_event_id,
        parent_id=task.parent_id,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.get("/grouped", response_model=GroupedTasksResponse)
def get_tasks_grouped(
    life_event_id: Optional[int] = None,
    user_id: Optional[int] = None,
    sort_by: str = "urgency",
    db: Session = Depends(get_db),
):
    """
    Return tasks grouped by deadline proximity.
    sort_by can be: urgency, due_date, priority

    Query params:
      life_event_id — filter to a single life event
      user_id       — used to resolve user's timezone.
      sort_by       — "urgency", "due_date", or "priority".
    """
    # Resolve the user's preferred timezone --------------------------------
    user_tz = "UTC"
    if user_id is not None:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user_tz = user.timezone

    # Fetch active tasks ---------------------------------------------------
    query = db.query(Task).filter(Task.status != TaskStatus.completed)
    if life_event_id is not None:
        query = query.filter(Task.life_event_id == life_event_id)
    tasks = query.all()

    # Score and categorize in user-local time ------------------------------
    buckets: dict[str, list[TaskResponse]] = {cat: [] for cat in CATEGORY_ORDER}
    for task in tasks:
        if task.due_date is not None:
            delta = days_until_due(task.due_date, user_tz)
        else:
            delta = None
        score = _compute_urgency_score(task, delta)
        category = _categorize(delta)
        buckets[category].append(_task_to_response(task, score))

    # Sort each bucket
    for cat in CATEGORY_ORDER:
        if sort_by == "due_date":
            # For Due Date, sort by nearest to furthest (None goes last)
            buckets[cat].sort(key=lambda t: (t.due_date is None, t.due_date))
        elif sort_by == "priority":
            buckets[cat].sort(key=lambda t: t.priority, reverse=True)
        else: # "urgency"
            buckets[cat].sort(key=lambda t: t.urgency_score or 0, reverse=True)

    groups = [TaskGroup(category=cat, tasks=buckets[cat]) for cat in CATEGORY_ORDER]
    return GroupedTasksResponse(groups=groups, total=len(tasks))


@router.get("/", response_model=List[TaskResponse])
def get_tasks(life_event_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List all tasks flat. Optionally filter by life_event_id."""
    query = db.query(Task)
    if life_event_id is not None:
        query = query.filter(Task.life_event_id == life_event_id)
    return query.all()


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(task_id: int, update: TaskStatusUpdate, db: Session = Depends(get_db)):
    """Update only the status of a task. Auto-sets completed_at when status → completed."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = update.status
    if update.status == TaskStatus.completed:
        task.completed_at = datetime.now(timezone.utc)
    elif task.completed_at is not None:
        # Status moved away from completed — clear the timestamp
        task.completed_at = None

    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, update: TaskUpdate, db: Session = Depends(get_db)):
    """Update fields of a task: priority, due_date, reminder_opt_out."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if update.priority is not None:
        task.priority = update.priority
    if update.due_date is not None:
        # Pydantic validates it's a valid datetime
        task.due_date = update.due_date
    elif "due_date" in update.model_dump(exclude_unset=True):
        # if the client explicitly sent null to clear the date
        task.due_date = None

    if update.reminder_opt_out is not None:
        task.reminder_opt_out = update.reminder_opt_out

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task and all its subtasks (cascade handled by SQLAlchemy)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

