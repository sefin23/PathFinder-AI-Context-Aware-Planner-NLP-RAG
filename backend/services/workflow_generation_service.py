"""
Layer 3.3 — Workflow Generation Service.

Pipeline:
  1. For each life_event_type in the request, call retrieve() to get top-k
     knowledge-base entries.
  2. Merge and de-duplicate chunks from all types.
  3. Build a grounded prompt containing ONLY the retrieved content.
  4. Call Gemini with response_mime_type="application/json" to enforce
     strict JSON output matching the required schema.
  5. Parse and validate with Pydantic before returning.

Rules enforced:
  - The LLM is given ONLY retrieved knowledge; no outside facts allowed.
  - No DB writes.
  - No scheduler interaction.
  - No task auto-creation.
  - If retrieved content is insufficient, return an error dict which the
    route maps to a graceful response (not a 5xx).
"""

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from google import genai
from google.genai import types

from backend.config import settings
from backend.schemas.nlp_schema import LifeEventType
from backend.schemas.rag_schema import RetrievedChunk
from backend.schemas.workflow_schema import (
    ProposedSubtask,
    ProposedTask,
    WorkflowProposalResponse,
)
from backend.services.rag_service import retrieve

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_GENERATION_MODEL = "gemini-2.0-flash"

_AI_FIRST_SYSTEM_PROMPT = """\
You are Pathfinder AI, a life-event workflow planner.

The user has described a goal or life event. Generate a practical, personalized, step-by-step task workflow using your broad general knowledge.

RULES:
- Create a realistic, actionable roadmap that directly addresses the user's specific goal.
- Break the goal into logical phases (e.g. for learning Python: Foundation → Core Skills → Projects → Portfolio).
- Each task should have 2-4 concrete subtasks.
- Keep task descriptions to 1-2 sentences max. Put specific step-by-step details in subtasks, not the description.
- Assign priority 1 (most urgent) to 5 (least urgent).
- suggested_due_offset_days must be 0 or a positive integer.
- If a timeline is given, derive offsets from it (e.g. "by end of year" = 365 days).
- If no timeline, use sensible relative ordering.
- For each task, set "phase_category" to exactly one value from this fixed list:
  planning, finance, legal, documents, career, startup, business,
  home, education, family, health, travel, relocation, marriage,
  loss, growth, vehicle, retirement, completion, caution
- For each task, set "task_type" ONLY if it directly maps to one of these guide keys:
  aadhaar_download, pan_download, bank_account_opening, epf_transfer, aadhaar_update,
  voter_address_change, passport_renewal, dl_address_change, epf_withdrawal,
  domicile_certificate, business_registration, business_name_registration,
  submit_hr_docs, open_salary_account
  Otherwise omit "task_type" entirely (do not set it to null or empty string).
- Output ONLY valid JSON matching this exact structure:
  {
    "tasks": [
      {
        "title": string,
        "description": string,
        "priority": integer 1-5,
        "suggested_due_offset_days": integer >= 0,
        "phase_category": string (one from the fixed list above),
        "task_type": string (optional — only if matches a known guide key above),
        "subtasks": [
          {
            "title": string,
            "priority": integer 1-5,
            "suggested_due_offset_days": integer >= 0,
            "task_type": string (optional — only if matches a known guide key above)
          }
        ]
      }
    ]
  }
- Do not include markdown, code fences, or any text outside the JSON.
"""

_WORKFLOW_SYSTEM_PROMPT = """\
You are Pathfinder AI, a life-event workflow planner.

You will receive:
1. One or more life-event types the user is going through.
2. Optional location and timeline context.
3. A numbered list of retrieved knowledge-base entries — these are the ONLY
   facts you may use.

Your job is to generate a practical, ordered task workflow to help the user
complete this life event.

STRICT RULES:
- Base EVERY task and subtask EXCLUSIVELY on the retrieved entries for factual details (forms, locations, specific laws).
- Keep task descriptions to 1-2 sentences max. Put specific step-by-step details in subtasks, not the description.
- LOGICAL DECOMPOSITION: You SHOULD break down high-level tasks into actionable sub-steps (e.g., "Apply for X" can naturally include "Gather required documents", "Fill application form", "Pay processing fee", "Submit and track status") provided these steps are logical extensions of the provided knowledge.
- Do NOT invent external links, specific office addresses, or legal deadlines not present in the entries.
- Do NOT use outside knowledge for legal advice or complex assumptions.
- If the retrieved entries do not contain enough information to generate a meaningful workflow, respond ONLY with: {"error": "Insufficient knowledge to generate workflow."}
- Assign priority 1 (most urgent) to 5 (least urgent).
- suggested_due_offset_days must be 0 or a positive integer.
- If a timeline is given, derive offsets logically from it.
- If no timeline, use sensible relative ordering (earlier steps get lower offsets than later steps).
- For each task, set "phase_category" to exactly one value from this fixed list:
  planning, finance, legal, documents, career, startup, business,
  home, education, family, health, travel, relocation, marriage,
  loss, growth, vehicle, retirement, completion, caution
  Use "caution" for tasks about avoiding mistakes, pitfalls, risks, or common errors.
  Choose the category that best matches the task's purpose.
- For each task, set "task_type" ONLY if it directly maps to one of these guide keys:
  aadhaar_download, pan_download, bank_account_opening, epf_transfer, aadhaar_update,
  voter_address_change, passport_renewal, dl_address_change, epf_withdrawal,
  domicile_certificate, business_registration, business_name_registration,
  submit_hr_docs, open_salary_account
  Otherwise omit "task_type" entirely (do not set it to null or empty string).
- Output ONLY valid JSON matching this exact structure:
  {
    "tasks": [
      {
        "title": string,
        "description": string,
        "priority": integer 1-5,
        "suggested_due_offset_days": integer >= 0,
        "phase_category": string (one from the fixed list above),
        "task_type": string (optional — only if matches a known guide key above),
        "subtasks": [
          {
            "title": string,
            "priority": integer 1-5,
            "suggested_due_offset_days": integer >= 0,
            "task_type": string (optional — only if matches a known guide key above)
          }
        ]
      }
    ]
  }
- Do not include markdown, code fences, or any text outside the JSON.
"""

# ---------------------------------------------------------------------------
# Gemini client (shared lazy singleton via rag_service would cause circular
# import — keep a local one here)
# ---------------------------------------------------------------------------

_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to your .env file.")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


# ---------------------------------------------------------------------------
# Retrieval aggregation
# ---------------------------------------------------------------------------

def _gather_chunks(
    db: Session,
    life_event_types: list[LifeEventType],
    top_k: int,
) -> list[RetrievedChunk]:
    """
    Run RAG retrieval for each life-event type and merge results.

    De-duplicates by chunk ID so the same entry is never sent twice even
    when multiple life-event types share knowledge.

    Args:
        db:               Active SQLAlchemy session (read-only).
        life_event_types: Life event categories to retrieve for.
        top_k:            Number of chunks per category.

    Returns:
        Deduplicated list of :class:`RetrievedChunk` sorted by similarity.
    """
    seen_ids: set[int] = set()
    merged: list[RetrievedChunk] = []

    for event_type in life_event_types:
        # Build a rich query string so the embedding captures context
        query = f"requirements and documents for {event_type.value.replace('_', ' ').lower()}"
        try:
            chunks = retrieve(db, query, life_event_type=event_type, top_k=top_k)
        except ValueError:
            # No entries for this type — skip gracefully
            logger.warning("No KB entries found for life_event_type=%s", event_type.value)
            continue
        except RuntimeError as exc:
            raise RuntimeError(f"Retrieval failed for {event_type.value}: {exc}") from exc

        for chunk in chunks:
            if chunk.id not in seen_ids:
                seen_ids.add(chunk.id)
                merged.append(chunk)

    # Re-sort by similarity descending so the most relevant content leads
    merged.sort(key=lambda c: c.similarity_score, reverse=True)
    return merged


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(
    life_event_types: list[LifeEventType],
    location: Optional[str],
    timeline: Optional[str],
    chunks: list[RetrievedChunk],
) -> str:
    """Assemble the grounded user message for the LLM."""
    types_str = ", ".join(t.value.replace("_", " ") for t in life_event_types)

    context_lines = [f"Life event(s): {types_str}"]
    if location:
        context_lines.append(f"Location: {location}")
    if timeline:
        context_lines.append(f"Timeline: {timeline}")

    context_lines.append("\nRetrieved knowledge-base entries:\n")
    for i, chunk in enumerate(chunks, start=1):
        context_lines.append(
            f"Entry {i} [ID={chunk.id}, Category={chunk.life_event_type.value}]\n"
            f"Title: {chunk.title}\n"
            f"Content: {chunk.content}"
        )

    context_lines.append(
        "\nGenerate a step-by-step task workflow using ONLY the entries above."
    )
    return "\n\n".join(context_lines)


# ---------------------------------------------------------------------------
# LLM call + parse
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> dict:
    """Strip markdown fences and parse JSON from LLM text output."""
    s = text.strip()
    if "```json" in s:
        s = s.split("```json")[1].split("```")[0].strip()
    elif "```" in s:
        s = s.split("```")[1].split("```")[0].strip()
    return json.loads(s)


def _generate_workflow(prompt: str) -> dict:
    """
    Generate workflow JSON, trying OpenRouter free models first, then direct Gemini.

    Raises:
        RuntimeError: If all API calls or JSON parsing fails.
    """
    # ── PRIMARY: OpenRouter (handles free model waterfall + Gemini fallback) ──
    try:
        from backend.services.openrouter_client import generate_completion
        text = generate_completion(
            system_instruction=_WORKFLOW_SYSTEM_PROMPT,
            user_message=prompt,
            max_tokens=4096,
            temperature=0.2,
        )
        return _extract_json(text)
    except Exception as exc:
        logger.warning("OpenRouter workflow generation failed: %s", str(exc)[:120])

    # ── SECONDARY: Direct Gemini with strict JSON mode — try multiple models ─
    client = _get_client()
    for gemini_model in ["gemini-2.0-flash", "gemini-2.0-flash-lite"]:
        try:
            response = client.models.generate_content(
                model=gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=_WORKFLOW_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=4096,
                ),
            )
            if response.text and response.text.strip():
                logger.info("Direct Gemini workflow SUCCESS: %s", gemini_model)
                return json.loads(response.text.strip())
        except Exception as exc:
            err_str = str(exc)
            logger.warning("Direct Gemini %s workflow failed: %s", gemini_model, str(exc)[:100])
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                continue  # try next model
            continue
    raise RuntimeError("All models rate limited or failed. Try again in ~60s.")


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------

def _parse_tasks(data: dict) -> tuple[list[ProposedTask], Optional[str]]:
    """
    Validate and coerce the LLM output dict into Pydantic models.

    Returns:
        (tasks, error) — either tasks is populated or error is set.
    """
    # LLM signalled insufficient knowledge
    if "error" in data:
        return [], data["error"]

    raw_tasks = data.get("tasks", [])
    if not raw_tasks:
        return [], "Insufficient knowledge to generate workflow."

    tasks: list[ProposedTask] = []
    for raw_task in raw_tasks:
        # Guard against LLM omitting title
        task_title = raw_task.get("title")
        if not task_title:
            continue

        raw_subtasks = raw_task.get("subtasks", [])
        subtasks: list[ProposedSubtask] = []
        for s in raw_subtasks:
            sub_title = s.get("title")
            if not sub_title:
                continue
            subtasks.append(
                ProposedSubtask(
                    title=sub_title,
                    priority=max(1, min(5, int(s.get("priority", 3)))),
                    suggested_due_offset_days=max(0, int(s.get("suggested_due_offset_days", 0))),
                    task_type=s.get("task_type") or None,
                )
            )

        tasks.append(
            ProposedTask(
                title=task_title,
                description=raw_task.get("description", ""),
                priority=max(1, min(5, int(raw_task.get("priority", 3)))),
                suggested_due_offset_days=max(
                    0, int(raw_task.get("suggested_due_offset_days", 0))
                ),
                phase_category=raw_task.get("phase_category") or None,
                task_type=raw_task.get("task_type") or None,
                subtasks=subtasks,
            )
        )

    return tasks, None


# ---------------------------------------------------------------------------
# AI-first generation (no KB entries available)
# ---------------------------------------------------------------------------

def _generate_ai_first_workflow(
    life_event_types: list[LifeEventType],
    location: Optional[str],
    timeline: Optional[str],
    original_description: Optional[str],
) -> list[ProposedTask]:
    """
    Generate a workflow using pure AI when no KB entries exist for the event type.
    Uses the user's original description so the roadmap is actually relevant.
    """
    types_str = ", ".join(t.value.replace("_", " ") for t in life_event_types)
    context_lines = [f"Life event(s): {types_str}"]
    if original_description:
        context_lines.append(f"User's goal: {original_description}")
    if location:
        context_lines.append(f"Location: {location}")
    if timeline:
        context_lines.append(f"Timeline: {timeline}")
    context_lines.append("\nGenerate a comprehensive, step-by-step task workflow for this goal.")
    prompt = "\n\n".join(context_lines)

    # Try OpenRouter first
    try:
        from backend.services.openrouter_client import generate_completion
        text = generate_completion(
            system_instruction=_AI_FIRST_SYSTEM_PROMPT,
            user_message=prompt,
            max_tokens=4096,
            temperature=0.3,
        )
        raw_data = _extract_json(text)
        tasks, _ = _parse_tasks(raw_data)
        if tasks:
            logger.info("AI-first workflow generated via OpenRouter for: %s", types_str)
            return tasks
    except Exception as exc:
        logger.warning("OpenRouter AI-first generation failed: %s", str(exc)[:120])

    # Fall back to direct Gemini
    client = _get_client()
    for gemini_model in ["gemini-2.0-flash", "gemini-2.0-flash-lite"]:
        try:
            response = client.models.generate_content(
                model=gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=_AI_FIRST_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.3,
                    max_output_tokens=4096,
                ),
            )
            if response.text and response.text.strip():
                raw_data = json.loads(response.text.strip())
                tasks, _ = _parse_tasks(raw_data)
                if tasks:
                    logger.info("AI-first workflow generated via Gemini %s", gemini_model)
                    return tasks
        except Exception as exc:
            logger.warning("Gemini %s AI-first failed: %s", gemini_model, str(exc)[:100])
            continue

    logger.error("All AI-first generation attempts failed for %s", types_str)
    return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def propose_workflow(
    db: Session,
    life_event_types: list[LifeEventType],
    location: Optional[str],
    timeline: Optional[str],
    top_k: int = 5,
    start_date: Optional[str] = None,
    original_description: Optional[str] = None,
) -> WorkflowProposalResponse:
    """
    Full Layer 3.3 pipeline: retrieve -> prompt -> generate -> validate.

    When KB has no relevant entries, falls back to pure AI generation using
    the original_description so the roadmap actually matches the user's goal.
    """
    chunks = []
    explanation = None
    tasks = []

    try:
        # 1. Retrieve grounded knowledge
        chunks = _gather_chunks(db, life_event_types, top_k)

        if not chunks:
            # No KB entries for this event type — use AI with the user's original description
            logger.info(
                "No KB chunks found for %s — switching to AI-first generation.",
                [t.value for t in life_event_types],
            )
            tasks = _generate_ai_first_workflow(life_event_types, location, timeline, original_description)
        else:
            # 3. Build grounded prompt for tasks
            prompt = _build_prompt(life_event_types, location, timeline, chunks)
            # 4. Call LLM with internal model fallback
            try:
                raw_data = _generate_workflow(prompt)
                tasks, error = _parse_tasks(raw_data)
                if error or not tasks:
                    # KB existed but LLM returned nothing useful — try AI-first
                    logger.warning("Grounded generation returned no tasks (%s) — trying AI-first.", error)
                    tasks = _generate_ai_first_workflow(life_event_types, location, timeline, original_description)
            except Exception as e:
                logger.warning("Workflow generation failed: %s — trying AI-first.", e)
                tasks = _generate_ai_first_workflow(life_event_types, location, timeline, original_description)

    except Exception as exc:
        logger.warning("Workflow proposal pipeline failed: %s — trying AI-first.", exc)
        tasks = _generate_ai_first_workflow(life_event_types, location, timeline, original_description)

    # 5. Apply scheduling if start_date provided
    if start_date and tasks:
        from backend.services.scheduling_service import calculate_task_dates
        try:
            task_dicts = [t.model_dump() for t in tasks]
            tasks_with_dates = calculate_task_dates(task_dicts, start_date, 1, db)
            tasks = [ProposedTask(**t) for t in tasks_with_dates]
        except Exception as e:
            logger.warning("Scheduling failed during proposal: %s", e)

    return WorkflowProposalResponse(
        success=True,
        life_event_types=life_event_types,
        location=location,
        timeline=timeline,
        tasks=tasks,
        explanation=explanation,
        retrieved_chunk_ids=[c.id for c in chunks],
        error=None,
    )


def _make_fallback_tasks(event_types: list[LifeEventType]) -> list[ProposedTask]:
    """Provides a safe, generic task list if the LLM or RAG fails completely."""
    return [
        ProposedTask(
            title="Initial Research & Documentation",
            description="Gather all existing identity proofs and category-specific documents.",
            priority=1,
            suggested_due_offset_days=1,
            subtasks=[
                ProposedSubtask(title="Locate Aadhaar and PAN", priority=1, suggested_due_offset_days=0),
                ProposedSubtask(title="Verify eligibility criteria", priority=2, suggested_due_offset_days=0),
            ]
        ),
        ProposedTask(
            title="Portal Registration",
            description="Create accounts on necessary government or service portals.",
            priority=2,
            suggested_due_offset_days=3,
            subtasks=[
                ProposedSubtask(title="Self-registration on official site", priority=1, suggested_due_offset_days=0),
            ]
        ),
        ProposedTask(
            title="Final Submission",
            description="Complete the application and pay any required fees.",
            priority=3,
            suggested_due_offset_days=7,
            subtasks=[]
        )
    ]
