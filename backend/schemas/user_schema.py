from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    name: str
    email: str
    # IANA timezone string — defaults to UTC if not provided
    timezone: str = "UTC"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    timezone: str
    extracted_profile: Optional[str] = None
    job_city: Optional[str] = None
    state_code: Optional[str] = None
    notif_smart_alerts: bool = True
    notif_progress_checkins: bool = False
    notif_phase_completions: bool = True
    notif_journey_completed: bool = True
    notif_weekly_summary: bool = False
    ai_clarification: bool = True
    ai_confidence: bool = False
    ai_badges: bool = True

    class Config:
        from_attributes = True


# ── Auth schemas ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserAuthResponse(BaseModel):
    id: int
    name: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    user: UserAuthResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
