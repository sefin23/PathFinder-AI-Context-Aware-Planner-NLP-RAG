"""
Schemas for Layer 3.1 — Life Event Classification (NLP).

These models are pure data contracts; they never touch the database.
"""

import enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enum — canonical life-event taxonomy
# ---------------------------------------------------------------------------

class LifeEventType(str, enum.Enum):
    """Canonical life-event labels the LLM may assign (multi-label)."""

    # Tier 1 (highest-demand)
    VEHICLE_PURCHASE = "VEHICLE_PURCHASE"
    RENTAL_VERIFICATION = "RENTAL_VERIFICATION"
    ELDERCARE_MANAGEMENT = "ELDERCARE_MANAGEMENT"
    EDUCATION_FINANCING = "EDUCATION_FINANCING"
    CAREER_TRANSITION = "CAREER_TRANSITION"
    POSTPARTUM_WELLNESS = "POSTPARTUM_WELLNESS"
    WORKPLACE_WELLNESS = "WORKPLACE_WELLNESS"
    PREGNANCY_PREPARATION = "PREGNANCY_PREPARATION"
    CHILD_SCHOOL_TRANSITION = "CHILD_SCHOOL_TRANSITION"
    WOMEN_DIVORCE_RECOVERY = "WOMEN_DIVORCE_RECOVERY"

    # Tier 2
    JOB_ONBOARDING = "JOB_ONBOARDING"
    RELOCATION = "RELOCATION"
    MARRIAGE_PLANNING = "MARRIAGE_PLANNING"
    HOME_PURCHASE = "HOME_PURCHASE"
    BUSINESS_STARTUP = "BUSINESS_STARTUP"
    WOMEN_ENTREPRENEURSHIP = "WOMEN_ENTREPRENEURSHIP"
    NRI_RETURN_TO_INDIA = "NRI_RETURN_TO_INDIA"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    VISA_APPLICATION = "VISA_APPLICATION"
    EDUCATIONAL_ENROLLMENT = "EDUCATIONAL_ENROLLMENT"

    # Tier 3
    WELLNESS_MANAGEMENT = "WELLNESS_MANAGEMENT"
    PROPERTY_INHERITANCE = "PROPERTY_INHERITANCE"
    HEALTH_INSURANCE = "HEALTH_INSURANCE"
    DEBT_MANAGEMENT = "DEBT_MANAGEMENT"
    CAREER_UPSKILLING = "CAREER_UPSKILLING"
    RETIREMENT_PLANNING = "RETIREMENT_PLANNING"
    FAMILY_RELOCATION = "FAMILY_RELOCATION"
    INTERNATIONAL_TRAVEL = "INTERNATIONAL_TRAVEL"
    ADOPTION_PROCESS = "ADOPTION_PROCESS"

    # Catch-all
    OTHER = "OTHER"


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class LifeEventAnalyzeRequest(BaseModel):
    """Request body for POST /life-events/analyze."""

    text: str = Field(
        ...,
        min_length=10,
        max_length=4000,
        description="Free-form user text describing their life situation.",
        examples=["I'm planning to buy a second-hand car next month in Bengaluru."],
    )


# ---------------------------------------------------------------------------
# LLM structured output — this is what Gemini must return as JSON
# ---------------------------------------------------------------------------

class LifeEventClassification(BaseModel):
    """
    Structured schema passed to the LLM as its required output format.
    The LLM must populate every field according to these constraints.
    """

    life_event_types: list[LifeEventType] = Field(
        ...,
        min_length=1,
        description="One or more life-event labels that apply to the user's text.",
    )
    location: Optional[str] = Field(
        None,
        description="City, state, or country mentioned or implied in the text.",
    )
    timeline: Optional[str] = Field(
        None,
        description=(
            "Time-frame extracted from the text, e.g. 'next month', "
            "'Q3 2026', 'within 6 months'."
        ),
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model's self-assessed confidence in the classification (0–1).",
    )

    @field_validator("life_event_types")
    @classmethod
    def no_duplicates(cls, v: list[LifeEventType]) -> list[LifeEventType]:
        if len(v) != len(set(v)):
            raise ValueError("life_event_types must not contain duplicate values.")
        return v


# ---------------------------------------------------------------------------
# HTTP response envelope
# ---------------------------------------------------------------------------

_LOW_CONFIDENCE_THRESHOLD = 0.6


class LifeEventAnalyzeResponse(BaseModel):
    """HTTP response returned by POST /life-events/analyze."""

    success: bool
    message: str
    data: LifeEventClassification

    @classmethod
    def from_classification(
        cls, classification: LifeEventClassification
    ) -> "LifeEventAnalyzeResponse":
        """Build the response envelope, flagging low-confidence results."""
        if classification.confidence < _LOW_CONFIDENCE_THRESHOLD:
            message = (
                f"Classification completed with low confidence "
                f"({classification.confidence:.0%}). "
                "Please provide more context for a better result."
            )
        else:
            message = "Life event classified successfully."

        return cls(success=True, message=message, data=classification)
