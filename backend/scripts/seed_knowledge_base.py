"""
Layer 3.2 — Knowledge Base Seed Script.

Usage:
    python -m backend.scripts.seed_knowledge_base

What it does:
  1. Initialises the DB (creates the knowledge_base table if needed).
  2. Inserts 30 curated requirement entries covering all Tier 1 life events.
  3. Calls Gemini text-embedding-004 to embed each entry's content.
  4. Saves embeddings back to the DB.

Rules:
  - Idempotent: already-embedded entries are skipped.
  - No web scraping — all content is hand-curated from the Life Events Library.
  - Run this ONCE after first deployment, or after adding new entries.

Estimated time: ~2 minutes (30 Gemini API calls with rate-limit delay).
"""

import json
import logging
import time

from backend.database import SessionLocal, init_db
from backend.models.knowledge_base_model import KnowledgeBaseEntry
from backend.schemas.nlp_schema import LifeEventType
from backend.services.rag_service import embed_text_for_document

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Curated knowledge base — 30 entries across Tier 1 life events
# ---------------------------------------------------------------------------

SEED_ENTRIES: list[dict] = [
    # ── VEHICLE_PURCHASE ────────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.VEHICLE_PURCHASE,
        "title": "RC Certificate Verification",
        "content": (
            "Before purchasing a used vehicle in India, the buyer must verify the "
            "Registration Certificate (RC) through the Parivahan portal "
            "(parivahan.gov.in). Key checks: vehicle class, engine/chassis number "
            "match, owner name, registration validity, and financier NOC if applicable."
        ),
    },
    {
        "life_event_type": LifeEventType.VEHICLE_PURCHASE,
        "title": "Insurance Transfer Requirements",
        "content": (
            "Vehicle insurance must be transferred to the new owner within 14 days of "
            "purchase. Required documents: Form 29 (notice of transfer), Form 30 "
            "(application for transfer of ownership), RC copy, sale deed, and the "
            "original insurance policy. Submit to the insurer and the RTO."
        ),
    },
    {
        "life_event_type": LifeEventType.VEHICLE_PURCHASE,
        "title": "Loan NOC and Hypothecation Removal",
        "content": (
            "If the vehicle has an active loan, the seller must obtain a NOC from the "
            "financing bank confirming full repayment. The hypothecation entry in the RC "
            "must be removed at the RTO using Form 35 before the sale is finalised."
        ),
    },

    # ── RENTAL_VERIFICATION ─────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.RENTAL_VERIFICATION,
        "title": "Rental Agreement Registration",
        "content": (
            "In India, a rental agreement exceeding 11 months must be registered at the "
            "Sub-Registrar's office. Registration requires: draft agreement, passport "
            "photos of both parties, identity proofs, address proofs, and stamp duty "
            "payment (typically 1–2% of annual rent depending on state)."
        ),
    },
    {
        "life_event_type": LifeEventType.RENTAL_VERIFICATION,
        "title": "Landlord Identity and Property Title Check",
        "content": (
            "Before signing a lease, verify the landlord's identity (Aadhaar/PAN) and "
            "their right to rent the property. Request a copy of the property tax "
            "receipt in the landlord's name and cross-check the property title at the "
            "local sub-registrar office to confirm no lien or dispute."
        ),
    },
    {
        "life_event_type": LifeEventType.RENTAL_VERIFICATION,
        "title": "Security Deposit Documentation",
        "content": (
            "Document the security deposit amount in the rental agreement. Best practice "
            "is to pay via bank transfer and obtain a signed receipt. The agreement "
            "should specify the conditions for deduction and the deadline for return "
            "(typically 1–2 months after vacating)."
        ),
    },

    # ── ELDERCARE_MANAGEMENT ────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.ELDERCARE_MANAGEMENT,
        "title": "Senior Citizen Health Insurance Requirements",
        "content": (
            "For parents aged 60+, obtain health insurance plans specifically designed "
            "for senior citizens (e.g. Star Health Senior Citizen Red Carpet, Niva Bupa "
            "Senior First). Key requirements: pre-policy medical check-up, disclosure of "
            "pre-existing conditions, waiting period of 1–2 years for specific illnesses."
        ),
    },
    {
        "life_event_type": LifeEventType.ELDERCARE_MANAGEMENT,
        "title": "Power of Attorney for Eldercare",
        "content": (
            "If managing finances or property on behalf of an elderly parent, obtain a "
            "registered Special Power of Attorney (SPoA). This must be executed on "
            "stamp paper and registered at the Sub-Registrar office with both parties "
            "present (or via representative if the parent is immobile)."
        ),
    },
    {
        "life_event_type": LifeEventType.ELDERCARE_MANAGEMENT,
        "title": "Medical Records Centralisation",
        "content": (
            "Maintain a consolidated medical record file containing: all prescriptions "
            "and test reports from the last 3 years, list of current medications with "
            "dosages, known allergies, vaccination history, and the contact details of "
            "all treating doctors. Keep both physical and digital copies (e.g. Google "
            "Drive or DigiLocker)."
        ),
    },

    # ── EDUCATION_FINANCING ─────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.EDUCATION_FINANCING,
        "title": "Education Loan Eligibility Criteria",
        "content": (
            "Indian banks typically require: admission letter from a recognised "
            "institution, academic marksheets (10th, 12th, graduation), income proof of "
            "co-applicant/guarantor, collateral for loans above ₹7.5 lakh, and KYC "
            "documents. Government schemes like Vidya Lakshmi portal aggregate multiple "
            "bank products in one application."
        ),
    },
    {
        "life_event_type": LifeEventType.EDUCATION_FINANCING,
        "title": "Scholarship Application Documents",
        "content": (
            "Common scholarships (PM Scholarship, State Merit Scholarship, NSP portal) "
            "require: Aadhaar-linked bank account, income certificate (below ₹2–8 lakh "
            "depending on scheme), caste certificate if applicable, bonafide certificate "
            "from institution, and previous year marksheet. Apply before the institution "
            "deadline, not just the government portal deadline."
        ),
    },

    # ── CAREER_TRANSITION ───────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.CAREER_TRANSITION,
        "title": "PF (Provident Fund) Transfer on Job Change",
        "content": (
            "When switching employers, transfer your EPF balance via the EPFO Unified "
            "Member Portal using Form 13 (online) or the One Member – One EPF Account "
            "facility. Ensure your UAN is activated, Aadhaar and PAN are seeded, and "
            "the previous employer has approved your exit date."
        ),
    },
    {
        "life_event_type": LifeEventType.CAREER_TRANSITION,
        "title": "Relieving Letter and Experience Certificate",
        "content": (
            "Before leaving an employer, obtain: Relieving Letter (states you have been "
            "relieved of your duties), Experience Certificate (states role, duration, "
            "and performance), last 3 months salary slips, and Form 16 for the financial "
            "year. These are mandatory for background verification at the new employer."
        ),
    },
    {
        "life_event_type": LifeEventType.CAREER_TRANSITION,
        "title": "Offer Letter and Joining Kit Requirements",
        "content": (
            "New employer onboarding typically requires: signed offer letter, educational "
            "certificates (originals for verification), previous employer documents "
            "(relieving letter, offer letter, salary slips), PAN card, Aadhaar card, "
            "bank account details for salary, and passport-size photographs."
        ),
    },

    # ── POSTPARTUM_WELLNESS ─────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.POSTPARTUM_WELLNESS,
        "title": "Maternity Benefit Act Entitlements",
        "content": (
            "Under the Maternity Benefit (Amendment) Act 2017, working women are "
            "entitled to 26 weeks of paid maternity leave (for first two children), "
            "creche facility for organisations with 50+ employees, and work-from-home "
            "option post-leave. To claim: submit the hospital discharge summary and "
            "birth certificate to the HR department."
        ),
    },
    {
        "life_event_type": LifeEventType.POSTPARTUM_WELLNESS,
        "title": "Postpartum Health Check Schedule",
        "content": (
            "WHO and Indian obstetric guidelines recommend postpartum check-ups at: "
            "24–48 hours (hospital), 1 week, 6 weeks (first formal postpartum visit: "
            "wound healing, BP, urine check, mental health screening, contraception "
            "counselling). Additional visits if the delivery was via C-section or if "
            "there are complications."
        ),
    },

    # ── PREGNANCY_PREPARATION ───────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.PREGNANCY_PREPARATION,
        "title": "Antenatal Care Schedule (India)",
        "content": (
            "India's Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA) recommends at "
            "least 4 antenatal check-ups: before 12 weeks (registration), between "
            "14–26 weeks, 28–34 weeks, and 36 weeks onwards. Each visit covers: weight, "
            "BP, anaemia check, urine test, ultrasound at specific intervals, and "
            "tetanus toxoid vaccination."
        ),
    },
    {
        "life_event_type": LifeEventType.PREGNANCY_PREPARATION,
        "title": "Maternity Insurance Pre-Authorisation",
        "content": (
            "Most health insurers in India cover maternity only after a waiting period "
            "of 2–4 years. Before delivery, submit a pre-authorisation request to the "
            "insurer with: estimated due date, hospital empanelment letter, and policy "
            "details. Cashless claims require empanelled hospitals; reimbursement claims "
            "require all original bills and doctor prescriptions."
        ),
    },

    # ── CHILD_SCHOOL_TRANSITION ──────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.CHILD_SCHOOL_TRANSITION,
        "title": "School Admission Documents",
        "content": (
            "Common documents required for school admission in India: birth certificate "
            "(mandatory), Aadhaar card, previous school Transfer Certificate (TC) and "
            "mark sheet, address proof (Aadhaar/election card), passport-size photos "
            "(usually 6–8), and immunisation records. Some schools also require an "
            "income certificate for fee concession applications."
        ),
    },
    {
        "life_event_type": LifeEventType.CHILD_SCHOOL_TRANSITION,
        "title": "RTE Act Admission Rights",
        "content": (
            "Under the Right to Education (RTE) Act 2009, private schools must reserve "
            "25% of seats for economically weaker section (EWS) and disadvantaged group "
            "children. Applications are made through the state government's RTE portal. "
            "Required: income certificate (below state-defined threshold), caste or "
            "disability certificate if applicable, and residence proof."
        ),
    },

    # ── WOMEN_DIVORCE_RECOVERY ──────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.WOMEN_DIVORCE_RECOVERY,
        "title": "Divorce Petition Filing Requirements",
        "content": (
            "To file for divorce in India under the Hindu Marriage Act 1955 (or "
            "applicable personal law), required documents include: marriage certificate, "
            "address proofs of both parties, identity proofs, evidence supporting "
            "grounds for divorce (mutual consent or contested), and passport-size photos. "
            "File at the Family Court in the jurisdiction where the couple last resided."
        ),
    },
    {
        "life_event_type": LifeEventType.WOMEN_DIVORCE_RECOVERY,
        "title": "Alimony and Maintenance Rights",
        "content": (
            "Under Section 25 of the Hindu Marriage Act (or Section 37, Special Marriage "
            "Act), a spouse may claim permanent alimony. Interim maintenance can be "
            "sought under Section 24 during the proceedings. Factors considered: income "
            "of both parties, standard of living, dependents. Document: bank statements "
            "(3 years), income tax returns, property records."
        ),
    },
    {
        "life_event_type": LifeEventType.WOMEN_DIVORCE_RECOVERY,
        "title": "Changing Official Name and Documents Post-Divorce",
        "content": (
            "After a divorce decree, to revert to maiden name: obtain the certified "
            "court decree, publish a name-change notice in a local and official gazette, "
            "then update Aadhaar (UIDAI portal), PAN (NSDL/UTI), passport (Form 1 "
            "reissue), bank accounts, and voter ID (Form 8). Process typically takes "
            "4–8 weeks end-to-end."
        ),
    },

    # ── JOB_ONBOARDING ──────────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.JOB_ONBOARDING,
        "title": "ESIC Registration for New Employees",
        "content": (
            "Employees earning up to ₹21,000/month in ESIC-covered organisations must "
            "be registered under the Employees' State Insurance Act. The employer "
            "registers the employee via the ESIC portal, generating an Insurance Number. "
            "The employee receives an ESIC card providing access to medical benefits, "
            "sickness benefits, and maternity benefits."
        ),
    },

    # ── RELOCATION ───────────────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Address Change Across Government Documents",
        "content": (
            "When relocating within India, update your address on: Aadhaar (UIDAI "
            "self-service portal or Aadhaar Seva Kendra), Voter ID (Form 8A on NVSP "
            "portal), PAN (NSDL/UTI portal), driving licence (Parivahan portal – Form "
            "33), and bank accounts (branch visit or net banking). Allow 2–6 weeks for "
            "each update to reflect."
        ),
    },

    # ── MARRIAGE_PLANNING ────────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.MARRIAGE_PLANNING,
        "title": "Marriage Registration Requirements",
        "content": (
            "Marriage registration under the Hindu Marriage Act (or Special Marriage Act "
            "for inter-religion) requires: filled application form, age proof of both "
            "parties (18+ for bride, 21+ for groom), residence proof (last 30 days), "
            "two passport photos each, witness Aadhaar cards (2 witnesses), and "
            "marriage invitation card or priest certificate. Apply at the Sub-Divisional "
            "Magistrate (SDM) or municipal office. Fee: ₹100–500 depending on state."
        ),
    },

    # ── HOME_PURCHASE ────────────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.HOME_PURCHASE,
        "title": "Property Title Verification Checklist",
        "content": (
            "Before purchasing property in India, verify: 30-year title search (check "
            "encumbrance certificate from Sub-Registrar), approved building plan "
            "(municipal corporation), occupancy certificate (OC), Khata/Patta in "
            "seller's name, no-dues certificate for property tax, and RERA registration "
            "(for under-construction projects on rera.mahaonline.gov.in or equivalent "
            "state portal)."
        ),
    },

    # ── VISA_APPLICATION ─────────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.VISA_APPLICATION,
        "title": "Common Documents for Visa Applications",
        "content": (
            "Most country visa applications require: valid passport (6+ months validity, "
            "2 blank pages), completed visa application form, recent passport-size "
            "photos meeting embassy specifications, proof of financial means (bank "
            "statements for last 3–6 months, minimum balance varies by country), travel "
            "itinerary, accommodation proof, travel insurance, and supporting documents "
            "specific to visa type (employment letter for work visa, admission letter for "
            "student visa)."
        ),
    },

    # ── MEDICAL_EMERGENCY ────────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.MEDICAL_EMERGENCY,
        "title": "Emergency Hospitalisation Cashless Claim Process",
        "content": (
            "For cashless hospitalisation: present the health insurance card at the "
            "empanelled hospital's TPA desk within 24 hours of emergency admission (or "
            "prior for planned admission). The hospital sends a pre-authorisation request "
            "to the insurer/TPA. If rejected, pay and file a reimbursement claim within "
            "15–30 days with: discharge summary, all bills and receipts, doctor's "
            "prescriptions, investigation reports, and claim form."
        ),
    },
]


def run_seed() -> None:
    """Insert and embed all seed entries (idempotent)."""
    init_db()
    db = SessionLocal()
    inserted = 0
    skipped = 0

    try:
        for entry_data in SEED_ENTRIES:
            # Check if an entry with the same title already exists
            existing = (
                db.query(KnowledgeBaseEntry)
                .filter(KnowledgeBaseEntry.title == entry_data["title"])
                .first()
            )

            if existing:
                if existing.embedding:
                    logger.info("SKIP (already embedded): %s", entry_data["title"])
                    skipped += 1
                    continue
                else:
                    # Entry exists but has no embedding — re-embed it
                    target = existing
            else:
                target = KnowledgeBaseEntry(
                    life_event_type=entry_data["life_event_type"],
                    title=entry_data["title"],
                    content=entry_data["content"],
                )
                db.add(target)
                db.flush()   # get target.id assigned

            # Generate embedding
            logger.info("Embedding: %s", target.title)
            try:
                vector = embed_text_for_document(target.content)
                target.embedding = json.dumps(vector)
                db.commit()
                inserted += 1
            except Exception as exc:
                logger.error("Failed to embed '%s': %s", target.title, exc)
                db.rollback()

            # Polite rate-limit delay (free tier: 60 req/min)
            time.sleep(1.1)

    finally:
        db.close()

    logger.info(
        "Seed complete — inserted/updated: %d | skipped: %d | total: %d",
        inserted,
        skipped,
        len(SEED_ENTRIES),
    )


if __name__ == "__main__":
    run_seed()
