"""
Layer 3.1 — Life Event Classification Service.

Uses OpenRouter (OpenAI-compatible) for LLM classification.
Gemini is reserved for embeddings only (RAG service).
Never writes to the database. Never creates tasks.
"""

import json
import logging
from sqlalchemy.orm import Session

from backend.config import settings
from backend.schemas.nlp_schema import LifeEventClassification, LifeEventType
from backend.services.openrouter_client import generate_completion as openrouter_generate, OpenRouterError
from backend.services.clarification_engine import generate_clarification_questions

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OpenRouter config
# ---------------------------------------------------------------------------

# Allowed event types for classification
_ALLOWED_TYPES = ", ".join(e.value for e in LifeEventType)

_SYSTEM_PROMPT = f"""\
You are "The Pathfinder," an elite life-event architect and master strategist. Your tone is expert, empathetic, and proactive.

Your ONLY job is to analyse the user's text and return a valid JSON object with exactly these keys:
- life_event_types: array of strings from: {_ALLOWED_TYPES}. IMPORTANT: If the text contains MULTIPLE major events (e.g., career change AND relocating), you MUST include ALL relevant types. Never drop a primary goal just because a secondary goal was added.
- display_title: string — A specific, human-friendly title (e.g., 'Launching a Tech Startup in London').
- location: string — city/state/country, or null.
- timeline: string — time-frame, or null.
- enriched_narrative: string — A natural 2-sentence summary of their situation. MUST be written directly to the user in the second person (e.g., "You are planning to...", "Your goal is to..."). NEVER use third person ("The individual...", "They...").
- confidence: number (0.0 to 1.0).
- is_highly_detailed: boolean — Set to TRUE only if the user has provided a VERY detailed brief (including industry, current stage, budget, and specific goals). Set to FALSE for short prompts like 'Starting a business' or 'Moving to Dubai'.
- missing_strategic_details: array of strings — Identify 3-4 specific pieces of information we still need to build a perfect roadmap.

Rules:
- SOCRATIC DEFAULT: Always assume the prompt is NOT highly detailed unless it is massive and specific (100+ words).
- CONFIDENCE: If the user provides a clear goal (even if simple like 'Learning Python'), provide a confidence score of 0.85+ if it fits a known category. Do not penalize confidence just for simplicity if the intent is clear.
- Pick only from the allowed life_event_types: {_ALLOWED_TYPES}
- Return ONLY JSON.
"""


def _call_with_fallback(user_message: str) -> str:
    """
    Calls OpenRouter (which now handles its own fallbacks and direct Gemini failover).
    """
    return openrouter_generate(
        model=settings.openrouter_model,
        system_instruction=_SYSTEM_PROMPT,
        user_message=user_message,
        max_tokens=512,
        temperature=0.2,
    )


def classify_life_event(db: Session, text: str, skip_clarification: bool = False) -> LifeEventClassification | dict:
    """
    Send *text* to OpenRouter and return a validated LifeEventClassification.
    Or, if confidence is too low, return a dictionary containing clarification questions.

    Guarantees:
    - Always returns at least one life_event_type (never raises on partial LLM failures).
    - Falls back through multiple free models on rate-limit errors.
    - Returns OTHER + low confidence tag when fully unable to classify.

    Args:
        text: Free-form user description of their life situation.

    Returns:
        A fully validated :class:`LifeEventClassification` instance.

    Raises:
        RuntimeError: If API key is missing or all models fail at the network level.
    """
    if not settings.openrouter_api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. "
            "Add it to your .env file and restart the server."
        )

    try:
        raw_text = _call_with_fallback(text)
        logger.debug("OpenRouter classification response: %s", raw_text)

        # Strip markdown fences if the model added them despite instructions
        json_str = raw_text
        if "```json" in raw_text:
            json_str = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            json_str = raw_text.split("```")[1].split("```")[0].strip()

        data = json.loads(json_str)

        conf = float(data.get("confidence", 0.0))
        types = [LifeEventType(t) for t in data.get("life_event_types", ["OTHER"])] # Default to OTHER if not present

        # Sanitize display_title: LLMs sometimes return generic placeholders
        _GENERIC_TITLES = {"new event", "event", "life event", "personal event", "untitled", "n/a", ""}
        raw_title = (data.get("display_title") or "").strip()
        if raw_title.lower() in _GENERIC_TITLES:
            # Derive a meaningful title from event types instead
            primary = types[0].value.replace("_", " ").title() if types else "Personal Planning Journey"
            raw_location = (data.get("location") or "").strip()
            if raw_location and raw_location.lower() not in ("null", "none", "n/a"):
                raw_title = f"{primary} in {raw_location}"
            else:
                raw_title = primary

        # Sanitize location: LLMs often return the string "null" instead of JSON null
        raw_location = data.get("location")
        if isinstance(raw_location, str) and raw_location.strip().lower() in ("null", "none", "n/a", ""):
            raw_location = None

        classification = LifeEventClassification(
            life_event_types=types,
            display_title=raw_title,
            location=raw_location,
            timeline=data.get("timeline"),
            enriched_narrative=data.get("enriched_narrative", text),
            confidence=conf,
            is_highly_detailed=bool(data.get("is_highly_detailed", False)),
            missing_strategic_details=data.get("missing_strategic_details", []),
        )

        # ── Layer 3.5: Correction Layer (Sniffer Fallback) ────────────────
        # If the LLM failed to catch a location or event type due to typos, 
        # we check the sniffer before giving up and asking clarification.
        if classification.confidence < 0.6 or not classification.location:
            logger.info("Confidence or Location missing. Running emergency sniffer repair...")
            upper_text = text.upper()
            
            # Location Repair
            LOCATIONS = {
                "London": ["LONDON", "LONDO", "LODN", "LNDN", "LODNON"],
                "Dubai": ["DUBAI", "DUBA", "DXB"],
                "New York": ["NEW YORK", "NYC", "NY"],
                "Toronto": ["TORONTO", "TRNT"],
                "Singapore": ["SINGAPORE", "SGP", "SINGA"],
                "Berlin": ["BERLIN", "BRLN"],
                "Paris": ["PARIS", "PRIS"],
                "Italy": ["ITALY", "ROME", "MILAN", "MILANO", "FLORENCE", "VENICE", "ITALIAN"],
                "Spain": ["SPAIN", "MADRID", "BARCELONA"],
                "Greece": ["GREECE", "ATHENS"],
                "Portugal": ["PORTUGAL", "LISBON"],
                "Japan": ["JAPAN", "TOKYO", "OSAKA"],
                "United Kingdom": ["UK", "BRITAIN", "ENGLAND", "SCOTLAND"],
                "India": ["INDIA", "DELHI", "MUMBAI", "BANGALORE", "HYDERABAD"],
                "United States": ["USA", "UNITED STATES", "AMERICA"],
                "Australia": ["AUSTRALIA", "AUS"],
            }
            if not classification.location:
                for city, variants in LOCATIONS.items():
                    if any(v in upper_text for v in variants):
                        classification.location = city
                        logger.info("Location repaired: %s", city)
                        break

            # Type Repair (Additive) & Confidence Boosting
            boosted = False
            if any(w in upper_text for w in ["RELOTCAT", "RELOCAT", "RELAC", "TRANSIT", "LANDING", "LIVING", "MIGRAT"]):
                if LifeEventType.RELOCATION not in classification.life_event_types:
                    classification.life_event_types.append(LifeEventType.RELOCATION)
                classification.confidence = max(classification.confidence, 0.95)
                boosted = True
                logger.info("Type repaired & boosted: RELOCATION")
            
            if any(w in upper_text for w in ["JOB", "WORK", "CAREER", "ONBOARD", "EMPLOY"]):
                if LifeEventType.JOB_ONBOARDING not in classification.life_event_types:
                    classification.life_event_types.append(LifeEventType.JOB_ONBOARDING)
                classification.confidence = max(classification.confidence, 0.95)
                boosted = True
                logger.info("Type repaired & boosted: JOB_ONBOARDING")

            if any(w in upper_text for w in ["PASSPORT", "VISA", "IMMIG", "AADHAAR", "AADHAR", "LEGAL", "CITIZEN"]):
                if LifeEventType.LEGAL_AND_IDENTITY not in classification.life_event_types:
                    classification.life_event_types.append(LifeEventType.LEGAL_AND_IDENTITY)
                classification.confidence = max(classification.confidence, 0.95)
                boosted = True
                logger.info("Type repaired & boosted: LEGAL_AND_IDENTITY")

            if any(w in upper_text for w in ["STARTUP", "BUSINESS", "VENTURE", "COMPANY", "INCORP", "LAUNCH"]):
                if LifeEventType.BUSINESS_STARTUP not in classification.life_event_types:
                    classification.life_event_types.append(LifeEventType.BUSINESS_STARTUP)
                classification.confidence = max(classification.confidence, 0.95)
                boosted = True
                logger.info("Type repaired & boosted: BUSINESS_STARTUP")

            if any(w in upper_text for w in ["LEARN", "STUDY", "COURSE", "DEGREE", "PYTHON", "CODING", "PROJECT", "PORTFOLIO", "UPKILL", "SKILL"]):
                if LifeEventType.CAREER_UPSKILLING not in classification.life_event_types:
                    classification.life_event_types.append(LifeEventType.CAREER_UPSKILLING)
                classification.confidence = max(classification.confidence, 0.90)
                boosted = True
                logger.info("Type repaired & boosted: CAREER_UPSKILLING")

        # ── Layer 4: Clarification Fallback (Socratic Gate) ────────────────
        # TRIGGER if: 
        # 1. AI is not confident
        # 2. Location is missing
        # 3. Prompt is not highly detailed (Socratic-First Requirement)
        if not skip_clarification and (classification.confidence < 0.6 or not classification.location or not classification.is_highly_detailed):
            logger.info("Triggering clarification fallback. Confidence: %s, Location: %s", classification.confidence, classification.location)
            return generate_clarification_questions(
                db=db, # Added missing DB session
                user_text=text, 
                detected_events=[t.value for t in classification.life_event_types]
            )

        return classification

    except OpenRouterError as exc:
        logger.warning("All LLM models failed, activating emergency keyword sniffer: %s", exc)

    except Exception as exc:
        logger.error("NLP pipeline failed (falling back to discovery): %s", exc)

    # ── ADVANCED EMERGENCY SNIFFER ──────────────────────────────────
    # Runs when the LLMs are fully offline/failing (Rate limits, API downtime).
    # Each rule: (keywords_all_required, keywords_any_required, LifeEventType)
    # A rule fires when ALL of keywords_all are present AND at least one of keywords_any is present.
    # keywords_any=[] means only keywords_all is checked.
    upper_text = text.upper()
    detected_types = []
    location_guess = None

    _SNIFFER_RULES: list[tuple[list[str], list[str], LifeEventType]] = [
        # High-specificity — unambiguous signals, checked first
        (["PASSPORT"], [], LifeEventType.LEGAL_AND_IDENTITY),
        (["VISA"], [], LifeEventType.VISA_APPLICATION),
        (["GREEN CARD"], [], LifeEventType.VISA_APPLICATION),
        (["WORK PERMIT"], [], LifeEventType.VISA_APPLICATION),
        (["CITIZENSHIP"], [], LifeEventType.LEGAL_AND_IDENTITY),
        (["AADHAAR"], [], LifeEventType.LEGAL_AND_IDENTITY),
        (["AADHAR"], [], LifeEventType.LEGAL_AND_IDENTITY),
        (["MARRIAGE"], [], LifeEventType.MARRIAGE_PLANNING),
        (["WEDDING"], [], LifeEventType.MARRIAGE_PLANNING),
        (["MARRY"], [], LifeEventType.MARRIAGE_PLANNING),
        (["DIVORCE"], [], LifeEventType.WOMEN_DIVORCE_RECOVERY),
        (["PREGNANT"], [], LifeEventType.PREGNANCY_PREPARATION),
        (["PREGNANCY"], [], LifeEventType.PREGNANCY_PREPARATION),
        (["DUE DATE"], [], LifeEventType.PREGNANCY_PREPARATION),
        (["TRIMESTER"], [], LifeEventType.PREGNANCY_PREPARATION),
        (["MATERNITY LEAVE"], [], LifeEventType.PARENTAL_LEAVE),
        (["PATERNITY LEAVE"], [], LifeEventType.PARENTAL_LEAVE),
        (["POSTPARTUM"], [], LifeEventType.POSTPARTUM_WELLNESS),
        (["NEWBORN"], [], LifeEventType.POSTPARTUM_WELLNESS),
        (["BIRTH CERTIFICATE"], [], LifeEventType.POSTPARTUM_WELLNESS),
        (["RELOCATION"], [], LifeEventType.RELOCATION),
        (["RELOCAT"], [], LifeEventType.RELOCATION),
        (["MOVING TO"], [], LifeEventType.RELOCATION),
        (["MIGRAT"], [], LifeEventType.RELOCATION),
        (["STARTUP"], [], LifeEventType.BUSINESS_STARTUP),
        (["INCORPORAT"], [], LifeEventType.BUSINESS_STARTUP),
        (["FREELANC"], [], LifeEventType.FREELANCE_SETUP),
        (["NRI"], [], LifeEventType.NRI_RETURN_TO_INDIA),
        (["RETURN TO INDIA"], [], LifeEventType.NRI_RETURN_TO_INDIA),
        (["REPATRIAT"], [], LifeEventType.REPATRIATION),
        (["DEATH ABROAD"], [], LifeEventType.REPATRIATION),
        (["STUDY ABROAD"], [], LifeEventType.STUDY_ABROAD),
        (["MASTERS"], [], LifeEventType.GRADUATE_STUDIES),
        (["PHD"], [], LifeEventType.GRADUATE_STUDIES),
        (["POSTGRAD"], [], LifeEventType.GRADUATE_STUDIES),
        (["RETIREMENT"], [], LifeEventType.RETIREMENT_PLANNING),
        (["RETIRE"], [], LifeEventType.RETIREMENT_PLANNING),
        (["ESTATE PLAN"], [], LifeEventType.ESTATE_PLANNING),
        (["INHERITANCE"], [], LifeEventType.PROPERTY_INHERITANCE),
        (["INHERIT"], [], LifeEventType.PROPERTY_INHERITANCE),
        (["ADOPTION"], [], LifeEventType.ADOPTION_PROCESS),
        (["CARA"], [], LifeEventType.ADOPTION_PROCESS),
        (["GRIEF"], [], LifeEventType.GRIEF_SUPPORT),
        (["BEREAVEMENT"], [], LifeEventType.GRIEF_SUPPORT),
        (["HEALTH INSURANCE"], [], LifeEventType.HEALTH_INSURANCE),
        (["MEDICLAIM"], [], LifeEventType.HEALTH_INSURANCE),
        (["MEDICAL EMERGENCY"], [], LifeEventType.MEDICAL_EMERGENCY),
        (["HOSPITALIZ"], [], LifeEventType.MEDICAL_EMERGENCY),
        (["DEBT"], [], LifeEventType.DEBT_MANAGEMENT),
        (["POLICE VERIFICATION"], [], LifeEventType.RENTAL_VERIFICATION),
        (["RENT AGREEMENT"], [], LifeEventType.RENTAL_VERIFICATION),
        (["HOME LOAN"], [], LifeEventType.HOME_PURCHASE),
        (["UDYAM"], [], LifeEventType.WOMEN_ENTREPRENEURSHIP),
        (["VOLUNTEER"], [], LifeEventType.VOLUNTEER_WORK),
        (["PET ADOPT"], [], LifeEventType.PET_ADOPTION),
        (["ELDER"], ["CARE", "PARENT", "MOTHER", "FATHER"], LifeEventType.ELDERCARE_MANAGEMENT),
        (["OLD AGE"], ["PARENT", "CARE"], LifeEventType.ELDERCARE_MANAGEMENT),
        (["EDUCATION LOAN"], [], LifeEventType.EDUCATION_FINANCING),
        (["SCHOLARSHIP"], [], LifeEventType.EDUCATION_FINANCING),
        (["BURNOUT"], [], LifeEventType.WORKPLACE_WELLNESS),
        (["WORKPLACE"], ["WELLNESS", "MENTAL HEALTH", "STRESS"], LifeEventType.WORKPLACE_WELLNESS),
        (["MENTAL HEALTH"], [], LifeEventType.WELLNESS_MANAGEMENT),
        (["CHRONIC"], ["CONDITION", "ILLNESS", "DISEASE"], LifeEventType.WELLNESS_MANAGEMENT),
        (["DISABILITY"], [], LifeEventType.HEALTH_AND_DISABILITY),
        (["PERSONAL GROWTH"], [], LifeEventType.PERSONAL_GROWTH),
        (["SELF IMPROVEMENT"], [], LifeEventType.PERSONAL_GROWTH),
        # Child school — must have BOTH school signal AND child signal to avoid false matches
        (["SCHOOL"], ["CHILD", "KID", "SON", "DAUGHTER"], LifeEventType.CHILD_SCHOOL_TRANSITION),
        (["TRANSFER CERTIFICATE"], [], LifeEventType.CHILD_SCHOOL_TRANSITION),
        (["ADMISSION"], ["CHILD", "KID", "SON", "DAUGHTER", "SCHOOL"], LifeEventType.CHILD_SCHOOL_TRANSITION),
        # Lower-specificity — checked after high-specificity
        (["PYTHON"], [], LifeEventType.CAREER_UPSKILLING),
        (["CODING"], [], LifeEventType.CAREER_UPSKILLING),
        (["PROGRAMMING"], [], LifeEventType.CAREER_UPSKILLING),
        (["UPSKILL"], [], LifeEventType.CAREER_UPSKILLING),
        (["LEARN"], ["SKILL", "COURSE", "CERTIF", "PYTHON", "CODING"], LifeEventType.CAREER_UPSKILLING),
        (["CAREER"], ["CHANGE", "SWITCH", "TRANSITION", "PIVOT", "CHANGE"], LifeEventType.CAREER_TRANSITION),
        (["QUIT"], ["JOB", "ROLE", "COMPANY"], LifeEventType.CAREER_TRANSITION),
        (["RESIGN"], [], LifeEventType.CAREER_TRANSITION),
        (["JOB"], ["OFFER", "JOINING", "ONBOARD", "START DATE", "NEW JOB"], LifeEventType.JOB_ONBOARDING),
        (["ONBOARDING"], [], LifeEventType.JOB_ONBOARDING),
        (["JOINING DATE"], [], LifeEventType.JOB_ONBOARDING),
        (["START"], ["BUSINESS", "COMPANY", "VENTURE"], LifeEventType.BUSINESS_STARTUP),
        (["LAUNCH"], ["BUSINESS", "COMPANY", "STARTUP"], LifeEventType.BUSINESS_STARTUP),
        (["WOMEN"], ["BUSINESS", "ENTREPRENEUR", "STARTUP"], LifeEventType.WOMEN_ENTREPRENEURSHIP),
        (["BUY"], ["HOUSE", "HOME", "FLAT", "APARTMENT", "PROPERTY"], LifeEventType.HOME_PURCHASE),
        (["PURCHASE"], ["HOUSE", "HOME", "FLAT", "APARTMENT", "PROPERTY"], LifeEventType.HOME_PURCHASE),
        (["BUY"], ["CAR", "BIKE", "VEHICLE", "SCOOTER", "MOTORCYCLE"], LifeEventType.VEHICLE_PURCHASE),
        (["PURCHASE"], ["CAR", "BIKE", "VEHICLE", "SCOOTER"], LifeEventType.VEHICLE_PURCHASE),
        (["MOVE"], ["CITY", "COUNTRY", "ABROAD", "NEW PLACE", "SHIFTING"], LifeEventType.RELOCATION),
        (["BABY"], [], LifeEventType.POSTPARTUM_WELLNESS),
        (["LEGAL"], ["CITIZEN", "IDENTITY", "DOCUMENT"], LifeEventType.LEGAL_AND_IDENTITY),
        (["INVEST"], ["PLAN", "PORTFOLIO", "ASSET", "WEALTH"], LifeEventType.MONEY_AND_ASSETS),
        (["LOAN"], ["MANAGE", "REPAY", "OVERDUE", "DEFAULT", "CREDIT"], LifeEventType.DEBT_MANAGEMENT),
        (["COLLEGE"], ["ADMISSION", "ENROL", "COUNSEL"], LifeEventType.EDUCATIONAL_ENROLLMENT),
        (["UNIVERSITY"], ["ADMISSION", "ENROL", "APPLY"], LifeEventType.EDUCATIONAL_ENROLLMENT),
        (["STUDY"], ["ABROAD", "OVERSEAS", "UK", "USA", "CANADA", "AUSTRALIA"], LifeEventType.STUDY_ABROAD),
        (["ADOPT"], ["DOG", "CAT", "PET", "ANIMAL"], LifeEventType.PET_ADOPTION),
        (["ADOPT"], ["CHILD", "BABY", "KID"], LifeEventType.ADOPTION_PROCESS),
        (["RENT"], ["LANDLORD", "TENANT", "POLICE", "VERIFY"], LifeEventType.RENTAL_VERIFICATION),
        (["FAMILY"], ["RELOCAT", "MOVING", "MOVE", "SHIFT"], LifeEventType.FAMILY_RELOCATION),
        (["TRAVEL"], ["ABROAD", "OVERSEAS", "FOREIGN", "INTERNATIONAL"], LifeEventType.INTERNATIONAL_TRAVEL),
        (["WILL"], ["ESTATE", "ASSETS", "HEIR", "PROPERTY", "BENEFICIAR"], LifeEventType.ESTATE_PLANNING),
        (["PROPERTY"], ["INHERIT", "INHERITED", "ESTATE"], LifeEventType.PROPERTY_INHERITANCE),
    ]

    for required, any_of, event_type in _SNIFFER_RULES:
        if event_type in detected_types:
            continue  # already detected
        if all(kw in upper_text for kw in required):
            if not any_of or any(kw in upper_text for kw in any_of):
                detected_types.append(event_type)

    # Location Sniffer (Common cities & typos)
    LOCATIONS = {
        "London": ["LONDON", "LONDO", "LODN", "LNDN"],
        "Dubai": ["DUBAI", "DUBA", "DXB", "UNITED ARAB EMIRATES", "UAE"],
        "New York": ["NEW YORK", "NYC", "NY"],
        "Toronto": ["TORONTO", "TRNT"],
        "Singapore": ["SINGAPORE", "SGP", "SINGA"],
        "Berlin": ["BERLIN", "BRLN"],
        "Paris": ["PARIS", "PRIS"],
        "Italy": ["ITALY", "ROME", "MILAN", "MILANO", "FLORENCE", "VENICE", "ITALIAN"],
        "Spain": ["SPAIN", "MADRID", "BARCELONA"],
        "Greece": ["GREECE", "ATHENS", "GREEK"],
        "France": ["FRANCE", "FRENCH"],
        "Portugal": ["PORTUGAL", "LISBON"],
        "Netherlands": ["NETHERLANDS", "AMSTERDAM", "DUTCH"],
        "Sweden": ["SWEDEN", "STOCKHOLM"],
        "India": ["INDIA", "IND", "DELHI", "MUMBAI", "BANGALORE", "HYDERABAD", "PUNE", "CHENNAI", "KOLKATA"],
        "United States": ["USA", "UNITED STATES", "AMERICA"],
        "Canada": ["CANADA", "CAN"],
        "Australia": ["AUSTRALIA", "AUS"],
        "Germany": ["GERMANY", "GERM", "DEUTSCHLAND"],
        "Japan": ["JAPAN", "TOKYO", "OSAKA"],
        "United Kingdom": ["UK", "BRITAIN", "ENGLAND", "SCOTLAND", "WALES"],
        "New Zealand": ["NEW ZEALAND", "NZ", "AUCKLAND"],
        "Ireland": ["IRELAND", "DUBLIN"],
        "Malaysia": ["MALAYSIA", "KUALA LUMPUR", "KL"],
    }
    for city, variants in LOCATIONS.items():
        if any(v in upper_text for v in variants):
            location_guess = city.title()
            break

    if not detected_types:
        detected_types = [LifeEventType.OTHER]
        guessed_title = "Personal Planning Journey"
        keyword_confidence = 0.5
    else:
        keyword_confidence = 0.85 if location_guess else 0.75
        # Build title from the primary detected type
        primary_type = detected_types[0]
        _TITLE_MAP = {
            LifeEventType.LEGAL_AND_IDENTITY: "Passport/Document Process",
            LifeEventType.VISA_APPLICATION: "Visa Application",
            LifeEventType.MARRIAGE_PLANNING: "Wedding Planning",
            LifeEventType.WOMEN_DIVORCE_RECOVERY: "Divorce & Recovery Planning",
            LifeEventType.PREGNANCY_PREPARATION: "Pregnancy Preparation",
            LifeEventType.POSTPARTUM_WELLNESS: "Postpartum Planning",
            LifeEventType.PARENTAL_LEAVE: "Parental Leave Planning",
            LifeEventType.CHILD_SCHOOL_TRANSITION: "School Transition for Child",
            LifeEventType.RELOCATION: "Relocation Planning",
            LifeEventType.FAMILY_RELOCATION: "Family Relocation",
            LifeEventType.BUSINESS_STARTUP: "Business Launch",
            LifeEventType.WOMEN_ENTREPRENEURSHIP: "Women Entrepreneurship",
            LifeEventType.FREELANCE_SETUP: "Freelance Setup",
            LifeEventType.JOB_ONBOARDING: "Job Onboarding",
            LifeEventType.CAREER_TRANSITION: "Career Transition",
            LifeEventType.CAREER_UPSKILLING: "Skill Building & Upskilling",
            LifeEventType.HOME_PURCHASE: "Home Purchase",
            LifeEventType.RENTAL_VERIFICATION: "Rental Verification",
            LifeEventType.VEHICLE_PURCHASE: "Vehicle Purchase",
            LifeEventType.RETIREMENT_PLANNING: "Retirement Planning",
            LifeEventType.ESTATE_PLANNING: "Estate Planning",
            LifeEventType.PROPERTY_INHERITANCE: "Property Inheritance",
            LifeEventType.DEBT_MANAGEMENT: "Debt Management",
            LifeEventType.HEALTH_INSURANCE: "Health Insurance Planning",
            LifeEventType.MEDICAL_EMERGENCY: "Medical Emergency",
            LifeEventType.WELLNESS_MANAGEMENT: "Wellness Management",
            LifeEventType.WORKPLACE_WELLNESS: "Workplace Wellness",
            LifeEventType.HEALTH_AND_DISABILITY: "Health & Disability Support",
            LifeEventType.ELDERCARE_MANAGEMENT: "Elder Care Planning",
            LifeEventType.ADOPTION_PROCESS: "Adoption Process",
            LifeEventType.GRIEF_SUPPORT: "Grief & Bereavement Support",
            LifeEventType.REPATRIATION: "Repatriation",
            LifeEventType.NRI_RETURN_TO_INDIA: "NRI Return to India",
            LifeEventType.STUDY_ABROAD: "Study Abroad",
            LifeEventType.GRADUATE_STUDIES: "Graduate Studies",
            LifeEventType.EDUCATIONAL_ENROLLMENT: "College Enrollment",
            LifeEventType.EDUCATION_FINANCING: "Education Financing",
            LifeEventType.INTERNATIONAL_TRAVEL: "International Travel",
            LifeEventType.VOLUNTEER_WORK: "Volunteer Work",
            LifeEventType.PET_ADOPTION: "Pet Adoption",
            LifeEventType.PERSONAL_GROWTH: "Personal Growth Journey",
            LifeEventType.MONEY_AND_ASSETS: "Financial Planning",
        }
        guessed_title = _TITLE_MAP.get(primary_type, primary_type.value.replace("_", " ").title())
        if location_guess:
            guessed_title += f" ({location_guess})"

    if skip_clarification:
        logger.info("Emergency fallback returning best-guess (conf=%.2f): %s", keyword_confidence, guessed_title)
        return LifeEventClassification(
            life_event_types=detected_types,
            display_title=guessed_title,
            location=location_guess,
            timeline=None,
            enriched_narrative=text,
            confidence=keyword_confidence,
        )

    # Otherwise, trigger CLARIFICATION to let the user help us out
    return generate_clarification_questions(
        db=db, # Added missing DB session in emergency call
        user_text=text,
        detected_events=[t.value for t in detected_types]
    )


from typing import Optional

def suggest_task_match(doc_summary: str, pending_tasks: list) -> Optional[int]:
    """
    Uses LLM to match a document to the most relevant task from a list.
    pending_tasks should be a list of dicts: {"id": 1, "title": "...", "description": "..."}
    Returns task_id or None.
    """
    if not pending_tasks:
        return None

    task_bullet_list = "\n".join([f"- ID {t['id']}: {t['title']} ({t['description']})" for t in pending_tasks])
    
    prompt = f"""
    You are an intelligent task-matching engine.
    Given a summary of a document, pick the MOST relevant task ID that this document might satisfy or prove completion for.
    If none of the tasks are relevant, return null.
    
    DOCUMENT SUMMARY:
    {doc_summary}
    
    PENDING TASKS:
    {task_bullet_list}
    
    Return ONLY the task ID (integer) or the word 'null'. No punctuation.
    """
    
    try:
        from backend.services.openrouter_client import generate_completion as openrouter_generate
        response = openrouter_generate(
            model=settings.openrouter_model,
            system_instruction="You are a precise task-matching assistant.",
            user_message=prompt,
            max_tokens=64,
            temperature=0.1
        )
        resp_text = response.strip().lower().replace("id", "").replace(":", "").strip()
        if 'null' in resp_text:
            return None
        return int(resp_text)
    except Exception as e:
        logger.error(f"Semantic task matching failed: {e}")
        return None
