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
    Cross-references vault vs plan tasks.
    In this simplified version, we match by task title/name keywords vs doc_type.
    """
    # 1. Get tasks for the plan that might need documents
    # Based on the brief, we are looking for "document requirements"
    # For now, let's assume any task with "document", "aadhaar", "pan", etc. in title needs one.
    tasks = db.query(Task).filter(Task.life_event_id == plan_id).all()
    
    # 2. Get vault docs
    vault = db.query(VaultDocument).filter(
        VaultDocument.user_id == user_id,
        VaultDocument.deleted_at == None
    ).all()
    
    vault_by_type = {}
    for d in vault:
        if d.doc_type not in vault_by_type:
            vault_by_type[d.doc_type] = d
    
    matched = []
    missing = []
    
    for t in tasks:
        # Heuristic for matching requirements
        req_type = None
        t_low = t.title.lower()
        words = t_low.replace('(', ' ').replace(')', ' ').replace('/', ' ').split()
        
        if any(k in t_low for k in ["aadhaar", "pan"]) or any(k in words for k in ["id", "identity"]): 
            req_type = "identity"
        elif any(k in t_low for k in ["salary", "offer"]): 
            req_type = "employment"
        elif any(k in t_low for k in ["degree", "certificate", "marksheet"]): 
            req_type = "education"
        elif any(k in t_low for k in ["bank", "tax"]): 
            req_type = "financial"
        
        if req_type:
            if req_type in vault_by_type:
                matched.append({
                    "task_id": t.id,
                    "task_title": t.title,
                    "vault_doc": vault_by_type[req_type]
                })
                # Check if already linked
                existing = db.query(VaultPlanLink).filter(
                    VaultPlanLink.task_id == t.id,
                    VaultPlanLink.vault_doc_id == vault_by_type[req_type].id
                ).first()
                if not existing:
                    link = VaultPlanLink(
                        vault_doc_id=vault_by_type[req_type].id,
                        plan_id=plan_id,
                        task_id=t.id,
                        requirement_id=req_type
                    )
                    db.add(link)
            else:
                missing.append(t.title)
    
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
