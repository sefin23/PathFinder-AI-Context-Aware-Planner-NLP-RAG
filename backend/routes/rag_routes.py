"""
Layer 3.2 — RAG retrieval route.

Provides POST /rag/retrieve — mounted at /rag in main.py.

Rules:
- No database writes.
- No task creation.
- Returns JSON only.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.schemas.rag_schema import RAGQueryRequest, RAGQueryResponse
from backend.services.rag_service import rag_query

logger = logging.getLogger(__name__)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post(
    "/retrieve",
    response_model=RAGQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve relevant life-event requirements (RAG)",
    description=(
        "Embeds the user's query, performs cosine-similarity search over the "
        "knowledge base, and returns the top-k matching requirement entries along "
        "with a grounded LLM explanation. No data is written to the database."
    ),
)
def retrieve_requirements(
    body: RAGQueryRequest,
    db: Session = Depends(get_db),
) -> RAGQueryResponse:
    """
    POST /rag/retrieve

    Full RAG pipeline:
      1. Embed the query (Gemini text-embedding-004).
      2. Cosine-similarity search over knowledge_base table.
      3. Gemini explains retrieved chunks — grounded only on retrieved content.
    """
    try:
        return rag_query(
            db=db,
            query=body.query,
            life_event_type=body.life_event_type,
            top_k=body.top_k,
        )
    except ValueError as exc:
        # Empty KB or filter returned no candidates
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        # Only reached if the embedding step itself fails (not explanation)
        logger.error("RAG embedding error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
