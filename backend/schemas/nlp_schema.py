"""
Schemas for Layer 3.1 — Life Event Classification (NLP).

These models are pure data contracts; they never touch the database.
"""

import enum
from typing import Optional, Any

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
    REPATRIATION = "REPATRIATION"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    VISA_APPLICATION = "VISA_APPLICATION"
    EDUCATIONAL_ENROLLMENT = "EDUCATIONAL_ENROLLMENT"
    NRI_RETURN_TO_INDIA = "NRI_RETURN_TO_INDIA"

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
    ACADEMIC_PLANNING = "ACADEMIC_PLANNING"
    EVENT_PLANNING = "EVENT_PLANNING"

    # Tier 4: Universal Domains (For generic Fallback & Broad Categorization)
    HOUSING_AND_LOCATION = "HOUSING_AND_LOCATION"
    WORK_AND_CAREER = "WORK_AND_CAREER"
    EDUCATION_AND_LEARNING = "EDUCATION_AND_LEARNING"
    HEALTH_AND_DISABILITY = "HEALTH_AND_DISABILITY"
    FAMILY_AND_RELATIONSHIPS = "FAMILY_AND_RELATIONSHIPS"
    MONEY_AND_ASSETS = "MONEY_AND_ASSETS"
    LEGAL_AND_IDENTITY = "LEGAL_AND_IDENTITY"
    PARENTING_AND_CAREGIVING = "PARENTING_AND_CAREGIVING"
    LOSS_AND_CRISIS = "LOSS_AND_CRISIS"
    PERSONAL_GROWTH = "PERSONAL_GROWTH"

    # New High-Impact Categories
    HOME_PURCHASE_PROCESS = "HOME_PURCHASE_PROCESS"
    STUDY_ABROAD = "STUDY_ABROAD"
    GRADUATE_STUDIES = "GRADUATE_STUDIES"
    PET_ADOPTION = "PET_ADOPTION"
    VOLUNTEER_WORK = "VOLUNTEER_WORK"
    ESTATE_PLANNING = "ESTATE_PLANNING"
    PARENTAL_LEAVE = "PARENTAL_LEAVE"
    GRIEF_SUPPORT = "GRIEF_SUPPORT"
    TRAVEL_RELOCATION = "TRAVEL_RELOCATION"
    FREELANCE_SETUP = "FREELANCE_SETUP"

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
        examples=["I'm planning to buy a second-hand car next month in London."],
    )
    skip_clarification: bool = Field(
        False,
        description="If true, bypasses further clarification questions."
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
    display_title: str = Field(
        ...,
        description="A short, descriptive, human-friendly title for this event (e.g. 'Relocating to London' or 'Buying a used Toyota').",
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
    enriched_narrative: str = Field(
        ...,
        description="A complete, professional, and descriptive sentence or paragraph that synthesizes the user's input and any answers to clarifications into a well-formed life situation overview. This will be stored as the formal description of the journey.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model's self-assessed confidence in the classification (0–1).",
    )
    is_highly_detailed: bool = Field(
        False,
        description="TRUE only if the prompt contains industry, stage, timeline, and specific goals."
    )
    missing_strategic_details: list[str] = Field(
        default_factory=list,
        description="Specific pieces of information required for a high-quality roadmap."
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
    data: Any

    @classmethod
    def from_classification(
        cls, classification: LifeEventClassification | dict
    ) -> "LifeEventAnalyzeResponse":
        """Build the response envelope, flagging low-confidence results or returning clarification questions."""
        # Handle dictionary case (Clarification or emergency fallback)
        if isinstance(classification, dict):
            is_clarification = classification.get("clarification_needed", False)
            return cls(
                success=True, 
                message="Low confidence clarification needed" if is_clarification else "Analysis found (fallback mode)", 
                data=classification
            )
             
        # Handle Pydantic model case
        if classification.confidence < _LOW_CONFIDENCE_THRESHOLD:
            message = "Low confidence classification — user may clarify details."
        else:
            message = "Life event classified based on your description."

        return cls(success=True, message=message, data=classification)
