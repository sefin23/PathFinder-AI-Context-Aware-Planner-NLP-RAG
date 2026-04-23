"""
Layer 3.2 — Knowledge Base Seed Script.

Usage:
    python -m backend.scripts.seed_knowledge_base

What it does:
  1. Initialises the DB (creates the knowledge_base table if needed).
  2. Inserts ~70 curated requirement entries covering Tier 1 and Tier 2 life events.
  3. Calls Gemini Embedding 2 to embed each entry's content.
  4. Saves embeddings back to the DB.

Rules:
  - Idempotent: already-embedded entries are skipped.
  - No web scraping — all content is hand-curated from the Life Events Library.
  - Run this ONCE after first deployment, or after adding new entries.

Estimated time: ~5 minutes (~70 Gemini API calls with rate-limit delay).
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
    {
        "life_event_type": LifeEventType.VEHICLE_PURCHASE,
        "title": "Basic Documents for Used Vehicle Purchase",
        "content": (
            "For a straightforward used vehicle purchase, the buyer should collect: a copy "
            "of the seller's government ID, the existing Registration Certificate, active "
            "insurance policy, recent pollution certificate, and a simple sale agreement "
            "mentioning price, date, and vehicle details."
        ),
    },
    {
        "life_event_type": LifeEventType.VEHICLE_PURCHASE,
        "title": "Common Mistakes When Buying a Used Car",
        "content": (
            "Typical mistakes during a used car purchase include paying a token amount "
            "without a written receipt, not checking if road tax or challans are pending, "
            "skipping a basic mechanical inspection, and failing to submit ownership "
            "transfer forms within the local transport office timelines."
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
    {
        "life_event_type": LifeEventType.JOB_ONBOARDING,
        "title": "Basic Document Checklist for Job Onboarding",
        "content": (
            "A simple pre-joining checklist usually includes: government identity proof, "
            "two to four passport photos, bank account details for salary, permanent "
            "address proof, educational certificates, and previous employer documents "
            "such as relieving letter or experience certificate if applicable."
        ),
    },
    {
        "life_event_type": LifeEventType.JOB_ONBOARDING,
        "title": "Commonly Missed Steps During Job Onboarding",
        "content": (
            "New employees frequently forget to upload bank details in the HR portal, "
            "submit tax declaration or investment proofs, complete mandatory online "
            "training within the deadline, or update emergency contact information in "
            "the internal system."
        ),
    },

    # ── RELOCATION (International) ───────────────────────────────────────────
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Address Change Across Government Documents (India Domestic)",
        "content": (
            "When relocating within India, update your address on: Aadhaar (UIDAI "
            "self-service portal or Aadhaar Seva Kendra), Voter ID (Form 8A on NVSP "
            "portal), PAN (NSDL/UTI portal), driving licence (Parivahan portal – Form "
            "33), and bank accounts (branch visit or net banking). Allow 2–6 weeks for "
            "each update to reflect."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "UK Skilled Worker Visa Requirements for Indian Nationals",
        "content": (
            "To relocate to the UK for work, Indian nationals typically need a Skilled "
            "Worker visa (formerly Tier 2). Requirements: a job offer from a UK Home "
            "Office-licensed sponsor, Certificate of Sponsorship (CoS) from employer, "
            "valid passport, English language proof (IELTS 6.5+ or equivalent), proof "
            "of salary meeting the minimum threshold (currently £26,200/year or role "
            "minimum), tuberculosis (TB) test certificate from an approved clinic in "
            "India (NABL-approved IOM clinics), and biometrics at a UKVI application "
            "centre. Apply online at gov.uk/skilled-worker-visa. Processing: 3 weeks "
            "from biometrics appointment. Fee: approx. £719–£1,500 depending on "
            "duration, plus NHS surcharge (£1,035/year per person)."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Finding Accommodation in London Before Arrival",
        "content": (
            "Before relocating to London, arrange short-term accommodation first (1–4 "
            "weeks) via serviced apartments or flatshares (Spotahome, Airbnb, "
            "OpenRent). For long-term rentals, UK landlords typically require: 3 months "
            "UK bank statements or employer letter confirming salary, references from "
            "previous landlords, and a UK-based guarantor or 6 months rent upfront if "
            "you have no UK credit history. Average London rent: £1,500–£2,500/month "
            "for a 1-bedroom flat depending on zone (Zone 1–6). Zones 2–4 offer better "
            "value with good Tube/Overground connectivity. Use Rightmove, Zoopla, or "
            "SpareRoom to search."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Opening a UK Bank Account as a New Arrival",
        "content": (
            "Opening a UK bank account requires a UK address proof, which creates a "
            "chicken-and-egg problem for new arrivals. Solutions: (1) Use digital banks "
            "— Monzo, Starling, or Revolut accept passport and selfie verification, "
            "no proof of address needed; open before or on arrival. (2) HSBC UK Premier "
            "accepts existing HSBC India customers with minimal paperwork. (3) Traditional "
            "banks (Barclays, NatWest) require proof of UK address. Recommended flow: "
            "open Monzo immediately (usually approved in 24–48 hours), then open a "
            "traditional bank account once you have a tenancy agreement. Register your "
            "UK bank account with your employer on Day 1."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "National Insurance Number (NIN) Application in the UK",
        "content": (
            "A National Insurance Number (NIN) is required for working and paying tax "
            "in the UK. You can start work without one but must apply promptly. Apply "
            "online at gov.uk/apply-national-insurance-number. You'll need: right to "
            "work in the UK (visa), proof of identity (passport), UK address. You'll be "
            "invited to an online identity verification. Processing time: 4–16 weeks. "
            "Your employer can use a temporary reference code until your NIN arrives. "
            "Once received, your NIN remains yours for life."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "NHS Registration and Healthcare in the UK",
        "content": (
            "Workers on a Skilled Worker visa who pay the NHS Immigration Health "
            "Surcharge are entitled to free NHS treatment. To access NHS: (1) Register "
            "with a local GP (General Practitioner) – find your nearest GP at "
            "nhs.uk/service-search. You'll need proof of UK address and your visa. "
            "(2) A&E (emergency) services are free to all. (3) Bring a sufficient "
            "supply of any regular medication and your original prescriptions — the UK "
            "GP will need these to prescribe NHS equivalents. (4) Dental treatment "
            "is charged separately (NHS Band 1: £26.80, Band 2: £73.50 in 2024)."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Shipping Household Goods Internationally from India to UK",
        "content": (
            "For relocating household belongings from India to the UK: (1) Sea freight "
            "20-foot container: 12–16 weeks, suitable for full household, cost "
            "₹2.5–4 lakh. (2) Air freight: 7–14 days, suitable for smaller volumes, "
            "cost ₹5,000–15,000/kg. (3) Customs in UK: personal effects imported "
            "within 12 months of arrival are duty-exempt under Transfer of Residence "
            "(ToR) relief; apply at gov.uk/moving-to-uk. Required documents: "
            "detailed inventory with values, passport copy, visa, proof of residence "
            "abroad, and ToR form C3. Avoid shipping items bought new within 6 months "
            "— they attract duty."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Council Tax and Utility Setup in the UK",
        "content": (
            "Upon moving into a UK property: (1) Council Tax — all UK residents must "
            "pay council tax to their local council. Register with your local council "
            "within 7 days of moving in. Band and cost depends on property and borough. "
            "Single-person households get 25% discount. (2) Set up utilities: choose "
            "gas/electricity supplier (compare on Uswitch or MoneySuperMarket), "
            "contact current supplier to set up account in your name. (3) TV Licence: "
            "required if you watch live TV or BBC iPlayer (£169.50/year). (4) Register "
            "to vote at gov.uk/register-to-vote after receiving your visa."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Biometric Residence Permit (BRP) Collection in the UK",
        "content": (
            "After entering the UK on a visa of more than 6 months, you must collect "
            "your Biometric Residence Permit (BRP) within 10 days of arrival. The "
            "collection location is specified in your visa decision letter (usually a "
            "Post Office or a specified address). The BRP proves your right to work, "
            "study, and access benefits in the UK. Carry it at all times. If lost, "
            "report to the Home Office within 3 days and apply for a replacement "
            "(fee: £56). From 2025, BRPs may be replaced by a digital eVisa — check "
            "gov.uk/biometric-residence-permits for latest guidance."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Relocation Budget Planning for International Move",
        "content": (
            "Key relocation costs to budget for when moving internationally (India to UK): "
            "Visa fees (Skilled Worker): £719–£1,500 + NHS surcharge £1,035/year. "
            "TB test (India, compulsory): ₹3,500–5,000. Flight: ₹30,000–60,000. "
            "Temporary accommodation first month: £1,500–3,000. Security deposit for "
            "flat: 5 weeks rent (~£2,000–3,000). Shipping (shared container): "
            "£500–1,500. Sim card and phone plan: £10–30/month (giffgaff, Lebara for "
            "cheap international calls). Emergency fund recommended: £3,000–5,000 "
            "as buffer for first 3 months. Total expected setup cost: £8,000–15,000."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Simple Relocation Essentials Checklist",
        "content": (
            "For any relocation, keep one small folder with key items: copies of identity "
            "documents, rental or sale agreements, employment offer or transfer letter, "
            "basic medical records, and an emergency contact sheet. Pack a separate small "
            "bag with 3–5 days of clothes, medicines, chargers, and basic toiletries."
        ),
    },
    {
        "life_event_type": LifeEventType.RELOCATION,
        "title": "Common Mistakes During Relocation",
        "content": (
            "Common relocation mistakes include not updating address with banks before "
            "moving, forgetting to cancel or transfer utilities, failing to photograph "
            "meter readings on move-out day, and not labelling fragile boxes clearly for "
            "movers."
        ),
    },

    # ── JOB_ONBOARDING (India + International) ──────────────────────────────
    {
        "life_event_type": LifeEventType.JOB_ONBOARDING,
        "title": "ESIC Registration for New Employees (India)",
        "content": (
            "Employees earning up to ₹21,000/month in ESIC-covered organisations must "
            "be registered under the Employees' State Insurance Act. The employer "
            "registers the employee via the ESIC portal, generating an Insurance Number. "
            "The employee receives an ESIC card providing access to medical benefits, "
            "sickness benefits, and maternity benefits."
        ),
    },
    {
        "life_event_type": LifeEventType.JOB_ONBOARDING,
        "title": "UK Employment Documents Required on Day 1",
        "content": (
            "When starting a job in the UK, bring on Day 1: passport (and BRP if "
            "applicable), proof of National Insurance Number (or confirmation you've "
            "applied), bank account details for payroll, P45 from previous UK employer "
            "(if any; first job in UK use Starter Checklist instead), signed contract "
            "of employment, and any professional qualification certificates if required "
            "for the role. Employers must verify your Right to Work in the UK before "
            "or on your first day — they will scan your passport/BRP or use the online "
            "Home Office checking service."
        ),
    },
    {
        "life_event_type": LifeEventType.JOB_ONBOARDING,
        "title": "UK Income Tax and PAYE System for New Employees",
        "content": (
            "In the UK, income tax is deducted at source through the PAYE (Pay As You "
            "Earn) system. Your employer will assign a tax code (e.g. 1257L for "
            "standard personal allowance of £12,570). For the first year: if you "
            "arrive mid-year from India, HMRC may initially use an emergency tax code — "
            "contact HMRC (0300 200 3300) or update via gov.uk/check-income-tax to "
            "correct it and claim a refund if over-taxed. Register for HMRC's online "
            "account at gov.uk/personal-tax-account to manage tax affairs digitally."
        ),
    },

    # ── VISA_APPLICATION (UK Specific) ───────────────────────────────────────
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
    {
        "life_event_type": LifeEventType.VISA_APPLICATION,
        "title": "UK Skilled Worker Visa Certificate of Sponsorship",
        "content": (
            "The Certificate of Sponsorship (CoS) is issued by the UK employer and is "
            "a mandatory requirement for a Skilled Worker visa. It confirms: the job "
            "title and SOC code (must be on the eligible occupation list), salary, "
            "start date, and that the employer is a licensed sponsor. The CoS has a "
            "reference number you enter in your visa application. It is valid for 3 "
            "months. Request it from your employer's HR before booking your UKVI "
            "appointment. You cannot apply for the visa without it."
        ),
    },
    {
        "life_event_type": LifeEventType.VISA_APPLICATION,
        "title": "TB Test Requirement for UK Visa from India",
        "content": (
            "Indian nationals applying for a UK visa for more than 6 months must "
            "provide a tuberculosis (TB) test certificate. Get tested at a UK Visas "
            "and Immigration (UKVI) approved clinic in India — search at "
            "gov.uk/tb-test-visa. Major IOM/NABL approved clinics: Mumbai (IOM, "
            "Kokilaben Hospital), Delhi (IOM Safdarjung), Bangalore, Hyderabad, "
            "Chennai. Test involves a chest X-ray. Results are usually ready in "
            "1–3 working days. Certificate is valid for 6 months. Cost: ₹3,500–5,500."
        ),
    },

    # ── INTERNATIONAL_TRAVEL ─────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.INTERNATIONAL_TRAVEL,
        "title": "Indian Passport Renewal Requirements",
        "content": (
            "Indian passport renewal (reissue): Apply on passportindia.gov.in. "
            "Required documents: existing passport (original), Address proof (Aadhaar "
            "or utility bill), self-attested copies. For renewals expiring in 1 year "
            "or already expired: use Tatkal scheme for urgent processing (3 working "
            "days). Normal processing: 7–14 working days at PSK (Passport Seva Kendra). "
            "Fee: ₹1,500 (normal), ₹3,500 (Tatkal). Carry original + 2 photocopies to "
            "appointment. For international job relocation, renew 6–12 months before "
            "departure as visa processing requires 6+ months validity."
        ),
    },
    {
        "life_event_type": LifeEventType.INTERNATIONAL_TRAVEL,
        "title": "Pre-Departure Checklist for International Relocation",
        "content": (
            "Before departing India for international relocation: (1) Inform bank of "
            "travel/relocation — activate international transactions, set up NRE/NRO "
            "account for remittances. (2) Port out mobile number to international SIM "
            "or retain on low-cost roaming plan. (3) Update address with pension "
            "fund (EPFO), PPF account, and insurance policies. (4) File advance tax "
            "if applicable before departure. (5) Store digital copies of all documents "
            "in cloud (DigiLocker, Google Drive). (6) Carry: passport, visa, BRP "
            "collection letter, employment contract, insurance policy, emergency "
            "contacts, and 3 months of any regular medication."
        ),
    },

    # ── NRI_RETURN_TO_INDIA ──────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.NRI_RETURN_TO_INDIA,
        "title": "NRE to Resident Account Conversion on Return",
        "content": (
            "When an NRI returns to India permanently, NRE/NRO accounts must be "
            "converted to resident rupee accounts within a reasonable time (typically "
            "within 90 days of return). Process: submit a written request to the bank "
            "with passport (Indian visa/stamps showing return), and completed KYC "
            "forms. Interest on NRE accounts is tax-exempt only during NRI status — "
            "after conversion, interest is fully taxable. Also update: Demat/trading "
            "account (repatriate from NRO to resident), mutual fund KYC status, and "
            "notify EPFO if resuming Indian employment."
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
    {
        "life_event_type": LifeEventType.MARRIAGE_PLANNING,
        "title": "Basic Documents for Marriage Registration",
        "content": (
            "Typical documents for marriage registration include: identity proof for both "
            "partners, age proof such as birth certificate or school leaving certificate, "
            "recent passport photos, local address proof, and identity proofs for the "
            "required witnesses. Details may vary slightly by state or country."
        ),
    },
    {
        "life_event_type": LifeEventType.MARRIAGE_PLANNING,
        "title": "Common Mistakes in Marriage Registration Applications",
        "content": (
            "Frequent issues in marriage registration include signatures not matching "
            "identity documents, incomplete address details, witnesses not carrying "
            "original ID proofs on the appointment day, and missing photocopies of "
            "supporting documents for the registrar's file."
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
    {
        "life_event_type": LifeEventType.HOME_PURCHASE,
        "title": "Basic Documents Needed for Property Purchase",
        "content": (
            "For a straightforward apartment purchase the buyer normally needs: "
            "government identity proof, permanent address proof, PAN or tax number, "
            "recent photographs, and copies of the property sale deed draft, "
            "builder-buyer agreement or allotment letter, and loan sanction letter if "
            "financing is used."
        ),
    },
    {
        "life_event_type": LifeEventType.HOME_PURCHASE,
        "title": "Common Mistakes in Property Registration",
        "content": (
            "Typical mistakes at the time of property registration include entering "
            "incorrect names or spelling on the sale deed, not checking the area or flat "
            "number carefully, paying stamp duty under the wrong category, and failing "
            "to collect certified copies and receipt numbers from the registration office."
        ),
    },

    # ── BUSINESS_STARTUP ─────────────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.BUSINESS_STARTUP,
        "title": "Basic Documents for New Business Registration",
        "content": (
            "For a simple small business registration, founders usually need: "
            "identity and address proof for each owner, recent photographs, proposed "
            "business name, a brief description of activities, and bank account details. "
            "Additional documents may include partnership deed or incorporation documents "
            "if more than one owner is involved."
        ),
    },
    {
        "life_event_type": LifeEventType.BUSINESS_STARTUP,
        "title": "Common Early Steps in Business Setup",
        "content": (
            "Early steps when starting a business typically include choosing a legal "
            "structure, registering the business with the appropriate authority, opening "
            "a dedicated business bank account, setting up a simple bookkeeping system, "
            "and confirming basic tax registrations or obligations."
        ),
    },
    {
        "life_event_type": LifeEventType.BUSINESS_STARTUP,
        "title": "Frequent Mistakes by First-Time Founders",
        "content": (
            "First-time founders often delay separating personal and business finances, "
            "skip putting key agreements in writing, underestimate recurring expenses, "
            "and fail to track important compliance dates such as tax filing or licence "
            "renewals."
        ),
    },

    # ── EDUCATIONAL_ENROLLMENT ───────────────────────────────────────────────
    {
        "life_event_type": LifeEventType.EDUCATIONAL_ENROLLMENT,
        "title": "Basic Documents for International University Applications",
        "content": (
            "Typical documents for international study applications include: academic "
            "transcripts, degree certificates, language test scores where required, "
            "a current passport, statement of purpose, letters of recommendation, and "
            "a simple CV or resume summarising education and experience."
        ),
    },
    {
        "life_event_type": LifeEventType.EDUCATIONAL_ENROLLMENT,
        "title": "Common Mistakes in University Application Forms",
        "content": (
            "Frequent issues in application forms include mismatched names compared to "
            "passport, missing answers to short questions, uploading the wrong version "
            "of the statement of purpose, and submitting without checking programme-"
            "specific document lists or deadlines."
        ),
    },
    {
        "life_event_type": LifeEventType.EDUCATIONAL_ENROLLMENT,
        "title": "Pre-Departure Checklist for International Students",
        "content": (
            "Before travelling for studies abroad, students should check that tuition "
            "fees and housing deposits are planned, travel insurance is arranged, "
            "emergency contact details are shared with family, and photocopies of "
            "admission letter, visa, and passport are saved in both physical and "
            "digital form."
        ),
    },

    # ── VISA_APPLICATION (General fallback) ──────────────────────────────────
    {
        "life_event_type": LifeEventType.VISA_APPLICATION,
        "title": "Common Documents for Visa Applications (General)",
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
    {
        "life_event_type": LifeEventType.VEHICLE_PURCHASE,
        "title": "Universal Used Vehicle Inspection and Lifecycle",
        "content": (
            "When buying a used vehicle anywhere, follow this workflow: 1. Accident History C"
            "heck (use national registries like Carfax, Vahan, etc.), 2. Professional Mechani"
            "cal Inspection, 3. Lien/Loan check to ensure the seller has the right to sell, 4"
            ". Price Negotiation based on market value, 5. Insurance Transfer, and 6. Officia"
            "l title/registration transfer."
        ),
    },
    {
        "life_event_type": LifeEventType.RENTAL_VERIFICATION,
        "title": "Global Rental and Lease Verification Guide",
        "content": (
            "Before signing a lease, ensure: 1. Pre-inspection for hazards (mold, pests, safe"
            "ty), 2. Landlord verification (proof of ownership), 3. Lease review (break claus"
            "es, hidden fees), 4. Utility checks (transfer processes), 5. Deposit protection "
            "scheme enrollment, and 6. A documented inventory with photos on move-in."
        ),
    },
    {
        "life_event_type": LifeEventType.ELDERCARE_MANAGEMENT,
        "title": "Comprehensive Eldercare Workflow",
        "content": (
            "Managing eldercare effectively requires: 1. Caretaker search and vetting, 2. Med"
            "ical records centralization (keep digital copies of diagnoses and prescriptions)"
            ", 3. Medicine management protocols (pill organizers, refill schedules), 4. Emerg"
            "ency response planning (local hospital routes, emergency contacts), 5. Family co"
            "ordination schedules, 6. Financial planning for long-term care, and 7. Organizin"
            "g legal documents (Power of Attorney, living wills)."
        ),
    },
    {
        "life_event_type": LifeEventType.EDUCATION_FINANCING,
        "title": "Education Financing and Loan Strategy",
        "content": (
            "Navigating education funding involves: 1. Eligibility assessment for local and i"
            "nternational loans, 2. Document checklist preparation (transcripts, identity pro"
            "ofs), 3. Bank comparison for lowest APR, 4. Active scholarship search strategies"
            ", 5. Co-signer coordination (identifying credit-worthy sponsors), 6. Loan tracki"
            "ng and disbursement schedules, and 7. Repayment planning post-graduation."
        ),
    },
    {
        "life_event_type": LifeEventType.CAREER_TRANSITION,
        "title": "Career Transition Action Plan",
        "content": (
            "Successfully transitioning careers requires: 1. Resume optimization for Applican"
            "t Tracking Systems (ATS), 2. LinkedIn setup and profile modernization, 3. Wardro"
            "be planning for the new industry, 4. Financial preparation for potential gaps in"
            " employment, 5. Networking strategy (informational interviews), 6. Interview cap"
            "ability prep (STAR method), and 7. First-day setup for the new role."
        ),
    },
    {
        "life_event_type": LifeEventType.POSTPARTUM_WELLNESS,
        "title": "Postpartum Recovery and Mental Health Guide",
        "content": (
            "Postpartum wellness must holistically cover: 1. Physical recovery checklists (he"
            "aling, sleep schedules), 2. Mental health screening (monitoring for depression a"
            "nd anxiety up to a year post-birth), 3. Breastfeeding/feeding support channels, "
            "4. Nutrition planning for recovery, 5. Pelvic floor exercises and physical thera"
            "py, 6. Active depression monitoring, and 7. Family coordination to distribute ne"
            "wborn care duties and reduce mother's isolation."
        ),
    },
    {
        "life_event_type": LifeEventType.WORKPLACE_WELLNESS,
        "title": "Workplace Wellness and Burnout Prevention",
        "content": (
            "Employees experiencing stress should: 1. Ask HR about Employee Assistance Progra"
            "m (EAP) setup, 2. Identify internal and external mental health resources, 3. Imp"
            "lement strict break scheduling during work hours, 4. Apply active stress managem"
            "ent techniques, 5. Initiate burnout prevention by setting boundaries, and 6. Pra"
            "ctice transparent manager communication regarding workload limits."
        ),
    },
    {
        "life_event_type": LifeEventType.PREGNANCY_PREPARATION,
        "title": "Holistic Pregnancy Preparation Checklist",
        "content": (
            "Preparing for birth involves: 1. Hospital selection and tour based on delivery p"
            "references, 2. Prenatal scheduling and regular check-ups, 3. Reviewing local mat"
            "ernity rights and leave policies, 4. Drafting a birth plan aligned with medical "
            "advice, 5. Facility verification for emergencies, 6. Early insurance documentati"
            "on and pre-authorisation, 7. Attending antenatal classes, and 8. Partner prepara"
            "tion for labor support."
        ),
    },
    {
        "life_event_type": LifeEventType.CHILD_SCHOOL_TRANSITION,
        "title": "Child School Transition and Separation Anxiety",
        "content": (
            "Smoothing a child's school transition requires: 1. Pre-school prep visits and ro"
            "utines, 2. Formulating a separation anxiety plan (short goodbyes, comfort object"
            "s), 3. Encouraging independence activities at home (dressing, bathroom), 4. Orie"
            "ntation preparation for parents and child, 5. Proactive teacher communication re"
            "garding child's triggers or needs, and 6. For boarding schools, emotional prep a"
            "nd communication schedules."
        ),
    },
    {
        "life_event_type": LifeEventType.WOMEN_DIVORCE_RECOVERY,
        "title": "Divorce Recovery and Planning for Women",
        "content": (
            "Recovering from divorce requires a structured approach to independence: 1. Initi"
            "al legal consultation to understand rights and custody arrangements, 2. Financia"
            "l planning and separation of joint accounts, 3. Document organization (marriage "
            "certificates, assets), 4. Securing mental health resources and therapy, 5. Confi"
            "dence rebuilding exercises, 6. Career planning or re-entry strategies, 7. Social"
            " network rebuilding to counter isolation, and 8. Establishing a long-term life p"
            "lan."
        ),
    },
    {
        "life_event_type": LifeEventType.WOMEN_ENTREPRENEURSHIP,
        "title": "Women Entrepreneurship Setup Guide",
        "content": (
            "For female founders, critical startup steps include: 1. Identifying capital acce"
            "ss (grants, specific loans for female founders like Mudra in India or SBA in US)"
            ", 2. Accessing mentorship networks for women in business, 3. Strategies to navig"
            "ate and overcome gender discrimination in funding, 4. Managing family pressure a"
            "nd work-life balance, 5. Official business registration and compliance, and 6. T"
            "ax planning."
        ),
    },
    {
        "life_event_type": LifeEventType.MEDICAL_EMERGENCY,
        "title": "Global Medical Emergency Preparation",
        "content": (
            "To correctly navigate a medical emergency: 1. Learn local emergency numbers (911"
            ", 112, 999, 108), 2. Familiarize yourself with hospital navigation and triage pr"
            "ocesses, 3. Keep insurance cards and identification easily accessible, 4. Unders"
            "tand the insurance claims or pre-authorisation process before crises hit, and 5."
            " Establish a post-discharge recovery plan with family or caregivers."
        ),
    },
    {
        "life_event_type": LifeEventType.WELLNESS_MANAGEMENT,
        "title": "Personal Wellness and Sleep Optimization",
        "content": (
            "Personal wellness management includes: 1. Establishing a consistent sleep hygien"
            "e routine and environment, 2. Incorporating daily physical fitness tracking, 3. "
            "Mindfulness and mental health check-ins, 4. Preventive health screenings based o"
            "n age brackets, and 5. Nutritional planning and hydration goals."
        ),
    },
    {
        "life_event_type": LifeEventType.PROPERTY_INHERITANCE,
        "title": "Property Inheritance and Estate Transfers",
        "content": (
            "Property inheritance requires navigating legal and tax systems: 1. Locating the "
            "original will and death certificate, 2. Legal documentation for title transfer ("
            "probate, succession certificates), 3. Reviewing potential inheritance tax or cap"
            "ital gains implications, 4. Negotiating disputes with beneficiaries, and 5. Upda"
            "ting municipal records and utilities to the new owner."
        ),
    },
    {
        "life_event_type": LifeEventType.HEALTH_INSURANCE,
        "title": "Health Insurance Selection and Usage Strategy",
        "content": (
            "Navigating health insurance requires: 1. Coverage selection based on pre-existin"
            "g conditions and network size, 2. Understanding deductibles, co-pays, and out-of"
            "-pocket maximums, 3. The claims process (in-network vs out-of-network), 4. Track"
            "ing policy renewals and portability, and 5. Leveraging preventive care benefits "
            "included at no cost."
        ),
    },
    {
        "life_event_type": LifeEventType.DEBT_MANAGEMENT,
        "title": "Debt Consolidation and Financial Recovery",
        "content": (
            "Effective debt management involves: 1. Listing all debts with their APRs to iden"
            "tify the most expensive (Avalanche method), 2. Evaluating loan consolidation opt"
            "ions for lower interest rates, 3. Strict monthly budgeting to increase repayment"
            " velocity, 4. Negotiating with creditors for hardship programs if needed, and 5."
            " Rebuilding credit score post-recovery."
        ),
    },
    {
        "life_event_type": LifeEventType.CAREER_UPSKILLING,
        "title": "Professional Upskilling and Certification",
        "content": (
            "Strategic career upskilling includes: 1. Identifying skill gaps based on target "
            "job descriptions, 2. Selecting accredited online courses or bootcamps, 3. Planni"
            "ng certification exam registration and timelines, 4. Applying new skills to port"
            "folio projects, and 5. Updating credentials on professional networks to attract "
            "recruiters."
        ),
    },
    {
        "life_event_type": LifeEventType.RETIREMENT_PLANNING,
        "title": "Retirement Planning Preparation",
        "content": (
            "Preparing for retirement involves: 1. Evaluating investment strategy (transition"
            "ing from high-growth to income-generating assets), 2. Calculating expected livin"
            "g expenses, 3. Healthcare prep (Medicare, supplemental insurance), 4. Estate pla"
            "nning review, 5. Navigating tax implications on pension withdrawals, and 6. Phas"
            "ed employment reduction if desired."
        ),
    },
    {
        "life_event_type": LifeEventType.FAMILY_RELOCATION,
        "title": "Multi-Person Family Relocation Workflow",
        "content": (
            "Relocating an entire family requires intense coordination: 1. Multi-person timel"
            "ine syncing (jobs, schools), 2. School planning and transition documentation for"
            " children, 3. Pet relocation (vaccinations, quarantine rules), 4. Spousal career"
            " support and visa handling, 5. Household goods shipping and inventory, and 6. Es"
            "tablishing new community roots."
        ),
    },
    {
        "life_event_type": LifeEventType.INTERNATIONAL_TRAVEL,
        "title": "International Travel and Medical Prep",
        "content": (
            "Robust international travel planning involves: 1. Visa timeline management, 2. C"
            "omprehensive travel and medical insurance purchase, 3. Medical prep (vaccination"
            " certificates, prescription supplies in original bottles), 4. Financial planning"
            " (currency access, no-foreign-transaction-fee cards), 5. Flight and itinerary ba"
            "ckups, and 6. Registering with your country's embassy if traveling to high-risk "
            "areas."
        ),
    },
    {
        "life_event_type": LifeEventType.ADOPTION_PROCESS,
        "title": "Child Adoption Process and Preparation",
        "content": (
            "The adoption process journey includes: 1. Initial agency selection and orientati"
            "on, 2. Intensive home study preparation (background checks, financial audits), 3"
            ". Legal documentation and dossier submission, 4. Matching process timelines, 5. "
            "Finalizing legal adoption in court, and 6. Post-placement home preparation and b"
            "onding."
        ),
    },
    {
        "life_event_type": LifeEventType.ACADEMIC_PLANNING,
        "title": "Academic Study Plan and Exam Preparation",
        "content": (
            "Creating a robust study or exam plan requires: 1. Compiling the complete syllabus and "
            "weightage distribution, 2. Gathering past exam papers, official study guides, and "
            "reference textbooks, 3. Creating a master calendar that blocks out revision times "
            "and accounts for your daily schedule, 4. Setting measurable weekly reading/practice "
            "milestones, and 5. Scheduling regular mock tests under timed conditions to identify "
            "weak areas."
        ),
    },
    {
        "life_event_type": LifeEventType.EVENT_PLANNING,
        "title": "Universal Event and Party Planning Checklist",
        "content": (
            "Successfully planning a personal event involves: 1. Finalizing a budget and guest list, "
            "2. Securing a venue and dates (checking for weather or holiday conflicts), 3. Booking "
            "caterers, decorators, or necessary vendors, 4. Sending invitations well in advance, "
            "5. Setting up a timeline for the day of the event, and 6. Having a backup plan for "
            "critical components like food and weather."
        ),
    },
    
    # ── UNIVERSAL DOMAINS (Core Taxonomies for broad mapping) ─────────────
    {
        "life_event_type": LifeEventType.HOUSING_AND_LOCATION,
        "title": "Housing & Relocation Foundations",
        "content": (
            "Any housing or location change requires auditing your budget, listing essential amenities, "
            "verifying property or neighborhood safety, securing necessary deposits or legal documents, "
            "and finally completing the logistics of moving and address updates."
        ),
    },
    {
        "life_event_type": LifeEventType.WORK_AND_CAREER,
        "title": "Universal Career & Employment Planning",
        "content": (
            "Career transitions involve: 1. Auditing current skills, 2. Updating resumes and portfolios, "
            "3. Networking and applications, 4. Handling notice periods and transitions gracefully, "
            "and 5. Completing onboarding compliance and tax registrations at the new job."
        ),
    },
    {
        "life_event_type": LifeEventType.EDUCATION_AND_LEARNING,
        "title": "Learning & Educational Strategy",
        "content": (
            "Educational events require defining the end goal, researching and enrolling in the right "
            "program/course, gathering study materials, managing a timeline/calendar with milestones, "
            "and continuously assessing progress."
        ),
    },
    {
        "life_event_type": LifeEventType.HEALTH_AND_DISABILITY,
        "title": "Health & Disability Planning",
        "content": (
            "Managing health events involves securing immediate care, understanding diagnosis, managing "
            "insurance or financial coverage, establishing a routine for treatments/medications, and "
            "building a long-term care or recovery plan."
        ),
    },
    {
        "life_event_type": LifeEventType.FAMILY_AND_RELATIONSHIPS,
        "title": "Family & Relationship Transitions",
        "content": (
            "Family changes require aligning on logistics, handling legal or official registrations "
            "(marriage/divorce/adoption), managing shared finances or property, and providing emotional "
            "or practical support where dependents are involved."
        ),
    },
    {
        "life_event_type": LifeEventType.MONEY_AND_ASSETS,
        "title": "Financial Lifecycle Events",
        "content": (
            "Major financial moves require: 1. Setting clear budgets and risk tolerance, 2. Gathering "
            "required proofs of income and identity, 3. Consulting financial advisors if necessary, "
            "and 4. Executing secure transactions while updating wills or estate plans."
        ),
    },
    {
        "life_event_type": LifeEventType.LEGAL_AND_IDENTITY,
        "title": "Legal & Identity Management",
        "content": (
            "Legal matters necessitate gathering certified identification, understanding relevant laws "
            "or obligations, filing correct forms within deadlines, and maintaining stamped/notarized "
            "copies of all proceedings."
        ),
    },
    {
        "life_event_type": LifeEventType.PARENTING_AND_CAREGIVING,
        "title": "Caregiving & Parenting Strategies",
        "content": (
            "Caregiving involves setting up safe environments, managing medical/school records, "
            "establishing daily routines, securing emotional support or respite care, and ensuring "
            "long-term financial stability for the dependent."
        ),
    },
    {
        "life_event_type": LifeEventType.LOSS_AND_CRISIS,
        "title": "Crisis Management & Loss Recovery",
        "content": (
            "In a crisis, prioritize immediate safety and essential needs. Next, handle urgent legal "
            "or administrative notifications (like life insurance or official authorities). Finally, "
            "seek counseling and slowly rebuild routines."
        ),
    },
    {
        "life_event_type": LifeEventType.PERSONAL_GROWTH,
        "title": "Personal Growth & Lifestyle Changes",
        "content": (
            "Lifestyle changes require defining a specific, measurable goal, breaking it into daily "
            "or weekly habits, tracking progress regularly, avoiding burnout, and adjusting timelines "
            "based on realistic constraints."
        ),
    },

    # ── UNIVERSAL DOCUMENT PATTERNS (Meta-Records for Any Event) ─────────────
    {
        "life_event_type": LifeEventType.OTHER,
        "title": "Standard Identity and Address Proof Guidelines",
        "content": (
            "For almost any official process (loans, renting, jobs, government services), "
            "you must provide Identity Proof (establishes who you are: Aadhaar, PAN, "
            "Passport, Voter ID) and Address Proof (establishes where you live: recent "
            "utility bills, bank statement, registered rent agreement). Always carry the "
            "originals for verification alongside 2-3 self-attested photocopies."
        ),
    },
    {
        "life_event_type": LifeEventType.OTHER,
        "title": "Standard Financial Proof and Affordability Documents",
        "content": (
            "Whenever establishing financial capability (for visas, large purchases, "
            "rentals, or loan applications), the standard requirement is: last 3-6 months "
            "of stamped bank statements, last 3 months of salary slips (if employed), "
            "and Income Tax Returns (ITR) for the last 1-2 years. These prove stable "
            "income and financial health."
        ),
    },
    {
        "life_event_type": LifeEventType.OTHER,
        "title": "Status, Eligibility, and Background Proofs",
        "content": (
            "To prove eligibility for a status change (immigration, admission, new job), "
            "authorities generally require: Educational/Trade certificates (degrees/mark "
            "sheets), Experience/Relieving letters from past employers, and sometimes a "
            "Police Clearance Certificate (PCC) or Medical Fitness certificate depending "
            "on the strictness of the background check."
        ),
    },
    {
        "life_event_type": LifeEventType.OTHER,
        "title": "Family, Dependent, and Civil Status Records",
        "content": (
            "If an event involves family members (dependent visas, school admissions, "
            "health insurance pooling, inheritance), you must prepare relationship proofs: "
            "Marriage certificate for spouses, and Birth certificates for children. "
            "Ensure names exactly match what is printed on the primary applicant's passport "
            "or national ID."
        ),
    },
    {
        "life_event_type": LifeEventType.OTHER,
        "title": "Agreements, Contracts, and Legal Protections",
        "content": (
            "Any transaction involving assets, tenancy, or employment should be backed by a "
            "signed contract (Employment Contract, Sale Agreement, Rent Agreement). "
            "In India, many agreements must be executed on Non-Judicial Stamp Paper of "
            "appropriate value and notarised or registered at a sub-registrar office to "
            "be legally enforceable in a dispute."
        ),
    },

    # ── RENTAL_VERIFICATION (India Police Verification) ──────────────────────
    {
        "life_event_type": LifeEventType.RENTAL_VERIFICATION,
        "title": "Tenant Police Verification Process in India",
        "content": (
            "Tenant police verification is mandatory in many Indian cities including Delhi, "
            "Bengaluru, and Mumbai. Documents required: signed rent agreement, landlord "
            "ownership proof (sale deed or tax receipt), Aadhaar copies of both landlord "
            "and tenant, and passport photos. Apply through state police portals — Delhi "
            "Police, Karnataka Police (online), or Maharashtra Police — or visit the "
            "local police station directly. Processing takes a few days to two weeks "
            "depending on the city. Missing this step can attract penalties for the landlord."
        ),
    },
    {
        "life_event_type": LifeEventType.RENTAL_VERIFICATION,
        "title": "Common Mistakes in Tenant Verification India",
        "content": (
            "The most frequent mistakes in tenant police verification are: skipping it "
            "entirely in cities where it is legally required, submitting incomplete forms "
            "without the landlord's ownership proof (causing silent rejection), and not "
            "retaining a copy of the verification acknowledgement number for future "
            "reference. Landlords must complete verification even for existing long-term "
            "tenants when they renew agreements."
        ),
    },

    # ── ELDERCARE_MANAGEMENT (India-specific) ────────────────────────────────
    {
        "life_event_type": LifeEventType.ELDERCARE_MANAGEMENT,
        "title": "Managing Pension and EPFO for Senior Parents in India",
        "content": (
            "To manage elderly parents' pensions in India: locate the Pension Payment Order "
            "(PPO) and verify the pension-disbursing bank. For EPFO Employees' Pension "
            "Scheme (EPS), corrections and transfers are done via the EPFO member portal. "
            "Pension corrections or branch transfers can take several weeks to a few months. "
            "Update nominee details in all bank accounts and insurance policies — these "
            "are often outdated and cause major delays during emergencies."
        ),
    },
    {
        "life_event_type": LifeEventType.ELDERCARE_MANAGEMENT,
        "title": "Ayushman Bharat and State Health Schemes for Senior Citizens",
        "content": (
            "Senior citizens in India may be eligible for Ayushman Bharat (PM-JAY) "
            "covering hospitalisation up to ₹5 lakh/year, or state equivalents like "
            "Arogya Karnataka or Chief Minister's Health Insurance. Enrollment requires "
            "Aadhaar, ration card, and BPL or eligibility certificate. Processing "
            "typically takes 1–4 weeks. Additionally, register for local senior citizen "
            "identity cards issued by municipal offices for priority counters, rail "
            "concessions, and community helplines."
        ),
    },

    # ── EDUCATION_FINANCING (India-specific) ─────────────────────────────────
    {
        "life_event_type": LifeEventType.EDUCATION_FINANCING,
        "title": "Vidya Lakshmi Portal and NSP for Education Loans and Scholarships",
        "content": (
            "The Vidya Lakshmi portal (vidyalakshmi.co.in) is a single-window platform "
            "where students can apply for education loans from multiple banks simultaneously. "
            "The National Scholarship Portal (scholarships.gov.in) lists central and state "
            "government scholarships — apply before the deadline, typically August–October. "
            "Documents needed: admission letter, fee structure, academic marksheets, income "
            "proof of co-applicant, and Aadhaar. Bank loan processing can take days to "
            "several months depending on collateral and lender; start at least 3 months "
            "before the fee payment deadline."
        ),
    },
    {
        "life_event_type": LifeEventType.EDUCATION_FINANCING,
        "title": "Common Mistakes in Indian Education Loan Applications",
        "content": (
            "Frequent education loan mistakes in India include: starting the loan process "
            "too close to fee-payment deadlines leaving no buffer for document queries, "
            "submitting incomplete co-applicant income proofs (missing ITR or salary slips), "
            "and not checking collateral requirements for loans above ₹7.5 lakh. For "
            "study-abroad loans, students often miss reviewing the moratorium terms and "
            "currency risk for EMIs repaid in rupees on foreign-currency fees."
        ),
    },

    # ── CAREER_TRANSITION (India EPF / F&F) ──────────────────────────────────
    {
        "life_event_type": LifeEventType.CAREER_TRANSITION,
        "title": "EPF Transfer Process When Changing Jobs in India",
        "content": (
            "When switching jobs in India, transfer your EPF online via the EPFO member "
            "portal using your UAN (Universal Account Number). Do NOT withdraw — withdrawal "
            "before 5 years of service attracts tax and forfeits future compounding. The "
            "transfer request is attested by your new employer online; processing typically "
            "takes 2–8 weeks after employer approval. Check your UAN passbook to confirm "
            "the transfer completed before your old employer closes your account."
        ),
    },
    {
        "life_event_type": LifeEventType.CAREER_TRANSITION,
        "title": "Collecting Exit Documents Before Leaving a Job in India",
        "content": (
            "Before your last working day, collect: experience letter, relieving letter, "
            "Form 16 (for the partial year if mid-year switch), last 3 salary slips, and "
            "the Full-and-Final (F&F) settlement statement. Ensure ESOP or stock grant "
            "documents are in hand if applicable. Resign just before an annual review "
            "only after checking the gratuity eligibility threshold (5 years of service). "
            "Corporate email and system access is usually revoked on exit day — collect "
            "all documents before that."
        ),
    },

    # ── POSTPARTUM_WELLNESS (India-specific) ─────────────────────────────────
    {
        "life_event_type": LifeEventType.POSTPARTUM_WELLNESS,
        "title": "Birth Registration Process in India",
        "content": (
            "In India, birth must be registered within 21 days at the municipal corporation "
            "or gram panchayat using the hospital-issued birth certificate. After 21 days, "
            "a late fee and additional affidavit are required. Documents needed: hospital "
            "discharge summary, parents' Aadhaar cards, and the filled registration form. "
            "The official birth certificate (required for passports, school admissions, "
            "and government schemes) is issued by the Registrar of Births and Deaths. "
            "Most cities now offer online tracking and delivery."
        ),
    },
    {
        "life_event_type": LifeEventType.POSTPARTUM_WELLNESS,
        "title": "Maternity Insurance Claims and Employer Benefits After Childbirth",
        "content": (
            "After childbirth, file a maternity insurance claim within the insurer's "
            "stipulated window (usually 15–30 days of discharge). Required documents: "
            "discharge summary, hospital bills, newborn birth record, and claim form. "
            "Notify employer HR within the required timeline to activate maternity pay "
            "and extend leave if needed. Under the Maternity Benefit Act 2017, eligible "
            "female employees get 26 weeks paid leave; ESIC-covered employees can "
            "claim maternity benefit directly from ESIC. Missing insurer notification "
            "deadlines is the most common reason for claim rejection."
        ),
    },

    # ── PREGNANCY_PREPARATION (India-specific) ───────────────────────────────
    {
        "life_event_type": LifeEventType.PREGNANCY_PREPARATION,
        "title": "Insurance Maternity Waiting Periods and ESIC Benefits in India",
        "content": (
            "Private health insurance plans in India typically have a maternity waiting "
            "period of 9–24 months — check your policy before planning. ESIC-covered "
            "employees (earning under ₹21,000/month) are entitled to maternity benefit "
            "paid directly by ESIC for 26 weeks without any waiting period. Register "
            "on the ESIC portal and confirm eligibility early in pregnancy. State "
            "government maternity schemes (e.g., Pradhan Mantri Matru Vandana Yojana) "
            "provide ₹5,000 cash for the first live birth upon Aadhaar-linked registration "
            "at an Anganwadi or health centre."
        ),
    },

    # ── CHILD_SCHOOL_TRANSITION (India-specific) ─────────────────────────────
    {
        "life_event_type": LifeEventType.CHILD_SCHOOL_TRANSITION,
        "title": "School Transfer Certificate and Admission Documents in India",
        "content": (
            "When moving to a new city with school-age children in India, collect the "
            "Transfer Certificate (TC) from the current school before departure — "
            "this is mandatory for admission to any new school. Also gather: birth "
            "certificate, latest report card, Aadhaar, and address proof for the new "
            "city. Government school admissions are managed through state education "
            "portals; private schools have independent intake cycles usually 3–6 months "
            "before the academic year. Mid-year transfers are possible but depend on "
            "seat availability. Entrance tests or interviews may add 1–3 weeks."
        ),
    },

    # ── WOMEN_DIVORCE_RECOVERY (India legal process) ─────────────────────────
    {
        "life_event_type": LifeEventType.WOMEN_DIVORCE_RECOVERY,
        "title": "Family Court Divorce Process in India",
        "content": (
            "Divorce in India is filed in the Family Court under personal law (Hindu "
            "Marriage Act, Special Marriage Act, etc.) or under Section 13B for mutual "
            "consent. Mutual consent divorce requires a joint petition, a 6-month "
            "cooling-off period (which courts may waive), and typically takes 6–18 months "
            "depending on court backlog. Contested divorce can take several years. "
            "Documents needed: marriage certificate, ID proofs of both parties, address "
            "proof, children's birth certificates, bank statements, and any DV complaints "
            "or FIRs. Legal aid services are available at District Legal Services "
            "Authorities (DLSA) free of charge for eligible women."
        ),
    },
    {
        "life_event_type": LifeEventType.WOMEN_DIVORCE_RECOVERY,
        "title": "Financial and Administrative Steps After Divorce in India",
        "content": (
            "After a divorce decree: update Aadhaar and PAN with maiden name if reverting "
            "(takes 4–8 weeks via UIDAI and NSDL portals). Separate all joint bank accounts "
            "and update nominees in EPF, insurance, and bank accounts immediately. Claim "
            "stridhan and document any shared assets (property, investments) before "
            "settlement is signed. Do not sign any agreement without independent legal "
            "and financial advice. File income tax separately from the year of separation. "
            "Open an independent credit card to start building your own credit history."
        ),
    },

    # ── REPATRIATION (India-specific) ────────────────────────────────────────
    {
        "life_event_type": LifeEventType.REPATRIATION,
        "title": "Repatriation of Body After Death Abroad — India Consular Process",
        "content": (
            "When an Indian national dies abroad, the family must contact the Indian "
            "Embassy or Consulate in that country immediately. The consulate coordinates "
            "the death certificate, No Objection Certificate (NOC) for repatriation, "
            "and coordinates with local authorities. Required documents: deceased's "
            "passport, local death certificate, hospital records, embalming certificate, "
            "and relationship proof of next of kin. Airlines allow repatriation as cargo "
            "with these clearances. The process typically takes 1–3 weeks internationally "
            "and a few days for domestic inter-state transfers. Insurance policies with "
            "repatriation cover (especially employer group policies) can fund this. "
            "MEA's Madad portal (madad.gov.in) tracks consular assistance cases."
        ),
    },

    # ── CAREER_TRANSITION — Senior Engineer / PM (Expert Map) ────────────────
    {
        "life_event_type": LifeEventType.CAREER_TRANSITION,
        "title": "Senior Software Engineer Promotion — Evidence and Interview Prep",
        "content": (
            "To move to a senior engineering level, document quantified impact: latency "
            "improvements, reliability gains, revenue impact, or team output multiplied. "
            "Compile a portfolio showing systems you owned end-to-end, incidents you led, "
            "and cross-team influence. Internal promotion cycles are typically tied to "
            "annual or biannual review windows. External moves at senior level realistically "
            "take 2–6 months and require strong system design and leadership narratives — "
            "not just coding ability. References from tech leads and managers accelerate "
            "the process."
        ),
    },
    {
        "life_event_type": LifeEventType.CAREER_TRANSITION,
        "title": "Switching from Engineering to Product Management",
        "content": (
            "Transitioning from engineering to product management requires building a "
            "portfolio of product-like work: features led end-to-end with documented "
            "problem, hypothesis, and outcome metrics. Evidence of customer interaction "
            "(interviews, surveys) and business trade-offs is essential. Internal "
            "transitions typically take 3–12 months of shadow PM work before a formal "
            "title change. External PM moves without a prior PM title require a strong "
            "narrative of discovery and impact — not just technical work. Position yourself "
            "as someone already doing PM work, not as a developer seeking a change."
        ),
    },

    # ── EDUCATIONAL_ENROLLMENT — Graduate Research ────────────────────────────
    {
        "life_event_type": LifeEventType.EDUCATIONAL_ENROLLMENT,
        "title": "Graduate Research Project — Approvals and Milestones",
        "content": (
            "Starting a graduate research project (MS or PhD) requires: an approved "
            "research proposal with a defined scope, ethics or IRB approval if human "
            "subjects are involved, data access agreements or lab access letters where "
            "applicable, and a reference library setup (Zotero or Mendeley). Master's "
            "projects typically run 6–12 months from proposal to defense; PhD research "
            "spans multiple years with formal candidacy and thesis stages. "
            "Common pitfall: choosing an overly broad topic that cannot be completed "
            "within the available time — narrow scope aggressively from the start."
        ),
    },

    # ── VISA_APPLICATION — H-1B / Work Visa Sponsorship ──────────────────────
    {
        "life_event_type": LifeEventType.VISA_APPLICATION,
        "title": "Work Visa Sponsorship Process (H-1B and Similar)",
        "content": (
            "Work visa sponsorship (e.g., US H-1B) involves: employer files a Labor "
            "Condition Application (LCA) with the Dept of Labor, then files a petition "
            "with USCIS. Standard USCIS processing can take 8–12 months; premium "
            "processing (additional fee) delivers a decision in about 15 business days. "
            "Applicant then attends a consular interview for visa stamping. Key mistake: "
            "assuming any employer can sponsor — they must be a registered sponsor with "
            "legal capacity. Track petition validity dates carefully and do not change "
            "employers without understanding portability rules. Total timeline from offer "
            "to start date commonly spans many months."
        ),
    },

    # ── BUSINESS_STARTUP — VC / Fundraising ──────────────────────────────────
    {
        "life_event_type": LifeEventType.BUSINESS_STARTUP,
        "title": "VC Pitch Deck and Fundraising Data Room",
        "content": (
            "For a venture capital raise, the pitch deck must clearly cover: problem, "
            "solution, market size, traction metrics (MRR, growth rate, CAC/LTV), "
            "business model, team, and financials. Back it with a data room containing "
            "incorporation documents, cap table, IP assignments, and key contracts. "
            "Early-stage fundraises commonly take 3–6 months from first meetings to "
            "money in the bank. The most common mistake is a deck strong on technology "
            "but weak on market size, go-to-market, and consistent metrics across deck "
            "and data room. Approach investors matched to your stage — pre-revenue "
            "startups should target angels and pre-seed funds, not Series A investors."
        ),
    },

    # ── MEDICAL_EMERGENCY — Surgical Planning ────────────────────────────────
    {
        "life_event_type": LifeEventType.MEDICAL_EMERGENCY,
        "title": "Elective Surgery Planning and Insurance Pre-Authorisation",
        "content": (
            "For planned surgeries in India: verify that both the hospital and surgeon "
            "are in-network for your insurance policy. Request pre-authorisation from "
            "your insurer/TPA at least 2 weeks before the procedure — submit referral "
            "letter, diagnosis, and proposed treatment plan. Elective surgical planning "
            "involves consultations, investigations (MRI, blood tests), and scheduling "
            "that together can take weeks to months. Critical mistakes: no updated "
            "medication and allergy list for the anaesthesiologist, and no discharge "
            "plan (follow-up appointments, home-care requirements) arranged in advance."
        ),
    },

    # ── HEALTH_INSURANCE — Chronic Condition Management ──────────────────────
    {
        "life_event_type": LifeEventType.HEALTH_INSURANCE,
        "title": "Managing Chronic Conditions — Records and Portability in India",
        "content": (
            "For chronic conditions (diabetes, hypertension, cardiac), maintain a "
            "consolidated record of all lab results, prescriptions, and imaging — "
            "fragmented records across multiple providers are the most common complaint "
            "during referrals. Health insurance policies can exclude pre-existing "
            "conditions for 2–4 years; after that, coverage typically activates. "
            "Port your policy before renewal (within the portability window) if changing "
            "insurer — portability preserves your accrued waiting periods. Schedule "
            "monthly or quarterly specialist visits and annual comprehensive panels "
            "proactively; irregular follow-up and medication non-adherence are the "
            "leading causes of hospitalisation in chronic cases."
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
