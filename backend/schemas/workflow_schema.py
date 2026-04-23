"""
Pydantic schemas for Layer 3.3 — Workflow Proposal.

Pure data contracts; no database access here.

Output is strictly validated before being returned to the caller.
The LLM is constrained to produce ONLY data derivable from retrieved
knowledge-base entries — no invented documents or deadlines.
"""

from typing import Optional

from pydantic import BaseModel, Field

from backend.schemas.nlp_schema import LifeEventType


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class WorkflowProposalRequest(BaseModel):
    """
    Request body for POST /life-events/propose-workflow.

    The service will run RAG retrieval for each life_event_type and build
    a grounded task workflow from the retrieved knowledge entries only.
    """

    life_event_types: list[LifeEventType] = Field(
        ...,
        min_length=1,
        description="One or more life-event categories to generate a workflow for.",
        examples=[["VEHICLE_PURCHASE"]],
    )
    location: Optional[str] = Field(
        None,
        max_length=200,
        description="User's location — used to personalise retrieval (e.g. 'Mumbai, India').",
    )
    timeline: Optional[str] = Field(
        None,
        max_length=200,
        description=(
            "Free-form timeline hint (e.g. 'within 30 days', 'by end of month'). "
            "Used to derive relative due-date offsets. If omitted, logical ordering is used."
        ),
    )
    top_k: int = Field(
        5,
        ge=1,
        le=15,
        description="Number of knowledge-base entries to retrieve per life-event type.",
    )
    start_date: Optional[str] = Field(
        None,
        description="Optional start date (ISO) to calculate real dates for tasks."
    )
    original_description: Optional[str] = Field(
        None,
        max_length=2000,
        description=(
            "The user's original free-text description of their goal or life event. "
            "Used to generate an AI-powered roadmap when no KB entries exist for the detected event type."
        ),
    )


# ---------------------------------------------------------------------------
# Proposed subtask
# ---------------------------------------------------------------------------

class ProposedSubtask(BaseModel):
    """A granular step nested inside a proposed task."""

    title: str = Field(..., description="Short, action-oriented subtask title.")
    priority: int = Field(
        ...,
        ge=1,
        le=5,
        description="Priority 1 (highest) to 5 (lowest).",
    )
    suggested_due_offset_days: int = Field(
        ...,
        ge=0,
        description="Days from the start of the life event when this subtask should be done.",
    )
    task_type: Optional[str] = Field(
        None,
        description="Guide key if this subtask maps to a known step-by-step guide.",
    )


# ---------------------------------------------------------------------------
# Proposed task
# ---------------------------------------------------------------------------

class ProposedTask(BaseModel):
    """A top-level task in the proposed workflow."""

    title: str = Field(..., description="Short, action-oriented task title.")
    description: str = Field(
        ...,
        description="Concise description of what must be done and why, citing the requirement source.",
    )
    priority: int = Field(
        ...,
        ge=1,
        le=5,
        description="Priority 1 (highest) to 5 (lowest).",
    )
    suggested_due_offset_days: int = Field(
        ...,
        ge=0,
        description="Days from the start of the life event when this task should be completed.",
    )
    phase_category: Optional[str] = Field(
        None,
        description="Fixed category tag for emoji/icon lookup (e.g. 'finance', 'legal', 'startup').",
    )
    task_type: Optional[str] = Field(
        None,
        description="Guide key if this task maps to a known step-by-step guide.",
    )
    subtasks: list[ProposedSubtask] = Field(
        default_factory=list,
        description="Optional ordered sub-steps for this task.",
    )


# ---------------------------------------------------------------------------
# HTTP response envelope
# ---------------------------------------------------------------------------

class WorkflowProposalResponse(BaseModel):
    """HTTP response for POST /life-events/propose-workflow."""

    success: bool
    life_event_types: list[LifeEventType]
    location: Optional[str]
    timeline: Optional[str]

    # Populated on success
    tasks: list[ProposedTask] = Field(default_factory=list)
    explanation: Optional[str] = Field(
        None,
        description="The AI-generated document requirements and essentials for this event."
    )
    retrieved_chunk_ids: list[int] = Field(
        default_factory=list,
        description="IDs of the knowledge-base chunks used to generate this workflow.",
    )

    # Populated when the LLM signals insufficient knowledge
    error: Optional[str] = Field(
        None,
        description=(
            "Set to a human-readable message if the LLM could not generate a "
            "reliable workflow from the retrieved knowledge. "
            "tasks will be empty in this case."
        ),
    )
