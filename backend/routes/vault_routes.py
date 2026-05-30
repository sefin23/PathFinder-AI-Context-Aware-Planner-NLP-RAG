import logging
import os
import shutil
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models.vault_model import VaultDocument, VaultPlanLink
from backend.models.task_model import Task

log = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = os.path.join("backend", "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def detect_doc_type(filename: str, content_type: str) -> str:
    """
    Detects document category based on filename keywords or MIME type.
    identity|employment|education|financial|education_employment
    """
    fn = filename.lower()
    
    identity_kw = ["aadhaar", "pan", "passport", "voter", "license", "id", "birth", "uidai", "aadhaar", "voter", "passport", "dl"]
    employment_kw = ["salary", "slip", "offer", "relieving", "experience", "contract", "payslip", "hike", "bonus", "appointment", "resignation"]
    education_kw = ["degree", "marksheet", "diploma", "graduation", "transcript", "convocation", "sslc", "hsc"]
    financial_kw = ["bank", "statement", "tax", "form 16", "investment", "loan", "itrv", "gst", "tds", "passbook", "invoice"]
    
    # 1. Hybrid Check: Education & Employment (The 'Marklist' rule)
    if any(k in fn for k in ["marklist", "plus two", "+2", "ten", "10th", "12th", "cbse", "marksheet"]):
        return "education_employment"
    
    # 2. Specific Identity Overrides
    if "birth" in fn: return "identity"
    
    # 3. Categorical Matches
    if any(k in fn for k in identity_kw): return "identity"
    if any(k in fn for k in employment_kw): return "employment"
    if any(k in fn for k in education_kw): return "education"
    if any(k in fn for k in financial_kw): return "financial"
    
    # 4. Certification fallback
    if "certificate" in fn: return "education"
    
    # 5. MIME based fallbacks
    if "image" in content_type: return "identity"
    if "pdf" in content_type: return "employment"
    
    return "identity" # Default

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: int = Form(1), # Default to Demo User for now
    db: Session = Depends(get_db)
):
    """Save file to local disk and record in DB."""
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
    
    doc_type = detect_doc_type(file.filename, file.content_type)
    display_name = file.filename
    
    db_doc = VaultDocument(
        user_id=user_id,
        name=display_name,
        doc_type=doc_type,
        storage_url=f"/uploads/{unique_filename}", # Local path
        size_bytes=os.path.getsize(file_path)
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    # 3. Apply state changes (side effects)
    from backend.services.vault_integration_service import process_vault_extraction
    try:
        process_vault_extraction(db, db_doc.id)
        db.refresh(db_doc) # Refresh to get doc_type/name updates from service
    except Exception as e:
        log.warning("Post-upload automation failed for doc_id=%d: %s", db_doc.id, e)
    
    return db_doc

@router.get("/")
def list_vault(user_id: int = 1, db: Session = Depends(get_db)):
    """List non-deleted documents for a user."""
    return db.query(VaultDocument).filter(
        VaultDocument.user_id == user_id,
        VaultDocument.deleted_at == None
    ).all()

@router.delete("/{doc_id}")
def delete_document(doc_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    """Soft delete a document."""
    doc = db.query(VaultDocument).filter(
        VaultDocument.id == doc_id,
        VaultDocument.user_id == user_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Document deleted"}

@router.get("/match")
def match_vault_to_plan(plan_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    """
    Cross-references vault vs plan tasks using EVENT-LEVEL semantic matching.

    Instead of scanning individual task titles (fragile — tasks like "Gather Required
    Documents" are generic), this function looks at the LIFE EVENT title/description
    to determine the event category, then maps that to the doc types that category
    always requires. A user typing "I want to apply for B.Tech" will automatically
    get their SSLC, Plus Two, and Aadhaar surfaced on relevant tasks — no explicit
    document naming needed in the prompt.
    """
    from backend.models.life_event_model import LifeEvent

    # 1. Get the life event for context
    life_event = db.query(LifeEvent).filter(LifeEvent.id == plan_id).first()
    event_context = ""
    if life_event:
        event_context = ((life_event.title or "") + " " + (life_event.description or "")).lower()

    # 2. Get tasks for the plan
    tasks = db.query(Task).filter(Task.life_event_id == plan_id).all()

    # 3. Get all vault docs for this user (not deleted)
    vault = db.query(VaultDocument).filter(
        VaultDocument.user_id == user_id,
        VaultDocument.deleted_at == None
    ).all()

    # Group vault docs by type
    vault_by_type: dict[str, list] = {}
    for d in vault:
        vault_by_type.setdefault(d.doc_type, []).append(d)

    # ── EVENT-LEVEL DOC REQUIREMENT MAP ──────────────────────────────────────
    # Maps event keywords → the doc types that event ALWAYS requires.
    # This runs once per event, not per-task — so generic task titles
    # like "Gather Required Documents" don't need to name specific docs.
    EVENT_DOC_REQUIREMENTS = [
        {
            # Education / college admission / competitive exams
            "event_keywords": [
                "admission", "college", "university", "engineering", "medical",
                "b.tech", "btech", "mbbs", "b.sc", "ba ", "ma ", "mba",
                "keam", "neet", "jee", "counseling", "counselling",
                "undergraduate", "postgraduate", "enrollment", "enrolment",
                "school admission", "scholarship",
            ],
            "required_doc_types": ["education", "education_employment", "identity"],
        },
        {
            # Employment / job change
            "event_keywords": [
                "job", "employment", "career", "joining", "onboarding",
                "offer letter", "new job", "switch job", "work permit",
            ],
            "required_doc_types": ["employment", "identity", "education"],
        },
        {
            # Business / startup registration
            "event_keywords": [
                "business", "startup", "company", "firm", "agency", "llp",
                "proprietor", "partnership", "gst", "msme", "udyam",
                "consulting", "freelan",
            ],
            "required_doc_types": ["identity", "financial"],
        },
        {
            # Property / real estate
            "event_keywords": [
                "property", "inheritance", "real estate", "land", "plot",
                "house", "flat", "apartment", "home purchase", "mortgage",
                "probate", "will", "deed",
            ],
            "required_doc_types": ["identity", "financial"],
        },
        {
            # Financial / banking / loan / tax
            "event_keywords": [
                "loan", "bank", "mortgage", "tax", "itr", "income tax",
                "financial", "investment", "insurance", "credit card",
            ],
            "required_doc_types": ["financial", "identity", "employment"],
        },
        {
            # Travel / visa / relocation
            "event_keywords": [
                "visa", "travel", "passport", "relocat", "immigration",
                "abroad", "overseas", "international move",
            ],
            "required_doc_types": ["identity", "financial", "employment"],
        },
    ]

    # Determine which doc types this event requires
    event_required_types: set[str] = set()
    for rule in EVENT_DOC_REQUIREMENTS:
        if any(kw in event_context for kw in rule["event_keywords"]):
            event_required_types.update(rule["required_doc_types"])

    # Fallback: if event context didn't match anything, use task-level scanning
    # as a safety net (but only for well-typed task keywords, not generic ones)
    TASK_DOC_KEYWORDS = {
        "identity":            ["aadhaar", "aadhar", "pan card", "passport", "voter id", "identity proof", "id proof", "kyc"],
        "employment":          ["salary", "offer letter", "relieving letter", "payslip", "appointment letter"],
        "education":           ["degree certificate", "diploma", "convocation", "academic transcript"],
        "education_employment": ["sslc", "hsc", "plus two", "+2", "class 12", "marksheet", "mark sheet", "marklist"],
        "financial":           ["bank statement", "itr", "form 16", "tax return"],
    }

    # ── PER-TASK MATCHING ────────────────────────────────────────────────────
    # For each task, determine which doc types apply:
    #   Priority 1 — event-level required types (always relevant to doc-collection tasks)
    #   Priority 2 — task-specific keyword match (for precision on non-doc tasks)
    matched = []
    missing = []

    for t in tasks:
        t_low = t.title.lower() + " " + (t.description or "").lower()
        subtask_text = " ".join(
            (s.title or "").lower()
            for s in (t.subtasks if hasattr(t, "subtasks") else [])
        )
        full_task_text = t_low + " " + subtask_text

        # Is this a document-collection task? (broad gate — only on these does
        # the event-level injection fire)
        is_doc_task = any(k in t_low for k in [
            "gather", "collect", "document", "submit", "upload",
            "prepare", "assemble", "obtain", "proof",
        ])

        required_types: set[str] = set()

        if is_doc_task and event_required_types:
            # Event-level injection: this is a doc task in a known event type
            required_types.update(event_required_types)
        else:
            # Fallback task-level scan with specific compound phrases only
            for doc_type, keywords in TASK_DOC_KEYWORDS.items():
                if any(k in full_task_text for k in keywords):
                    required_types.add(doc_type)

        # For each required type, add all matching vault docs
        for req_type in required_types:
            docs_of_type = vault_by_type.get(req_type, [])
            for vault_doc in docs_of_type:
                already_added = any(
                    m["task_id"] == t.id and m["vault_doc"]["id"] == vault_doc.id
                    for m in matched
                )
                if already_added:
                    continue

                matched.append({
                    "task_id": t.id,
                    "task_title": t.title,
                    "vault_doc": {
                        "id": vault_doc.id,
                        "name": vault_doc.name,
                        "doc_type": vault_doc.doc_type,
                        "storage_url": vault_doc.storage_url,
                        "extracted_fields": vault_doc.extracted_fields,
                    }
                })

                # Auto-link if not already linked
                existing = db.query(VaultPlanLink).filter(
                    VaultPlanLink.task_id == t.id,
                    VaultPlanLink.vault_doc_id == vault_doc.id
                ).first()
                if not existing:
                    link = VaultPlanLink(
                        vault_doc_id=vault_doc.id,
                        plan_id=plan_id,
                        task_id=t.id,
                        requirement_id=req_type
                    )
                    db.add(link)

    db.commit()
    return {
        "matched": matched,
        "missing": missing,
        "match_count": len(matched)
    }

@router.post("/link")
def link_vault_to_task(
    vault_doc_id: int,
    task_id: int,
    requirement_id: str,
    db: Session = Depends(get_db)
):
    """Manually link a vault document to a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    link = VaultPlanLink(
        vault_doc_id=vault_doc_id,
        plan_id=task.life_event_id,
        task_id=task_id,
        requirement_id=requirement_id
    )
    db.add(link)
    db.commit()
    return {"message": "Linked successfully"}

@router.patch("/{doc_id}")
def rename_document(
    doc_id: int,
    name: str = Form(...),
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """Rename a document."""
    doc = db.query(VaultDocument).filter(
        VaultDocument.id == doc_id,
        VaultDocument.user_id == user_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.name = name
    db.commit()
    db.refresh(doc)
    return doc

@router.post("/{doc_id}/reextract")
def reextract_document(doc_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    """
    Re-run Gemini Vision extraction on an existing vault document.
    Use this when extracted_fields is null (e.g. initial extraction failed due to quota).
    """
    doc = db.query(VaultDocument).filter(
        VaultDocument.id == doc_id,
        VaultDocument.user_id == user_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from backend.services.vault_integration_service import process_vault_extraction
    try:
        process_vault_extraction(db, doc.id)
        db.refresh(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")

    import json
    fields = None
    if doc.extracted_fields:
        try:
            fields = json.loads(doc.extracted_fields)
        except Exception:
            pass

    return {
        "doc_id": doc.id,
        "name": doc.name,
        "doc_type": doc.doc_type,
        "extracted": fields is not None,
        "extracted_fields": fields,
    }

@router.post("/reextract-all")
def reextract_all(user_id: int = 1, db: Session = Depends(get_db)):
    """Bulk re-extract all vault docs for a user that are missing extracted_fields."""
    docs = db.query(VaultDocument).filter(
        VaultDocument.user_id == user_id,
        VaultDocument.deleted_at == None,
        VaultDocument.extracted_fields == None
    ).all()

    from backend.services.vault_integration_service import process_vault_extraction
    results = []
    for doc in docs:
        try:
            process_vault_extraction(db, doc.id)
            db.refresh(doc)
            results.append({"doc_id": doc.id, "name": doc.name, "status": "ok", "has_fields": bool(doc.extracted_fields)})
        except Exception as e:
            results.append({"doc_id": doc.id, "name": doc.name, "status": "error", "error": str(e)})

    return {"processed": len(results), "results": results}
