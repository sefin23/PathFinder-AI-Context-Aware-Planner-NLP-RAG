import logging
import requests
import json
from backend.config import settings

logger = logging.getLogger(__name__)

class AnthropicError(Exception):
    """Raised when Anthropic API returns a non-200 status code."""
    pass

def generate_anthropic_completion(
    model: str = "claude-sonnet-4-6",
    system_instruction: str = "",
    user_message: str = "",
    max_tokens: int = 4096,
    temperature: float = 0.3,
    json_mode: bool = False,
) -> str:
    """
    Directly calls the Anthropic API for Claude models.
    """
    if not settings.anthropic_api_key:
        raise AnthropicError("ANTHROPIC_API_KEY is missing from configuration.")

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    messages = [{"role": "user", "content": user_message}]
    if json_mode:
        messages.append({"role": "assistant", "content": "{"})

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system_instruction,
        "messages": messages
    }

    try:
        logger.info(f"Calling Anthropic API with model: {model}")
        response = requests.post(url, headers=headers, json=payload, timeout=45)
        
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            logger.error(f"Anthropic API Error ({response.status_code}): {error_msg}")
            raise AnthropicError(f"Anthropic API Error: {error_msg}")

        data = response.json()
        result = data["content"][0]["text"]
        if json_mode:
            result = "{" + result
        return result

    except requests.exceptions.RequestException as e:
        logger.error(f"Network error calling Anthropic: {e}")
        raise AnthropicError(f"Network error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in Anthropic client: {e}")
        raise AnthropicError(f"Internal error: {e}")
