"""
Minimal OpenRouter client wrapper used for LLM explanations when an
OPENROUTER_API_KEY is configured. Keeps usage synchronous and tiny —
we only need a single helper to POST a chat completion and return text.

This module purposely avoids heavy dependencies and uses `requests`.

── MODEL STRATEGY (March 2026) ──────────────────────────────────────
All models verified alive via OpenRouter /api/v1/models endpoint or
confirmed by 429 responses in production logs (429 = model exists,
just rate-limited — better than 404).

REMOVED as confirmed dead/404:
  google/gemini-2.0-flash-exp:free, google/gemini-2.0-flash-lite:free,
  meta-llama/llama-4-scout:free, meta-llama/llama-3.1-405b-instruct:free,
  qwen/qwen-2.5-72b-instruct:free, mistralai/pixtral-12b:free,
  nvidia/nemotron-4-340b-instruct:free, deepseek/deepseek-chat:free,
  qwen/qwen3-next-80b-a3b-instruct:free (replaced by official qwen-3.6-plus),
  openai/gpt-oss-120b:free (never appeared in logs),
  nousresearch/hermes-3-llama-3.1-405b:free (never appeared in logs)

── PERSISTENT CACHE ────────────────────────────────────────────────
Responses are cached to disk (backend/data/ai_cache.json, TTL 48h).
This survives server restarts — critical for demo reliability.
After the first successful run of each event type, all subsequent
loads (including after restart) are instant with no API calls.
"""
from __future__ import annotations

from typing import Optional
import hashlib
import json
import logging
import os
import random
import time

import requests

from backend.config import settings

logger = logging.getLogger(__name__)

# ── Persistent file-based response cache ─────────────────────────────────────
# Stored at backend/data/ai_cache.json.
# Survives server restarts — crucial for demo/review reliability.
_CACHE_FILE = os.path.join(
    os.path.dirname(__file__), "..", "data", "ai_cache.json"
)
_CACHE_TTL = 172800  # 48 hours
_CACHE: dict = {}


def _load_cache() -> None:
    """Load persisted cache from disk on startup."""
    global _CACHE
    try:
        if os.path.exists(_CACHE_FILE):
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                raw = json.load(f)
            # Prune expired entries on load
            now = time.time()
            _CACHE = {k: v for k, v in raw.items() if (now - v["ts"]) < _CACHE_TTL}
            logger.info("AI cache loaded: %d entries from disk.", len(_CACHE))
    except Exception as exc:
        logger.warning("Could not load AI cache: %s — starting fresh.", exc)
        _CACHE = {}


def _save_cache() -> None:
    """Persist cache to disk (best-effort)."""
    try:
        os.makedirs(os.path.dirname(_CACHE_FILE), exist_ok=True)
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_CACHE, f, ensure_ascii=False)
    except Exception as exc:
        logger.warning("Could not save AI cache: %s", exc)


def _cache_key(system_instruction: str, user_message: str) -> str:
    raw = f"{system_instruction}|{user_message}"
    return hashlib.md5(raw.encode("utf-8", errors="replace")).hexdigest()


def _get_cached(key: str) -> Optional[str]:
    entry = _CACHE.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["text"]
    return None


def _set_cached(key: str, text: str) -> None:
    if len(_CACHE) > 300:
        # Evict 50 oldest entries to keep file size bounded
        oldest = sorted(_CACHE.items(), key=lambda x: x[1]["ts"])[:50]
        for k, _ in oldest:
            del _CACHE[k]
    _CACHE[key] = {"text": text, "ts": time.time()}
    _save_cache()


# Load cache on module import
_load_cache()


# ── VERIFIED FREE MODELS (March 2026) ────────────────────────────────────────
# Sources: OpenRouter /api/v1/models endpoint + 429 responses in prod logs.
# 429 = model exists and is just rate-limited. 404 = dead, removed.

# Tier 1: Confirmed stable / Flagship Free — likely lower public traffic
_TIER_1_CONFIRMED_API = [
    "qwen/qwen-3.6-plus:free",               # official release April 2 2026. Very stable.
    "arcee-ai/trinity-large-preview:free",   # confirmed in /api/v1/models
    "nvidia/nemotron-3-nano-30b-a3b:free",   # confirmed in /api/v1/models
]

# Tier 2: Confirmed alive by 429 in prod logs — solid quality
_TIER_2_CONFIRMED_LOGS = [
    "mistralai/mistral-small-3.1-24b-instruct:free",  # 429 confirmed
    "google/gemma-3-27b-it:free",                      # 429 confirmed
    "openai/gpt-oss-20b:free",                         # 429 confirmed
]

# Tier 3: High-traffic / Just Released — alive but often rate-limited (429s expected)
_TIER_3_HIGH_TRAFFIC = [
    "google/gemma-4-31b-it:free",              # NEW: Released April 2, 2026. High demand/traffic.
    "google/gemma-4-26b-moe:free",             # NEW: Released April 2, 2026. High demand/traffic.
    "meta-llama/llama-3.3-70b-instruct:free",      # 429 confirmed
    "nvidia/nemotron-3-super-120b-a12b:free",       # 429 confirmed (Released April 6)
    "minimax/minimax-m2.5:free",                    # confirmed in /api/v1/models
    "stepfun/step-3.5-flash:free",                  # confirmed in /api/v1/models
    # NOTE: arcee-ai/trinity-large-thinking is now a PAID model (only preview was free).
]

# Tier 4: Auto-router fallback
_TIER_4_FALLBACK = [
    "openrouter/free",
]

# Small compact models — used for short requests (≤512 tokens) only
_COMPACT_MODELS = [
    "google/gemma-4-4b-it:free",            # NEW: Released April 2, 2026.
    "liquid/lfm-2.5-1.2b-instruct:free",    # confirmed in /api/v1/models
    "google/gemma-3-12b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
]

# ── NVIDIA NIM MODELS (Ultra-Stable Tier 0) ──────────────────────────────────
# Primarily used for demos to avoid OpenRouter rate limits.
_NVIDIA_MODELS = [
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "nvidia/nemotron-4-340b-instruct",
    "mistralai/mistral-large-2-instruct",
    "google/gemma-2-27b-it",
    "meta/llama-3.1-405b-instruct",  # moved to end — large model, often slow/overloaded on free tier
]

FREE_MODELS = (
    _TIER_1_CONFIRMED_API + _TIER_2_CONFIRMED_LOGS +
    _TIER_3_HIGH_TRAFFIC + _TIER_4_FALLBACK
)


def _build_model_list(max_tokens: int) -> list[str]:
    models: list[str] = []
    if max_tokens <= 512:
        compact = _COMPACT_MODELS.copy()
        random.shuffle(compact)
        models.extend(compact)

    t1 = _TIER_1_CONFIRMED_API.copy()
    random.shuffle(t1)
    models.extend(t1)

    t2 = _TIER_2_CONFIRMED_LOGS.copy()
    random.shuffle(t2)
    models.extend(t2)

    t3 = _TIER_3_HIGH_TRAFFIC.copy()
    random.shuffle(t3)
    models.extend(t3)

    models.extend(_TIER_4_FALLBACK)
    return models


class OpenRouterError(RuntimeError):
    pass


def generate_completion(
    model: Optional[str] = None,
    system_instruction: str = "",
    user_message: str = "",
    max_tokens: int = 1024,
    temperature: float = 0.1,
) -> str:
    api_key = settings.openrouter_api_key
    gemini_key = settings.gemini_api_key

    # ── Cache check — instant return on repeated/duplicate requests ────────
    # Covers: page refreshes, frontend double-fetches, server restarts.
    ck = _cache_key(system_instruction, user_message)
    cached = _get_cached(ck)
    if cached:
        logger.info("AI CACHE HIT — returning persisted response (no API call)")
        return cached

    # ── TIER 0a: Groq (Fastest — LPU hardware, dedicated quota) ───────────
    # Free tier: 14,400 req/day, 30 req/min. ~200+ tokens/sec on LPU.
    # llama-3.3-70b-versatile: same quality as OpenRouter 70B models, far faster.
    if settings.groq_api_key:
        groq_url = "https://api.groq.com/openai/v1/chat/completions"
        groq_headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        }
        groq_models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
        for g_model in groq_models:
            try:
                logger.info("Groq attempt: %s", g_model)
                g_payload = {
                    "model": g_model,
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_message},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
                g_resp = requests.post(
                    groq_url,
                    headers=groq_headers,
                    data=json.dumps(g_payload),
                    timeout=30,
                )
                if g_resp.status_code == 200:
                    g_data = g_resp.json()
                    g_text = g_data["choices"][0]["message"]["content"]
                    if g_text and g_text.strip():
                        logger.info("Groq SUCCESS: %s", g_model)
                        result = g_text.strip()
                        _set_cached(ck, result)
                        return result
                elif g_resp.status_code == 429:
                    logger.warning("Groq %s rate limited (429) — next model.", g_model)
                else:
                    logger.warning("Groq %s failed (%s)", g_model, g_resp.status_code)
            except requests.exceptions.Timeout:
                logger.warning("Groq %s timed out — next model.", g_model)
            except Exception as exc:
                logger.warning("Groq %s error: %s", g_model, str(exc)[:80])
                continue

    # ── TIER 0b: NVIDIA NIM (Ultra-Stable Primary) ─────────────────────────
    if settings.nvidia_api_key:
        logger.info("Trying NVIDIA NIM Tier 0...")
        nvidia_url = "https://integrate.api.nvidia.com/v1/chat/completions"
        nvidia_headers = {
            "Authorization": f"Bearer {settings.nvidia_api_key}",
            "Content-Type": "application/json",
        }
        for n_model in _NVIDIA_MODELS[:3]:
            try:
                logger.info("NVIDIA attempt: %s", n_model)
                n_payload = {
                    "model": n_model,
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_message},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
                n_resp = requests.post(
                    nvidia_url,
                    headers=nvidia_headers,
                    data=json.dumps(n_payload),
                    timeout=10
                )
                if n_resp.status_code == 200:
                    n_data = n_resp.json()
                    n_text = n_data["choices"][0]["message"]["content"]
                    if n_text and n_text.strip():
                        logger.info("NVIDIA SUCCESS: %s", n_model)
                        result = n_text.strip()
                        _set_cached(ck, result)
                        return result
                logger.warning("NVIDIA %s failed (%s)", n_model, n_resp.status_code)
            except Exception as exc:
                logger.warning("NVIDIA %s error: %s", n_model, str(exc)[:80])
                continue

    # ── PRIMARY FALLBACK: OpenRouter free model waterfall ──────────────────
    if api_key:
        models_to_try = _build_model_list(max_tokens)

        # Honour explicit model override or settings default
        primary_model = model or settings.openrouter_model
        if primary_model and ":free" not in primary_model and "/" in primary_model:
            primary_model = f"{primary_model}:free"
        if primary_model and primary_model in FREE_MODELS and primary_model in models_to_try:
            models_to_try.remove(primary_model)
            models_to_try.insert(0, primary_model)

        # Cap at 8 attempts before handing off to Gemini
        models_to_try = models_to_try[:8]

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Title": "Pathfinder AI",
            "HTTP-Referer": "https://pathfinder-ai.io",
        }
        using_secondary = False

        for idx, current_model in enumerate(models_to_try):
            payload = {
                "model": current_model,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
                "include_reasoning": False,  # disable Qwen3/thinking-mode models from outputting <think> blocks
            }

            try:
                timeout_sec = 15 if max_tokens > 2000 else 10

                # Switch to secondary key after a few failures
                if not using_secondary and settings.openrouter_api_key_secondary and idx >= 3:
                    logger.info("Switching to SECONDARY OpenRouter key")
                    headers["Authorization"] = f"Bearer {settings.openrouter_api_key_secondary}"
                    using_secondary = True

                logger.info("OpenRouter attempt %d/%d: %s", idx + 1, len(models_to_try), current_model)
                resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=timeout_sec)

                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        choice = choices[0]
                        msg = choice.get("message") or {}
                        text = msg.get("content") or msg.get("text") or choice.get("text")
                        if text and text.strip():
                            logger.info("OpenRouter SUCCESS: %s", current_model)
                            result = text.strip()
                            _set_cached(ck, result)
                            return result
                    logger.warning("OpenRouter %s returned empty response", current_model)
                elif resp.status_code == 429:
                    logger.warning("OpenRouter %s rate limited (429) — next.", current_model)
                else:
                    logger.warning("OpenRouter %s failed (%s)", current_model, resp.status_code)

            except requests.exceptions.Timeout:
                logger.warning("OpenRouter %s timed out — next model.", current_model)
            except Exception as exc:
                logger.warning("OpenRouter %s error: %s — next model.", current_model, str(exc)[:80])

    # ── FALLBACK: Direct Gemini API — separate quota pool ─────────────────
    if gemini_key:
        logger.info("OpenRouter exhausted. Trying direct Gemini API...")
        # Prioritize Gemma 4 here if using direct key (likely higher RPM than OpenRouter free)
        gemini_models = ["gemini-2.0-flash", "gemma-4-31b-it", "gemini-2.0-flash-lite"]
        keys_to_try = [gemini_key]
        if settings.gemini_api_key_secondary:
            keys_to_try.append(settings.gemini_api_key_secondary)

        for key in keys_to_try:
            for gemini_model in gemini_models:
                try:
                    from google import genai
                    client = genai.Client(api_key=key)
                    response = client.models.generate_content(
                        model=gemini_model,
                        contents=user_message,
                        config={
                            "system_instruction": system_instruction,
                            "max_output_tokens": max_tokens,
                            "temperature": temperature,
                        },
                    )
                    if response.text and response.text.strip():
                        logger.info("Gemini fallback SUCCESS: %s", gemini_model)
                        result = response.text.strip()
                        _set_cached(ck, result)
                        return result
                except Exception as exc:
                    logger.warning("Gemini %s failed: %s", gemini_model, str(exc)[:80])
                    continue

    raise OpenRouterError("All models (OpenRouter and Gemini) failed.")
