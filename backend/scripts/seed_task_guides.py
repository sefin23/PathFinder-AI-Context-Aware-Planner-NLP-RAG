import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.database import SessionLocal
from backend.models.task_guide_model import TaskGuide

GUIDES = [
    {
        "task_type": "aadhaar_download",
        "title": "Download your e-Aadhaar",
        "estimated_mins": 5,
        "url": "https://myaadhaar.uidai.gov.in/genricDownloadAadhaar/en",
        "steps": json.dumps([
            {
                "num": 1, "title": "Go to the official UIDAI page",
                "description": "Open myaadhaar.uidai.gov.in — make sure it's the .gov.in domain. Don't use any third-party sites.",
                "action": {"type": "link", "label": "Open UIDAI page →", "url": "https://myaadhaar.uidai.gov.in/genricDownloadAadhaar/en"},
                "explainer_type": "uidai_aadhaar_download"
            },
            {
                "num": 2, "title": "Enter your Aadhaar number",
                "description": "Enter the 12-digit number. Your last 4 digits are shown above from your vault — verify and type the full number.",
                "action": {"type": "copy", "label": "Copy Aadhaar last 4", "value_key": "id_last4"}
            },
            {
                "num": 3, "title": "Enter the OTP sent to your phone",
                "description": "An SMS will arrive on your registered mobile. Enter the 6-digit code. If you don't receive it within 2 minutes, click 'Resend OTP'.",
                "action": None
            },
            {
                "num": 4, "title": "Download the PDF and enter the password",
                "description": "Click 'Download Aadhaar'. The PDF is password-protected. Password = first 4 letters of your name (uppercase) + birth year. E.g. SEFI1995",
                "action": {"type": "copy", "label": "Copy password formula", "value": "First 4 letters of name (CAPS) + birth year"}
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Aadhaar last 4", "source": "vault.identity.id_last4"},
            {"label": "Full name", "source": "profile.full_name"},
            {"label": "Date of birth", "source": "profile.dob"}
        ]),
        "expected_result": "A PDF named 'eaadhaar.pdf' will download. It opens with your password. You'll see your photo, Aadhaar number, and address.",
        "what_to_save": "Rename it 'Aadhaar_2026.pdf' and upload it back to your Vault. You'll need it in multiple upcoming tasks.",
        "tags": json.dumps(["identity", "aadhaar", "government"]),
        "required_doc_types": json.dumps(["identity"])
    },
    {
        "task_type": "pan_download",
        "title": "Download your e-PAN",
        "estimated_mins": 5,
        "url": "https://onlineservices.proteantech.in/paam/requestAndDownloadEPAN.html",
        "steps": json.dumps([
            {
                "num": 1, "title": "Open the Protean e-PAN portal",
                "description": "This is the official Protean (formerly NSDL) page for downloading your PAN card.",
                "action": {"type": "link", "label": "Open Protean portal →", "url": "https://onlineservices.proteantech.in/paam/requestAndDownloadEPAN.html"},
                "explainer_type": "pan_download"
            },
            {
                "num": 2, "title": "Enter your PAN and Aadhaar number",
                "description": "Enter your PAN number, then your Aadhaar number for e-KYC verification.",
                "action": {"type": "copy", "label": "Copy name for PAN field", "value_key": "full_name"}
            },
            {
                "num": 3, "title": "Verify OTP and pay fee (if applicable)",
                "description": "Enter the OTP sent to your Aadhaar-linked mobile. A fee of ₹8.26 may apply for physical PAN.",
                "action": None
            },
            {
                "num": 4, "title": "Download the e-PAN PDF",
                "description": "After OTP verification, your e-PAN PDF will be available for download.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full name", "source": "profile.full_name"},
            {"label": "Date of birth", "source": "profile.dob"}
        ]),
        "expected_result": "A PDF e-PAN card will download with your 10-digit PAN number and photo.",
        "what_to_save": "Upload the e-PAN PDF to your Vault under the 'Identity' category.",
        "tags": json.dumps(["identity", "pan", "tax"]),
        "required_doc_types": json.dumps(["identity"])
    },
    {
        "task_type": "submit_hr_docs",
        "title": "Submit documents to HR",
        "estimated_mins": 20,
        "url": "https://infyme.infosys.com/",
        "steps": json.dumps([
            {
                "num": 1, "title": "Collect all required documents",
                "description": "Check which documents are already in your Vault below. Upload any missing ones before going to the HR portal.",
                "action": None
            },
            {
                "num": 2, "title": "Open your company onboarding portal",
                "description": "You would have received the portal link and credentials in your offer letter email. Check that email first.",
                "action": {"type": "link", "label": "Search email for portal link", "url": "https://mail.google.com/mail/u/0/#search/onboarding+portal"}
            },
            {
                "num": 3, "title": "Upload each document to the correct category",
                "description": "Identity: Aadhaar + PAN. Education: Degree + Marksheets. Employment: Offer letter + Relieving letter. Each file must be under 2MB.",
                "action": None
            },
            {
                "num": 4, "title": "Submit and note the reference number",
                "description": "After submitting, you'll get a reference number by email. Save it — HR may need it if there's a query.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Employer", "source": "profile.employer"},
            {"label": "Joining date", "source": "profile.joining_date"},
            {"label": "Full name", "source": "profile.full_name"}
        ]),
        "expected_result": "HR will confirm document receipt within 1-2 business days. BGV (background verification) will start automatically.",
        "what_to_save": "Screenshot the submission confirmation. Save the reference number — HR may contact you if any document is unclear.",
        "tags": json.dumps(["employment", "onboarding", "hr"]),
        "required_doc_types": json.dumps(["identity", "employment", "education"])
    },
    {
        "task_type": "bank_account_opening",
        "title": "Open your salary bank account",
        "estimated_mins": 30,
        "url": "https://www.hdfc.bank.in/salary-account",
        "steps": json.dumps([
            {
                "num": 1, "title": "Choose your bank based on employer tie-ups",
                "description": "Most major employers have salary account partnerships. HDFC, Kotak, and ICICI offer zero-balance salary accounts.",
                "action": {"type": "link", "label": "HDFC Salary Account →", "url": "https://www.hdfc.bank.in/salary-account"}
            },
            {
                "num": 2, "title": "Find nearest branch to your office",
                "description": "Visit a branch near your new office location with your original documents for KYC.",
                "action": {"type": "link", "label": "Find nearest HDFC branch →", "url": "https://www.hdfc.bank.in/branch-locator"}
            },
            {
                "num": 3, "title": "Bring documents to the branch",
                "description": "Required: Aadhaar (original + copy), PAN (original + copy), Offer Letter (copy), 2 passport-size photos.",
                "action": None
            },
            {
                "num": 4, "title": "Link Aadhaar and activate UPI",
                "description": "Account opens same day. Link your Aadhaar for DBT. Download the mobile app and activate UPI immediately.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Employer", "source": "profile.employer"},
            {"label": "Office city", "source": "profile.job_city"},
            {"label": "Full name", "source": "profile.full_name"}
        ]),
        "expected_result": "Account number issued same day. Net banking credentials arrive by post in 5 working days. UPI works immediately.",
        "what_to_save": "Note your account number and IFSC code. Share it with HR payroll so your first salary goes to the right account.",
        "tags": json.dumps(["financial", "banking", "onboarding"]),
        "required_doc_types": json.dumps(["identity", "employment"])
    },
    {
        "task_type": "epf_transfer",
        "title": "Transfer your PF to new employer",
        "estimated_mins": 15,
        "url": "https://unifiedportal-mem.epfindia.gov.in/memberinterface/",
        "steps": json.dumps([
            {
                "num": 1, "title": "Login with UAN and password",
                "description": "Go to the EPFO Unified Member Portal. Use your UAN found in your offer letter or salary slip.",
                "action": {"type": "copy", "label": "Copy UAN", "value_key": "uan_number"},
                "explainer_type": "epfo_pf_transfer"
            },
            {
                "num": 2, "title": "Go to Online Services → Transfer Request",
                "description": "Navigate to 'Online Services' → 'One Member – One EPF Account (Transfer Request)'.",
                "action": None
            },
            {
                "num": 3, "title": "Verify and submit transfer",
                "description": "Verify your personal information and PF account details of current employer. Submit via Aadhaar OTP.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full name", "source": "profile.full_name"},
            {"label": "UAN Number", "source": "profile.uan_number"},
            {"label": "Previous employer", "source": "vault.employment.company_name"}
        ]),
        "expected_result": "Claim Submission Reference Number. Transfer completes within 20 working days.",
        "what_to_save": "Take a screenshot of the successful submission with the claim ID.",
        "tags": json.dumps(["financial", "pf", "employment"]),
        "required_doc_types": json.dumps(["identity"])
    },
    {
        "task_type": "aadhaar_update",
        "title": "Update your Aadhaar address",
        "estimated_mins": 10,
        "url": "https://myaadhaar.uidai.gov.in/updateAddress",
        "steps": json.dumps([
            {
                "num": 1, "title": "Login to the UIDAI address update portal",
                "description": "Open the Aadhaar address update page and login with your Aadhaar number and OTP.",
                "action": {"type": "link", "label": "Open address update →", "url": "https://myaadhaar.uidai.gov.in/updateAddress"}
            },
            {
                "num": 2, "title": "Select 'Update Address Online'",
                "description": "Choose 'Address Update' then 'Update Address Online'. Make sure your new address matches your proof document exactly.",
                "action": None
            },
            {
                "num": 3, "title": "Enter new address and upload proof",
                "description": "Type your new address carefully. Upload a valid proof: Rent Agreement, Utility Bill, or Bank Statement with new address.",
                "action": {"type": "copy", "label": "Copy new city", "value_key": "job_city"}
            },
            {
                "num": 4, "title": "Submit and save the URN",
                "description": "Note the Update Request Number (URN). You can track the status using this number.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Current Aadhaar city", "source": "profile.current_city"},
            {"label": "New work city", "source": "profile.job_city"},
            {"label": "Full name", "source": "profile.full_name"}
        ]),
        "expected_result": "URN (Update Request Number) will be generated. Address update completes in 5-7 business days.",
        "what_to_save": "Save the acknowledgment slip with the URN number for tracking.",
        "tags": json.dumps(["identity", "aadhaar", "address"]),
        "required_doc_types": json.dumps(["identity"])
    },
    {
        "task_type": "voter_address_change",
        "title": "Update Voter ID address",
        "estimated_mins": 15,
        "url": "https://voters.eci.gov.in/",
        "steps": json.dumps([
            {
                "num": 1, "title": "Register/Login on the NVSP portal",
                "description": "The National Voter's Service Portal is managed by the Election Commission of India.",
                "action": {"type": "link", "label": "Open NVSP portal →", "url": "https://voters.eci.gov.in/"}
            },
            {
                "num": 2, "title": "Select Form 8 for address correction",
                "description": "Choose 'Form 8' for shifting of residence or correction of entries in the Electoral Roll.",
                "action": None
            },
            {
                "num": 3, "title": "Fill in new address details",
                "description": "Enter your new address. Upload proof of new address (any government document).",
                "action": {"type": "copy", "label": "Copy full name", "value_key": "full_name"}
            },
            {
                "num": 4, "title": "Submit and get reference ID",
                "description": "After submission, note the Reference ID for tracking your application status.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full name", "source": "profile.full_name"},
            {"label": "Date of birth", "source": "profile.dob"},
            {"label": "New city", "source": "profile.job_city"}
        ]),
        "expected_result": "Reference ID generated. Voter ID update processed by local Electoral Roll Officer.",
        "what_to_save": "Note the Reference ID for tracking your application.",
        "tags": json.dumps(["identity", "voter", "address"]),
        "required_doc_types": json.dumps([])
    },
    {
        "task_type": "passport_renewal",
        "title": "Renew or apply for Passport",
        "estimated_mins": 40,
        "url": "https://www.passportindia.gov.in/",
        "steps": json.dumps([
            {
                "num": 1, "title": "Register on Passport Seva Portal",
                "description": "Create an account on the official Passport Seva portal if you don't have one.",
                "action": {"type": "link", "label": "Open Passport Seva →", "url": "https://services1.passportindia.gov.in/forms/registration"},
                "explainer_type": "passport_seva"
            },
            {
                "num": 2, "title": "Apply for Fresh or Re-issue",
                "description": "For renewal, select 'Apply for Fresh Passport/Re-issue of Passport'. Fill the application form with your latest details.",
                "action": None
            },
            {
                "num": 3, "title": "Pay fee and book appointment",
                "description": "Pay the fee online and book an appointment at your nearest Passport Seva Kendra (PSK).",
                "action": {"type": "link", "label": "Find nearest PSK →", "url": "https://www.passportindia.gov.in/AppOnlineProject/welcomeLink"}
            },
            {
                "num": 4, "title": "Attend appointment with originals",
                "description": "Bring all original documents. Biometrics and photo will be captured at the PSK.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full name", "source": "profile.full_name"},
            {"label": "Date of birth", "source": "profile.dob"},
            {"label": "Current city", "source": "profile.current_city"}
        ]),
        "expected_result": "Appointment Confirmation PDF. Passport dispatched within 3-7 days of appointment.",
        "what_to_save": "Download and save the Appointment Receipt. Keep the file reference number.",
        "tags": json.dumps(["identity", "passport", "travel"]),
        "required_doc_types": json.dumps(["identity"])
    },
    {
        "task_type": "dl_address_change",
        "title": "Update Driving Licence address",
        "estimated_mins": 20,
        "url": "https://sarathi.parivahan.gov.in/",
        "steps": json.dumps([
            {
                "num": 1, "title": "Open Sarathi Parivahan portal",
                "description": "Go to the official Sarathi portal and select your state.",
                "action": {"type": "link", "label": "Open Sarathi portal →", "url": "https://sarathi.parivahan.gov.in/"}
            },
            {
                "num": 2, "title": "Select DL Services → Change of Address",
                "description": "Go to 'Apply for DL Services', enter your DL number and DOB, then select 'Change of Address'.",
                "action": None
            },
            {
                "num": 3, "title": "Fill in new address with pincode",
                "description": "Enter your exact new address. Upload new address proof that matches exactly.",
                "action": {"type": "copy", "label": "Copy new city", "value_key": "job_city"}
            },
            {
                "num": 4, "title": "Pay fee and submit",
                "description": "Pay the address change fee and book a verification slot if required by your RTO.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full name", "source": "profile.full_name"},
            {"label": "Date of birth", "source": "profile.dob"},
            {"label": "New city", "source": "profile.job_city"}
        ]),
        "expected_result": "Application Reference Number. Updated DL dispatched in 7-14 days.",
        "what_to_save": "Save the application form PDF with your reference number.",
        "tags": json.dumps(["identity", "driving", "address"]),
        "required_doc_types": json.dumps([])
    },
    {
        "task_type": "epf_withdrawal",
        "title": "Withdraw PF (on resignation)",
        "estimated_mins": 15,
        "url": "https://unifiedportal-mem.epfindia.gov.in/memberinterface/",
        "steps": json.dumps([
            {
                "num": 1, "title": "Ensure UAN is seeded with Aadhaar and Bank",
                "description": "Before claiming, your UAN must be linked with Aadhaar, PAN, and bank account details for instant credit.",
                "action": {"type": "link", "label": "Open EPFO portal →", "url": "https://unifiedportal-mem.epfindia.gov.in/memberinterface/"},
                "explainer_type": "epfo_pf_transfer"
            },
            {
                "num": 2, "title": "Go to Online Services → Claim",
                "description": "Navigate to 'Online Services' → 'Claim (Form-31, 19, 10C & 10D)'.",
                "action": None
            },
            {
                "num": 3, "title": "Verify bank account and submit claim",
                "description": "Enter the last 4 digits of your bank account to verify. Choose claim type (Full settlement or Partial). Submit via Aadhaar OTP.",
                "action": {"type": "copy", "label": "Copy account last 4", "value_key": "account_last4"}
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full name", "source": "profile.full_name"},
            {"label": "Bank account last 4", "source": "vault.financial.account_last4"}
        ]),
        "expected_result": "Claim Submission Receipt with Claim ID. Amount credited within 3-20 working days.",
        "what_to_save": "Screenshot the submission confirmation with the Claim ID.",
        "tags": json.dumps(["financial", "pf", "epf"]),
        "required_doc_types": json.dumps(["identity", "financial"])
    },
    {
        "task_type": "domicile_certificate",
        "title": "Apply for Domicile Certificate",
        "estimated_mins": 25,
        "url": "https://aaplesarkar.mahaonline.gov.in/",
        "steps": json.dumps([
            {
                "num": 1, "title": "Identify your state's citizen portal",
                "description": "Each state has its own portal (e.g., Aaple Sarkar for MH, Seva Sindhu for KA). We've linked the one for your state.",
                "action": {"type": "link", "label": "Open State Portal →", "url": "https://aaplesarkar.mahaonline.gov.in/"}
            },
            {
                "num": 2, "title": "Register and search for 'Domicile'",
                "description": "Create a login if you don't have one. Search for 'Age, Nationality and Domicile Certificate' in the services menu.",
                "action": None
            },
            {
                "num": 3, "title": "Upload Address and Identity Proof",
                "description": "Required: Ration Card/Voter ID (Address), Aadhaar/PAN (Identity), and an Affidavit signed by a notary.",
                "action": None
            },
            {
                "num": 4, "title": "Submit and get application number",
                "description": "Note the application ID. Use it to track the status. It usually takes 15-21 days.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full name", "source": "profile.full_name"},
            {"label": "State", "source": "profile.state_code"},
            {"label": "Address", "source": "profile.job_city"}
        ]),
        "expected_result": "Application reference number generated. Certificate issued after local Tehsildar verification.",
        "what_to_save": "Save the application receipt. Once issued, download the digital certificate and upload to Vault.",
        "tags": json.dumps(["identity", "domicile", "government"]),
        "required_doc_types": json.dumps(["identity"])
    },
    {
        "task_type": "business_registration",
        "title": "Register the business",
        "estimated_mins": 45,
        "url": "https://www.mca.gov.in/content/mca/global/en/home.html",
        "steps": json.dumps([
            {
                "num": 1, "title": "Register business name",
                "description": "Search for name availability on MCA portal. Reserve your chosen business name before it's taken by someone else.",
                "action": {"type": "link", "label": "Open MCA name search →", "url": "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html"},
                "explainer_type": "mca_name_check"
            },
            {
                "num": 2, "title": "Obtain business registration number",
                "description": "Apply for CIN/LLPIN and company PAN/TAN through MCA SPICe+ form. This gives your business its legal identity.",
                "action": {"type": "link", "label": "Open SPICe+ form →", "url": "https://www.mca.gov.in/content/mca/global/en/services/company-registration.html"}
            },
            {
                "num": 3, "title": "Upload incorporation documents",
                "description": "Prepare: MOA (Memorandum of Association), AOA (Articles of Association), Director ID proofs, Address proof. All must be digitally signed.",
                "action": None
            },
            {
                "num": 4, "title": "Pay registration fees and submit",
                "description": "Pay the MCA registration fee online (varies by capital). Submission triggers government verification which takes 3-7 days.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full Name", "source": "profile.full_name"},
            {"label": "PAN", "source": "vault.identity.pan_number"},
            {"label": "Proposed Business Name", "source": "profile.business_name"}
        ]),
        "expected_result": "CIN (Corporate Identity Number) and Certificate of Incorporation will be issued digitally within 7 working days.",
        "what_to_save": "Download the Certificate of Incorporation PDF. Save your CIN — you'll need it for GST, bank account, and all future compliance.",
        "tags": json.dumps(["business", "startup", "legal", "registration"]),
        "required_doc_types": json.dumps(["identity", "business_plan"])
    },
    {
        "task_type": "business_name_registration",
        "title": "Register business name",
        "estimated_mins": 20,
        "url": "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html",
        "steps": json.dumps([
            {
                "num": 1, "title": "Search for name availability",
                "description": "Enter your proposed business name on the MCA portal. Check if it's already registered or too similar to existing companies.",
                "action": {"type": "link", "label": "Check name availability →", "url": "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html"},
                "explainer_type": "mca_name_check"
            },
            {
                "num": 2, "title": "Prepare 2-3 name alternatives",
                "description": "MCA may reject your first choice. Keep backup names ready that follow naming guidelines (no prohibited words like 'Bank', 'Government').",
                "action": None
            },
            {
                "num": 3, "title": "File RUN (Reserve Unique Name) application",
                "description": "Submit the name reservation form with your director details and PAN. Pay ₹1000 fee for name reservation.",
                "action": {"type": "link", "label": "File RUN application →", "url": "https://www.mca.gov.in/content/mca/global/en/services/company-registration.html"}
            },
            {
                "num": 4, "title": "Receive name approval",
                "description": "If approved, you have 20 days to complete incorporation using this reserved name. If rejected, reapply with alternative names.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full Name", "source": "profile.full_name"},
            {"label": "PAN", "source": "vault.identity.pan_number"},
            {"label": "Proposed Business Name", "source": "profile.business_name"}
        ]),
        "expected_result": "Name approval letter with SRN (Service Request Number). Valid for 20 days for incorporation filing.",
        "what_to_save": "Save the name approval letter PDF. Note the SRN — you'll use it in the SPICe+ incorporation form.",
        "tags": json.dumps(["business", "startup", "legal"]),
        "required_doc_types": json.dumps(["identity"])
    },
    {
        "task_type": "business_reg_number",
        "title": "Obtain business registration number",
        "estimated_mins": 30,
        "url": "https://www.mca.gov.in/content/mca/global/en/services/company-registration.html",
        "steps": json.dumps([
            {
                "num": 1, "title": "Complete Part A of SPICe+ form",
                "description": "Fill company details: registered office address, authorized capital, directors' KYC. Use the approved business name from previous step.",
                "action": {"type": "link", "label": "Open SPICe+ form →", "url": "https://www.mca.gov.in/content/mca/global/en/services/company-registration.html"},
                "explainer_type": "mca_name_check"
            },
            {
                "num": 2, "title": "Complete Part B - Tax registrations",
                "description": "Apply for PAN, TAN, and GSTIN simultaneously. This saves time as all tax numbers are issued together with CIN.",
                "action": None
            },
            {
                "num": 3, "title": "Attach and digitally sign documents",
                "description": "Upload: MOA, AOA, Director ID proofs, Registered office proof. All must be digitally signed by all directors using DSC (Digital Signature Certificate).",
                "action": None
            },
            {
                "num": 4, "title": "Pay fees and submit",
                "description": "Registration fee: ₹500 (up to ₹1L capital) to ₹4,500 (above ₹50L capital). Add stamp duty per state. Payment triggers ROC verification.",
                "action": None
            }
        ]),
        "prefill_fields": json.dumps([
            {"label": "Full Name", "source": "profile.full_name"},
            {"label": "PAN", "source": "vault.identity.pan_number"},
            {"label": "Business Name (Approved)", "source": "profile.business_name"},
            {"label": "Office Address", "source": "profile.business_address"}
        ]),
        "expected_result": "CIN (21-digit Corporate Identity Number), Company PAN, TAN, and Certificate of Incorporation — all issued digitally within 5-7 days.",
        "what_to_save": "Download: Certificate of Incorporation (most important), PAN card, TAN allotment letter. Store CIN securely — it's your company's permanent identity.",
        "tags": json.dumps(["business", "startup", "legal", "tax"]),
        "required_doc_types": json.dumps(["identity", "business_plan", "address_proof"])
    }
]


def seed_task_guides():
    db = SessionLocal()
    
    for g_data in GUIDES:
        existing = db.query(TaskGuide).filter(TaskGuide.task_type == g_data["task_type"]).first()
        if existing:
            for key, value in g_data.items():
                setattr(existing, key, value)
        else:
            db.add(TaskGuide(**g_data))
    
    db.commit()
    db.close()
    print(f"Seeded {len(GUIDES)} task guides with rich step structure.")

if __name__ == "__main__":
    seed_task_guides()
