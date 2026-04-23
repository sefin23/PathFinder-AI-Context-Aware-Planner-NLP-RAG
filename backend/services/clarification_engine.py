"""
Layer 4.3 — Clarification System.

Generates follow-up questions when user input is ambiguous or has low NLP classification confidence.
"""

import json
import logging
import os
import re
from sqlalchemy.orm import Session
from backend.services.openrouter_client import generate_completion as openrouter_generate
from backend.services.rag_service import retrieve
from backend.schemas.nlp_schema import LifeEventType
from backend.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are "The Pathfinder," an elite life-event architect. Your job is to identify genuine gaps in the user's information and ask ONLY about what is missing.

CRITICAL RULE — Read the input carefully first. Do NOT ask about anything already stated:
- If the user named a city or country → do NOT ask "which city/country?"
- If the user stated a reason (e.g., "new job", "for studies") → do NOT ask "is this for work or studies?"
- If the user gave a timeline (e.g., "by next month", "in 3 months") → do NOT ask about timeline
- If the input makes the purpose obvious → skip that question entirely
- If destination + reason + timeline are ALL already in the input → return {"clarification_needed": false, "questions": []}

Generate 1-3 SHORT, SPECIFIC follow-up questions ONLY for genuine unknowns. Each question must fill an actual gap.

Rules:
- Questions MUST be specific to the detected life-event type(s).
- NO generic questions like "can you share more?". Every question must have a clear strategic purpose.
- For PASSPORT / LEGAL_AND_IDENTITY: ask about urgency window, current status (renewal/new), and destination country.
- For RELOCATION / FAMILY_RELOCATION / TRAVEL_RELOCATION: ask about destination city, reason for move, and timeline.
- For JOB_ONBOARDING: ask about company city, joining date, and whether it's first job or switching.
- For BUSINESS_STARTUP / WOMEN_ENTREPRENEURSHIP / FREELANCE_SETUP: ask about business type, location, and funding/registration status.
- For MARRIAGE_PLANNING: ask about ceremony type, budget range, and timeline.
- For VISA_APPLICATION: ask about visa type, destination country, and nationality.
- For CHILD_SCHOOL_TRANSITION: ask about child's grade/age, whether this is a city change or school change, and which documents are needed.
- For CAREER_TRANSITION / CAREER_UPSKILLING / WORK_AND_CAREER: ask about industry/role, timeline, and whether relocation is involved.
- For PREGNANCY_PREPARATION / POSTPARTUM_WELLNESS / PARENTAL_LEAVE: ask about due date/stage, insurance coverage status, and employer policy.
- For ELDERCARE_MANAGEMENT / PARENTING_AND_CAREGIVING: ask about the dependent's primary needs, location, and urgency.
- For RETIREMENT_PLANNING / ESTATE_PLANNING / MONEY_AND_ASSETS: ask about target retirement age, current savings status, and key assets to plan around.
- For HEALTH_INSURANCE / WELLNESS_MANAGEMENT / WORKPLACE_WELLNESS / HEALTH_AND_DISABILITY: ask about current coverage status, specific condition or goal, and whether employer or individual plan.
- For DEBT_MANAGEMENT: ask about type(s) of debt, total outstanding amount, and primary goal (payoff vs restructure).
- For STUDY_ABROAD / GRADUATE_STUDIES / EDUCATIONAL_ENROLLMENT / ACADEMIC_PLANNING / EDUCATION_AND_LEARNING: ask about target country/institution, program type, and intake year.
- For HOME_PURCHASE / HOME_PURCHASE_PROCESS: ask about new vs resale, target city, and loan vs self-funded.
- For RENTAL_VERIFICATION / HOUSING_AND_LOCATION: ask about city, landlord or tenant side, and timeline.
- For ADOPTION_PROCESS: ask about domestic vs international, child age preference, and current stage of the process.
- For GRIEF_SUPPORT / LOSS_AND_CRISIS / WOMEN_DIVORCE_RECOVERY: ask about immediate practical needs, support network, and any legal/financial matters that need urgent attention.
- For PROPERTY_INHERITANCE: ask about type of property, number of legal heirs, and whether a will exists.
- For MEDICAL_EMERGENCY: ask about insurance coverage, hospital and city, and whether cashless or reimbursement is needed.
- For NRI_RETURN_TO_INDIA / REPATRIATION: ask about target city, permanency of return, and status of foreign assets/accounts.
- For VEHICLE_PURCHASE: ask about new vs used, city of registration, and loan vs cash.
- For PET_ADOPTION: ask about pet type, adoption vs purchase, and city.
- For EVENT_PLANNING: ask about event type, expected headcount, and city and date.
- For VOLUNTEER_WORK / PERSONAL_GROWTH: ask about area of interest, time commitment, and whether local or international.
- For EDUCATION_FINANCING: ask about loan vs scholarship, institution type, and co-applicant availability.
- For INTERNATIONAL_TRAVEL: ask about destination, purpose, and passport/visa status.
- Speak directly to the user (use "you" and "your").
- Warm, expert tone — like a knowledgeable friend helping you.
- Return ONLY the JSON object — no markdown, no explanation, no code fences.

Example output:
{
  "clarification_needed": true,
  "questions": [
    {"question": "Is this a renewal of an existing passport or a first-time application?"},
    {"question": "How urgently do you need it — is there a travel date or deadline we're working towards?"},
    {"question": "Which country are you applying in? (This determines the exact process and timelines.)"}
  ]
}
"""

# ──────────────────────────────────────────────────────────────────────────────
# Event-specific fallback questions — covers ALL 53 event types
# ──────────────────────────────────────────────────────────────────────────────

_FALLBACK_QUESTIONS: dict[str, list[dict]] = {
    # ── Tier 1 ────────────────────────────────────────────────────────────────
    "VEHICLE_PURCHASE": [
        {"question": "Are you buying a new vehicle or a used one?"},
        {"question": "Which city will the vehicle be registered in?"},
        {"question": "Are you planning to finance it with a loan, or is this a cash purchase?"},
    ],
    "RENTAL_VERIFICATION": [
        {"question": "Which city is the rental property in?"},
        {"question": "Are you the landlord or the tenant in this situation?"},
        {"question": "Has the tenant already moved in, or is the verification needed before move-in?"},
    ],
    "ELDERCARE_MANAGEMENT": [
        {"question": "What are your parent's or elder's most urgent needs right now — medical, financial, or daily care?"},
        {"question": "Are they living with you, in their own home, or in a care facility?"},
        {"question": "Do they have active health insurance or a pension plan we should factor in?"},
    ],
    "EDUCATION_FINANCING": [
        {"question": "Are you looking at an education loan, a scholarship, or a combination of both?"},
        {"question": "Is the institution a government college, private college, or an overseas university?"},
        {"question": "Do you have a co-applicant (parent or guardian) available who can support the loan application?"},
    ],
    "CAREER_TRANSITION": [
        {"question": "Are you moving into a new industry, or a similar role in a different company?"},
        {"question": "Do you have a notice period to serve, or are you transitioning immediately?"},
        {"question": "Is the new role in the same city, or will you also be relocating?"},
    ],
    "POSTPARTUM_WELLNESS": [
        {"question": "Has the baby been born, or are you preparing for the postpartum period in advance?"},
        {"question": "Do you have active maternity/health insurance coverage for the birth and recovery?"},
        {"question": "Are you an employed professional who needs to plan maternity leave and return-to-work logistics?"},
    ],
    "WORKPLACE_WELLNESS": [
        {"question": "Is this a personal wellness initiative (for yourself) or are you setting up a workplace program for a team?"},
        {"question": "What is the primary concern — mental health, physical health, burnout, or work-life balance?"},
        {"question": "Does your employer have an existing EAP (Employee Assistance Programme) or wellness benefit we can work with?"},
    ],
    "PREGNANCY_PREPARATION": [
        {"question": "How far along are you — which trimester, or are you in early planning before conception?"},
        {"question": "Do you have active health insurance with maternity coverage, and do you know its waiting period?"},
        {"question": "Are you employed, and have you reviewed your company's maternity leave policy?"},
    ],
    "CHILD_SCHOOL_TRANSITION": [
        {"question": "What grade or age is your child, and what type of school are you looking for (private, public, international)?"},
        {"question": "Is this transition due to a move to a new city, or are you changing schools within the same area?"},
        {"question": "Which specific documents do you need help with — transfer certificate, leaving certificate, admission forms, or all of the above?"},
    ],
    "WOMEN_DIVORCE_RECOVERY": [
        {"question": "Have proceedings already been filed, or are you in the early stage of planning and seeking advice?"},
        {"question": "Are there children involved, and is custody a key part of what you need to plan for?"},
        {"question": "What is the most urgent practical need right now — legal representation, financial separation, or housing?"},
    ],

    # ── Tier 2 ────────────────────────────────────────────────────────────────
    "JOB_ONBOARDING": [
        {"question": "Which city will you be joining the new company in?"},
        {"question": "Do you have a confirmed start date yet?"},
        {"question": "Is this your first job, or are you switching from a previous employer? (This affects PF transfer and notice period tasks.)"},
    ],
    "RELOCATION": [
        {"question": "Which city or country are we planning your move to?"},
        {"question": "Is this move primarily for work, studies, or a personal fresh start?"},
        {"question": "What's your target timeline — are you moving in the next 1 month, 3 months, or 6+ months?"},
    ],
    "MARRIAGE_PLANNING": [
        {"question": "What's your target wedding date, or are you still in early planning mode?"},
        {"question": "Are you planning a civil ceremony, a religious ceremony, or both?"},
        {"question": "Are there any key legal documents you need to prepare (e.g., marriage registration, name change)?"},
    ],
    "HOME_PURCHASE": [
        {"question": "Are you looking to buy a new property or a resale property?"},
        {"question": "Which city are you looking to buy in?"},
        {"question": "Are you planning to take a home loan, or is this a self-funded purchase?"},
    ],
    "BUSINESS_STARTUP": [
        {"question": "What type of business are you planning to start — product, service, tech, or retail?"},
        {"question": "Which city or country will the business be registered in?"},
        {"question": "Are you bootstrapping, or are you looking to raise investment?"},
    ],
    "WOMEN_ENTREPRENEURSHIP": [
        {"question": "What type of business are you starting or scaling — product, service, or digital?"},
        {"question": "Have you registered the business yet (Udyam/MSME or company registration)?"},
        {"question": "Are you exploring government schemes like MUDRA loans or the Stree Shakti package?"},
    ],
    "REPATRIATION": [
        {"question": "In which country did the death occur, and have you contacted the Indian Embassy or Consulate there yet?"},
        {"question": "Does the deceased have travel insurance, employer group cover, or a life insurance policy that may cover repatriation costs?"},
        {"question": "What is your estimated timeline — is this urgent within 24–48 hours, or is there more time?"},
    ],
    "MEDICAL_EMERGENCY": [
        {"question": "Is the patient currently hospitalised, or are you preparing a plan for a potential emergency?"},
        {"question": "Does the patient have active health insurance — if yes, do you know the TPA name and policy number?"},
        {"question": "Which city and hospital are involved? (This helps identify cashless network status.)"},
    ],
    "VISA_APPLICATION": [
        {"question": "Which country are you applying for a visa to?"},
        {"question": "What type of visa do you need — work, student, tourist, or family visa?"},
        {"question": "How much time do you have before your planned travel date?"},
    ],
    "EDUCATIONAL_ENROLLMENT": [
        {"question": "Have you received an admission offer, or are you still in the application stage?"},
        {"question": "Is this for a government college (counselling-based) or a private institution (direct admission)?"},
        {"question": "Do you need help with a Transfer Certificate, category certificate, or fee payment process?"},
    ],
    "NRI_RETURN_TO_INDIA": [
        {"question": "Which city in India are you returning to?"},
        {"question": "Are you returning permanently, or is this a temporary stay?"},
        {"question": "Do you have any foreign assets, bank accounts, or investments that need to be repatriated or disclosed?"},
    ],

    # ── Tier 3 ────────────────────────────────────────────────────────────────
    "WELLNESS_MANAGEMENT": [
        {"question": "What is the primary wellness goal — managing a chronic condition, mental health, fitness, or general preventive care?"},
        {"question": "Are you looking for personal lifestyle changes, or do you need to navigate insurance and medical appointments?"},
        {"question": "Is there a specific trigger for this now — a diagnosis, a life event, or a personal decision?"},
    ],
    "PROPERTY_INHERITANCE": [
        {"question": "What type of property is being inherited — residential, commercial, or agricultural land?"},
        {"question": "How many legal heirs are involved, and is there a registered will or is this intestate succession?"},
        {"question": "Has the original owner passed away, or is this estate planning while they are alive?"},
    ],
    "HEALTH_INSURANCE": [
        {"question": "Are you looking for individual health insurance, a family floater plan, or a top-up to an existing policy?"},
        {"question": "Do you have any pre-existing conditions we need to factor into the coverage?"},
        {"question": "Is this for India-based coverage only, or do you need international coverage as well?"},
    ],
    "DEBT_MANAGEMENT": [
        {"question": "What types of debt are you dealing with — personal loan, credit card, home loan, or a mix?"},
        {"question": "What is the approximate total outstanding amount, and is any of it overdue?"},
        {"question": "Is your primary goal to pay off debt faster, reduce monthly EMIs, or deal with a collections situation?"},
    ],
    "CAREER_UPSKILLING": [
        {"question": "What specific skill or domain are you looking to build — tech, management, creative, or something else?"},
        {"question": "Are you targeting this for a promotion in your current company, or to transition to a new role?"},
        {"question": "Do you prefer self-paced online learning, a structured bootcamp, or a formal certification program?"},
    ],
    "RETIREMENT_PLANNING": [
        {"question": "What is your target retirement age, and how many years away is that?"},
        {"question": "Do you have existing retirement savings — EPF, PPF, NPS, or an investment portfolio?"},
        {"question": "What lifestyle are you planning for in retirement — modest, comfortable, or travelling frequently?"},
    ],
    "FAMILY_RELOCATION": [
        {"question": "Which city or country is the family relocating to?"},
        {"question": "How many family members are involved, and are there school-age children we need to plan for?"},
        {"question": "What is the primary reason for the move — job, family, education, or lifestyle?"},
    ],
    "INTERNATIONAL_TRAVEL": [
        {"question": "Which country is your destination?"},
        {"question": "Is this for leisure, business, or a long-term stay?"},
        {"question": "Do you already have a valid passport and visa, or do we need to sort those first?"},
    ],
    "ADOPTION_PROCESS": [
        {"question": "Are you pursuing domestic adoption (within India) or international adoption?"},
        {"question": "Do you have a preferred age range for the child?"},
        {"question": "Have you registered on CARA (Central Adoption Resource Authority) yet, or are you just starting?"},
    ],
    "ACADEMIC_PLANNING": [
        {"question": "Is this academic planning for yourself, or are you helping a child or student navigate their path?"},
        {"question": "What level — school board choices, undergraduate entrance exams, or postgraduate planning?"},
        {"question": "What is the approximate timeline — next academic year, or planning 2–3 years out?"},
    ],
    "EVENT_PLANNING": [
        {"question": "What type of event is this — corporate, social, cultural, or personal celebration?"},
        {"question": "What is the expected number of attendees and the target city?"},
        {"question": "Do you have a fixed date and budget in mind, or is this still in early scoping?"},
    ],

    # ── Tier 4: Universal Domains ─────────────────────────────────────────────
    "HOUSING_AND_LOCATION": [
        {"question": "Are you looking to rent, buy, or resolve a current housing issue?"},
        {"question": "Which city or area are you focusing on?"},
        {"question": "What is your approximate timeline — immediate need, or planning ahead?"},
    ],
    "WORK_AND_CAREER": [
        {"question": "What is the main goal — finding a new job, growing in your current role, or changing careers entirely?"},
        {"question": "Which industry or domain are you working in or targeting?"},
        {"question": "Do you have a timeline in mind, such as a target start date or a deadline?"},
    ],
    "EDUCATION_AND_LEARNING": [
        {"question": "What level of education or learning are you planning — school, undergraduate, postgraduate, or professional certification?"},
        {"question": "Is this for yourself or for someone else (e.g., a child)?"},
        {"question": "Do you have a specific institution or country in mind, or are you still exploring options?"},
    ],
    "HEALTH_AND_DISABILITY": [
        {"question": "Is this about managing an existing condition, getting a diagnosis, or accessing disability support?"},
        {"question": "Do you have active health insurance, and does it cover the treatment or support you need?"},
        {"question": "Is there an immediate urgency — an ongoing medical situation — or is this longer-term planning?"},
    ],
    "FAMILY_AND_RELATIONSHIPS": [
        {"question": "What is the main situation — a new family addition, a separation, caring for a family member, or something else?"},
        {"question": "Are there legal or financial aspects that need to be addressed alongside the personal side?"},
        {"question": "Is there a specific deadline or urgency we should plan around?"},
    ],
    "MONEY_AND_ASSETS": [
        {"question": "What is the primary financial goal — saving, investing, managing debt, or protecting assets?"},
        {"question": "Are there any major upcoming expenses or life events (like buying a home, retirement, or education) we should factor in?"},
        {"question": "Do you currently have an investment portfolio, insurance, or savings plan we can build on?"},
    ],
    "LEGAL_AND_IDENTITY": [
        {"question": "Is this a renewal of an existing document or a first-time application?"},
        {"question": "How urgently do you need it — is there a specific deadline or travel date we're working towards?"},
        {"question": "Which country are you applying in? (This determines the exact process and official fees.)"},
    ],
    "PARENTING_AND_CAREGIVING": [
        {"question": "What is the primary challenge right now — school admission, healthcare, legal guardianship, or daily care logistics?"},
        {"question": "What is your child's or dependent's age?"},
        {"question": "Is there a specific deadline or event driving this, such as a school term start or a medical appointment?"},
    ],
    "LOSS_AND_CRISIS": [
        {"question": "What is the most urgent practical matter right now — financial, legal, housing, or emotional support?"},
        {"question": "Are there time-sensitive legal or financial tasks (such as a will, insurance claim, or property transfer) that need immediate attention?"},
        {"question": "Do you have a support network in place, or do you also need help identifying resources and services?"},
    ],
    "PERSONAL_GROWTH": [
        {"question": "What area of personal growth are you focusing on — mental health, habits, relationships, skills, or something else?"},
        {"question": "Is there a specific goal or outcome you have in mind for the next 3–6 months?"},
        {"question": "Are you looking for a structured plan, resources to explore, or accountability milestones?"},
    ],

    # ── New High-Impact Categories ─────────────────────────────────────────────
    "HOME_PURCHASE_PROCESS": [
        {"question": "Are you looking at a new property or a resale property?"},
        {"question": "Which city and approximate budget are you working with?"},
        {"question": "Are you planning to take a home loan, or is this a self-funded purchase?"},
    ],
    "STUDY_ABROAD": [
        {"question": "Which country and university are you targeting?"},
        {"question": "What intake are you applying for — September/January of which year?"},
        {"question": "Have you started your standardized tests (IELTS/TOEFL/GRE), or is that still pending?"},
    ],
    "GRADUATE_STUDIES": [
        {"question": "Are you applying for a Masters, PhD, or a professional postgraduate program?"},
        {"question": "Is this in India or abroad — and if abroad, which country?"},
        {"question": "Have you shortlisted universities, or are you still in the research and exam preparation phase?"},
    ],
    "PET_ADOPTION": [
        {"question": "What type of pet are you planning to adopt — dog, cat, or another animal?"},
        {"question": "Are you adopting from a shelter or rescue, or buying from a breeder?"},
        {"question": "Which city are you in? (This affects local registration, vet access, and housing rules.)"},
    ],
    "VOLUNTEER_WORK": [
        {"question": "What cause or area are you passionate about — education, environment, healthcare, or community welfare?"},
        {"question": "Are you looking for local volunteering opportunities or international programs (like VSO or UN Volunteers)?"},
        {"question": "How much time can you commit — a few hours a week, full-time, or a specific project duration?"},
    ],
    "ESTATE_PLANNING": [
        {"question": "Do you currently have a will in place, or is this the starting point?"},
        {"question": "What are the key assets to plan around — property, investments, business interests, or insurance?"},
        {"question": "Are there any specific beneficiaries or dependents (minor children, elderly parents) whose future needs are a priority?"},
    ],
    "PARENTAL_LEAVE": [
        {"question": "Is this for maternity, paternity, or adoption leave?"},
        {"question": "Are you employed by a private company, a government body, or self-employed?"},
        {"question": "Do you know your company's leave policy, and have you checked your ESIC or insurance maternity benefit eligibility?"},
    ],
    "GRIEF_SUPPORT": [
        {"question": "Are you primarily looking for emotional and mental health support resources, or practical help with legal and financial matters after a loss?"},
        {"question": "Are there immediate tasks like estate settlement, insurance claims, or government notifications that need to be handled?"},
        {"question": "Is this recent, or are you dealing with the longer-term aftermath of a loss?"},
    ],
    "TRAVEL_RELOCATION": [
        {"question": "Is this a temporary relocation (e.g., a work assignment abroad) or a permanent move?"},
        {"question": "Which country or city are you travelling and relocating to?"},
        {"question": "What is the primary driver — a job offer, personal choice, education, or family?"},
    ],
    "FREELANCE_SETUP": [
        {"question": "What type of freelance work are you setting up — creative, technical, consulting, or another field?"},
        {"question": "Are you in India or abroad, and do you need to register as an MSME or set up formal invoicing?"},
        {"question": "Do you already have clients lined up, or do you also need help with finding work and building a presence?"},
    ],
}

# ──────────────────────────────────────────────────────────────────────────────
# Context-aware question filter
# Detects what the user's input already answers and removes those questions.
# Covers all 53 LifeEventType categories + typo correction.
# ──────────────────────────────────────────────────────────────────────────────

# ---------------------------------------------------------------------------
# Typo correction
# ---------------------------------------------------------------------------

# Known terms users commonly misspell — used for fuzzy correction
_KNOWN_SPELLINGS: list[str] = [
    # Indian cities
    "bangalore", "bengaluru", "mumbai", "delhi", "pune", "hyderabad", "chennai",
    "kolkata", "ahmedabad", "jaipur", "surat", "lucknow", "chandigarh", "kochi",
    "goa", "noida", "gurugram", "gurgaon", "bhopal", "indore", "nagpur",
    "visakhapatnam", "vadodara", "patna", "coimbatore", "thiruvananthapuram",
    # Foreign cities / countries
    "canada", "australia", "germany", "france", "singapore", "malaysia",
    "ireland", "japan", "dubai", "toronto", "melbourne", "sydney", "london",
    "amsterdam", "zurich", "new zealand", "united states", "united kingdom",
    # Life-event keywords
    "passport", "visa", "aadhaar", "insurance", "relocation", "relocate",
    "retirement", "freelance", "mortgage", "inheritance", "adoption",
    "pregnancy", "trimester", "maternity", "paternity", "postpartum",
    "domicile", "certificate", "registration", "scholarship",
]


def _correct_typos(text: str) -> str:
    """
    Append fuzzy-corrected versions of misspelled words to the text so that
    downstream regex patterns can still match.  Only words ≥5 chars are checked.
    Returns original text + corrected tokens appended (never replaces original).
    """
    import difflib
    words = re.findall(r'\b[a-zA-Z]{5,}\b', text)
    corrections: list[str] = []
    text_lower = text.lower()
    for word in words:
        wl = word.lower()
        if wl in text_lower and any(wl == s for s in _KNOWN_SPELLINGS):
            continue  # already correctly spelled
        matches = difflib.get_close_matches(wl, _KNOWN_SPELLINGS, n=1, cutoff=0.82)
        if matches and matches[0] != wl:
            corrections.append(matches[0])
    if corrections:
        return text + " " + " ".join(corrections)
    return text


# ---------------------------------------------------------------------------
# Topic → question pattern  (what is a question asking about?)
# ---------------------------------------------------------------------------

_QUESTION_TOPICS: list[tuple[str, re.Pattern]] = [
    # Location / destination
    ("destination", re.compile(
        r"which city|which country|city or country|"
        r"where.{0,30}(move|relocat|going|travel|planning)|"
        r"which destination|what.{0,10}destination|destination city|destination country|"
        r"which (place|location)|"
        r"new city|move to a (new|different) city|"
        r"city.{0,15}or.{0,15}(same area|current area|within)|"
        r"also.{0,15}relocat|same city.{0,20}relocat|will you.{0,15}relocat",
        re.I
    )),
    # Reason / motivation
    ("reason", re.compile(
        r"primarily for|mainly for|purpose.{0,20}move|reason for (the )?move|"
        r"why are you|for work.{0,10}stud|work.{0,5}stud.{0,5}personal|"
        r"driver.{0,15}move|what.{0,10}bring(ing)? you|"
        r"primary (reason|driver|goal)|"
        r"leisure.{0,15}business|business.{0,15}leisure|"
        r"for leisure|for tourism|long.?term stay|"
        r"is this for (work|study|leisure|business|personal)",
        re.I
    )),
    # Timeline / deadline
    ("timeline", re.compile(
        r"timeline|target.{0,15}(date|month|time|age)|"
        r"when.{0,15}(moving|plan|relocat|happen|complet)|"
        r"how soon|how long|how many (years|months)|years away|"
        r"retirement age|1 month|3 months|6.? months|"
        r"in the next|planning to move|"
        r"start date|joining date|confirmed.{0,10}date|"
        r"do you have.{0,15}(confirmed|set).{0,10}(start|joining)|"
        r"exact.{0,10}(start|joining) date|"
        r"what intake|which intake|intake.{0,20}(year|month|semester)|"
        r"which (semester|term|batch|cohort|intake)",
        re.I
    )),
    # First job vs switching
    ("first_or_switch", re.compile(
        r"first job.{0,20}(switch|new company)|is this your first.{0,10}job|"
        r"first (full.?time|job).{0,20}(switch|previous)|"
        r"switching from a previous employer|first job or switch",
        re.I
    )),
    # Country (used by visa, international, NRI questions)
    ("country", re.compile(
        r"which country|what country|destination country|"
        r"country are you (apply|going|visiting|moving|travel)",
        re.I
    )),
    # Loan / financing preference
    ("loan_finance", re.compile(
        r"home loan|finance it|cash purchase|self.?fund|"
        r"loan (or|vs) (cash|self)|taking a loan",
        re.I
    )),
    # New vs resale property
    ("new_or_resale", re.compile(
        r"new (property|flat|house|apartment)|resale|new or.{0,10}resale",
        re.I
    )),
    # Visa type
    ("visa_type", re.compile(
        r"type of visa|which visa|work.{0,15}student.{0,15}tourist|"
        r"what (kind|type) of visa",
        re.I
    )),
    # Education level / program type
    ("education_level", re.compile(
        r"masters.{0,15}phd|phd.{0,15}masters|postgraduate program|"
        r"masters, phd, or professional|what level|which program",
        re.I
    )),
    # Business type
    ("business_type", re.compile(
        r"type of business|product.{0,10}service.{0,10}tech|"
        r"what (kind|type) of (business|company|venture)|"
        r"product, service",
        re.I
    )),
    # Wedding / marriage date or ceremony type
    ("wedding_timing", re.compile(
        r"target wedding date|when.{0,15}(wedding|ceremony|married)|"
        r"wedding date|getting married",
        re.I
    )),
    ("ceremony_type", re.compile(
        r"civil.{0,15}ceremony|religious.{0,15}ceremony|civil.{0,15}religious|"
        r"type of (ceremony|wedding)|court marriage",
        re.I
    )),
    # Pregnancy stage
    ("pregnancy_stage", re.compile(
        r"which trimester|how far along|due date|trimester|"
        r"stage of (pregnancy|expecting)|early planning",
        re.I
    )),
    # Insurance coverage status
    ("insurance_status", re.compile(
        r"do you have.{0,25}insurance|active.{0,15}insurance|"
        r"health insurance.{0,20}covered|insurance coverage",
        re.I
    )),
    # Pet type
    ("pet_type", re.compile(
        r"type of pet|what type of pet|dog.{0,10}cat|cat.{0,10}dog|"
        r"another animal",
        re.I
    )),
    # Child info (age / grade)
    ("child_info", re.compile(
        r"child.{0,20}(grade|age|year)|grade or age|"
        r"what (grade|age|year).{0,15}child|how old.{0,10}child",
        re.I
    )),
    # Debt type
    ("debt_type", re.compile(
        r"type.{0,10}(debt|loan)|personal loan.{0,10}credit|"
        r"credit card.{0,10}home loan|what (kind|type) of debt",
        re.I
    )),
    # Vehicle: new vs used
    ("vehicle_type", re.compile(
        r"new vehicle|used (vehicle|car|bike)|"
        r"new or.{0,10}used|(new|used).{0,10}(car|bike|vehicle)",
        re.I
    )),
    # Permanency of move
    ("permanency", re.compile(
        r"permanent.{0,15}temporar|permanently.{0,10}temporar|"
        r"permanent(ly)? return|temporary (stay|assignment|relocation)|"
        r"is this.{0,15}(permanent|temporary)",
        re.I
    )),
    # Adoption type (domestic vs international)
    ("adoption_type", re.compile(
        r"domestic.{0,20}international|international.{0,20}domestic|"
        r"within india.{0,10}abroad|domestic or international adoption",
        re.I
    )),
    # Elder's location / living situation
    ("elder_location", re.compile(
        r"living with you|in their (own )?home|care facility|"
        r"where (is|are) your (parent|elder|mother|father)",
        re.I
    )),
    # Insurance plan type (individual vs family floater vs top-up)
    ("insurance_plan_type", re.compile(
        r"individual.{0,20}family floater|family floater.{0,20}individual|"
        r"top.?up|what (type|kind) of (health |medical )?insurance|"
        r"individual.{0,10}(plan|policy|insurance)|family floater",
        re.I
    )),
    # Elder's care needs
    ("elder_needs", re.compile(
        r"most urgent needs|primary (need|concern)|"
        r"medical.{0,15}financial.{0,15}(care|daily)|"
        r"daily care.{0,20}medical",
        re.I
    )),
    # Savings / retirement corpus
    ("savings_status", re.compile(
        r"existing (retirement )?savings|current savings|epf.{0,10}ppf|"
        r"do you have.{0,20}(savings|investments|portfolio)",
        re.I
    )),
    # Landlord vs tenant
    ("landlord_or_tenant", re.compile(
        r"landlord or tenant|are you the (landlord|tenant)",
        re.I
    )),
    # Event headcount / type
    ("event_type", re.compile(
        r"type of event|what (kind|type) of event|"
        r"corporate.{0,10}social|personal celebration",
        re.I
    )),
    # Accommodation already sorted
    ("accommodation_status", re.compile(
        r"accommodation lined up|place to stay|housing.{0,20}sorted|"
        r"found a (place|flat|pg|room)|accommodation (sorted|arranged|booked)|"
        r"already have.{0,15}(place|flat|accommodation|housing)",
        re.I
    )),
    # Work mode (remote / hybrid / office)
    ("work_mode", re.compile(
        r"remote|hybrid|office.?based|work from (home|office)|"
        r"fully (remote|office)|wfh|in.?office role",
        re.I
    )),
    # Moving alone vs with family
    ("family_moving", re.compile(
        r"moving alone|just (me|myself)|solo (move|relocation)|"
        r"family (staying|not coming|remaining)|not relocating (my )?family",
        re.I
    )),
    # Previous employer clearances sorted
    ("previous_clearance", re.compile(
        r"relieving letter|noc (from|issued)|pf (transferred|done|sorted)|"
        r"clearance (done|sorted|obtained)|got my noc",
        re.I
    )),
    # Loan pre-approval
    ("loan_preapproval", re.compile(
        r"pre.?approved|loan (sanctioned|approved|in principle)|"
        r"home loan (approved|sanctioned)",
        re.I
    )),
    # Home purpose (primary / investment / second home)
    ("home_type", re.compile(
        r"primary (home|residence|house)|main home|own use|"
        r"investment property|rental (property|income)|second home",
        re.I
    )),
    # Work authorization for international relocation
    ("work_permit", re.compile(
        r"work permit|employment pass|work visa|h.?1b|tier.?2 visa|"
        r"work authorization|right to work",
        re.I
    )),
    # Co-founders / founding team
    ("cofounders", re.compile(
        r"solo founder|sole founder|co.?founder|founding team of|"
        r"two (of us|founders)|three (of us|founders)",
        re.I
    )),
    # Venue status for events / weddings
    ("venue_status", re.compile(
        r"venue (booked|confirmed|shortlisted|sorted|finalised|finalized)|"
        r"(booked|confirmed|have a) venue",
        re.I
    )),
    # Passport validity
    ("passport_valid", re.compile(
        r"passport.{0,20}(valid|expires|renewed|renewal done)|"
        r"valid passport|renewed (my )?passport",
        re.I
    )),
    # Financial proof / funds documentation
    ("funds_doc", re.compile(
        r"(proof of funds|bank statements|financial (proof|documents)).{0,20}(ready|done|prepared)|"
        r"have (my )?bank statements|funds (ready|sorted)",
        re.I
    )),
    # NRI asset disclosure
    ("foreign_assets", re.compile(
        r"foreign (assets|accounts|investments)|"
        r"overseas (assets|bank|investments)|repatriate",
        re.I
    )),
]

# ---------------------------------------------------------------------------
# Topic → input signal  (what does the user's text already tell us?)
# ---------------------------------------------------------------------------

_INPUT_PROVIDES: list[tuple[str, re.Pattern]] = [
    # Explicit "no relocation" / same city signals
    ("destination", re.compile(
        r"\b(no relocation|not relocating|same city|staying in (my |the )?(same |current )?(city|location|place)|"
        r"local (role|job|opportunity|position)|won't (be )?relocat|not moving)\b",
        re.I
    )),
    # City / country (destination or general location)
    ("destination", re.compile(
        r"\b(bangalore|bengaluru|mumbai|bombay|delhi|new delhi|pune|hyderabad|"
        r"chennai|madras|kolkata|calcutta|ahmedabad|jaipur|surat|lucknow|"
        r"chandigarh|kochi|cochin|goa|noida|gurugram|gurgaon|bhopal|indore|"
        r"nagpur|visakhapatnam|vizag|vadodara|baroda|patna|coimbatore|"
        r"thiruvananthapuram|trivandrum|bhubaneswar|"
        r"usa|uk|united states|united kingdom|canada|australia|new zealand|"
        r"singapore|dubai|uae|germany|france|ireland|malaysia|japan|"
        r"toronto|melbourne|sydney|london|amsterdam|zurich)\b",
        re.I
    )),
    # Reason / motivation for the event
    ("reason", re.compile(
        r"\b(new job|got a job|job offer|got an offer|start\w{0,5} job|joining|"
        r"for work|for study|for studies|to study|for school|family reason|"
        r"personal reason|for family|fresh start|got (a|the) role|"
        r"accepted.{0,15}offer|career (move|opportunity)|"
        r"for leisure|for tourism|for (a )?(holiday|vacation|trip)|leisure trip|"
        r"for business|business trip|for sightseeing)\b",
        re.I
    )),
    # Timeline / deadline already given
    ("timeline", re.compile(
        r"\b(next month|this month|next week|"
        r"next (january|february|march|april|may|june|july|august|september|october|november|december)|"
        r"by (january|february|march|april|may|june|july|august|september|october|november|december)|"
        r"in \d+ (days?|weeks?|months?|years?)|within \d+ (days?|weeks?|months?)|"
        r"asap|immediately|by end of (month|year|quarter)|deadline|"
        r"joining (in|on|by)|start(ing|s)? (in|on|by)|"
        r"retire (at|by) \d+|retirement (at|age) \d+|want to retire at|"
        r"intake (january|february|march|april|may|june|july|august|september|october|november|december)|"
        r"(september|january|march|july) \d{4} intake)\b",
        re.I
    )),
    # First job vs switching (job onboarding context)
    ("first_or_switch", re.compile(
        r"\b(first job|my first job|first full.?time|switching from|"
        r"currently (at|working at)|previous (company|employer|job))\b",
        re.I
    )),
    # Foreign country mentioned (visa / international context)
    ("country", re.compile(
        r"\b(usa|uk|united states|united kingdom|canada|australia|new zealand|"
        r"germany|france|singapore|dubai|uae|ireland|malaysia|japan|"
        r"europe|schengen|europe|middle east)\b",
        re.I
    )),
    # Financing preference stated
    ("loan_finance", re.compile(
        r"\b(home loan|bank loan|taking a loan|need a loan|with a loan|"
        r"self.?funded|self.?fund|cash purchase|paying cash|no loan|own savings|"
        r"without loan|loan.{0,15}sanction)\b",
        re.I
    )),
    # New vs resale property
    ("new_or_resale", re.compile(
        r"\b(new (flat|apartment|property|house|home|project)|"
        r"under.?construction|resale|second.?hand|"
        r"ready.?to.?move|existing (flat|house|property))\b",
        re.I
    )),
    # Visa type already mentioned
    ("visa_type", re.compile(
        r"\b(student visa|work visa|tourist visa|visitor visa|"
        r"family visa|dependent visa|employment visa|"
        r"business visa|pr visa|permanent resident visa)\b",
        re.I
    )),
    # Education level / program type
    ("education_level", re.compile(
        r"\b(masters|master's degree|mba|m\.b\.a|phd|ph\.d|postgrad\w*|"
        r"bachelor\w*|b\.tech|b\.e\.|undergraduate|diploma|bootcamp)\b",
        re.I
    )),
    # Business type or sector
    ("business_type", re.compile(
        r"\b(tech startup|saas|e.?commerce|retail (business|shop)|restaurant|"
        r"salon|cafe|consulting (firm|business)|freelance (work|business)|"
        r"service (business|company)|product (company|startup)|"
        r"manufacturing|fashion|food business)\b",
        re.I
    )),
    # Wedding / marriage timing
    ("wedding_timing", re.compile(
        r"\b(wedding (date|in|on)|getting married (in|on|by)|"
        r"marriage (date|scheduled|planned)|next year.{0,10}wedding|"
        r"wedding (next|this) (year|month))\b",
        re.I
    )),
    # Ceremony type / style
    ("ceremony_type", re.compile(
        r"\b(civil (wedding|ceremony|marriage)|court marriage|"
        r"registered marriage|hindu (wedding|ceremony)|"
        r"christian (wedding|ceremony)|nikah|arya samaj|"
        r"destination wedding|intimate (wedding|ceremony))\b",
        re.I
    )),
    # Pregnancy stage
    ("pregnancy_stage", re.compile(
        r"\b(first trimester|second trimester|third trimester|"
        r"\d+ weeks (pregnant|along)|due (in|on)|expecting in|"
        r"\d+ months (pregnant|along)|just found out (i am|i'm) pregnant)\b",
        re.I
    )),
    # Insurance coverage — user already has it
    ("insurance_status", re.compile(
        r"\b(have (health |medical )?insurance|covered (by|under)|"
        r"insurance through (my |the )?employer|"
        r"active (health |medical )?insurance|company.{0,15}insurance|"
        r"my policy|policy (number|holder))\b",
        re.I
    )),
    # Pet type specified
    ("pet_type", re.compile(
        r"\b(adopt\w* (a |an )?(dog|cat|puppy|kitten|rabbit|bird)|"
        r"(a |my )(dog|cat|puppy|kitten|rabbit|hamster|guinea pig))\b",
        re.I
    )),
    # Child age / grade mentioned
    ("child_info", re.compile(
        r"\b(\d+.?year.?old (son|daughter|child|kid)|"
        r"(son|daughter|child|kid).{0,15}\d+.?year|"
        r"(class|grade|std) \d+|std \d+|"
        r"(my )?(son|daughter).{0,20}(class|grade|year))\b",
        re.I
    )),
    # Debt type
    ("debt_type", re.compile(
        r"\b(credit card (debt|bill|dues)|personal loan|car loan|"
        r"home loan (debt|emi)|student loan|education loan|"
        r"owe \d|outstanding (loan|emi|amount))\b",
        re.I
    )),
    # Vehicle type (car / bike / scooter etc.)
    ("vehicle_type", re.compile(
        r"\b(buy(ing)? (a |an )?(new|used|second.?hand)? ?(car|bike|scooter|"
        r"motorcycle|suv|sedan|hatchback|ev|electric (car|vehicle)|"
        r"two.?wheeler|four.?wheeler))\b",
        re.I
    )),
    # Permanency of move / return
    ("permanency", re.compile(
        r"\b(permanently|settling (down|in)|permanent (move|return|relocation)|"
        r"temporary (stay|assignment|posting)|for (a year|\d+ months))\b",
        re.I
    )),
    # Adoption type
    ("adoption_type", re.compile(
        r"\b(domestic adoption|international adoption|"
        r"adopt(ing)? from (india|abroad|internationally)|cara)\b",
        re.I
    )),
    # Elder's living situation
    ("elder_location", re.compile(
        r"\b((parent|mother|father|elder).{0,25}(living with (me|us)|"
        r"in (their|our|my) (home|house)|in a care|old age home)|"
        r"(living with me|at home).{0,15}(parent|mother|father))\b",
        re.I
    )),
    # Insurance plan type (individual / floater / top-up)
    ("insurance_plan_type", re.compile(
        r"\b(family floater|individual.{0,15}(plan|policy|insurance)|"
        r"top.?up (plan|policy)|super top.?up)\b",
        re.I
    )),
    # Elder's care needs already stated
    ("elder_needs", re.compile(
        r"\b(daily care|medical care|needs (daily|medical|financial) (care|support|help)|"
        r"(daily|medical|financial) (care|support|help)|"
        r"dementia|bedridden|full.?time care)\b",
        re.I
    )),
    # Retirement savings status
    ("savings_status", re.compile(
        r"\b(epf|ppf|nps|mutual funds|sip|portfolio|"
        r"existing (savings|investments)|retirement (corpus|savings|fund))\b",
        re.I
    )),
    # Landlord or tenant role
    ("landlord_or_tenant", re.compile(
        r"\b((i am|i'm) (the )?(landlord|tenant|owner|renter)|"
        r"as (a |the )(landlord|tenant|owner))\b",
        re.I
    )),
    # Event type / headcount
    ("event_type", re.compile(
        r"\b(corporate (event|conference|summit)|birthday (party|celebration)|"
        r"anniversary (event|party)|product launch|team (outing|event)|"
        r"for \d+ (people|guests|attendees))\b",
        re.I
    )),
    # NRI foreign assets disclosure
    ("foreign_assets", re.compile(
        r"\b(nro\b|nre\b|nre (accounts?|fds?)|foreign (accounts?|assets|investments)|"
        r"overseas (savings|investments|property)|fema|fcnr)\b",
        re.I
    )),
    # Accommodation already sorted
    ("accommodation_status", re.compile(
        r"\b(have (my )?(accommodation|place|flat|room|pg) (sorted|booked|arranged|ready)|"
        r"already (found|got|have) (a |an )?(place|flat|room|accommodation|pg)|"
        r"place to stay (sorted|ready|arranged)|accommodation (sorted|arranged|booked)|"
        r"staying (at|in) a (flat|room|pg|place|hotel))\b",
        re.I
    )),
    # Work mode stated explicitly
    ("work_mode", re.compile(
        r"\b(fully remote|remote (role|job|work|position)|hybrid (role|job|position)|"
        r"office.?based (role|job|position)|work from home|wfh|"
        r"(the )?role is (remote|hybrid|office.?based)|"
        r"(the )?job is (remote|hybrid|office.?based)|in.?office (role|job))\b",
        re.I
    )),
    # Moving alone vs with family
    ("family_moving", re.compile(
        r"\b(moving alone|just (me|myself) (moving|relocating)|solo (move|relocation)|"
        r"family (staying|not coming|remaining|not moving|won.t be moving)|"
        r"(my )?family.{0,20}(staying|not relocating|not moving)|"
        r"not (relocating|moving) (my )?family)\b",
        re.I
    )),
    # Previous employer clearances sorted
    ("previous_clearance", re.compile(
        r"\b(relieving letter (done|received|issued|in hand|obtained)|"
        r"(got|have|received) (my )?(relieving letter|noc|clearance)|"
        r"pf (transferred|done|completed|sorted)|clearance (done|sorted|completed|obtained))\b",
        re.I
    )),
    # Home loan pre-approval
    ("loan_preapproval", re.compile(
        r"\b(pre.?approved (for )?(a |the )?loan|loan (sanctioned|in principle|approved)|"
        r"home loan (approved|sanctioned|pre.?approved)|"
        r"loan (approval|sanction) (done|received|sorted))\b",
        re.I
    )),
    # Home purpose stated
    ("home_type", re.compile(
        r"\b(primary (home|residence|house|property)|main (home|house|residence)|"
        r"for (own|self) (use|occupation)|investment (property|flat|house|apartment)|"
        r"second (home|property|house)|rental (property|income|purpose))\b",
        re.I
    )),
    # Work permit / work authorization sorted
    ("work_permit", re.compile(
        r"\b((have|got) (my |a )?(work permit|employment pass|h.?1b|tier.?2|right to work)|"
        r"work permit (done|approved|in hand|received|sorted)|"
        r"work visa (approved|issued|in hand|done))\b",
        re.I
    )),
    # Co-founders / founding team
    ("cofounders", re.compile(
        r"\b(sole (founder|co.?founder)|co.?founder(s)?\b|founding team of \d+|"
        r"(two|three|four) (of us|founders|co.?founders)|"
        r"starting (it |this )?(alone|solo|by myself))\b",
        re.I
    )),
    # Venue booked / confirmed
    ("venue_status", re.compile(
        r"\b(venue (booked|confirmed|sorted|shortlisted|finalized|finalised|decided)|"
        r"(booked|confirmed|found|have) (a |our |the )?venue|"
        r"venue is (done|set|confirmed|ready))\b",
        re.I
    )),
    # Passport valid / renewed
    ("passport_valid", re.compile(
        r"\b(passport (is )?(valid|renewed|current|up.?to.?date)|"
        r"valid passport|(have|got|renewed) (a |my )?valid passport|"
        r"passport.{0,20}(doesn.t|does not|won.t) (need|require) renewal)\b",
        re.I
    )),
    # Proof of funds / financial documents ready
    ("funds_doc", re.compile(
        r"\b((proof of funds|bank statements|financial (proof|documents|paperwork)).{0,20}(ready|done|prepared|have)|"
        r"(have|got) (my )?(bank statements|financial proof|proof of funds)|"
        r"funds (ready|sorted|documented|in order))\b",
        re.I
    )),
]


def _filter_answered_questions(questions: list[dict], user_text: str) -> list[dict]:
    """
    Remove questions whose answers are already present in the user's input.

    Steps:
      1. Correct likely typos in the text so regex still matches misspelled cities/terms.
      2. Identify which fact-topics are already covered in the (corrected) input.
      3. Drop questions that ask about already-covered topics.

    Returns the filtered list — may be empty (caller should skip clarification).
    """
    normalized = _correct_typos(user_text)

    already_known: set[str] = set()
    for topic, pattern in _INPUT_PROVIDES:
        if pattern.search(normalized):
            already_known.add(topic)

    if not already_known:
        return questions  # nothing to filter

    filtered = []
    for q in questions:
        redundant = False
        q_text = q.get("question", "")
        for topic, pattern in _QUESTION_TOPICS:
            if topic in already_known and pattern.search(q_text):
                redundant = True
                break
        if not redundant:
            filtered.append(q)

    return filtered


# Generic fallback for any type not in the map (should rarely trigger now)
_GENERIC_FALLBACK = [
    {"question": "Could you describe the main goal or outcome you're working towards in a bit more detail?"},
    {"question": "Is there a specific city, country, or deadline we should build the plan around?"},
    {"question": "Is there a particular aspect you'd like to start with — documents, finances, or logistics?"},
]

# ──────────────────────────────────────────────────────────────────────────────
# Smart operational questions — asked when basic info is already known.
# These target factors that significantly change the workflow but are
# rarely stated upfront. One or two per event type.
# ──────────────────────────────────────────────────────────────────────────────

_SMART_QUESTIONS: dict[str, list[dict]] = {
    "RELOCATION": [
        {"question": "Do you already have accommodation lined up at your destination, or do you need help finding a place?"},
        {"question": "Are you moving alone, or is your family relocating with you? (This affects the scale of the planning.)"},
    ],
    "JOB_ONBOARDING": [
        {"question": "Is the role fully office-based, hybrid, or remote? (This affects relocation and commute planning.)"},
        {"question": "Are there any pending clearances from your previous employer — relieving letter, NOC, or PF transfer?"},
    ],
    "FAMILY_RELOCATION": [
        {"question": "Does the destination city have suitable schooling options for your children, and have you started researching admissions?"},
        {"question": "Will both earning members need to find work at the new location, or is one partner's employment already confirmed?"},
    ],
    "CAREER_TRANSITION": [
        {"question": "Do you have an emergency fund to cover 3–6 months of expenses during the transition period?"},
        {"question": "Does the target role require any new certifications or skills that you'll need to acquire before joining?"},
    ],
    "CAREER_UPSKILLING": [
        {"question": "Do you have a specific certification or credential in mind, or are you open to recommendations?"},
        {"question": "Are you preparing for this while currently employed, or do you have dedicated full-time learning time?"},
    ],
    "HOME_PURCHASE": [
        {"question": "Have you already been pre-approved for a home loan, or does that need to be arranged first?"},
        {"question": "Are you buying this as a primary residence, a second home, or an investment property?"},
    ],
    "HOME_PURCHASE_PROCESS": [
        {"question": "Have you already been pre-approved for a home loan, or does that need to be arranged first?"},
        {"question": "Are you buying this as a primary residence, a second home, or an investment property?"},
    ],
    "RENTAL_VERIFICATION": [
        {"question": "Do you also need a rent agreement or lease drafted, or do you already have one ready?"},
        {"question": "Is the property furnished, semi-furnished, or unfurnished? (Affects your move-in checklist.)"},
    ],
    "MARRIAGE_PLANNING": [
        {"question": "Will both families be heavily involved in the planning, or is this primarily a couple-driven celebration?"},
        {"question": "Are there any cross-city or outstation arrangements — guests travelling far, or a destination venue?"},
    ],
    "PREGNANCY_PREPARATION": [
        {"question": "Have you shortlisted hospitals or birthing centers, and do you know their maternity package costs?"},
        {"question": "Is your partner or a close family member actively involved in the preparation, or are you primarily planning solo?"},
    ],
    "POSTPARTUM_WELLNESS": [
        {"question": "Will you have family support at home after the birth, or are you planning professional help like a nurse or nanny?"},
        {"question": "Have you connected with a pediatrician and scheduled the newborn's first check-ups?"},
    ],
    "PARENTAL_LEAVE": [
        {"question": "Have you formally notified your employer about the expected leave start and end dates?"},
        {"question": "Do you know your exact entitlement — days of paid leave, any top-up pay, and the return-to-work process?"},
    ],
    "CHILD_SCHOOL_TRANSITION": [
        {"question": "Has the new school confirmed the admission offer, or is the application still being processed?"},
        {"question": "Does your child have any special requirements — learning support, medical conditions — that need to be shared with the new school?"},
    ],
    "VISA_APPLICATION": [
        {"question": "Do you have a valid passport with at least 6 months remaining validity, or does that need to be renewed first?"},
        {"question": "Is this your first visa application for this country, or have you held one before? (Prior visas can affect processing.)"},
    ],
    "STUDY_ABROAD": [
        {"question": "Do you have a valid passport with sufficient validity for the program duration, or does it need renewal?"},
        {"question": "Have you arranged your proof of funds or financial documentation needed for the visa and university application?"},
    ],
    "GRADUATE_STUDIES": [
        {"question": "Have you secured funding — scholarship, fellowship, or self-funded — or is that still being arranged?"},
        {"question": "Does the program require a supervisor or research proposal confirmation, or is it a coursework-based admission?"},
    ],
    "EDUCATIONAL_ENROLLMENT": [
        {"question": "Is the admission for the upcoming academic year, or for a future intake?"},
        {"question": "Have you cleared the relevant entrance exams (JEE, NEET, CUET, etc.), or is exam preparation still part of the plan?"},
    ],
    "EDUCATION_FINANCING": [
        {"question": "Have you explored institution-specific scholarships, state government schemes, or the Vidya Lakshmi portal?"},
        {"question": "Do you have a co-applicant — a parent or guardian — available for a joint loan application?"},
    ],
    "BUSINESS_STARTUP": [
        {"question": "Will you be the sole founder, or do you have co-founders on board already?"},
        {"question": "Do you have a target launch date or MVP timeline in mind?"},
    ],
    "WOMEN_ENTREPRENEURSHIP": [
        {"question": "Do you already have a product or service ready, or are you still in the ideation or development phase?"},
        {"question": "Are you targeting retail consumers, B2B clients, government contracts, or an online marketplace?"},
    ],
    "FREELANCE_SETUP": [
        {"question": "Do you already have clients or contracts lined up, or is finding your first clients also part of the plan?"},
        {"question": "Do you need to set up dedicated workspace, equipment, or software tools for your freelance work?"},
    ],
    "VEHICLE_PURCHASE": [
        {"question": "Do you have a specific make or model shortlisted, or are you still comparing options?"},
        {"question": "Are you planning to trade in an existing vehicle, or is this a fresh purchase?"},
    ],
    "NRI_RETURN_TO_INDIA": [
        {"question": "Are you shipping household goods or significant personal property that will go through customs?"},
        {"question": "Do you need to re-establish local essentials from scratch — bank account, SIM card, credit history — or are some still active?"},
    ],
    "REPATRIATION": [
        {"question": "Have you contacted the Indian Embassy or Consulate in the country where the death occurred?"},
        {"question": "Are there other family members coordinating on-ground who need to be connected with the relevant officials?"},
    ],
    "MEDICAL_EMERGENCY": [
        {"question": "Do you have immediate access to the insurance policy documents and the TPA (Third Party Administrator) helpline number?"},
        {"question": "Is the patient currently admitted, or are you proactively preparing an emergency response plan?"},
    ],
    "HEALTH_INSURANCE": [
        {"question": "Do you have any pre-existing conditions — diabetes, hypertension, thyroid — that need to be covered?"},
        {"question": "Is there a specific upcoming procedure or hospitalization you need coverage for urgently?"},
    ],
    "WELLNESS_MANAGEMENT": [
        {"question": "Have you recently had a health check-up or consulted a doctor about this concern?"},
        {"question": "Are you looking for a structured program (hospital, wellness center) or self-directed resources (apps, diet plans)?"},
    ],
    "WORKPLACE_WELLNESS": [
        {"question": "Have you spoken to your manager or HR about your wellness needs, or is this something you're exploring privately first?"},
        {"question": "Are you looking for immediate support resources, or planning a longer-term structured wellness program?"},
    ],
    "ELDERCARE_MANAGEMENT": [
        {"question": "Does your elder have a current primary care physician, and are their medical records and prescriptions organized?"},
        {"question": "Are there any ongoing medications, chronic conditions, or scheduled procedures we should factor into the care plan?"},
    ],
    "RETIREMENT_PLANNING": [
        {"question": "Do you own real estate or have rental income that should be factored into your retirement corpus plan?"},
        {"question": "Will you need to financially support dependents — children's education or parents' care — during your retirement years?"},
    ],
    "DEBT_MANAGEMENT": [
        {"question": "Are any of your loans or credit card dues already in default or sent to collections?"},
        {"question": "Have you explored debt consolidation, balance transfer, or restructuring with your lenders?"},
    ],
    "PROPERTY_INHERITANCE": [
        {"question": "Is the property registered solely in the deceased's name, or was it jointly held?"},
        {"question": "Are there any outstanding loans, mortgages, or liabilities attached to the property?"},
    ],
    "ESTATE_PLANNING": [
        {"question": "Have you identified a lawyer or financial planner to help with the will and asset transfer process?"},
        {"question": "Are there minor children who need a designated guardian specified in the will?"},
    ],
    "INTERNATIONAL_TRAVEL": [
        {"question": "Do you need any vaccinations or health clearances for your destination country?"},
        {"question": "Are you carrying any medications, valuables, or items that may need customs declaration?"},
    ],
    "TRAVEL_RELOCATION": [
        {"question": "Do you have the necessary work authorization — work permit or employment pass — sorted for the destination country?"},
        {"question": "Will you be shipping household goods, or starting fresh at the destination?"},
    ],
    "ADOPTION_PROCESS": [
        {"question": "Have you attended any pre-adoption counseling or orientation sessions yet?"},
        {"question": "Is your home environment and documentation ready for the home study process?"},
    ],
    "PET_ADOPTION": [
        {"question": "Does your current housing allow pets, and do you have your landlord's permission if you're renting?"},
        {"question": "Have you identified a local vet and looked into vaccination and registration requirements for your new pet?"},
    ],
    "WOMEN_DIVORCE_RECOVERY": [
        {"question": "Are there any joint assets — property, bank accounts, investments — that need to be legally separated or transferred?"},
        {"question": "Do you need to update your name on official documents such as Aadhaar, PAN, passport, and bank accounts?"},
    ],
    "GRIEF_SUPPORT": [
        {"question": "Are you connected with a counselor, therapist, or grief support group, or would that be helpful to plan for?"},
        {"question": "Are there practical responsibilities — minor children, property, dependents — that have now fallen to you?"},
    ],
    "LOSS_AND_CRISIS": [
        {"question": "Have you secured the original will, insurance policies, and important financial documents?"},
        {"question": "Is there an immediate financial need — funeral expenses, ongoing mortgage, or insurance claim — requiring urgent action?"},
    ],
    "ACADEMIC_PLANNING": [
        {"question": "Is this for exam preparation (JEE, NEET, UPSC, CAT, GMAT) or for a broader long-term academic path?"},
        {"question": "Do you have access to a mentor, coaching institute, or structured study material?"},
    ],
    "EVENT_PLANNING": [
        {"question": "Do you have a venue shortlisted or booked, or is that still being decided?"},
        {"question": "Are you managing the planning yourself, or working with an event management company?"},
    ],
    "VOLUNTEER_WORK": [
        {"question": "Are you looking for a one-time opportunity, a recurring weekly commitment, or a full-time volunteering placement?"},
        {"question": "Do you need any certifications, background checks, or mandatory training before you can start?"},
    ],
    "PERSONAL_GROWTH": [
        {"question": "Have you worked on this goal before? What approaches worked and what didn't?"},
        {"question": "Do you have an accountability partner, community, or support system in place, or would that be helpful?"},
    ],
    "HOUSING_AND_LOCATION": [
        {"question": "What is your approximate monthly budget for rent or EMI?"},
        {"question": "Are you open to sharing accommodation, or do you need an independent unit?"},
    ],
    "WORK_AND_CAREER": [
        {"question": "Do you have an updated resume and portfolio ready, or does that need to be refreshed first?"},
        {"question": "Are you actively applying right now, or still in an exploratory phase?"},
    ],
    "EDUCATION_AND_LEARNING": [
        {"question": "Is the primary goal a qualification for employment, a career change, personal enrichment, or something else?"},
        {"question": "Do you need financial support — scholarship or education loan — for this course?"},
    ],
    "HEALTH_AND_DISABILITY": [
        {"question": "Are you currently under a doctor's care for this condition, or are you seeking an initial consultation?"},
        {"question": "Do you need workplace accommodations or official disability documentation for any benefits or legal purposes?"},
    ],
    "FAMILY_AND_RELATIONSHIPS": [
        {"question": "Are there any children involved whose needs need to be prioritized in the planning?"},
        {"question": "Is there a legal component — marriage, divorce, adoption, or custody — that needs to be formally addressed?"},
    ],
    "MONEY_AND_ASSETS": [
        {"question": "Have you done a recent net worth assessment — listing all assets and liabilities — or would that be a useful first step?"},
        {"question": "Is there a specific financial goal with a hard deadline — a property down payment, business investment, or retirement?"},
    ],
    "LEGAL_AND_IDENTITY": [
        {"question": "Do you have an appointment booked at the relevant authority, or does that still need to be scheduled?"},
        {"question": "Are there any supporting documents that are currently expired or need renewal before you can apply for the main document?"},
    ],
    "PARENTING_AND_CAREGIVING": [
        {"question": "Is the primary caregiver currently employed, and how does that affect the availability for care responsibilities?"},
        {"question": "Are there any healthcare appointments or treatments coming up for your child or dependent that need to be coordinated?"},
    ],
    "WELLNESS_MANAGEMENT": [
        {"question": "Have you recently had a health check-up or consulted a doctor about this concern?"},
        {"question": "Are you looking for a structured program (hospital, wellness center) or self-directed resources (apps, diet plans)?"},
    ],
}


def _get_all_questions(key: str) -> list[dict]:
    """
    Combine basic info questions with smart operational questions for an event type.
    Basic questions come first so they're prioritised for vague inputs;
    smart questions appear after and show when basics are already answered.
    """
    basic = _FALLBACK_QUESTIONS.get(key, [])
    smart = _SMART_QUESTIONS.get(key, [])
    return basic + smart


def _get_fallback_for_events(detected_events: list[str]) -> list[dict]:
    """Pick the best combined question list based on detected event type."""
    for event in detected_events:
        if event in _FALLBACK_QUESTIONS or event in _SMART_QUESTIONS:
            return _get_all_questions(event)
    # Partial match (e.g., "LEGAL_AND_IDENTITY" covers PASSPORT)
    for event in detected_events:
        for key in _FALLBACK_QUESTIONS:
            if key in event or event in key:
                return _get_all_questions(key)
    return _GENERIC_FALLBACK


# ──────────────────────────────────────────────────────────────────────────────
# Keyword → event type map for Priority A matching
# Each tuple: (required_keywords, any_of_keywords, fallback_key)
# A match fires if ALL required_keywords are in upper_text AND
# at least one of any_of_keywords is in upper_text (or any_of is empty).
# ──────────────────────────────────────────────────────────────────────────────

_KEYWORD_RULES: list[tuple[list[str], list[str], str]] = [
    # Identity / passport / legal
    (["PASSPORT"], [], "LEGAL_AND_IDENTITY"),
    (["RENEW"], ["ID", "DOCUMENT", "LICENCE", "LICENSE", "CARD"], "LEGAL_AND_IDENTITY"),
    (["AADHAAR"], [], "LEGAL_AND_IDENTITY"),
    (["PAN CARD"], [], "LEGAL_AND_IDENTITY"),
    # Visa / travel
    (["VISA"], [], "VISA_APPLICATION"),
    (["INTERNATIONAL"], ["TRAVEL", "TRIP", "FLIGHT"], "INTERNATIONAL_TRAVEL"),
    (["TRAVEL"], ["ABROAD", "OVERSEAS", "FOREIGN"], "INTERNATIONAL_TRAVEL"),
    # Relocation
    (["RELOCAT"], [], "RELOCATION"),
    (["MOVING TO"], [], "RELOCATION"),
    (["MOVE"], ["CITY", "COUNTRY", "ABROAD", "NEW PLACE"], "RELOCATION"),
    (["FAMILY"], ["RELOCAT", "MOVING", "MOVE"], "FAMILY_RELOCATION"),
    # Job / career
    (["JOB"], ["OFFER", "JOINING", "ONBOARD", "START"], "JOB_ONBOARDING"),
    (["ONBOARDING"], [], "JOB_ONBOARDING"),
    (["CAREER"], ["CHANGE", "SWITCH", "TRANSITION", "PIVOT"], "CAREER_TRANSITION"),
    (["QUIT"], ["JOB", "ROLE"], "CAREER_TRANSITION"),
    (["RESIGN"], [], "CAREER_TRANSITION"),
    (["LEARN"], ["SKILL", "COURSE", "PYTHON", "CODING", "CERTIF"], "CAREER_UPSKILLING"),
    (["UPSKILL"], [], "CAREER_UPSKILLING"),
    (["FREELANC"], [], "FREELANCE_SETUP"),
    (["FREELANCE"], [], "FREELANCE_SETUP"),
    # Business
    (["STARTUP"], [], "BUSINESS_STARTUP"),
    (["START"], ["BUSINESS", "COMPANY", "VENTURE"], "BUSINESS_STARTUP"),
    (["LAUNCH"], ["BUSINESS", "COMPANY", "STARTUP"], "BUSINESS_STARTUP"),
    (["WOMEN"], ["BUSINESS", "ENTREPRENEUR", "STARTUP"], "WOMEN_ENTREPRENEURSHIP"),
    # Education
    (["SCHOOL"], ["CHILD", "KID", "SON", "DAUGHTER", "TRANSFER", "ADMISSION"], "CHILD_SCHOOL_TRANSITION"),
    (["TRANSFER CERTIFICATE"], [], "CHILD_SCHOOL_TRANSITION"),
    (["STUDY ABROAD"], [], "STUDY_ABROAD"),
    (["STUDY"], ["ABROAD", "OVERSEAS", "UK", "USA", "CANADA", "AUSTRALIA", "EUROPE"], "STUDY_ABROAD"),
    (["MASTERS"], [], "GRADUATE_STUDIES"),
    (["PHD"], [], "GRADUATE_STUDIES"),
    (["POSTGRAD"], [], "GRADUATE_STUDIES"),
    (["COLLEGE"], ["ADMISSION", "ENROL", "COUNSEL"], "EDUCATIONAL_ENROLLMENT"),
    (["UNIVERSITY"], ["ADMISSION", "ENROL", "APPLY"], "EDUCATIONAL_ENROLLMENT"),
    (["SCHOLARSHIP"], [], "EDUCATION_FINANCING"),
    (["EDUCATION LOAN"], [], "EDUCATION_FINANCING"),
    (["STUDENT LOAN"], [], "EDUCATION_FINANCING"),
    # Home / property
    (["BUY"], ["HOUSE", "HOME", "FLAT", "APARTMENT", "PROPERTY"], "HOME_PURCHASE"),
    (["PURCHASE"], ["HOUSE", "HOME", "FLAT", "APARTMENT", "PROPERTY"], "HOME_PURCHASE"),
    (["HOME LOAN"], [], "HOME_PURCHASE"),
    (["PROPERTY"], ["INHERIT", "INHERITED", "INHERITANCE", "ESTATE"], "PROPERTY_INHERITANCE"),
    (["INHERIT"], [], "PROPERTY_INHERITANCE"),
    (["WILL"], ["ESTATE", "ASSETS", "HEIR", "PROPERTY"], "ESTATE_PLANNING"),
    (["ESTATE PLAN"], [], "ESTATE_PLANNING"),
    (["RENT"], ["AGREEMENT", "POLICE", "VERIFICATION", "VERIFY", "LANDLORD", "TENANT"], "RENTAL_VERIFICATION"),
    (["POLICE VERIFICATION"], [], "RENTAL_VERIFICATION"),
    # Marriage / divorce
    (["MARRY"], [], "MARRIAGE_PLANNING"),
    (["WEDDING"], [], "MARRIAGE_PLANNING"),
    (["MARRIAGE"], [], "MARRIAGE_PLANNING"),
    (["DIVORCE"], [], "WOMEN_DIVORCE_RECOVERY"),
    (["SEPARATION"], ["LEGAL", "SPOUSE", "HUSBAND", "WIFE"], "WOMEN_DIVORCE_RECOVERY"),
    # Pregnancy / parenting / childcare
    (["PREGNANT"], [], "PREGNANCY_PREPARATION"),
    (["PREGNANCY"], [], "PREGNANCY_PREPARATION"),
    (["DUE DATE"], [], "PREGNANCY_PREPARATION"),
    (["TRIMESTER"], [], "PREGNANCY_PREPARATION"),
    (["MATERNITY"], ["LEAVE", "BENEFIT", "PLAN"], "PARENTAL_LEAVE"),
    (["PATERNITY"], [], "PARENTAL_LEAVE"),
    (["PARENTAL LEAVE"], [], "PARENTAL_LEAVE"),
    (["POSTPARTUM"], [], "POSTPARTUM_WELLNESS"),
    (["AFTER BIRTH"], [], "POSTPARTUM_WELLNESS"),
    (["NEW BABY"], [], "POSTPARTUM_WELLNESS"),
    (["NEWBORN"], [], "POSTPARTUM_WELLNESS"),
    (["ADOPT"], [], "ADOPTION_PROCESS"),
    (["ADOPTION"], [], "ADOPTION_PROCESS"),
    (["CARA"], [], "ADOPTION_PROCESS"),
    # Health / wellness
    (["HEALTH INSURANCE"], [], "HEALTH_INSURANCE"),
    (["MEDICLAIM"], [], "HEALTH_INSURANCE"),
    (["MEDICAL EMERGENCY"], [], "MEDICAL_EMERGENCY"),
    (["HOSPITALIZ"], [], "MEDICAL_EMERGENCY"),
    (["HOSPITALISED"], [], "MEDICAL_EMERGENCY"),
    (["CASHLESS"], ["CLAIM", "HOSPITAL"], "MEDICAL_EMERGENCY"),
    (["WELLNESS"], ["WORKPLACE", "WORK", "EMPLOYEE", "OFFICE"], "WORKPLACE_WELLNESS"),
    (["BURNOUT"], [], "WORKPLACE_WELLNESS"),
    (["MENTAL HEALTH"], [], "WELLNESS_MANAGEMENT"),
    (["CHRONIC"], ["CONDITION", "ILLNESS", "DISEASE"], "WELLNESS_MANAGEMENT"),
    (["DISABILITY"], [], "HEALTH_AND_DISABILITY"),
    # Finance / debt / retirement
    (["DEBT"], [], "DEBT_MANAGEMENT"),
    (["LOAN"], ["MANAGE", "REPAY", "OVERDUE", "DEFAULT"], "DEBT_MANAGEMENT"),
    (["CREDIT CARD"], ["DEBT", "OVERDUE", "LIMIT"], "DEBT_MANAGEMENT"),
    (["RETIRE"], [], "RETIREMENT_PLANNING"),
    (["RETIREMENT"], [], "RETIREMENT_PLANNING"),
    (["INVEST"], ["PLAN", "PORTFOLIO", "ASSET", "WEALTH"], "MONEY_AND_ASSETS"),
    # Eldercare
    (["ELDER"], ["PARENT", "CARE", "FATHER", "MOTHER"], "ELDERCARE_MANAGEMENT"),
    (["AGEING"], ["PARENT", "CARE"], "ELDERCARE_MANAGEMENT"),
    (["OLD AGE"], [], "ELDERCARE_MANAGEMENT"),
    # Loss / grief
    (["GRIEF"], [], "GRIEF_SUPPORT"),
    (["BEREAVEMENT"], [], "GRIEF_SUPPORT"),
    (["LOST"], ["LOVED ONE", "PARENT", "SPOUSE", "CHILD", "SIBLING"], "GRIEF_SUPPORT"),
    (["REPATRIAT"], [], "REPATRIATION"),
    (["DEATH ABROAD"], [], "REPATRIATION"),
    (["BODY"], ["REPATRIATE", "ABROAD", "FOREIGN"], "REPATRIATION"),
    # NRI / return
    (["NRI"], [], "NRI_RETURN_TO_INDIA"),
    (["RETURN TO INDIA"], [], "NRI_RETURN_TO_INDIA"),
    (["COMING BACK"], ["INDIA"], "NRI_RETURN_TO_INDIA"),
    # Vehicle
    (["BUY"], ["CAR", "BIKE", "VEHICLE", "SCOOTER", "MOTORCYCLE"], "VEHICLE_PURCHASE"),
    (["PURCHASE"], ["CAR", "BIKE", "VEHICLE", "SCOOTER"], "VEHICLE_PURCHASE"),
    # Pet
    (["PET"], ["ADOPT", "ADOPTION", "BUY", "DOG", "CAT"], "PET_ADOPTION"),
    (["ADOPT"], ["DOG", "CAT", "PET", "ANIMAL"], "PET_ADOPTION"),
    # Event planning
    (["PLAN"], ["EVENT", "PARTY", "CONFERENCE", "CORPORATE"], "EVENT_PLANNING"),
    # Volunteer
    (["VOLUNTEER"], [], "VOLUNTEER_WORK"),
    (["NGO"], ["JOIN", "WORK", "VOLUNTEER"], "VOLUNTEER_WORK"),
    # Personal growth
    (["PERSONAL GROWTH"], [], "PERSONAL_GROWTH"),
    (["SELF IMPROVEMENT"], [], "PERSONAL_GROWTH"),
    (["HABIT"], ["BUILD", "FORM", "CHANGE", "IMPROVE"], "PERSONAL_GROWTH"),
]


def _priority_a_match(upper_text: str) -> str | None:
    """
    Returns the _FALLBACK_QUESTIONS key for the first matching keyword rule,
    or None if nothing matches.
    """
    for required, any_of, fallback_key in _KEYWORD_RULES:
        if all(kw in upper_text for kw in required):
            if not any_of or any(kw in upper_text for kw in any_of):
                return fallback_key
    return None


def generate_clarification_questions(db: Session, user_text: str, detected_events: list[str]) -> dict:
    """
    Returns specific clarification questions for the given user input.

    Priority order:
      A. Keyword match in user text → immediate pre-built questions (no AI call)
      B. Detected event type match → immediate pre-built questions (no AI call)
      C. AI generation with full event-type rules in system prompt
      D. Event-specific fallback if AI fails or returns generic output
    """
    primary = settings.openrouter_model
    upper_text = user_text.upper()

    # ── Priority A: keyword match ──────────────────────────────────────────────
    matched_key = _priority_a_match(upper_text)
    if matched_key and (matched_key in _FALLBACK_QUESTIONS or matched_key in _SMART_QUESTIONS):
        questions = _filter_answered_questions(_get_all_questions(matched_key), user_text)[:3]
        if not questions:
            logger.info("Priority A -> %s but all questions answered in input — skipping clarification", matched_key)
            return {"clarification_needed": False, "questions": []}
        logger.info("Priority A keyword match -> %s (%d questions after filter)", matched_key, len(questions))
        return {"clarification_needed": True, "questions": questions}

    # ── Priority B: detected event type ───────────────────────────────────────
    for event in detected_events:
        if event in _FALLBACK_QUESTIONS or event in _SMART_QUESTIONS:
            questions = _filter_answered_questions(_get_all_questions(event), user_text)[:3]
            if not questions:
                logger.info("Priority B -> %s but all questions answered in input — skipping clarification", event)
                return {"clarification_needed": False, "questions": []}
            logger.info("Priority B event match -> %s (%d questions after filter)", event, len(questions))
            return {"clarification_needed": True, "questions": questions}

    # ── Priority C: AI generation ──────────────────────────────────────────────
    expert_context = ""
    if detected_events and detected_events[0] != "OTHER":
        try:
            event_type = LifeEventType(detected_events[0])
            chunks = retrieve(db, user_text, event_type, top_k=2)
            if chunks:
                summaries = [f"- {c.title}: {c.content[:200]}..." for c in chunks]
                expert_context = "\n\nExpert Knowledge (use this to ask informed questions):\n" + "\n".join(summaries)
        except Exception as e:
            logger.warning(f"RAG failed for clarification: {e}")

    portal_context = ""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        registry_path = os.path.join(base_dir, "backend", "data", "portal_registry.json")
        if os.path.exists(registry_path):
            with open(registry_path, "r", encoding="utf-8") as f:
                registry = json.load(f)
            relevant_bits = []
            for state_code, state_info in registry.get("states", {}).items():
                if state_code.upper() in upper_text or state_info.get("name", "").upper() in upper_text:
                    url = (list(state_info.get("portals", {}).values()) or [{}])[0].get("url_home", "N/A")
                    relevant_bits.append(f"State: {state_info['name']} - Portal: {url}")
            if relevant_bits:
                portal_context = "\n\nRegional Portal Info:\n" + "\n".join(relevant_bits)
    except Exception as e:
        logger.warning(f"Portal Registry lookup failed: {e}")

    prompt = (
        f"User Input: \"{user_text}\"\n"
        f"Detected Event Type(s): {', '.join(detected_events) if detected_events else 'Unknown'}"
        f"{portal_context}"
        f"{expert_context}"
        f"\n\nGenerate 2-3 specific, targeted clarification questions for EXACTLY these event types."
    )

    try:
        raw_text = openrouter_generate(
            model=primary,
            system_instruction=_SYSTEM_PROMPT,
            user_message=prompt,
            max_tokens=400,
            temperature=0.3,
        )

        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        result = json.loads(raw_text)

        questions = result.get("questions", [])
        if len(questions) < 2 or (len(questions) == 1 and "more detail" in questions[0].get("question", "").lower()):
            logger.info("LLM returned generic question — using event-specific fallback.")
            fallback_qs = _filter_answered_questions(_get_fallback_for_events(detected_events), user_text)[:3]
            if not fallback_qs:
                return {"clarification_needed": False, "questions": []}
            return {"clarification_needed": True, "questions": fallback_qs}

        result["questions"] = result["questions"][:3]
        return result

    except Exception as exc:
        logger.warning(f"LLM clarification failed ({exc}), using pre-built fallback.")

    # ── Priority D: pre-built fallback ────────────────────────────────────────
    fallback_qs = _filter_answered_questions(_get_fallback_for_events(detected_events), user_text)[:3]
    if not fallback_qs:
        return {"clarification_needed": False, "questions": []}
    return {"clarification_needed": True, "questions": fallback_qs}
