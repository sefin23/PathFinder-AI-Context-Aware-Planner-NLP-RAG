"""
Schemas for Layer 3.2 — Requirement Retrieval (RAG).

Pure data contracts; no database access here.
"""

from typing import Optional

from pydantic import BaseModel, Field

from backend.schemas.nlp_schema import LifeEventType


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class RAGQueryRequest(BaseModel):
    """
    Request body for POST /rag/retrieve.

    Either supply a free-form *query* (similarity search) or a
    specific *life_event_type* to filter entries for that category.
    Both can be combined: the type filter narrows the candidate pool
    before embedding similarity is computed.
    """

    query: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Natural-language question or context to retrieve requirements for.",
        examples=["What documents do I need to buy a used car?"],
    )
    life_event_type: Optional[LifeEventType] = Field(
        None,
        description=(
            "Optional filter — restrict retrieval to a single life-event category. "
            "If omitted, all categories are searched."
        ),
    )
    top_k: int = Field(
        3,
        ge=1,
        le=10,
        description="Number of top results to return (default 3, max 10).",
    )


# ---------------------------------------------------------------------------
# Individual retrieved chunk
# ---------------------------------------------------------------------------

class RetrievedChunk(BaseModel):
    """One retrieved knowledge-base entry with its similarity score."""

    id: int
    life_event_type: LifeEventType
    title: str
    content: str
    similarity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity between query embedding and this entry (0–1).",
    )


# ---------------------------------------------------------------------------
# LLM explanation (grounded on retrieved chunks only)
# ---------------------------------------------------------------------------

class RAGExplanation(BaseModel):
    """
    The LLM's explanation of the retrieved requirements.
    Grounded strictly on retrieved content — no hallucination beyond that.
    """

    explanation: str = Field(
        ...,
        description=(
            "Concise explanation of the retrieved requirements, "
            "written in the context of the user's query. "
            "Based solely on retrieved chunks."
        ),
    )
    source_ids: list[int] = Field(
        ...,
        description="IDs of the knowledge-base entries the explanation draws from.",
    )


# ---------------------------------------------------------------------------
# HTTP response envelope
# ---------------------------------------------------------------------------

class RAGQueryResponse(BaseModel):
    """HTTP response for POST /rag/retrieve."""

    success: bool
    query: str
    life_event_type_filter: Optional[LifeEventType]
    retrieved_chunks: list[RetrievedChunk]
    explanation: Optional[RAGExplanation] = None

    # Signals to the caller whether the LLM explanation step ran successfully.
    # Chunks are always returned when retrieval succeeds.
    explanation_available: bool = True
    explanation_error: Optional[str] = None
