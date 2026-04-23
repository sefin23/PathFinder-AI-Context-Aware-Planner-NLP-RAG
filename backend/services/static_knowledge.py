"""
Layer 3.3 — Static Expert Knowledge Fallback.
Provides high-quality, pre-written requirement summaries for common life events.
Used as a 'Safety Net' when all AI models (OpenRouter/Gemini) are failing or rate-limited.
Ensures the user ALWAYS sees professional content during demos/reviews.
"""
from typing import Dict, List
from backend.schemas.nlp_schema import LifeEventType

# High-quality, expert-vetted essentials for common life events
EXPERT_FALLBACKS: Dict[LifeEventType, str] = {
    LifeEventType.BUSINESS_STARTUP: """\
### Strategic Overview
Launching a business requires careful legal structuring and regulatory compliance from day one.

### 1. Primary Essentials
- **Business Structure & Registration**: Selection of entity type (Private Limited, LLP, or Sole Proprietorship) and official incorporation.
- **Tax Identification (PAN/TAN)**: Registration for business tax IDs and Goods and Services Tax (GST) if applicable.
- **Operating Licenses**: Industry-specific permits and local Shop & Establishment licenses.

### 2. From Authorities & Third Parties
- **NOCs & Clearances**: No Objection Certificates from pollution boards or fire safety where applicable.
- **Bank Account Setup**: Dedicated business account requires specific board resolutions or incorporation certificates.
- **Digital Signature Certificates (DSC)**: Necessary for online filing and secure document signing in many jurisdictions.

### 3. Action & Submission Needs
- **Domain & Branding**: Registration of trademark and digital assets to protect intellectual property.
- **Employee Paperwork**: Compliance with labor laws, including EPF (Employee Provident Fund) and insurance.

### 4. Common Mistakes & Expert Tips
- **Mixing Personal Funds**: Always keep business and personal finances separate from the beginning.
- **Ignoring Local Zoning**: Validating your business location against local land-use laws before signing a lease.
""",

    LifeEventType.RELOCATION: """\
### Strategic Overview
Moving, especially internationally, demands strict coordination between immigration status and physical logistics.

### 1. Primary Essentials
- **Address Verification**: New lease agreement or utility bills to prove residence at your destination.
- **Logistics & Packing**: Inventory list and insurance for household goods during transit.
- **Customs Documentation**: Detailed declaration for any restricted or dutiable items being moved.

### 2. From Authorities & Third Parties
- **ID Updates**: Updating your driver's license and national identity cards with the new residential details.
- **Bank Transfers**: Notifying financial institutions and potentially setting up local bank accounts in the new city.
- **School & Medical Records**: Certified copies for children's enrollment and local healthcare continuity.

### 3. Action & Submission Needs
- **Exit Formalities**: Termination of previous utility contracts and mail forwarding setup.
- **Local Taxes**: Registration with local municipal authorities for tax and voting purposes.

### 4. Common Mistakes & Expert Tips
- **Poor Inventory Detail**: Accurate inventory lists save weeks of delays in customs and insurance claims.
- **Ignoring Insurance**: Standard moving coverage is often insufficient for high-value personal assets.
""",

    LifeEventType.LEGAL_AND_IDENTITY: """\
### Strategic Overview
Maintaining valid identity documents is the cornerstone of processing any further legal or civic request.

### 1. Primary Essentials
- **Current Identity Proof**: Valid Passport, National ID, or Driver's License as the primary source of truth.
- **Evidence of Change**: Certificates for marriage, divorce, or official name changes where applicable.
- **Biometric Enrolment**: Modern identity systems often require physical fingerprinting or iris scanning.

### 2. From Authorities & Third Parties
- **Verification Records**: Police clearance certificates or background verification reports for high-security applications.
- **Certified Translations**: Apostille or legalized translations for documents being used in foreign countries.

### 3. Action & Submission Needs
- **Recent Photographs**: High-resolution passport-sized photos meeting specific technical standards.
- **Online portal registration**: Accessing official government systems for secure document submission.

### 4. Common Mistakes & Expert Tips
- **Expiring Documents**: Never wait until the last 6 months of validity to start a renewal process.
- **Name Mismatches**: Ensure your name is spelled IDENTICALLY across all supporting evidence (e.g. Aadhar vs Passport).
""",

    LifeEventType.VISA_APPLICATION: """\
### Strategic Overview
Visa success is determined by proving clear intent, strong financial ties, and strict adherence to the host country’s rules.

### 1. Primary Essentials
- **Valid Passport**: Must have at least 6 months’ validity beyond your intended stay.
- **Proof of Funds**: Bank statements or sponsorship letters proving financial stability.
- **Travel Itinerary**: Detailed plan of stay, including flight bookings and hotel reservations.

### 2. From Authorities & Third Parties
- **Sponsorship Documents**: Invitations from residents or letters of support from employers/universities.
- **Health Insurance**: Mandatory medical coverage for the duration of the stay in most jurisdictions.

### 3. Action & Submission Needs
- **Covering Letter**: A clear, typed letter explaining the exact purpose and duration of the trip.
- **Visa Fee Payment**: Proof of transaction for the non-refundable processing fees.

### 4. Common Mistakes & Expert Tips
- **Vague Itineraries**: Border agents and visa officers prefer specific dates and named locations.
- **Missing Proof of Ties**: Always emphasize reasons you MUST return to your home country (job, family, property).
""",

    LifeEventType.VEHICLE_PURCHASE: """\
### Strategic Overview
Buying a vehicle in India requires verifying legal ownership, ensuring no active loans, and completing RTO registration within the required timeline.

### 1. Primary Essentials
- **RC Verification**: Check the Registration Certificate (RC) on Parivahan/VAHAN portal for correct owner name, hypothecation status, and engine/chassis match.
- **Insurance and PUC**: Valid motor insurance policy and Pollution Under Control (PUC) certificate must transfer with the vehicle.
- **PAN Card**: Mandatory for purchases above certain invoice values; also required for high-value loans.

### 2. From Authorities & Third Parties
- **RTO (Regional Transport Office)**: Handles ownership transfer, registration, and road taxes via the Parivahan portal.
- **Hypothecation NOC**: If the vehicle had a loan, get a No Objection Certificate from the bank confirming it is cleared.
- **Insurance Transfer**: Must be completed within 14 days of purchase using Form 29 and Form 30.

### 3. Action & Submission Needs
- **Temporary Registration**: Usually issued by the dealer, valid for about 1 month; permanent registration number typically issued within 2–7 days.
- **BH-Series Registration**: If you relocate states frequently, discuss Bharat series registration with the dealer to avoid repeat NOC and re-registration.

### 4. Common Mistakes & Expert Tips
- **Skipping RC Check**: Many buyers discover hypothecation or wrong ownership details only after payment — always verify on VAHAN before handover.
- **Assuming Dealer Completed RTO Work**: Verify RTO status on Parivahan yourself; do not drive until you have confirmation.
""",

    LifeEventType.RENTAL_VERIFICATION: """\
### Strategic Overview
Tenant police verification is legally required in major Indian cities; skipping it exposes both landlord and tenant to penalties.

### 1. Primary Essentials
- **Rent Agreement**: Registered or notarised rent agreement on stamp paper is the foundation document.
- **Landlord Ownership Proof**: Sale deed, property tax receipt, or khata establishing that the landlord has legal right to rent.
- **ID Proofs for Both Parties**: Aadhaar card copies for landlord and tenant; passport or PAN as alternatives.

### 2. From Authorities & Third Parties
- **Local Police Station**: Submit verification form or apply via state police online portals (Delhi Police, Bengaluru City Police, Maharashtra Police).
- **Bangalore One / State Portals**: Many cities now allow online submission — keep the acknowledgement reference number.

### 3. Action & Submission Needs
- **Passport Photos**: Required for tenant and sometimes for the landlord.
- **Verification Window**: Complete within days of the tenant moving in; retroactive filing involves extra explanation and delays.

### 4. Common Mistakes & Expert Tips
- **Incomplete Ownership Proof**: Submissions rejected silently when ownership documents are missing — always include the sale deed or tax receipt.
- **No Acknowledgement Copy**: Always retain the police verification acknowledgement or reference number as proof the process was completed.
""",

    LifeEventType.ELDERCARE_MANAGEMENT: """\
### Strategic Overview
Managing care for elderly parents in India requires centralising their documents, accessing government health schemes, and keeping financial nominations updated.

### 1. Primary Essentials
- **Parent Identity Documents**: Aadhaar, PAN, bank passbooks, pension payment order (PPO), and health insurance TPA cards in one consolidated folder.
- **Medical Records**: Current prescriptions, diagnosis reports, and vaccination records organised chronologically.
- **Pension Details**: Know the disbursing bank, PPO number, and EPFO credentials for EPS pension tracking.

### 2. From Authorities & Third Parties
- **EPFO Portal**: For pension corrections, passbook, or EPS grievances.
- **Ayushman Bharat / State Schemes**: PM-JAY covers ₹5 lakh/year hospitalisation; state schemes like Arogya Karnataka extend further. Enroll via Aadhaar at empanelled hospitals.
- **Municipal Office**: Register for senior citizen identity card for priority counters, rail concessions, and local helplines.

### 3. Action & Submission Needs
- **Nominee Updates**: Update nominees in all bank accounts, insurance policies, and EPF — outdated nominees cause major delays during emergencies.
- **Power of Attorney**: Draft a medical or general PoA while your parents are able to consent.

### 4. Common Mistakes & Expert Tips
- **No Centralised Document Folder**: Children scramble to find PPO, policy numbers, and account details during a medical crisis — build this folder now.
- **Delaying Scheme Enrollment**: Eligibility for state and central health schemes is often missed because families are unaware; check eligibility on pmjay.gov.in.
""",

    LifeEventType.EDUCATION_FINANCING: """\
### Strategic Overview
Education financing in India involves bank education loans, government portals like Vidya Lakshmi, and scholarship portals — start early to avoid deadline crunches.

### 1. Primary Essentials
- **Admission Letter and Fee Structure**: The institution’s official offer and detailed fee schedule are required by all lenders.
- **Co-Applicant Income Proofs**: Salary slips (3 months), ITR (2 years), and bank statements for parents or guarantors.
- **Academic Records**: Marksheets and degree certificates establish creditworthiness with lenders.

### 2. From Authorities & Third Parties
- **Vidya Lakshmi Portal** (vidyalakshmi.co.in): Single window to apply to multiple bank education loans simultaneously.
- **National Scholarship Portal** (scholarships.gov.in): Lists central and state government scholarships with deadline-driven windows.
- **Bank / NBFC Portals**: Public sector banks typically have lower interest rates; NBFCs are faster but cost more.

### 3. Action & Submission Needs
- **Collateral Documents**: Loans above ₹7.5 lakh often require property papers and valuation report.
- **Scholarship Applications**: Apply before August–October for most government schemes, well ahead of fee deadlines.

### 4. Common Mistakes & Expert Tips
- **Starting Too Late**: Begin the loan process at least 3 months before fee payment; bank queries can add weeks.
- **Moratorium Blindspot**: Interest accrues during the study period even during moratorium — plan how to manage this accumulation.
""",

    LifeEventType.CAREER_TRANSITION: """\
### Strategic Overview
A career transition in India involves a notice period, EPF transfer (not withdrawal), and collecting all exit documents before system access is revoked.

### 1. Primary Essentials
- **Offer and Appointment Letters**: Both current and new offer letters are needed for background verification by the new employer.
- **EPF/UAN Details**: Transfer your EPF balance online via the EPFO member portal — do not withdraw, as this forfeits compounding and attracts tax.
- **Form 16 and Salary Slips**: Required for income tax filing and background checks; collect for the current partial year.

### 2. From Authorities & Third Parties
- **EPFO Member Portal**: Handles online EPF transfer requests; typically completed in 2–8 weeks after employer attestation.
- **Income Tax Portal**: Update Form 10E for arrears, and verify your PAN-linked income once the new employer adds you.
- **State Labour Portals**: Raise EPF grievances here if the transfer is delayed beyond 30 days.

### 3. Action & Submission Needs
- **Exit Document Checklist**: Relieving letter, experience letter, F&F statement, and ESOP/RSU grant documents — collect before your last day.
- **Notice Period**: Typically 30–90 days in Indian IT/tech; negotiate buyout with new employer if needed.

### 4. Common Mistakes & Expert Tips
- **EPF Withdrawal Instead of Transfer**: Withdrawing EPF before 5 years of service attracts full income tax and loses long-term compounding.
- **Resigning Near Gratuity Threshold**: Gratuity (under Payment of Gratuity Act) vests after 5 years — check your anniversary date before tendering resignation.
""",

    LifeEventType.POSTPARTUM_WELLNESS: """\
### Strategic Overview
After childbirth in India, the immediate priorities are birth registration within 21 days, maternity insurance claim submission, and activating employer maternity benefits.

### 1. Primary Essentials
- **Birth Certificate**: Register at the municipal corporation within 21 days using the hospital-issued birth record and parents’ Aadhaar cards.
- **Hospital Discharge Summary**: Required for insurance claims, employer leave verification, and all post-delivery medical follow-ups.
- **Vaccination Card**: The immunisation schedule starts from birth — maintain this record carefully.

### 2. From Authorities & Third Parties
- **Municipal Corporation**: Issues the official birth certificate; many cities offer online tracking.
- **Insurance TPA Portal**: File the maternity claim within 15–30 days of discharge with all hospital bills and discharge summary.
- **Employer HR**: Submit discharge summary and leave application to activate maternity pay under the Maternity Benefit Act (26 weeks for eligible employees).

### 3. Action & Submission Needs
- **ESIC Maternity Claim**: For ESIC-covered employees, claim directly via the ESIC portal — maternity benefit is paid by ESIC, not the employer.
- **Pradhan Mantri Matru Vandana Yojana**: ₹5,000 cash benefit for the first live birth; register at the Anganwadi centre or health centre.

### 4. Common Mistakes & Expert Tips
- **Delayed Birth Registration**: After 21 days, an affidavit and late fee are required; after 1 year, court order may be needed.
- **Ignoring Mental Health**: Postnatal depression affects 1 in 5 new mothers — schedule a mental health check-in at the 6-week postnatal appointment.
""",

    LifeEventType.PREGNANCY_PREPARATION: """\
### Strategic Overview
Pregnancy preparation in India requires checking insurance maternity waiting periods (often 9–24 months), aligning leave plans with medical advice, and understanding ESIC entitlements if applicable.

### 1. Primary Essentials
- **Health Insurance Policy Review**: Confirm maternity cover is active; private plans typically have a 9–24 month waiting period — check before planning.
- **Employer Maternity Policy**: Under the Maternity Benefit Act 2017, eligible employees get 26 weeks paid leave; confirm your HR handbook’s specific rules.
- **Financial Planning Documents**: Review ongoing EMIs, savings, and emergency fund to plan for NICU or high-risk costs.

### 2. From Authorities & Third Parties
- **ESIC Portal**: ESIC-covered employees (salary ≤ ₹21,000/month) qualify for full maternity benefit without a waiting period — register early in pregnancy.
- **Insurance Portal / TPA**: Notify insurer of pregnancy early to activate pre-natal cover and understand what requires pre-authorisation.
- **State Maternity Schemes**: PM Matru Vandana Yojana gives ₹5,000 for the first child; check eligibility at Anganwadi or health centre.

### 3. Action & Submission Needs
- **Leave Planning**: Align pre- and post-delivery leave splits with both your OB-GYN recommendation and your company’s policy for maximum benefit.
- **Medical Records**: Organise all prenatal reports and scans from Week 1 — required for insurance claims and hospital admissions.

### 4. Common Mistakes & Expert Tips
- **Discovering Waiting Periods Too Late**: Many women discover their insurance does not cover maternity after conception — check before planning.
- **No Emergency Cost Backup**: NICU or high-risk deliveries can cost ₹2–10 lakh; have a separate emergency fund separate from regular savings.
""",

    LifeEventType.CHILD_SCHOOL_TRANSITION: """\
### Strategic Overview
Moving to a new city with school-age children requires collecting the Transfer Certificate from the current school before departure and timing the move with admission cycles.

### 1. Primary Essentials
- **Transfer Certificate (TC)**: Mandatory from the current school; most new schools will not process admission without the original TC.
- **Academic Records**: Last report card and marksheets as proof of grade level.
- **Birth Certificate**: Required by all schools — ensure the name matches parents’ ID exactly.

### 2. From Authorities & Third Parties
- **State Education Portals**: Government school admissions are managed online in most states; check the new city’s DEO (District Education Officer) portal.
- **Private School Websites**: Private schools have independent admission cycles, typically opening 3–6 months before the academic year.
- **Local Education Office**: For mid-year transfers to government schools, the Block Education Office can facilitate seat allocation.

### 3. Action & Submission Needs
- **Address Proof for New City**: Rent agreement or utility bill in the new city is required for both government and private school enrollment.
- **Vaccination Record**: Increasingly required at admission, especially for nursery and primary levels.

### 4. Common Mistakes & Expert Tips
- **Missing the Admission Cycle**: Moving after admissions close leaves only expensive private options or waitlisted government seats — plan the relocation date around the academic calendar.
- **Forgetting TC at Old School**: TC collection is often overlooked in the chaos of moving; request it at least 2 weeks before the last day.
""",

    LifeEventType.WOMEN_DIVORCE_RECOVERY: """\
### Strategic Overview
Divorce in India involves family courts and a structured legal process; women should secure independent legal advice before signing any settlement and update all financial nominations promptly.

### 1. Primary Essentials
- **Marriage Certificate**: The foundational document for all court proceedings and subsequent name changes.
- **Financial Documents**: Bank statements (3 years), ITR, property ownership documents, and investment statements for both parties — needed for maintenance and alimony (Section 24 HMA).
- **Children’s Birth Certificates**: Required for custody and maintenance proceedings if children are involved.

### 2. From Authorities & Third Parties
- **Family Court**: File the divorce petition here; mutual consent under Section 13B requires a 6-month cooling-off period (waivable by court).
- **District Legal Services Authority (DLSA)**: Provides free legal aid to eligible women — do not navigate court proceedings without representation.
- **Land/Registration Department**: Required for property division and mutation of title post-settlement.

### 3. Action & Submission Needs
- **Separate Financial Accounts**: Open an individual bank account and credit card immediately to build an independent credit history.
- **Nominee Updates**: Update nominees in bank accounts, EPF, insurance, and PPF as soon as the decree is granted.
- **Name Reversion**: Update Aadhaar, PAN, and passport with maiden name — process takes 4–8 weeks end-to-end.

### 4. Common Mistakes & Expert Tips
- **Settling Under Pressure**: One-sided settlements signed under emotional or social pressure without financial review can result in decades of financial loss — insist on independent advice.
- **Overlooking Spouse’s Assets**: Property, investments, and business interests in the spouse’s name may be claimed during proceedings — document everything before filing.
""",

    LifeEventType.JOB_ONBOARDING: """\
### Strategic Overview
Smooth onboarding in India requires consistent names across all ID documents, timely EPF transfer from previous employer, and completing all HR and tax declarations within the joining window.

### 1. Primary Essentials
- **Government ID and Address Proof**: Aadhaar, PAN, and address proof — ensure the name on all documents is identical (a mismatch causes payroll and KYC delays).
- **Bank Account Details**: Salary account number and cancelled cheque for payroll setup.
- **Education and Experience Certificates**: Originals and photocopies; relieving letter and F&F statement from previous employer if applicable.

### 2. From Authorities & Third Parties
- **EPFO Member Portal**: Transfer your old PF account using UAN within the first month to avoid scattered balances.
- **ESIC Portal**: If the new employer is ESIC-covered, your Insurance Number is mapped from Day 1 by employer.
- **DigiLocker**: Useful for fetching verified Aadhaar, driving licence, and educational certificates for digital onboarding.

### 3. Action & Submission Needs
- **Tax Declaration**: Submit HRA, LTA, and Section 80C investment declarations to HR within the first week to avoid excess TDS deductions.
- **Background Check Consent**: Sign background verification forms and provide correct dates for education and employment — inconsistencies cause delays.

### 4. Common Mistakes & Expert Tips
- **Name Mismatch Across Documents**: Aadhaar says "Rahul Kumar", PAN says "Rahul K." — even minor differences stall KYC and payroll. Correct before joining.
- **Not Transferring PF**: Multiple small PF accounts lose compounding and make withdrawal complex; always transfer within 30 days of joining.
""",

    LifeEventType.MARRIAGE_PLANNING: """\
### Strategic Overview
Legal marriage registration in India requires choosing between personal law acts or the Special Marriage Act, and coordinating witnesses with valid ID on the registration day.

### 1. Primary Essentials
- **Age Proofs**: Birth certificate or school-leaving certificate; groom must be 21+, bride 18+.
- **Address Proof**: Residence in the jurisdiction of the registrar for at least 30 days prior.
- **Witness ID Proofs**: 2 witnesses with original Aadhaar or government ID must be physically present on registration day.

### 2. From Authorities & Third Parties
- **Sub-Divisional Magistrate (SDM) / Marriage Registrar**: Handles registration under the Hindu Marriage Act or Special Marriage Act.
- **State Registration Portal**: Many states offer online appointment booking; apply early as slots fill up quickly.
- **Special Marriage Act Notice**: Requires a 30-day public notice period posted at the registrar’s office before solemnization — plan your wedding date accordingly.

### 3. Action & Submission Needs
- **Photos**: Passport-size photos of both parties and witnesses in the format specified by the registrar.
- **Marriage Invitation or Priest Certificate**: Some states require this as supporting evidence.

### 4. Common Mistakes & Expert Tips
- **Wedding Before SMA Notice Clears**: Couples who marry religiously before completing the 30-day SMA notice often face timeline conflicts — plan legal registration separately and first.
- **Witnesses Without Original ID**: Witnesses arriving with photocopies instead of original government ID cause rescheduling — confirm this in advance.
""",

    LifeEventType.HOME_PURCHASE: """\
### Strategic Overview
Buying property in India requires a 30-year title search, RERA verification for under-construction projects, and budgeting for stamp duty and registration costs beyond the sale price.

### 1. Primary Essentials
- **Title Documents**: Sale deed, chain of agreements, encumbrance certificate (EC) from the Sub-Registrar to verify no loans or disputes on the property.
- **Building Approvals**: Approved building plan from municipal corporation and Occupancy Certificate (OC) — purchase without OC creates future legal risk.
- **RERA Registration**: Mandatory for under-construction projects; verify on the state RERA portal before signing any agreement.

### 2. From Authorities & Third Parties
- **Sub-Registrar / IGR Portal**: Property registration is executed here; book a slot in advance.
- **Bank / HFC**: Loan processing takes 2–6 weeks; ensure the property is on the bank’s approved list before submitting application.
- **Municipal Corporation**: Verify property tax status and Khata/Patta is in the seller’s name.

### 3. Action & Submission Needs
- **Stamp Duty and Registration Fee**: Budget 5–8% of property value for stamp duty (varies by state) plus registration fee — this is not included in the quoted price.
- **Home Loan Sanction Letter**: Required at registration to demonstrate source of funds.

### 4. Common Mistakes & Expert Tips
- **No Title Search**: Skipping the encumbrance certificate allows disputed or double-sold properties to pass — insist on a 30-year EC.
- **Under-Budgeting**: Buyers focus on EMI and miss stamp duty, registration, society deposits, and interior costs — budget 10–12% above the property price for closing costs.
""",

    LifeEventType.NRI_RETURN_TO_INDIA: """\
### Strategic Overview
Returning to India permanently requires converting NRE/NRO bank accounts, planning residential status for tax purposes, and notifying EPFO and investment accounts of the status change.

### 1. Primary Essentials
- **NRE/NRO Account Conversion**: Must be converted to resident accounts within 90 days of permanent return — submit passport with return stamps and KYC forms to your bank.
- **RNOR Status Planning**: Returning NRIs may qualify for RNOR (Resident but Not Ordinarily Resident) status for up to 2 years, limiting global income taxation — consult a CA before the first Indian tax filing.
- **Investment and Demat Account Updates**: Notify brokers and mutual funds of change from NRI to resident status; portfolio re-KYC is required.

### 2. From Authorities & Third Parties
- **Banks as Authorized Dealers**: Handle NRE/NRO/FCNR conversion; bring Indian passport with overseas entry/exit stamps.
- **Income Tax Portal**: File as per your actual residential status (NRI/RNOR/ROR); use the DTAA (Double Taxation Avoidance Agreement) provisions if you paid tax abroad.
- **EPFO**: If returning to Indian employment, update the EPFO portal with the new employer.

### 3. Action & Submission Needs
- **Overseas Tax Closure**: Obtain tax clearance or residency termination documents from the foreign country before departure.
- **Foreign Asset Disclosure**: Under FEMA, report foreign assets in the Indian income tax return (Schedule FA).

### 4. Common Mistakes & Expert Tips
- **Wrong Residential Status**: Filing as NRI when you have spent 182+ days in India can trigger notices — track your days from the return date.
- **Leaving Money in NRE Accounts Post-Return**: NRE accounts are tax-exempt only during NRI status; interest becomes taxable after return and the account must be redesignated.
""",

    LifeEventType.MEDICAL_EMERGENCY: """\
### Strategic Overview
During a medical emergency in India, the priority is activating cashless hospitalisation if insured; if unavailable, pay and file a reimbursement claim within the insurer’s stipulated window.

### 1. Primary Essentials
- **Insurance Card and Policy Number**: Present at the hospital TPA desk within 24 hours of emergency admission to trigger cashless authorisation.
- **Patient ID Proof**: Aadhaar or any government ID for hospital admission.
- **Medical and Allergy Records**: A pre-prepared card or phone note with current diagnoses, medications, and allergies saves critical time during triage.

### 2. From Authorities & Third Parties
- **Insurance TPA Desk**: Sends pre-authorisation request to insurer; if rejected, request the reason in writing and escalate to insurer’s grievance team.
- **Ayushman Bharat / State Schemes**: If the patient is eligible, the empanelled hospital processes the PM-JAY claim directly — no out-of-pocket for covered treatments.
- **Police / Medico-Legal**: For accidents, an FIR may be required by the hospital as part of the medico-legal case (MLC) process.

### 3. Action & Submission Needs
- **Reimbursement Claim Deadline**: If cashless is not possible, file a reimbursement claim within 15–30 days with: discharge summary, all bills, prescriptions, lab reports, and claim form.
- **Emergency Fund Backup**: Have ₹1–2 lakh accessible immediately for deposits when cashless authorisation is delayed.

### 4. Common Mistakes & Expert Tips
- **Family Not Knowing Insurance Details**: Keep insurance card, TPA number, and policy number on every family member’s phone — delays in locating this information cost critical time.
- **Missing TPA Notification Window**: Insurers require notification within a defined window even for emergencies; late notification is the most common reason for claim reduction.
""",

    LifeEventType.EDUCATIONAL_ENROLLMENT: """\
### Strategic Overview
Enrolling in a college or course in India involves application portals, counselling rounds, and physical document verification — missing any one step can forfeit an accepted seat.

### 1. Primary Essentials
- **Admission Letter**: Official acceptance from the institution, required for all further processes.
- **Transfer Certificate (TC) and Migration Certificate**: Mandatory from the previous school/institution; request these weeks before the last day.
- **Category Certificates**: SC/ST/OBC/EWS certificates, if claiming reservation — must be issued by a competent authority in the correct format.

### 2. From Authorities & Third Parties
- **Central Counselling Portals**: CUET, JoSAA (for IITs/NITs), or state counselling portals for government college admissions; track all rounds including waitlist upgrades.
- **State Education Departments**: Government college enrollment often requires verification at the district level.
- **University Student Portal**: Complete online enrollment and fee payment before the deadline even after receiving the acceptance.

### 3. Action & Submission Needs
- **Document Verification Day**: Universities schedule physical verification days — missing this even after online acceptance forfeits the seat.
- **Fee Payment Proof**: Keep receipts for all fee payments; discrepancies between payment records and institutional records can delay enrollment.

### 4. Common Mistakes & Expert Tips
- **Missing Verification Deadlines**: Online acceptance does not complete enrollment; physical verification is mandatory and time-bound.
- **Not Tracking All Counselling Rounds**: Many students miss better options because they do not refresh their counselling portal daily during round windows.
""",

    LifeEventType.WOMEN_ENTREPRENEURSHIP: """\
### Strategic Overview
Setting up a small business in India as a woman starts with Udyam (MSME) registration for access to government schemes and credit, followed by GST registration if turnover requires it.

### 1. Primary Essentials
- **Udyam Registration** (udyamregistration.gov.in): Free MSME registration using Aadhaar; opens access to government schemes, priority lending, and MUDRA loans.
- **Business Address Proof**: Rental agreement or property tax receipt for the business premises.
- **PAN and Business Bank Account**: A separate business account is essential for GST compliance, loan eligibility, and scheme access.

### 2. From Authorities & Third Parties
- **MCA21 Portal**: For LLP or Private Limited Company registration if operating as a registered entity.
- **GST Portal**: Mandatory registration if annual turnover exceeds ₹20 lakh (₹10 lakh for some states) or if selling inter-state.
- **MUDRA / SIDBI / Bank Portals**: Pradhan Mantri Mudra Yojana offers loans up to ₹10 lakh for micro/small businesses without collateral; apply via banks or MUDRA portal.

### 3. Action & Submission Needs
- **State Shops & Establishments Registration**: Required for businesses with commercial premises; done via the state labour portal.
- **Women-Specific Schemes**: Stree Shakti Package (SBI), Annapurna Scheme (SBI), and Mahila Udyam Nidhi (PNB/SBI) offer preferential rates for women entrepreneurs.

### 4. Common Mistakes & Expert Tips
- **Running Entirely as Personal Account**: Without Udyam registration and a business account, you cannot access formal credit, government tenders, or scheme benefits.
- **Ignoring GST Compliance**: Once turnover crosses the threshold, non-registration attracts penalties — register proactively rather than reactively.
""",

    LifeEventType.REPATRIATION: """\
### Strategic Overview
Repatriation of a body after death abroad requires coordinating with the Indian Embassy, obtaining multiple clearances, and having insurance or employer group cover to fund the process.

### 1. Primary Essentials
- **Death Certificate**: Issued by local authorities at the place of death; must be apostilled or authenticated for Indian use.
- **Consular NOC**: Indian Embassy or Consulate issues the No Objection Certificate for repatriation — contact them immediately.
- **Embalming Certificate**: Required by airlines for international transport of human remains.

### 2. From Authorities & Third Parties
- **Indian Embassy / Consulate**: Primary point of contact for consular assistance; use the MEA Madad portal (madad.gov.in) to track the case.
- **Local Authorities at Place of Death**: Issue the death certificate and medical/cause-of-death documentation; police clearance required for unnatural deaths.
- **Airlines Cargo Team**: Arrange human remains transport as special cargo; all documentation must be verified before acceptance.

### 3. Action & Submission Needs
- **Identity and Relationship Proofs**: Bring passport of deceased, your passport, and relationship proof (birth/marriage certificate) to all authority interactions.
- **Insurance Claim**: Check if the deceased’s travel insurance, employer group cover, or life insurance includes repatriation benefits — most group term plans do.

### 4. Common Mistakes & Expert Tips
- **Confusion Over Which Authority Issues What**: The sequence matters — local death certificate first, then consular NOC, then airline clearance. Wrong sequence causes days of delay.
- **No Repatriation Cover**: Many families discover post-facto that no policy covers repatriation; advocate for employer group policies to include this benefit.
""",

    LifeEventType.CAREER_UPSKILLING: """\
### Strategic Overview
Upskilling in India works best when paired with a clear outcome — a promotion, a role switch, or freelance credibility. Choose platforms with recognized certificates and build a portfolio alongside coursework.

### 1. Primary Essentials
- **Learning Goal Definition**: Identify the specific skill gap (e.g., Python for data analysis, cloud certification for DevOps) before enrolling anywhere.
- **Platform Selection**: Coursera, edX, NPTEL (free, UGC-recognized), LinkedIn Learning, or domain-specific bootcamps depending on depth required.
- **Certification Plan**: Industry-recognized certs (AWS, Google Cloud, PMP, CFA, CPA) carry more weight than generic course completions.

### 2. From Authorities & Third Parties
- **NSDC / Skill India Portal**: Government-recognized short-term courses with industry tie-ups; some include placement assistance.
- **LinkedIn Profile**: Update skills and certifications here proactively — many recruiters filter specifically for cert holders.
- **Current Employer**: Check if your company reimburses learning and development costs under an L&D policy before self-funding.

### 3. Action & Submission Needs
- **Portfolio Projects**: Apply each skill immediately on a tangible project (GitHub repo, Kaggle notebook, Figma prototype); certifications without portfolio work are easily dismissed.
- **Timeline Planning**: Most professional certifications require 2–6 months of consistent study; block dedicated time weekly from the start.

### 4. Common Mistakes & Expert Tips
- **Collecting Certificates Without Applying Skills**: Employers assess demonstrated ability, not certificate count — build something real with each skill.
- **Skipping Fundamentals**: Many learners jump to advanced topics and plateau; invest time in the fundamentals even if they feel slow.
""",

    LifeEventType.RETIREMENT_PLANNING: """\
### Strategic Overview
Retirement planning in India requires activating NPS or building a PPF/EPF corpus, understanding the RNOR window for returning NRIs, and stress-testing the plan against inflation and healthcare costs.

### 1. Primary Essentials
- **EPF/UAN Statement**: Review your current EPF corpus and projected pension via the EPFO member portal.
- **NPS Account (Tier I & II)**: National Pension System offers tax-efficient accumulation; open or review via eNPS or your bank.
- **PPF Account**: 15-year lock-in with tax-free maturity; ideal for conservative, guaranteed-return allocation.

### 2. From Authorities & Third Parties
- **EPFO Member Portal**: Track balance, transfer history, and pension eligibility (EPS).
- **NPS CRA Portals** (NSDL / KFintech): Manage NPS allocations, nomination, and withdrawal.
- **Registered Investment Adviser (RIA)**: For optimizing asset allocation between debt, equity, and annuity products in the last 10 years before retirement.

### 3. Action & Submission Needs
- **Nominee Updates**: Update nominations in EPF, NPS, PPF, and all insurance policies — outdated nominees cause significant legal delays.
- **Health Insurance Top-Up**: Arrange a senior citizen health plan or top-up policy before retirement, while you are still insurable at a lower premium.

### 4. Common Mistakes & Expert Tips
- **Underestimating Healthcare Costs**: Medical inflation runs at 12–15% annually in India; factor in 2–3x current medical spend by the 10th year of retirement.
- **No Annuity Plan**: Lump-sum corpus without a systematic withdrawal or annuity plan often runs out faster than expected — plan a structured drawdown.
""",

    LifeEventType.DEBT_MANAGEMENT: """\
### Strategic Overview
Managing debt in India requires understanding which debts to prioritise (highest interest first), protecting your CIBIL score, and using structured options like balance transfers or loan restructuring before default occurs.

### 1. Primary Essentials
- **CIBIL / Credit Report**: Pull your free annual credit report from CIBIL, Experian, or CRIF to see all active liabilities and your current score.
- **Debt Inventory**: List every outstanding loan — home loan, personal loan, credit card, gold loan — with outstanding balance, EMI, and interest rate.
- **Emergency Fund**: Maintain at least 3 months of EMI as liquid reserve so a single income disruption does not cascade into missed payments.

### 2. From Authorities & Third Parties
- **RBI Loan Ombudsman**: If a lender is applying unfair charges or refuses restructuring unfairly, file a complaint via the RBI Integrated Ombudsman Scheme.
- **Bank Relationship Manager**: Most banks offer one-time restructuring for customers in temporary distress — contact proactively before the first EMI default.
- **CIBIL Dispute Portal**: Incorrect entries (closed loans still showing active) can be disputed directly and corrected within 30 days.

### 3. Action & Submission Needs
- **Balance Transfer**: Move high-interest credit card debt to a 0% or low-rate balance transfer card or personal loan — saves significantly over 12–24 months.
- **Avalanche Method**: Pay minimums on all debts; direct all extra cash to the highest interest rate debt first.

### 4. Common Mistakes & Expert Tips
- **Only Paying Minimum Due**: Paying the credit card minimum keeps the account "good" but triggers 36–48% annual interest on the revolving balance.
- **Borrowing to Repay**: Taking a new personal loan to clear another without reducing total EMI burden is a debt spiral — restructure, do not add new credit.
""",

    LifeEventType.HEALTH_INSURANCE: """\
### Strategic Overview
Health insurance selection in India requires matching the plan’s network hospitals to your city, understanding waiting periods for pre-existing conditions, and choosing between individual and family floater based on age mix.

### 1. Primary Essentials
- **Sum Insured Adequacy**: In metro cities, a minimum of ₹10–15 lakh family floater is recommended; medical inflation erodes lower covers quickly.
- **Network Hospital Check**: Verify your preferred hospitals are on the insurer’s cashless network before purchasing.
- **Pre-existing Disease (PED) Waiting Period**: Most plans have 2–4 year PED waiting periods; disclose all conditions honestly to avoid claim rejection.

### 2. From Authorities & Third Parties
- **IRDAI Policyholder Portal**: Check insurer claim settlement ratios and grievance records before choosing a provider.
- **Insurance Aggregators** (Policybazaar, Coverfox): Useful for comparing plans side-by-side; verify details directly with the insurer before purchase.
- **TPA (Third Party Administrator)**: Your insurer’s TPA handles cashless claims — save their 24/7 helpline number before any hospitalisation.

### 3. Action & Submission Needs
- **No-Claim Bonus (NCB)**: Each claim-free year typically adds 5–50% to your sum insured at no extra cost — factor this into multi-year planning.
- **Top-Up / Super Top-Up Plans**: If employer covers ₹3–5 lakh, add a super top-up above this threshold at low cost rather than switching to an individual plan.

### 4. Common Mistakes & Expert Tips
- **Relying Solely on Employer Cover**: Group insurance terminates on the day you leave the company — have an independent plan running in parallel.
- **Non-Disclosure of Conditions**: Claims are rejected and policies cancelled if undisclosed pre-existing conditions are discovered at claim time.
""",

    LifeEventType.PROPERTY_INHERITANCE: """\
### Strategic Overview
Inheriting property in India requires mutation of the title in municipal records, legal heir certificates, and — if multiple heirs — a formal partition deed to prevent future disputes.

### 1. Primary Essentials
- **Death Certificate**: Original and certified copies from the municipal corporation; required for every subsequent authority interaction.
- **Legal Heir Certificate / Succession Certificate**: Issued by a civil court or tehsildar; required for financial assets and immovable property transfer.
- **Will (if exists)**: A registered will simplifies probate; an unregistered will is still legally valid but can be contested.

### 2. From Authorities & Third Parties
- **Sub-Registrar / Municipal Corporation**: Handles property mutation (khata/patta transfer) into the heir’s name after submission of death certificate and legal heir proof.
- **District Court**: For probate of will or for obtaining a succession certificate where no will exists.
- **Income Tax Department**: Capital gains tax applies on eventual sale; inherited property cost basis is the original owner’s acquisition cost.

### 3. Action & Submission Needs
- **Partition Deed**: If multiple legal heirs, execute and register a partition deed to define each person’s share — prevents decades of litigation.
- **Property Tax Update**: Update property tax records in the new owner’s name to avoid penalties and ensure valid ownership for future sale.

### 4. Common Mistakes & Expert Tips
- **Delaying Mutation**: Unmutated property (title not transferred) cannot be legally sold or mortgaged; prioritise this even if no immediate sale is planned.
- **Ignoring Minor Heirs**: If a minor child is an heir, a court-appointed guardian must represent their interest — handle this through the family court before proceeding.
""",

    LifeEventType.WELLNESS_MANAGEMENT: """\
### Strategic Overview
Ongoing wellness management in India involves navigating both the public health system (Ayushman Bharat, ESIC) and private providers, while building habits and digital health records that travel with you.

### 1. Primary Essentials
- **Medical History Record**: Consolidated file of diagnoses, prescriptions, lab reports, and vaccination records — a digital folder on DigiLocker or a health app ensures continuity across providers.
- **Primary Care Provider**: Establish a relationship with one general physician who knows your history; reduces unnecessary specialist visits and duplicate testing.
- **Health Insurance Active Status**: Confirm your policy is active, premiums are paid, and the renewal is not lapsing.

### 2. From Authorities & Third Parties
- **Ayushman Bharat / ABHA Number**: Create your Ayushman Bharat Health Account at abha.abdm.gov.in for linked digital health records across participating hospitals.
- **National Mental Health Helpline (iCall / Vandrevala)**: Free counselling is available via iCall (9152987821) for stress, anxiety, and burnout.
- **Specialist Referral Network**: Use platforms like Practo or Apollo 247 for verified specialist access; confirm insurance empanelment before booking.

### 3. Action & Submission Needs
- **Preventive Screenings**: Annual blood panel, BP, and BMI check; add screenings appropriate to your age and family history (e.g., lipid profile after 35, cancer screenings after 40).
- **Prescription Management**: Do not self-discontinue chronic disease medication; carry a minimum 2-week buffer supply for travel or emergencies.

### 4. Common Mistakes & Expert Tips
- **Treating Symptoms Without a Diagnosis**: Self-medicating without investigation delays correct treatment — get a baseline blood workup before assuming causes.
- **No Mental Health Plan**: Physical wellness without mental health support is incomplete; normalise scheduling a mental health check-in the way you would a dental appointment.
""",

    LifeEventType.WORKPLACE_WELLNESS: """\
### Strategic Overview
Workplace wellness in India spans mental health support (EAP), statutory compliance (POSH, ESIC), and personal burnout recovery — knowing which lever to pull depends on whether this is an individual need or an organisational initiative.

### 1. Primary Essentials
- **EAP (Employee Assistance Programme)**: Check if your employer has an EAP — most large IT and BFSI companies provide 6–8 free confidential counselling sessions per year.
- **POSH Compliance (for organisations)**: Every company with 10+ employees must have an Internal Complaints Committee (ICC) and conduct annual POSH training.
- **ESIC Health Coverage**: If your salary is ≤ ₹21,000/month, ESIC covers OPD and hospitalisation at ESIC dispensaries; claim via your ESIC card.

### 2. From Authorities & Third Parties
- **Ministry of Labour (POSH Act)**: Governs the Sexual Harassment of Women at Workplace Act; ICC complaints follow a defined timeline and appeal process.
- **iCall / Vandrevala Foundation**: Free or low-cost mental health support for employees; accessible without employer knowledge.
- **National Health Mission**: Some states run mental health outreach programmes at district hospitals.

### 3. Action & Submission Needs
- **Leave Application**: Stress-related medical leave can be backed by a GP letter; HR cannot legally deny medical leave backed by a doctor’s certificate.
- **Workload Escalation**: Document specific overload instances (emails, task logs) before escalating to HR — quantified concerns are addressed more reliably than general complaints.

### 4. Common Mistakes & Expert Tips
- **Waiting for a Crisis**: Burnout recovery takes 3–6 months; address early warning signs (sleep disruption, cynicism, persistent fatigue) before complete breakdown.
- **Not Knowing Your Rights**: Employees are entitled to mental health leave under the Mental Healthcare Act 2017 — this is a legal right, not a favour.
""",

    LifeEventType.PARENTAL_LEAVE: """\
### Strategic Overview
Parental leave in India is governed by the Maternity Benefit Act (for mothers) and individual company policy (for fathers); ESIC-covered employees have separate entitlements directly through ESIC rather than the employer.

### 1. Primary Essentials
- **Maternity Benefit Act 2017**: 26 weeks paid leave for the first two children; 12 weeks for the third child onwards; requires 80 days of employment in the preceding 12 months.
- **ESIC Maternity Benefit**: If salary ≤ ₹21,000/month, benefit is paid directly by ESIC at full wage rate — employer does not pay separately.
- **Paternity Leave**: No central law mandates paternity leave for private sector; check your company HR handbook; government employees get 15 days under CCS Rules.

### 2. From Authorities & Third Parties
- **Employer HR / Payroll**: Submit the leave application with the expected delivery date; pre-delivery and post-delivery leave splits must be declared in advance.
- **ESIC Portal**: File the maternity claim at esic.in after delivery with the hospital’s discharge summary and birth certificate.
- **Labour Department**: File a complaint if your employer denies legally mandated maternity leave or penalises you for taking it.

### 3. Action & Submission Needs
- **Handover Planning**: Document your responsibilities and handover to a colleague 4–6 weeks before leave begins to reduce return-to-work anxiety.
- **PM Matru Vandana Yojana**: ₹5,000 cash benefit for the first live birth; register at the Anganwadi centre or online at pmmvy-cas.nic.in.

### 4. Common Mistakes & Expert Tips
- **Not Declaring Pre-Delivery Split Correctly**: Leave taken before delivery is counted from the leave pool; undeclaring it leads to payroll discrepancies.
- **Missing ESIC Claim Window**: ESIC claims must be submitted within a defined window; delay forfeits the wage replacement benefit.
""",

    LifeEventType.ESTATE_PLANNING: """\
### Strategic Overview
Estate planning in India starts with a registered will, updated nominations, and clear documentation of assets — without these, even well-intentioned families face years of legal proceedings.

### 1. Primary Essentials
- **Will Drafting & Registration**: A will can be handwritten or typed, signed, and witnessed; registration at the Sub-Registrar’s office makes it harder to contest.
- **Nomination in All Accounts**: Update nominations in bank accounts, Demat accounts, mutual funds, EPF, NPS, and insurance policies — nomination simplifies asset transfer without legal proceedings.
- **Asset Inventory**: Maintain a confidential document listing all assets (property, investments, insurance, digital assets, lockers) with their locations, account numbers, and login details.

### 2. From Authorities & Third Parties
- **Sub-Registrar**: For will registration; also handles property title and gift deed registration.
- **Chartered Accountant**: Reviews estate for tax-efficient structuring (trusts, HUF partition, gift planning before death).
- **Notary**: For Powers of Attorney (medical and financial) while the grantor is capable of consent.

### 3. Action & Submission Needs
- **Trust Formation**: For high-value estates or minor beneficiaries, a private discretionary trust avoids probate and provides asset protection.
- **Digital Asset Plan**: Include login credentials for email, investment portals, and cloud storage in a sealed, trusted location — digital assets are frequently overlooked.

### 4. Common Mistakes & Expert Tips
- **Outdated Nominations Overriding Will**: In India, the nominee on a bank account or insurance policy receives the asset first — even if the will says otherwise — then the legal heirs can claim. Align nominations with the will’s intent.
- **No Will for Jointly Held Property**: Joint property without survivorship clause or will creates contested succession; specify clearly in the will or use a registered gift deed.
""",

    LifeEventType.ADOPTION_PROCESS: """\
### Strategic Overview
Domestic adoption in India is governed by CARA (Central Adoption Resource Authority) and the HAMA/JJ Act; it is a structured, wait-list-based process that typically takes 1–3 years from registration to placement.

### 1. Primary Essentials
- **CARA Registration**: Create a prospective adoptive parent (PAP) profile at cara.nic.in — this is the mandatory first step; no child can be placed outside this system.
- **Home Study Report (HSR)**: A social worker from a licensed Specialised Adoption Agency (SAA) assesses your home, lifestyle, and parenting readiness; valid for 2 years.
- **Financial and Medical Fitness**: Documents include ITR (2 years), salary slips, medical certificates, and police clearance certificates for all adult household members.

### 2. From Authorities & Third Parties
- **CARA (cara.nic.in)**: Central authority; manages the waitlist, child matching, and legal orders.
- **District Child Protection Unit (DCPU)**: Issues declarations and supports post-adoption follow-up visits.
- **Family Court**: Issues the adoption order, which is the final legal document making the child a full legal heir.

### 3. Action & Submission Needs
- **Child Matching**: Once the HSR is accepted and the wait period passes, you will receive a child referral online; accept or decline within 48 hours.
- **Post-Adoption Follow-Up**: SAA visits are mandatory for 2 years after placement; maintain cooperative communication.

### 4. Common Mistakes & Expert Tips
- **Approaching Directly (Bypassing CARA)**: Private or direct adoptions are illegal in India — only go through CARA-registered agencies.
- **Underestimating the Wait**: Average domestic wait after HSR approval is 1–2 years; plan emotionally and financially for this window.
""",

    LifeEventType.GRIEF_SUPPORT: """\
### Strategic Overview
Bereavement in India triggers both emotional needs and immediate legal/financial tasks; addressing both in parallel — rather than waiting until grief subsides — prevents compounding difficulties.

### 1. Primary Essentials
- **Death Certificate**: Register the death at the local municipal corporation within 21 days; required for every subsequent legal and financial step.
- **Insurance Claims**: Life insurance, employer group cover, and term plans must be claimed within the policy’s specified window (usually 90 days) to avoid complications.
- **Bank Account Access**: Joint account holders can continue access; sole account holders require a succession certificate or legal heir certificate for transfer.

### 2. From Authorities & Third Parties
- **iCall / Vandrevala Foundation / Fortis Mental Health Helpline**: Free grief counselling and crisis support in multiple Indian languages.
- **District Legal Services Authority (DLSA)**: Provides free legal aid for succession certificates, property transfers, and pension claims for bereaved families.
- **Employer HR**: Claim any outstanding salary, gratuity, leave encashment, and group insurance on behalf of the deceased.

### 3. Action & Submission Needs
- **Nominee & Succession**: Collect all assets through nominees first (banks, insurance, PF), then use succession certificate for anything not nominated.
- **Pension Conversion**: For government pensioners, the family pension starts after the pensioner’s death — contact the pension disbursing bank with the death certificate and family details.

### 4. Common Mistakes & Expert Tips
- **Delaying Legal Steps While Grieving**: Legal tasks have deadlines; insurance claims and property mutations have time limits — delegate to a trusted family member or solicitor if unable to act.
- **Isolating Completely**: Prolonged social isolation after bereavement significantly increases the risk of complicated grief — professional support within the first 3 months improves long-term outcomes.
""",

    LifeEventType.FREELANCE_SETUP: """\
### Strategic Overview
Setting up as a freelancer in India requires managing GST compliance (if turnover crosses thresholds), maintaining separate business banking, and protecting income with a professional services agreement.

### 1. Primary Essentials
- **GST Registration**: Mandatory if annual freelance turnover exceeds ₹20 lakh (₹10 lakh in some states); also required for any cross-border (export of service) work regardless of amount.
- **PAN & Business Bank Account**: Open a separate current or savings account for all freelance income — simplifies tax filing and builds a credible financial history.
- **Professional Services Agreement**: A written contract for every client covering scope, payment terms, IP ownership, and confidentiality — prevents disputes.

### 2. From Authorities & Third Parties
- **Income Tax Portal**: File quarterly advance tax if annual freelance income exceeds ₹10,000 tax liability; penalties apply for non-payment.
- **Udyam (MSME) Portal**: Free registration gives access to government tenders, priority banking, and subsidies.
- **Invoicing Tools**: Zoho Invoice, Refrens, or Vyapar simplify GST-compliant invoicing and maintain an automatic audit trail.

### 3. Action & Submission Needs
- **ITR-3 or ITR-4 Filing**: Freelancers file under business/professional income; ITR-4 (Sugam) applies if you opt for the presumptive taxation scheme (44ADA).
- **44ADA Presumptive Scheme**: For eligible professionals (IT, medicine, law, etc.) with turnover ≤ ₹75 lakh, 50% of gross receipts is deemed profit — significantly reduces tax complexity.

### 4. Common Mistakes & Expert Tips
- **No Contract, No Payment**: Verbal agreements are unenforceable in disputes; always send a scope-of-work email and get written acceptance before starting work.
- **Missing Advance Tax**: Freelancers are responsible for their own tax withholding; missing the March 15 advance tax deadline attracts interest under Section 234B/C.
""",

    LifeEventType.STUDY_ABROAD: """\
### Strategic Overview
Studying abroad requires parallel tracking of university applications, English proficiency tests, visa timelines, and financial documentation — missing any one stream delays the entire plan.

### 1. Primary Essentials
- **Standardised Tests**: GRE/GMAT (postgraduate), IELTS/TOEFL (English proficiency), SAT (undergraduate); most require 3–6 months of preparation and have specific score validity periods.
- **Transcripts and Certificates**: Attested copies of all mark sheets, degree certificates, and awards; international universities often require WES (World Education Services) evaluation for Indian credentials.
- **Statement of Purpose (SOP) and LORs**: A compelling SOP and 2–3 strong Letters of Recommendation are primary differentiators; start drafting 4–6 months before deadlines.

### 2. From Authorities & Third Parties
- **University Admissions Portal**: Each university has its own portal and deadline; track all applications in a spreadsheet.
- **Visa Consulate / Embassy**: Apply for student visa only after receiving the I-20 (US), CAS (UK), or CoE (Australia); allow 4–8 weeks for visa processing.
- **Forex and Remittance**: Open a Forex card (Niyo, Thomas Cook) and understand RBI’s Liberalised Remittance Scheme (LRS) — transfers above $250,000/year require Form A2.

### 3. Action & Submission Needs
- **Education Loan (if applicable)**: Apply to banks using the university offer letter; most Indian banks offer loans up to ₹1.5 crore for top global universities.
- **Accommodation Booking**: On-campus housing fills fast; apply within the first week of receiving the offer letter.

### 4. Common Mistakes & Expert Tips
- **Applying Only to Reach Schools**: A balanced list (safety + target + reach) maximises acceptance probability; most students underestimate how competitive their profile looks from the outside.
- **Ignoring Living Cost in Budget**: Tuition is one part of the cost; accommodation, health insurance, and food often add 40–60% to the annual outlay.
""",

    LifeEventType.GRADUATE_STUDIES: """\
### Strategic Overview
Postgraduate admissions in India (IIMs, IITs, AIIMS, NLUs) are almost entirely entrance-exam driven; international postgraduate applications require research fit, SOP quality, and funding strategy as much as grades.

### 1. Primary Essentials
- **Entrance Exam Registration**: CAT (MBA), GATE (M.Tech/MS), CLAT (LLM), NEET-PG (medical PG), CUET-PG (central universities) — registration windows open 3–6 months before exams.
- **Academic Transcripts and Degree Certificate**: Required for all applications; obtain attested copies and a provisional degree certificate before convocation if needed urgently.
- **Research Interest Statement (for PhD/Research programs)**: Identify faculty whose work aligns with your research interest and reach out before applying — improves acceptance odds significantly.

### 2. From Authorities & Third Parties
- **NTA (National Testing Agency)**: Conducts CUET-PG, JEE, and several PG entrance exams; register at nta.ac.in.
- **University Admissions Cell**: After clearing the entrance, the university admissions cell handles document verification, counselling rank rounds, and seat allocation.
- **UGC-NET**: Qualifies for PhD admissions and JRF (Junior Research Fellowship) stipends; held twice yearly by NTA.

### 3. Action & Submission Needs
- **Fellowship Applications**: JRF, ICSSR, ICMR, and CSIR fellowships fund PhD studies; apply in parallel with university applications.
- **NOC from Employer (if employed)**: Required by most universities for candidates pursuing PG while employed.

### 4. Common Mistakes & Expert Tips
- **Only Targeting Tier-1 Institutions**: Good placement and research outcomes exist in Tier-2 institutions; a focused application with strong SOP can outperform a generic application to IIMs.
- **Ignoring Funding Options**: Funded seats (TA/RA positions) exist at IITs and IISER; applying only to self-funded programs misses significant financial support.
""",

    LifeEventType.INTERNATIONAL_TRAVEL: """\
### Strategic Overview
International travel planning requires passport validity checks (minimum 6 months beyond travel), visa processing timelines, and travel insurance — rushing any of these creates last-minute crises.

### 1. Primary Essentials
- **Passport Validity**: Must be valid for at least 6 months beyond your return date; many countries enforce this strictly at entry.
- **Visa Requirements**: Check the destination country’s visa policy for Indian passport holders; apply at least 4–8 weeks before travel for countries requiring a visa appointment.
- **Travel Insurance**: Covers medical emergencies, trip cancellation, baggage loss, and flight delays; Schengen visa applications legally require a minimum €30,000 cover.

### 2. From Authorities & Third Parties
- **VFS Global / BLS International**: Handles visa application appointments for most countries in India; book early as slots fill weeks ahead.
- **Indian Embassy at Destination**: Register your travel itinerary at the MEA’s MADAD portal for emergency consular support.
- **FRRO (Foreigners Regional Registration Office)**: Required if staying in India for extended periods; relevant for dual-purpose trips.

### 3. Action & Submission Needs
- **Forex and Cards**: Carry a forex card with destination currency pre-loaded; notify your bank about international travel to prevent card blocks.
- **Health Declarations and Vaccinations**: Many countries require Yellow Fever vaccination or proof of COVID vaccination; check destination health requirements 8 weeks before travel.

### 4. Common Mistakes & Expert Tips
- **Booking Flights Before Visa Approval**: Non-refundable tickets booked before visa approval create significant financial risk; use refundable fares or dummy tickets for visa applications.
- **No Copies of Documents**: Keep digital copies of passport, visa, insurance, and hotel bookings on email and a cloud drive — loss of physical documents is far less catastrophic with backups.
""",

    LifeEventType.PET_ADOPTION: """\
### Strategic Overview
Adopting a pet in India involves choosing between a shelter rescue and a breeder, completing municipal registration, and setting up veterinary care — a plan for the first 90 days of ownership prevents most common problems.

### 1. Primary Essentials
- **Adoption Source**: Shelters (Friendicoes, CUPA, Welfare for Stray Dogs) adopt out vaccinated, neutered animals with health certificates — first preference over breeders for ethical reasons.
- **Municipal Registration**: Most cities require dogs to be registered with the municipal corporation; the registration tag and annual renewal are mandatory to avoid fines.
- **Vaccination Record**: Core vaccines (Distemper, Parvovirus, Hepatitis, Rabies) must be completed on schedule starting from 6–8 weeks of age.

### 2. From Authorities & Third Parties
- **Municipal Corporation**: Issues pet dog license; requires owner ID, address proof, and vaccination certificate.
- **Local Veterinarian**: Establish a relationship with a nearby vet on day one; schedule a health check within 48 hours of bringing the pet home.
- **AWBI (Animal Welfare Board of India)**: Governs pet trade regulations; breeders selling animals must be AWBI-registered.

### 3. Action & Submission Needs
- **Microchipping**: Permanent identification embedded under the skin; increasingly required for travel and recommended for all owned pets.
- **Pet-Proofing the Home**: Secure electrical cords, toxic plants, and small objects; remove food items accessible to pets before bringing them home.

### 4. Common Mistakes & Expert Tips
- **Impulse Adoption**: Pets are a 10–15 year commitment; research breed temperament, space requirements, and exercise needs thoroughly before deciding.
- **Skipping the Vet in the First Week**: Many pets from shelters or breeders arrive with hidden health issues; a vet check in the first 48 hours protects both the pet and existing pets at home.
""",

    LifeEventType.VOLUNTEER_WORK: """\
### Strategic Overview
Volunteering in India ranges from local NGO support to structured international programmes; formalising your commitment with a volunteer agreement and tracking hours builds a credible record for career and social impact goals.

### 1. Primary Essentials
- **Interest and Skill Match**: Identify whether you are offering skills (teaching, medical, engineering, legal) or general support (event management, community outreach); skill-based volunteering creates more lasting impact.
- **Organisation Verification**: Check the NGO’s registration (Society Registration Act / Trust Act / Section 8 Company), FCRA registration (for international programmes), and CSR portal listing for credibility.
- **Volunteer Agreement**: A written agreement defining hours, role, responsibilities, and confidentiality protects both parties.

### 2. From Authorities & Third Parties
- **NGO Darpan Portal (ngodarppan.gov.in)**: Government registry of NGOs; verify registration and recent filing status before committing.
- **FCRA Registration**: NGOs receiving foreign funding must be FCRA-registered; required for international volunteering placements.
- **UN Volunteers (unv.org)**: For structured international volunteering placements with the UN system; applications are competitive and require professional experience.

### 3. Action & Submission Needs
- **Volunteer Log**: Maintain a record of hours, activities, and impact metrics; many organisations issue certificates that are useful for CVs and graduate school applications.
- **Background Check**: Some organisations (especially those working with children) require police clearance certificates — arrange this before onboarding.

### 4. Common Mistakes & Expert Tips
- **Choosing an Unregistered NGO**: Unregistered organisations cannot legally receive donations or issue receipts; your time and contributions may not be channelled effectively.
- **Over-committing Time**: Start with a short trial commitment (4–8 weeks) before signing a long-term agreement — volunteer burnout is common when expectations are misaligned.
""",

    LifeEventType.PERSONAL_GROWTH: """\
### Strategic Overview
Personal growth is most effective when it is specific (a defined skill or habit), measurable (a visible output or metric), and time-bound (a 90-day sprint rather than an open-ended resolution).

### 1. Primary Essentials
- **Goal Clarity**: Define the growth goal in outcome terms — "I want to run a 5K" is more actionable than "I want to get fit"; this shapes every subsequent decision.
- **Current Baseline Assessment**: Identify where you are starting from — skill level, habits, mental state — so progress is measurable, not just felt.
- **Support System**: Identify one accountability partner or community (online or in-person) aligned with the goal; social accountability doubles follow-through rates.

### 2. From Authorities & Third Parties
- **Therapists / Life Coaches**: For mental health and behaviour change goals; verify credentials (RCI-registered psychologist, ICF-certified coach) before engaging.
- **Online Learning Platforms**: Coursera, Udemy, and LinkedIn Learning for skill-based growth; NPTEL for academic or technical upskilling.
- **Habit Tracking Apps**: Streaks, Habitica, or simple spreadsheets make progress visible and trigger consistency.

### 3. Action & Submission Needs
- **90-Day Sprint Plan**: Break the annual goal into 3 monthly milestones with specific weekly actions; review and adjust at the end of each month.
- **Environment Design**: Change your physical or digital environment to make the desired behaviour easier — remove friction, not just add willpower.

### 4. Common Mistakes & Expert Tips
- **Too Many Goals at Once**: Focusing on 3+ major personal growth areas simultaneously leads to 0 sustained progress; pick one primary goal and let others follow.
- **Confusing Motion with Progress**: Reading books about the goal, watching videos, and planning feel productive but produce no output — schedule the actual practice daily, even for 15 minutes.
""",

    LifeEventType.FAMILY_RELOCATION: """\
### Strategic Overview
Relocating as a family requires coordinating school transfers, medical record transfers, and housing simultaneously — decisions that take a week as an individual can take a month with dependents.

### 1. Primary Essentials
- **School Transfer Certificate (TC)**: Request from the current school at least 4 weeks before moving; required by any new school for admission.
- **Medical Records Transfer**: Collect physical copies of chronic illness records, vaccination cards, and prescriptions; do not rely on the previous doctor forwarding them.
- **Family ID Updates**: After relocation, update Aadhaar addresses for all family members, school enrollment addresses, and voter ID if changing states.

### 2. From Authorities & Third Parties
- **New City’s District Education Office (DEO)**: For government school mid-year admissions; provides guidance on seat availability and documentation.
- **Municipal Corporation (New City)**: For Aadhaar address update and local voter enrollment.
- **State Transport Authority**: Update vehicle RC and driving licence address within 30 days of permanent address change.

### 3. Action & Submission Needs
- **Address Proof for New City**: A signed lease agreement or utility bill in the new city is needed for school enrollment, bank account updates, and government ID changes.
- **Child Vaccination Continuity**: Register with a new paediatrician and continue the vaccination schedule within the first 2 weeks; missed boosters create gaps in immunity.

### 4. Common Mistakes & Expert Tips
- **Moving After School Year Starts**: Mid-year transfers are harder — government schools may have no seats; private schools charge full-year fees. Time the move to coincide with a new academic year wherever possible.
- **Not Updating Bank Branch**: KYC lapses on accounts linked to old addresses; inform your bank and update records within 30 days of moving.
""",

    LifeEventType.HOME_PURCHASE_PROCESS: """\
### Strategic Overview
The home purchase process in India has multiple sequential stages — booking, agreement, loan sanction, registration — and each has documents, fees, and timelines that must be tracked carefully to avoid costly delays.

### 1. Primary Essentials
- **Title Verification**: Engage a local property lawyer to verify the chain of title for at least 30 years; the Encumbrance Certificate (EC) from the Sub-Registrar confirms no loans or legal disputes.
- **RERA Verification**: For under-construction properties, verify the project and builder are RERA-registered at your state’s RERA portal.
- **Loan Pre-Approval**: Get a loan pre-approval letter before making an offer; this defines your budget clearly and speeds up the transaction.

### 2. From Authorities & Third Parties
- **Sub-Registrar Office**: Property sale deed registration happens here; slot booking is often done online.
- **Bank / HFC (Housing Finance Company)**: Processes the home loan; property must be on the bank’s approved project list for under-construction homes.
- **Municipal Corporation**: Confirms property tax status, building plan approval, and Occupancy Certificate (OC) for completed buildings.

### 3. Action & Submission Needs
- **Stamp Duty and Registration**: Budget 5–8% of property value for stamp duty (state-dependent) plus 1% registration fee; this is paid on the day of registration.
- **Agreement to Sale vs Sale Deed**: The Agreement to Sale is a pre-registration document; the Sale Deed is the final legal transfer — ensure both are registered.

### 4. Common Mistakes & Expert Tips
- **No Occupancy Certificate Check**: Buying a building without an OC means the construction is technically unauthorised; banks will not fund and resale is difficult.
- **Ignoring Society Transfer Charges**: Housing societies charge transfer fees (sometimes ₹25,000–₹1,00,000) that are not mentioned in the sale price; confirm before signing.
""",

    LifeEventType.LOSS_AND_CRISIS: """\
### Strategic Overview
A personal crisis — financial collapse, sudden job loss, domestic abuse, or family breakdown — requires immediate triage of safety, then income, then legal protection, in that sequence.

### 1. Primary Essentials
- **Safety First**: If there is any risk of physical harm, contact the National Women’s Helpline (181), Police (100), or iCall crisis line; relocation to a safe location takes precedence over documents.
- **Emergency Fund Access**: Identify liquid assets (savings account, FD, gold) accessible without anyone else’s consent; at least 3 months of expenses is the target buffer.
- **Identity Documents**: Secure original ID documents (Aadhaar, PAN, passport) in a safe location under your sole control — these are the foundation for every recovery step.

### 2. From Authorities & Third Parties
- **District Legal Services Authority (DLSA)**: Free legal aid for anyone in financial or domestic crisis; file for emergency maintenance or protection orders here.
- **iCall / Vandrevala / iChowk**: Free mental health crisis lines for immediate psychological support.
- **Pradhan Mantri Jan Dhan Yojana**: Zero-balance bank account if you need to establish independent banking; open at any public sector bank with Aadhaar.

### 3. Action & Submission Needs
- **Domestic Violence Protection Order**: File under Protection of Women from Domestic Violence Act at the Magistrate’s court or via the Protection Officer — provides immediate legal protection.
- **Job Loss**: File for ESIC unemployment benefit (if covered) within 90 days of job loss; claim via the ESIC portal.

### 4. Common Mistakes & Expert Tips
- **Staying Silent Out of Shame**: Financial crises and domestic situations improve with action, not silence; the DLSA, banks, and employer HR all have structured processes to help.
- **Prioritising Assets Over Safety**: Documents and money can be replaced; personal safety cannot — leave first, recover documents second.
""",

    LifeEventType.HOUSING_AND_LOCATION: """\
### Strategic Overview
Whether renting, buying, or resolving a housing dispute, the foundation is always verified ownership documentation and a clear paper trail of payments and agreements.

### 1. Primary Essentials
- **For Renting**: Registered rent agreement (11-month for short-term, registered for long-term), landlord’s ownership proof, and police verification within the first week.
- **For Buying**: Title documents, Encumbrance Certificate (EC), and building approval from the municipal corporation.
- **Address Proof Update**: After any permanent change of address, update Aadhaar (via UIDAI), bank KYC, and voter ID within 30 days.

### 2. From Authorities & Third Parties
- **Sub-Registrar Office**: Handles property registration and rent agreement registration.
- **Local Police Station / Online Portal**: For tenant police verification — mandatory in most major Indian cities.
- **Municipal Corporation / Panchayat**: For property tax records, khata transfers, and building plan approvals.

### 3. Action & Submission Needs
- **Utility Transfer**: Electricity, water, and gas connections need to be transferred to the new resident’s name — do this within the first month.
- **Society NOC**: Many housing societies require an NOC for new residents or tenants; check with the society secretary before moving in.

### 4. Common Mistakes & Expert Tips
- **Verbal Rental Agreements**: Verbal agreements are unenforceable; always have a written, signed agreement even for short-term stays with family friends.
- **Skipping EC Verification**: The Encumbrance Certificate reveals if the property has an active mortgage or legal dispute — never buy without it.
""",

    LifeEventType.WORK_AND_CAREER: """\
### Strategic Overview
Career management in India requires keeping EPF, tax filings, and professional certifications current while proactively building a network and skills portfolio before the next transition becomes urgent.

### 1. Primary Essentials
- **UAN Activation and EPF Tracking**: Ensure your Universal Account Number (UAN) is active and linked to Aadhaar; track your PF balance and ensure contributions are being made.
- **Updated Resume and LinkedIn**: Keep both current even when not actively job-seeking; recruiters approach passive candidates frequently.
- **Form 16 Collection**: Collect Form 16 from every employer at the end of each financial year; required for tax filing and loan applications.

### 2. From Authorities & Third Parties
- **EPFO Member Portal**: Check PF balance, transfer history, and raise grievances.
- **National Career Services Portal (ncs.gov.in)**: Government job listings and skill matching; useful for both private sector and government opportunities.
- **LinkedIn and Naukri**: Primary platforms for professional networking and job applications in India.

### 3. Action & Submission Needs
- **Tax Filing**: File ITR annually even if fully TDS-deducted; builds a financial track record for loans and visa applications.
- **Professional Membership**: Join relevant professional bodies (ICAI, ICSI, Bar Council, NASSCOM) — membership and continuing education maintain professional standing.

### 4. Common Mistakes & Expert Tips
- **Withdrawing PF on Every Job Change**: EPF withdrawal before 5 years of continuous service attracts full income tax and loses compounding; always transfer, never withdraw unless truly necessary.
- **No Record of Exit Documents**: Collect relieving letter, experience letter, F&F settlement, and Form 16 before leaving — recovering these after access is revoked is extremely difficult.
""",

    LifeEventType.EDUCATION_AND_LEARNING: """\
### Strategic Overview
Education planning in India spans government-subsidised pathways (JEE/NEET/CUET), private institutions, and international options — the right path depends on the learner’s goal, not the prestige of the institution.

### 1. Primary Essentials
- **Academic Record Organisation**: All mark sheets, transfer certificates, and degree certificates should be available as originals and attested copies; originals are required for counselling and admissions.
- **Entrance Exam Calendar**: Track registration deadlines for relevant exams (JEE, NEET, CUET, CLAT, CAT) — most open registration 4–6 months before the exam.
- **Category Certificate (if applicable)**: SC/ST/OBC/EWS certificates must be from the current financial year in the specified format; renewal is annual.

### 2. From Authorities & Third Parties
- **NTA (National Testing Agency)**: Administers most central government entrance exams; register at nta.ac.in.
- **State Counselling Boards**: For state quota seats, track the state-specific counselling portal alongside central counselling.
- **National Scholarship Portal (scholarships.gov.in)**: Central and state scholarships with eligibility criteria and application windows.

### 3. Action & Submission Needs
- **Document Verification Appointments**: Physical verification at institutions is mandatory after online acceptance — missing this forfeits the seat.
- **Fee Payment Tracking**: Keep receipts for all fee payments; portal discrepancies between payment and institution records are common and must be resolved proactively.

### 4. Common Mistakes & Expert Tips
- **Applying to Too Few Colleges**: Concentration risk in entrance-based admissions is high; apply broadly across tiers to ensure at least one quality option.
- **Not Tracking All Counselling Rounds**: Upgrades to better institutions happen in later rounds; check the portal daily during active counselling windows.
""",

    LifeEventType.HEALTH_AND_DISABILITY: """\
### Strategic Overview
Navigating health and disability support in India requires knowing the entitlements under the Rights of Persons with Disabilities (RPwD) Act 2016 and the government schemes accessible through a valid disability certificate.

### 1. Primary Essentials
- **Disability Certificate**: Issued by a government-authorised medical board; required for all schemes, concessions, and legal protections under RPwD Act.
- **UDID Card (Unique Disability ID)**: Apply at swavlambancard.gov.in; a single card integrating the disability certificate for use across all government schemes.
- **Medical Records**: Comprehensive documentation of diagnoses, treatment history, and specialist reports — required for disability assessment and insurance claims.

### 2. From Authorities & Third Parties
- **Designated Medical Authority**: Government hospital’s medical board issues the disability certificate; assessment is free of charge.
- **NIMH / NIEPMD / NIEPVD**: National institutes for mental, physical, and visual disabilities; provide rehabilitation, assistive devices, and vocational training.
- **DEPwD (Dept for Empowerment of Persons with Disabilities)**: Administers central schemes including ADIP (Assistive Devices), SIPDA (accessible infrastructure), and scholarship programmes.

### 3. Action & Submission Needs
- **Assistive Devices (ADIP Scheme)**: Free or subsidised assistive devices (wheelchair, hearing aid, Braille kits) for persons with disability and income below ₹15,000/month — apply via ALIMCO.
- **Income Tax Deduction (Section 80U/80DD)**: Persons with disability or their carers can claim ₹75,000–₹1,25,000 deduction annually.

### 4. Common Mistakes & Expert Tips
- **Not Knowing Reservation Rights**: 4% reservation in central government jobs and 5% in central educational institutions exists for persons with benchmark disabilities — exercise these rights.
- **Skipping Reassessment**: Disability certificates have validity periods; expired certificates block access to schemes even for permanent conditions — renew proactively.
""",

    LifeEventType.FAMILY_AND_RELATIONSHIPS: """\
### Strategic Overview
Major family transitions — a new addition, a separation, an adoption, or a custody arrangement — all have legal and financial dimensions that, if ignored, create long-term problems even when the personal transition goes well.

### 1. Primary Essentials
- **Legal Status Clarity**: Determine what legal changes are involved — marriage, divorce, adoption, guardianship, or name change — and what documents each requires.
- **Financial Separation or Consolidation**: New family units need shared financial planning; separating families need independent accounts, updated nominations, and revised estate plans.
- **Children’s Welfare Documents**: Birth certificates, school records, vaccination records, and custody orders (if applicable) should be consolidated and accessible.

### 2. From Authorities & Third Parties
- **Family Court**: Handles divorce, custody, maintenance, and adoption orders.
- **Sub-Registrar**: Marriage registration, property transfer within family (gift deed), and will registration.
- **Child Welfare Committee (CWC)**: For matters involving child protection, custody disputes, or adoption.

### 3. Action & Submission Needs
- **Nomination Updates**: Following any significant family event, update nominees in all bank accounts, insurance, EPF, NPS, and property documents.
- **Aadhaar Family Update**: Add or remove family members on linked Aadhaar profiles where applicable; update addresses for all family members after a relocation.

### 4. Common Mistakes & Expert Tips
- **Undocumented Informal Arrangements**: Verbal or informal family financial arrangements (loans within family, shared property use) create legal disputes later; document everything with a simple written agreement.
- **No Power of Attorney During Incapacity**: For elderly family members, arrange a medical and financial Power of Attorney while they are able to consent — avoid the family court process later.
""",

    LifeEventType.MONEY_AND_ASSETS: """\
### Strategic Overview
Financial health in India requires three concurrent tracks: liquidity (emergency fund), protection (insurance), and growth (investments) — most problems occur when one track is absent or misaligned with life stage.

### 1. Primary Essentials
- **Emergency Fund**: 6 months of household expenses in a liquid instrument (savings account or overnight liquid mutual fund); non-negotiable before investing.
- **Insurance Baseline**: Term life insurance (10–15x annual income), health insurance (₹10–15 lakh family cover), and personal accident cover are the three must-have layers.
- **Financial Record Centralisation**: All account statements, policy documents, and investment records in one secure folder (physical + cloud); family members should know where this is.

### 2. From Authorities & Third Parties
- **SEBI-Registered Investment Adviser (RIA)**: For unbiased, fee-only investment advice; verify registration at sebi.gov.in before engaging.
- **IRDAI Consumer Portal**: For insurance grievances and checking insurer solvency ratios.
- **CIBIL / Credit Bureau**: Free annual credit report; review for errors and monitor score before applying for any large loan.

### 3. Action & Submission Needs
- **Will and Nomination Alignment**: Ensure nominees in all accounts match the will’s intent; update after every major life event (marriage, birth, death in family).
- **Annual Financial Review**: Review insurance adequacy, investment allocation, and asset growth once a year — life changes create gaps that go unnoticed for years.

### 4. Common Mistakes & Expert Tips
- **Investment Before Insurance**: Many Indians invest for growth before protecting income and health; a single medical emergency without insurance can wipe out years of savings.
- **ULIPs and Endowment Plans as "Investment"**: Insurance-cum-investment products almost always underperform both pure insurance and pure investments; keep these two separate.
""",

    LifeEventType.PARENTING_AND_CAREGIVING: """\
### Strategic Overview
Parenting and caregiving in India involves navigating educational systems, healthcare, legal guardianship, and government welfare schemes — knowing which authority to approach saves weeks of misdirected effort.

### 1. Primary Essentials
- **Child’s Identity Documents**: Birth certificate, Aadhaar (from 5 years), school TC, and vaccination record — these travel with the child across every institution.
- **Caregiver’s Legal Standing**: If you are not the biological parent, establish legal guardianship through the District Court or Child Welfare Committee before the child needs institutional care.
- **Health Insurance for Dependent**: Add the child as a dependent on the family health insurance floater immediately after birth.

### 2. From Authorities & Third Parties
- **Anganwadi Centres (ICDS)**: Free early childhood nutrition, immunisation, and pre-school education for children 0–6 years.
- **District Education Office (DEO)**: For government school admissions, mid-year transfers, and disputes about TC issuance.
- **Child Welfare Committee (CWC)**: For cases of child in need of care and protection; also processes foster care and institutional care referrals.

### 3. Action & Submission Needs
- **RTE Admission (Class 1)**: 25% reservation for economically weaker section children in private schools under the Right to Education Act — apply via the state education portal during the admission window.
- **Scholarship Applications**: National Scholarship Portal lists multiple central and state scholarships from Class 1 through postgraduate level.

### 4. Common Mistakes & Expert Tips
- **Missing RTE Window**: RTE admissions open once a year (usually February–March); missing it means waiting a full year for the reserved seat.
- **No Legal Guardianship Documentation**: Grandparents, aunts, or uncles caring for a child without a guardianship order face repeated institutional roadblocks (school, hospital, passport) — formalise this through the court early.
""",
}

# Generic fallback for unlisted types
GENERIC_EXPERT_GUIDE = """\
### Strategic Overview
Your request involves a unique planning journey. Focus on core documentation first to build a solid foundation.

### 1. Primary Essentials
- **Verified Identity Proof**: Ensure you have valid, updated national ID or passport documents.
- **Financial Baseline**: Prepare current bank statements and proof of income or assets relevant to your request.
- **Historical Records**: Any previous certificates or legal documents that define your current status.

### 2. From Authorities & Third Parties
- **Expert Consultations**: Depending on the complexity, seek advice from legal or financial professionals.
- **Official Clearances**: Check for any necessary government permits or professional associations required.

### 3. Action & Submission Needs
- **Digital Transformation**: Scan all physical documents into high-quality PDFs for online submission.
- **Deadline Monitoring**: Create a calendar of any hard deadlines or renewal dates.

### 4. Common Mistakes & Expert Tips
- **Ignoring Fine Print**: Always read the ‘Terms and Conditions’ or ‘Eligibility Criteria’ before submitting applications.
- **Data Inconsistency**: Maintain 100% consistency in names, dates, and addresses across all files.
"""

def get_expert_fallback(event_type: LifeEventType) -> str:
    """Returns the best matching expert guide for the given type."""
    return EXPERT_FALLBACKS.get(event_type, GENERIC_EXPERT_GUIDE)

# Generic fallback for unlisted types
GENERIC_EXPERT_GUIDE = """\
### Strategic Overview
Your request involves a unique planning journey. Focus on core documentation first to build a solid foundation.

### 1. Primary Essentials
- **Verified Identity Proof**: Ensure you have valid, updated national ID or passport documents.
- **Financial Baseline**: Prepare current bank statements and proof of income or assets relevant to your request.
- **Historical Records**: Any previous certificates or legal documents that define your current status.

### 2. From Authorities & Third Parties
- **Expert Consultations**: Depending on the complexity, seek advice from legal or financial professionals.
- **Official Clearances**: Check for any necessary government permits or professional associations required.

### 3. Action & Submission Needs
- **Digital Transformation**: Scan all physical documents into high-quality PDFs for online submission.
- **Deadline Monitoring**: Create a calendar of any hard deadlines or renewal dates.

### 4. Common Mistakes & Expert Tips
- **Ignoring Fine Print**: Always read the 'Terms and Conditions' or 'Eligibility Criteria' before submitting applications.
- **Data Inconsistency**: Maintain 100% consistency in names, dates, and addresses across all files.
"""

def get_expert_fallback(event_type: LifeEventType) -> str:
    """Returns the best matching expert guide for the given type."""
    return EXPERT_FALLBACKS.get(event_type, GENERIC_EXPERT_GUIDE)
