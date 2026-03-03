"""
Layer 3.1 — Life Event Classification Service.

Calls Google Gemini with constrained (structured) JSON output.
Never writes to the database. Never creates tasks.
"""

import json
import logging
from typing import Any

from google import genai
from google.genai import types

from backend.config import settings
from backend.schemas.nlp_schema import LifeEventClassification, LifeEventType

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini model config
# ---------------------------------------------------------------------------

_MODEL = "gemini-2.0-flash"

_SYSTEM_PROMPT = """\
You are a life-event classification engine for Pathfinder AI, an Indian life-planning assistant.

Your ONLY job is to analyse the user's text and return a valid JSON object.

Rules:
- Choose one or more life_event_types from the allowed enum values.
- Extract location if mentioned (city, state, or country). Return null if absent.
- Extract timeline if mentioned (e.g. "next month", "Q3 2026"). Return null if absent.
- Set confidence between 0.0 and 1.0 reflecting how certain you are.
- Do NOT make up information not present in the text.
- Return ONLY the JSON object — no markdown, no explanation.

Allowed life_event_types:
VEHICLE_PURCHASE, RENTAL_VERIFICATION, ELDERCARE_MANAGEMENT, EDUCATION_FINANCING,
CAREER_TRANSITION, POSTPARTUM_WELLNESS, WORKPLACE_WELLNESS, PREGNANCY_PREPARATION,
CHILD_SCHOOL_TRANSITION, WOMEN_DIVORCE_RECOVERY, JOB_ONBOARDING, RELOCATION,
MARRIAGE_PLANNING, HOME_PURCHASE, BUSINESS_STARTUP, WOMEN_ENTREPRENEURSHIP,
NRI_RETURN_TO_INDIA, MEDICAL_EMERGENCY, VISA_APPLICATION, EDUCATIONAL_ENROLLMENT,
WELLNESS_MANAGEMENT, PROPERTY_INHERITANCE, HEALTH_INSURANCE, DEBT_MANAGEMENT,
CAREER_UPSKILLING, RETIREMENT_PLANNING, FAMILY_RELOCATION, INTERNATIONAL_TRAVEL,
ADOPTION_PROCESS, OTHER
"""

# JSON schema passed as response_schema so Gemini enforces structure
_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "life_event_types": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": [e.value for e in LifeEventType],
            },
            "minItems": 1,
            "description": "One or more life-event labels.",
        },
        "location": {
            "type": ["string", "null"],
            "description": "City, state, or country from the text, or null.",
        },
        "timeline": {
            "type": ["string", "null"],
            "description": "Time-frame extracted from the text, or null.",
        },
        "confidence": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0,
            "description": "Self-assessed confidence score (0–1).",
        },
    },
    "required": ["life_event_types", "location", "timeline", "confidence"],
    "additionalProperties": False,
}


def _build_client() -> genai.Client:
    """Initialise the Gemini client from the configured API key."""
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. "
            "Add it to your .env file and restart the server."
        )
    return genai.Client(api_key=settings.gemini_api_key)


def classify_life_event(text: str) -> LifeEventClassification:
    """
    Send *text* to Gemini and return a validated LifeEventClassification.

    Args:
        text: Free-form user description of their life situation.

    Returns:
        A fully validated :class:`LifeEventClassification` instance.

    Raises:
        ValueError: If the LLM response cannot be parsed or validated.
        RuntimeError: If the API key is missing or the LLM call fails.
    """
    client = _build_client()

    logger.info("Sending life-event classification request to Gemini.")

    try:
        response = client.models.generate_content(
            model=_MODEL,
            contents=text,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=_RESPONSE_SCHEMA,
                temperature=0.2,    # low temperature → deterministic, structured output
                max_output_tokens=512,
            ),
        )
    except Exception as exc:
        logger.exception("Gemini API call failed.")
        raise RuntimeError(f"LLM call failed: {exc}") from exc

    raw_text = response.text
    logger.debug("Gemini raw response: %s", raw_text)

    # Parse and validate through Pydantic
    try:
        payload = json.loads(raw_text)
        classification = LifeEventClassification.model_validate(payload)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse/validate LLM response: %s", raw_text)
        raise ValueError(
            f"LLM returned an invalid JSON structure: {exc}"
        ) from exc

    return classification
