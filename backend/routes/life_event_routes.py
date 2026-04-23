import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.schemas.life_event_schema import LifeEventCreate, LifeEventUpdate, LifeEventResponse, LifeEventWithTasksResponse
from backend.schemas.task_schema import TaskResponse
from backend.models.life_event_model import LifeEvent
from backend.models.user_model import User
from backend.database import SessionLocal

log = logging.getLogger(__name__)

router = APIRouter()


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=LifeEventResponse)
def create_life_event(life_event: LifeEventCreate, db: Session = Depends(get_db)):
    """Create a new life event for a user."""
    # Verify the user exists
    user = db.query(User).filter(User.id == life_event.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_life_event = LifeEvent(
        title=life_event.title,
        display_title=life_event.display_title,
        description=life_event.description,
        location=life_event.location,
        timeline=life_event.timeline,
        metadata_json=life_event.metadata_json,
        user_id=life_event.user_id,
        start_date=life_event.start_date
    )
    db.add(db_life_event)
    db.commit()
    db.refresh(db_life_event)
    return db_life_event


@router.get("/", response_model=List[LifeEventResponse])
def get_life_events(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List all life events. Optionally filter by user_id."""
    from backend.utils.visual_mapping import get_event_visuals
    
    query = db.query(LifeEvent)
    if user_id is not None:
        query = query.filter(LifeEvent.user_id == user_id)
    
    results = query.all()
    # Populate visuals for each event
    for res in results:
        res.visuals = get_event_visuals(res.title, res.display_title)
    
    return results


@router.get("/{life_event_id}", response_model=LifeEventWithTasksResponse)
def get_life_event(life_event_id: int, db: Session = Depends(get_db)):
    """Get a specific life event with all its tasks, including computed urgency scores."""
    from backend.routes.task_routes import _compute_urgency_score
    from backend.utils.timezone_utils import days_until_due
    from backend.utils.visual_mapping import get_event_visuals
    import json

    life_event = db.query(LifeEvent).filter(LifeEvent.id == life_event_id).first()
    if not life_event:
        raise HTTPException(status_code=404, detail="Life event not found")
    
    # Resolve user timezone
    user_tz = "UTC"
    if life_event.user:
        user_tz = life_event.user.timezone

    # Inject urgency scores and required docs status
    from backend.models.task_guide_model import TaskGuide

    # Pre-cache user's vault doc types for efficiency
    vault_doc_types = {d.doc_type for d in life_event.user.vault_documents if not d.deleted_at}

    top_level_tasks = [t for t in life_event.tasks if t.parent_id is None]

    # Batch-load all guides needed by this event's tasks — avoids N+1 queries
    task_types_needed = {t.task_type for t in top_level_tasks if t.task_type}
    guides_by_type: dict = {}
    if task_types_needed:
        guides = db.query(TaskGuide).filter(TaskGuide.task_type.in_(task_types_needed)).all()
        guides_by_type = {g.task_type: g for g in guides}

    formatted_tasks = []
    for task in top_level_tasks:
        delta = days_until_due(task.due_date, user_tz) if task.due_date else None
        task.urgency_score = _compute_urgency_score(task, delta)

        # Doc Enrichment
        task.required_docs = []
        if task.task_type:
            guide = guides_by_type.get(task.task_type)
            if guide and guide.required_doc_types:
                try:
                    doc_types = json.loads(guide.required_doc_types)
                    for dt in doc_types:
                        task.required_docs.append({
                            "name": dt.replace('_', ' ').title(),
                            "has": dt in vault_doc_types
                        })
                except Exception:
                    log.warning("Corrupt required_doc_types JSON for task_type=%s", task.task_type)

        # Also handle subtasks (optional but good for consistency)
        for sub in task.subtasks:
            s_delta = days_until_due(sub.due_date, user_tz) if sub.due_date else None
            sub.urgency_score = _compute_urgency_score(sub, s_delta)
            sub.required_docs = [] # Simple for now
        
        # Convert to Pydantic after all scores are set
        task_data = TaskResponse.model_validate(task)
        formatted_tasks.append(task_data)

    # Return a dict that matches LifeEventWithTasksResponse
    response_data = LifeEventResponse.model_validate(life_event).model_dump()
    response_data["tasks"] = formatted_tasks
    # Populate visuals for the detailed view too
    response_data["visuals"] = get_event_visuals(life_event.title, life_event.display_title)
    
    return response_data


@router.patch("/{life_event_id}", response_model=LifeEventResponse)
def update_life_event(life_event_id: int, updates: LifeEventUpdate, db: Session = Depends(get_db)):
    """Update life event details (title, description, status)."""
    db_life_event = db.query(LifeEvent).filter(LifeEvent.id == life_event_id).first()
    if not db_life_event:
        raise HTTPException(status_code=404, detail="Life event not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    old_start_date = db_life_event.start_date
    
    for key, value in update_data.items():
        setattr(db_life_event, key, value)
    
    # If start_date changed, shift all associated task due_dates by the same delta
    if "start_date" in update_data and update_data["start_date"] and old_start_date:
        # Calculate delta
        delta = update_data["start_date"].replace(tzinfo=None) - old_start_date.replace(tzinfo=None)
        if delta.total_seconds() != 0:
            from backend.models.task_model import Task
            tasks = db.query(Task).filter(Task.life_event_id == life_event_id).all()
            for t in tasks:
                if t.due_date:
                    t.due_date = t.due_date + delta
    elif "start_date" in update_data and update_data["start_date"] and not old_start_date:
        # If setting start_date for the first time, we don't have a delta.
        # This case is less common but could happen.
        pass

    db.commit()
    db.refresh(db_life_event)
    return db_life_event


@router.delete("/{life_event_id}", status_code=204)
def delete_life_event(life_event_id: int, db: Session = Depends(get_db)):
    """Delete a life event and its associated tasks."""
    life_event = db.query(LifeEvent).filter(LifeEvent.id == life_event_id).first()
    if not life_event:
        raise HTTPException(status_code=404, detail="Life event not found")
    
    db.delete(life_event)
    db.commit()
    return None
