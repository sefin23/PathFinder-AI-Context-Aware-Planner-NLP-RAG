"""
Layer 3.1 — NLP routes.

Provides POST /life-events/analyze for life-event classification.
Mounted under the existing /life-events prefix in main.py.

Rules enforced here:
- No database interaction.
- No task creation.
- Returns JSON only.
"""

import logging

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from backend.schemas.nlp_schema import (
    LifeEventAnalyzeRequest,
    LifeEventAnalyzeResponse,
)
from backend.services.nlp_service import classify_life_event
from backend.database import get_db

from backend.routes.auth_routes import get_current_user
from backend.models.user_model import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/analyze",
    response_model=LifeEventAnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Classify a life event from free-form text",
    description=(
        "Accepts a natural-language description of a life situation and "
        "returns structured classification data (event types, location, "
        "timeline, and confidence). No data is saved to the database."
    ),
)
def analyze_life_event(
    body: LifeEventAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LifeEventAnalyzeResponse:
    """
    POST /life-events/analyze

    - Calls Gemini for structured life-event classification.
    - Returns JSON only; nothing is persisted.
    - Proactively identifies relevant documents from the user's vault.
    - Confidence < 0.6 is flagged in the response message.
    """
    try:
        # Fetch vault document names for proactive awareness
        vault_inventory = [doc.name for doc in current_user.vault_documents]
        
        classification = classify_life_event(
            db, 
            body.text, 
            skip_clarification=body.skip_clarification,
            vault_inventory=vault_inventory
        )
    except RuntimeError as exc:
        logger.error("NLP service error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        logger.error("LLM response validation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned an unexpected response: {exc}",
        ) from exc

    return LifeEventAnalyzeResponse.from_classification(classification)
