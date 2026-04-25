"""
Plan Chat — conversational AI endpoint.

Users can ask natural-language questions about their specific life event plan.
The AI answers using the full plan context (tasks, phases, progress, costs,
location, vault documents, requirements knowledge) injected into the system
prompt — not generic advice.

Endpoints:
  POST /api/life-events/{life_event_id}/chat
  GET  /api/life-events/{life_event_id}/chat/history
"""
from __future__ import annotations

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.life_event_model import LifeEvent
from backend.models.plan_chat_model import PlanChatMessage
from backend.routes.auth_routes import get_current_user
from backend.models.user_model import User
from backend.services.openrouter_client import generate_completion, OpenRouterError

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryMessage]] = []


class ChatResponse(BaseModel):
    reply: str


class ChatHistoryItem(BaseModel):
    role: str
    content: str


# ── Event-type → Navigator persona ───────────────────────────────────────────

_NAVIGATOR_PERSONA: dict[str, str] = {
    "RELOCATION": "You are an expert in domestic and international relocation — housing search, logistics, address updates, and settling into a new city.",
    "JOB_ONBOARDING": "You are an expert in job transitions — offer letters, PF transfers, background verification, onboarding documents, and first-day logistics.",
    "HOME_PURCHASE": "You are an expert in property buying — home loans, due diligence, registration, stamp duty, possession, and legal checks.",
    "HOME_PURCHASE_PROCESS": "You are an expert in property buying — home loans, due diligence, registration, stamp duty, possession, and legal checks.",
    "MARRIAGE_PLANNING": "You are an expert in wedding planning — venue, vendors, legal registration, name change, and budget management.",
    "VISA_APPLICATION": "You are an expert in visa applications — documentation, consulate appointments, biometrics, processing times, and approval odds.",
    "STUDY_ABROAD": "You are an expert in overseas education — university applications, SOPs, scholarships, student visas, and pre-departure planning.",
    "GRADUATE_STUDIES": "You are an expert in postgraduate education — research proposals, funding, supervisor selection, and academic applications.",
    "BUSINESS_STARTUP": "You are an expert in new business formation — entity registration, GST, banking, hiring, IP, and early-stage operations.",
    "FREELANCE_SETUP": "You are an expert in freelancing — GST registration, contracts, invoicing, tax compliance, and building a client base.",
    "RETIREMENT_PLANNING": "You are an expert in retirement planning — corpus calculation, EPF, NPS, PPF, investment strategy, and tax efficiency.",
    "HOME_PURCHASE": "You are an expert in property buying — home loans, RERA compliance, due diligence, registration, and possession.",
    "NRI_RETURN_TO_INDIA": "You are an expert in NRI repatriation — FEMA compliance, NRE/NRO account closure, customs, and re-establishing life in India.",
    "PREGNANCY_PREPARATION": "You are an expert in pregnancy planning — maternity insurance, hospital empanelment, leave policy, and delivery preparation.",
    "CHILD_SCHOOL_TRANSITION": "You are an expert in school admissions and transitions — transfer certificates, RTE, counselling, and document requirements.",
    "HEALTH_INSURANCE": "You are an expert in health insurance — policy selection, pre-existing conditions, waiting periods, and claims.",
    "DEBT_MANAGEMENT": "You are an expert in debt management — consolidation, EMI restructuring, negotiation, and credit score recovery.",
    "PROPERTY_INHERITANCE": "You are an expert in property inheritance — succession certificates, mutation, will probate, and legal heir processes.",
    "VISA_APPLICATION": "You are an expert in visa applications — documentation, biometrics, consulate procedures, and approval strategies.",
    "INTERNATIONAL_TRAVEL": "You are an expert in international travel — visas, insurance, customs, forex, and health requirements.",
    "TRAVEL_RELOCATION": "You are an expert in international relocation — work permits, housing, banking, cultural orientation, and logistics.",
    "MEDICAL_EMERGENCY": "You are an expert in medical emergencies — insurance claims, TPA processes, cashless hospitalisation, and financial planning.",
    "ADOPTION_PROCESS": "You are an expert in adoption — CARA registration, home study, legal procedures, and post-adoption integration.",
    "ELDERCARE_MANAGEMENT": "You are an expert in eldercare — medical management, legal instruments like POA, financial planning, and care facility evaluation.",
    "WOMEN_DIVORCE_RECOVERY": "You are an expert in divorce recovery — legal proceedings, asset division, financial independence, and emotional support resources.",
    "ESTATE_PLANNING": "You are an expert in estate planning — wills, trusts, nominations, power of attorney, and succession.",
}

_DEFAULT_PERSONA = "You are an expert life navigator with deep knowledge across housing, finance, legal, career, health, and personal planning domains in the Indian context."


# ── Event-type → smart suggested questions ───────────────────────────────────

_EVENT_SUGGESTIONS: dict[str, list[str]] = {
    "RELOCATION": [
        "What should I do in the first week after moving?",
        "Which address updates are most time-sensitive?",
        "What can I do before the move to save time later?",
        "How do I prioritise if I only have 2 weeks?",
        "What documents should I carry on moving day?",
        "What's the most common mistake people make when relocating?",
    ],
    "JOB_ONBOARDING": [
        "What documents should I carry on Day 1?",
        "How long does PF transfer typically take?",
        "What should I do in my notice period right now?",
        "What if my relieving letter is delayed?",
        "Which task is blocking everything else?",
        "What can I do in parallel to save time?",
    ],
    "HOME_PURCHASE": [
        "What due diligence checks are most critical?",
        "When should I involve a lawyer?",
        "What are the hidden costs I should budget for?",
        "What happens if the builder delays possession?",
        "How do I compare two shortlisted properties?",
        "What should I verify before signing the agreement?",
    ],
    "MARRIAGE_PLANNING": [
        "What should I book at least 6 months in advance?",
        "What legal registrations do I absolutely need?",
        "How do I manage vendor payments safely?",
        "What's typically forgotten until the last minute?",
        "How do I handle name change after marriage?",
        "What can I delegate to save stress?",
    ],
    "VISA_APPLICATION": [
        "What's the most common reason for rejection?",
        "How early should I book my biometrics appointment?",
        "Which documents need to be attested or notarised?",
        "What if my passport expires soon?",
        "How do I write a strong cover letter for the consulate?",
        "What should I do if my visa is delayed?",
    ],
    "STUDY_ABROAD": [
        "Which application deadlines are coming up soonest?",
        "What makes a strong SOP for this program?",
        "How much proof of funds do I need to show?",
        "What should I do before leaving India?",
        "How do I open a bank account in my destination country?",
        "What's the best time to apply for scholarships?",
    ],
    "BUSINESS_STARTUP": [
        "What's the fastest legal structure to set up?",
        "When do I need to register for GST?",
        "What mistakes do most first-time founders make?",
        "What can I delay until I have revenue?",
        "Which task is the most critical right now?",
        "How do I protect my business name and IP early?",
    ],
    "RETIREMENT_PLANNING": [
        "Am I on track given my current savings?",
        "How should I think about my EPF vs NPS allocation?",
        "What tax-efficient options am I not using?",
        "When should I start shifting to safer investments?",
        "What's a realistic monthly corpus I need to build?",
        "How do I plan for healthcare costs in retirement?",
    ],
    "PREGNANCY_PREPARATION": [
        "What's most urgent in my current trimester?",
        "How do I make the most of my maternity leave?",
        "What should I prepare at home before the due date?",
        "Which hospital documents do I need in advance?",
        "What insurance claims can I start preparing now?",
        "What should my partner or family be doing in parallel?",
    ],
    "HEALTH_INSURANCE": [
        "What pre-existing conditions affect my coverage?",
        "Is there a waiting period I should know about?",
        "How do I compare two policies I'm considering?",
        "What's not covered that I should plan for separately?",
        "How do I add a family member to my policy?",
        "What should I do if a claim gets rejected?",
    ],
    "NRI_RETURN_TO_INDIA": [
        "What do I need to close or convert before I leave?",
        "How do I handle my foreign assets under FEMA?",
        "What's the process for closing NRE/NRO accounts?",
        "Which Indian documents do I need to reactivate first?",
        "What customs duties apply to goods I'm shipping?",
        "What should I do on arrival to avoid compliance issues?",
    ],
    "DEBT_MANAGEMENT": [
        "Which debt should I tackle first?",
        "Can I negotiate my interest rate with the lender?",
        "What's the fastest path to becoming debt-free?",
        "How is this affecting my credit score?",
        "What happens if I miss an EMI?",
        "Are there any government relief schemes I qualify for?",
    ],
    "VISA_APPLICATION": [
        "What's the typical processing time for this visa?",
        "How do I get a strong financial proof package together?",
        "What if I've had a previous rejection?",
        "Which documents need to be translated or apostilled?",
        "How early should I apply for my travel date?",
        "What should I do if biometrics slots are full?",
    ],
    "BUSINESS_STARTUP": [
        "What's the fastest legal structure I can set up?",
        "When exactly do I need to register for GST?",
        "What can I delay until I have my first customer?",
        "Which task is blocking everything else right now?",
        "What are the most common mistakes first-time business owners make?",
        "How do I protect my business name early?",
    ],
    "FREELANCE_SETUP": [
        "Do I need to register as a business from day one?",
        "How do I handle taxes as a freelancer in India?",
        "What should a freelance contract include?",
        "When should I start charging GST to clients?",
        "What's the fastest way to get my first paying client?",
        "How do I protect myself if a client doesn't pay?",
    ],
    "TRAVEL_RELOCATION": [
        "What should I do in the first week after arriving?",
        "What's the most time-sensitive task before I leave India?",
        "How do I handle my Indian bank accounts while abroad?",
        "What documents should I carry on the day I travel?",
        "How do I handle tax residency if I'm abroad for over a year?",
        "What can I sort out in parallel to save time?",
    ],
    "ELDERCARE_MANAGEMENT": [
        "What legal documents should I put in place urgently?",
        "How do I evaluate a care facility or home nurse?",
        "What government schemes are available for senior citizens?",
        "How do I manage their finances if they can't do it themselves?",
        "What medical insurance options work for someone their age?",
        "What should I do if there's a sudden medical emergency?",
    ],
    "ESTATE_PLANNING": [
        "What's the single most important thing to do first?",
        "What happens if someone dies without a will in India?",
        "How do I add or change nominees on financial accounts?",
        "What's the difference between a will and a trust here?",
        "How do I make sure my family doesn't face legal hassles later?",
        "Which assets need special attention or separate documentation?",
    ],
    "ADOPTION_PROCESS": [
        "How long does the CARA process typically take?",
        "What does a home study involve and how do I prepare?",
        "What are the most common reasons for delays?",
        "What legal steps happen after matching?",
        "What should we do to prepare our home before the child arrives?",
        "What support is available after the adoption is complete?",
    ],
    "PREGNANCY_PREPARATION": [
        "What's most urgent in my current trimester?",
        "How do I make the most of my maternity leave?",
        "What should I prepare at home before the due date?",
        "Which hospital documents do I need in advance?",
        "What insurance claims can I start preparing now?",
        "What should my partner or family be doing in parallel?",
    ],
    "CHILD_SCHOOL_TRANSITION": [
        "What documents are most commonly missed in school admissions?",
        "How early should I start the application process?",
        "What's the RTE quota process and do we qualify?",
        "How do I get a transfer certificate quickly from the current school?",
        "What if the school we want doesn't have a spot?",
        "How do I make this transition easier for my child?",
    ],
}

_DEFAULT_SUGGESTIONS = [
    "What should I focus on first?",
    "What happens if I delay the next task by 2 weeks?",
    "Which task is the most critical right now?",
    "What documents am I likely to need?",
    "What can I do in parallel to save time?",
    "What are the most common mistakes people make here?",
    "How does my progress compare to a typical plan?",
    "Do I really need a professional for any of these?",
]


# ── Context builders ──────────────────────────────────────────────────────────

def _format_tasks_for_prompt(tasks) -> str:
    """Convert task list into a readable block for the system prompt."""
    if not tasks:
        return "No tasks created yet."

    phases: dict[str, list] = {}
    for task in tasks:
        phase = task.phase_title or "General"
        phases.setdefault(phase, []).append(task)

    lines = []
    for phase_name, phase_tasks in phases.items():
        done = sum(1 for t in phase_tasks if t.status == "completed")
        lines.append(f"\nPHASE: {phase_name} ({done}/{len(phase_tasks)} complete)")
        for t in phase_tasks:
            status = "✓ DONE" if t.status == "completed" else "⬜ PENDING"
            priority_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW", 5: "OPTIONAL"}
            pri = priority_map.get(t.priority, "MEDIUM")
            date_info = ""
            if t.due_date:
                date_info = f", due: {t.due_date.strftime('%b %d')}"
            elif getattr(t, "due_offset_days", None):
                date_info = f", due: Day {t.due_offset_days}"
            cost_info = ""
            if t.estimated_cost_min is not None and t.estimated_cost_max is not None:
                cost_info = f", cost: ₹{t.estimated_cost_min:,}–₹{t.estimated_cost_max:,}"
            lines.append(f"  [{status}] {t.title} (priority: {pri}{date_info}{cost_info})")
            if t.description:
                lines.append(f"    → {t.description[:120]}")
            for sub in (t.subtasks or []):
                sub_status = "✓" if sub.status == "completed" else "⬜"
                lines.append(f"      {sub_status} {sub.title}")
    return "\n".join(lines)


def _format_vault_for_prompt(user: User) -> str:
    """Build a vault summary: what documents the user already has uploaded."""
    docs = [d for d in (user.vault_documents or []) if not d.deleted_at]
    if not docs:
        return "No documents uploaded to vault yet."
    lines = []
    for doc in docs:
        expiry = f", expires: {doc.expires_at.strftime('%b %Y')}" if doc.expires_at else ""
        lines.append(f"  ✓ {doc.name} [{doc.doc_type}{expiry}]")
    return "\n".join(lines)


def _format_requirements_for_prompt(life_event: LifeEvent) -> str:
    """Parse requirements_json into a readable block of knowledge context."""
    raw = life_event.requirements_json
    if not raw:
        return ""
    try:
        data = json.loads(raw)
    except Exception:
        return ""

    # requirements_json can be the full RAG response or just the explanation string
    if isinstance(data, str):
        return f"KNOWLEDGE CONTEXT:\n{data[:1200]}"

    explanation = data.get("explanation") or data.get("summary") or ""
    # explanation may itself be a dict like {"explanation": "...text..."} — unwrap it
    if isinstance(explanation, dict):
        explanation = explanation.get("explanation") or explanation.get("text") or explanation.get("summary") or ""
    chunks = data.get("retrieved_chunks") or data.get("chunks") or []

    lines = []
    if explanation:
        lines.append(f"KNOWLEDGE CONTEXT (why these tasks exist):\n{explanation[:800]}")
    if chunks:
        lines.append("\nKEY REQUIREMENTS FROM KNOWLEDGE BASE:")
        for chunk in chunks[:6]:
            title = chunk.get("title") or chunk.get("task_type") or ""
            content = chunk.get("content") or chunk.get("text") or ""
            if title or content:
                lines.append(f"  • {title}: {content[:200]}" if title else f"  • {content[:200]}")
    return "\n".join(lines) if lines else ""


def _get_event_type(life_event: LifeEvent) -> str:
    """Extract the primary event type from metadata_json (most reliable source),
    falling back to title. Returns the enum key e.g. 'BUSINESS_STARTUP'."""
    # Try metadata_json first — this is where the actual enum type is stored
    try:
        meta = json.loads(life_event.metadata_json or '{}')
        types = meta.get('event_types') or []
        if types:
            return str(types[0]).upper().replace(" ", "_")
    except Exception:
        pass
    # Fallback: derive from title (less reliable)
    return (life_event.title or "").upper().replace(" ", "_")


def _build_system_prompt(life_event: LifeEvent, user: User) -> str:
    """Build a rich system prompt with full plan + vault + knowledge context."""
    tasks = [t for t in (life_event.tasks or []) if t.parent_id is None]
    total = len(tasks)
    done = sum(1 for t in tasks if t.status == "completed")
    progress_pct = round(done / total * 100) if total else 0

    location = life_event.location or "Not specified"
    timeline = life_event.timeline or "Not specified"
    created = life_event.created_at.strftime("%b %d, %Y") if life_event.created_at else "Unknown"

    event_type = _get_event_type(life_event)
    persona = _NAVIGATOR_PERSONA.get(event_type, _DEFAULT_PERSONA)

    tasks_block = _format_tasks_for_prompt(tasks)
    vault_block = _format_vault_for_prompt(user)
    requirements_block = _format_requirements_for_prompt(life_event)

    # Extract user profile facts if available
    profile_lines = []
    if user.job_city:
        profile_lines.append(f"City: {user.job_city}")
    if user.state_code:
        profile_lines.append(f"State: {user.state_code}")
    if user.extracted_profile:
        try:
            profile = json.loads(user.extracted_profile)
            for k, v in list(profile.items())[:5]:
                profile_lines.append(f"{k.replace('_', ' ').title()}: {v}")
        except Exception:
            pass
    profile_block = "\n".join(profile_lines) if profile_lines else "Not available"

    prompt = f"""You are the PathFinder Navigator — {persona}

Your role: answer questions specifically about THIS plan with expert, actionable guidance. You have the user's complete plan, vault documents, and the knowledge base context that was used to build this plan.

━━━ PLAN OVERVIEW ━━━
Event: {life_event.display_title or life_event.title}
Description: {life_event.description or 'Not provided'}
Location: {location}
Timeline: {timeline}
Started: {created}
Progress: {progress_pct}% ({done}/{total} tasks complete)
User: {user.name}

━━━ USER PROFILE ━━━
{profile_block}

━━━ TASKS BY PHASE ━━━
{tasks_block}

━━━ VAULT (DOCUMENTS ALREADY UPLOADED) ━━━
{vault_block}
"""

    if requirements_block:
        prompt += f"""
━━━ {requirements_block} ━━━
"""

    prompt += """
━━━ RULES ━━━
RELEVANCE (most important rule):
- You are a focused plan advisor, not a general assistant.
- If the question is clearly unrelated to the plan, this life event, or broadly to the domain (e.g. housing, career, legal, finance, health) — respond with exactly: "I'm focused on your [event name] plan. Is there something specific about your tasks, documents, or next steps I can help with?"
- Do NOT answer trivia, coding questions, general knowledge, creative writing, or anything outside the life-planning domain. Redirect warmly but firmly.
- BORDERLINE questions (e.g. "what is stamp duty?" for a home purchase plan, or "how does PF transfer work?" for a job plan) ARE relevant — answer them using the knowledge context and your domain expertise.

PLAN-SPECIFIC ANSWERS:
- Reference specific task names, phases, and dates from the plan when relevant.
- VAULT AWARENESS: When the user asks about a document they've already uploaded, acknowledge it — e.g. "You've already got your Aadhaar in your vault, that task is sorted."
- KNOWLEDGE AWARENESS: Use the requirements/knowledge context to explain WHY tasks exist when asked (regulations, deadlines, legal requirements).
- When asked "what if I delay/skip X", trace the dependency chain and give specific downstream impacts.
- When asked about costs, use the cost ranges from the tasks above.
- When recommending what to do next, factor in both task priority AND what's already in the vault.

TONE AND FORMAT:
- Use the navigator voice — warm, direct, honest. Like a knowledgeable friend who's done this before.
- Keep answers concise — max 3–4 short paragraphs. Use **bold** for key facts.
- Never say "as an AI" or "I don't have access to" — you have the full plan above.
- If a plan-relevant question touches something not in the plan data, answer from your domain expertise and note it's general guidance, not specific to the plan.
"""
    return prompt


def _build_user_message_with_history(message: str, history: List[HistoryMessage]) -> str:
    """Embed conversation history into the user message for multi-turn context."""
    if not history:
        return message

    recent = history[-16:]
    lines = ["[Previous conversation in this session:]"]
    for h in recent:
        prefix = "User" if h.role == "user" else "Navigator"
        body = h.content[:400] + "..." if len(h.content) > 400 else h.content
        lines.append(f"{prefix}: {body}")
    lines.append("[End of history]\n")
    lines.append(f"User's new question: {message}")
    return "\n".join(lines)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/{life_event_id}/chat", response_model=ChatResponse)
def chat_with_plan(
    life_event_id: int,
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    life_event = db.query(LifeEvent).filter(
        LifeEvent.id == life_event_id,
        LifeEvent.user_id == current_user.id,
    ).first()
    if not life_event:
        raise HTTPException(status_code=404, detail="Life event not found")

    system_prompt = _build_system_prompt(life_event, current_user)
    user_message = _build_user_message_with_history(body.message, body.history or [])

    try:
        reply = generate_completion(
            system_instruction=system_prompt,
            user_message=user_message,
            max_tokens=800,
            temperature=0.7,
        )
    except OpenRouterError as exc:
        logger.error("Plan chat AI failed for event %d: %s", life_event_id, exc)
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable — please try again.")

    # Persist both turns
    db.add(PlanChatMessage(
        life_event_id=life_event_id,
        user_id=current_user.id,
        role="user",
        content=body.message,
    ))
    db.add(PlanChatMessage(
        life_event_id=life_event_id,
        user_id=current_user.id,
        role="assistant",
        content=reply,
    ))
    db.commit()

    return ChatResponse(reply=reply)


@router.get("/{life_event_id}/chat/history", response_model=List[ChatHistoryItem])
def get_chat_history(
    life_event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    life_event = db.query(LifeEvent).filter(
        LifeEvent.id == life_event_id,
        LifeEvent.user_id == current_user.id,
    ).first()
    if not life_event:
        raise HTTPException(status_code=404, detail="Life event not found")

    messages = (
        db.query(PlanChatMessage)
        .filter(
            PlanChatMessage.life_event_id == life_event_id,
            PlanChatMessage.user_id == current_user.id,
        )
        .order_by(PlanChatMessage.created_at.asc())
        .limit(60)
        .all()
    )
    return [ChatHistoryItem(role=m.role, content=m.content) for m in messages]


@router.get("/{life_event_id}/chat/suggestions")
def get_chat_suggestions(
    life_event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return event-type-specific suggested questions for the chat panel."""
    life_event = db.query(LifeEvent).filter(
        LifeEvent.id == life_event_id,
        LifeEvent.user_id == current_user.id,
    ).first()
    if not life_event:
        raise HTTPException(status_code=404, detail="Life event not found")

    event_type = _get_event_type(life_event)
    suggestions = _EVENT_SUGGESTIONS.get(event_type, _DEFAULT_SUGGESTIONS)
    return {"suggestions": suggestions, "event_type": event_type}
