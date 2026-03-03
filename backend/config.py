"""
Application configuration — loaded from environment variables.

Usage:
    from backend.config import settings
    settings.smtp_host

Never hard-code credentials. Create a .env file locally and load it
with `python-dotenv` (or set vars in your deployment environment).

Required env vars for email:
    SMTP_HOST        e.g. smtp.gmail.com
    SMTP_PORT        e.g. 587
    SMTP_USER        sender address / login
    SMTP_PASSWORD    app password or API key
    EMAIL_FROM       "Pathfinder AI <no-reply@example.com>"

Required env vars for NLP (Layer 3):
    GEMINI_API_KEY      Google AI Studio API key — used for embeddings (aistudio.google.com)
    OPENROUTER_API_KEY  OpenRouter API key — used for LLM explanation (openrouter.ai/keys)

Optional:
    SMTP_TLS         "true" (default) — use STARTTLS
    EMAIL_MAX_RETRIES   "3" (default)
    EMAIL_RETRY_DELAY   "5" (default, seconds between retries)
    APP_ENV          "development" | "production"
"""
import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

# Load .env file before the Settings dataclass reads os.environ.
# override=True ensures .env always wins over stale OS environment variables.
load_dotenv(override=True)


def _env(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


def _env_int(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, str(default)))
    except ValueError:
        return default


def _env_bool(key: str, default: bool = True) -> bool:
    val = os.environ.get(key, str(default)).lower()
    return val in ("1", "true", "yes")


@dataclass(frozen=True)
class Settings:
    # SMTP
    smtp_host: str = field(default_factory=lambda: _env("SMTP_HOST", "smtp.gmail.com"))
    smtp_port: int = field(default_factory=lambda: _env_int("SMTP_PORT", 587))
    smtp_user: str = field(default_factory=lambda: _env("SMTP_USER"))
    smtp_password: str = field(default_factory=lambda: _env("SMTP_PASSWORD"))
    smtp_tls: bool = field(default_factory=lambda: _env_bool("SMTP_TLS", True))

    # Sender identity shown in From: header
    email_from: str = field(
        default_factory=lambda: _env("EMAIL_FROM", "Pathfinder AI <no-reply@pathfinder.ai>")
    )

    # Retry settings
    email_max_retries: int = field(default_factory=lambda: _env_int("EMAIL_MAX_RETRIES", 3))
    email_retry_delay: int = field(default_factory=lambda: _env_int("EMAIL_RETRY_DELAY", 5))

    # NLP / AI
    gemini_api_key: str = field(default_factory=lambda: _env("GEMINI_API_KEY"))
    openrouter_api_key: str = field(default_factory=lambda: _env("OPENROUTER_API_KEY"))

    # Runtime environment
    app_env: str = field(default_factory=lambda: _env("APP_ENV", "development"))

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def email_configured(self) -> bool:
        """True when all required SMTP credentials are present."""
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)


# Module-level singleton — imported everywhere
settings = Settings()
