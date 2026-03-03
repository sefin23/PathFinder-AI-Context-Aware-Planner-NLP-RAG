"""
Pydantic schemas for Layer 3.4 — Workflow Approval & Task Creation.

Pure data contracts. No database access here.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Approved subtask (from proposal JSON)
# ---------------------------------------------------------------------------

class ApprovedSubtask(BaseModel):
    """A subtask the user chose to approve from the Layer 3.3 proposal."""

    title: str = Field(..., min_length=1, max_length=500)
    priority: int = Field(..., ge=1, le=5, description="Priority 1 (highest) to 5 (lowest).")
    due_offset_days: int = Field(
        ...,
        ge=0,
        description="Days from today (UTC) when this subtask should be done.",
    )


# ---------------------------------------------------------------------------
# Approved task (from proposal JSON)
# ---------------------------------------------------------------------------

class ApprovedTask(BaseModel):
    """A top-level task the user chose to approve from the Layer 3.3 proposal."""

    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    priority: int = Field(..., ge=1, le=5, description="Priority 1 (highest) to 5 (lowest).")
    due_offset_days: int = Field(
        ...,
        ge=0,
        description="Days from today (UTC) when this task should be completed.",
    )
    subtasks: list[ApprovedSubtask] = Field(
        default_factory=list,
        description="Optional nested subtasks to create under this task.",
    )


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class WorkflowApprovalRequest(BaseModel):
    """
    Request body for POST /life-events/approve-workflow.

    The caller submits the proposal output from Layer 3.3 (possibly edited),
    with the target life_event_id to attach the tasks to.
    """

    life_event_id: int = Field(
        ...,
        gt=0,
        description="ID of the existing LifeEvent record to attach tasks to.",
    )
    approved_tasks: list[ApprovedTask] = Field(
        ...,
        min_length=1,
        description="Tasks (and their subtasks) to persist. Must contain at least one task.",
    )


# ---------------------------------------------------------------------------
# Response item
# ---------------------------------------------------------------------------

class CreatedTaskItem(BaseModel):
    """Summary of one persisted Task record."""

    task_id: int
    title: str
    parent_task_id: Optional[int] = Field(
        None,
        description="Set for subtasks; null for top-level tasks.",
    )


# ---------------------------------------------------------------------------
# Response envelope
# ---------------------------------------------------------------------------

class WorkflowApprovalResponse(BaseModel):
    """HTTP response for POST /life-events/approve-workflow."""

    success: bool
    life_event_id: int
    created_tasks: list[CreatedTaskItem] = Field(
        default_factory=list,
        description=(
            "All tasks and subtasks that were created. "
            "Skipped duplicates are not included."
        ),
    )
    skipped_duplicates: list[str] = Field(
        default_factory=list,
        description=(
            "Titles of tasks that were skipped because a task with the same "
            "title already exists under this life_event_id."
        ),
    )
    message: str
