import os
import shutil
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.company_policy import CompanyPolicy
from app.models.policy_acceptance import PolicyAcceptance
from app.models.audit_log import AuditLog
from app.security.rbac import get_current_hr
from app.schemas.hr_operations import PolicyUploadResponse, PolicyAcceptanceStat

router = APIRouter()

UPLOAD_DIR = "uploads/policies"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=List[PolicyUploadResponse])
def get_all_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    policies = db.query(CompanyPolicy).order_by(CompanyPolicy.effective_date.desc()).all()
    
    result = []
    for p in policies:
        result.append(PolicyUploadResponse(
            id=p.id,
            title=p.title,
            version=p.version,
            effective_date=p.effective_date,
            file_url=p.file_url,
            is_active=p.is_active
        ))
    return result

@router.post("/", response_model=PolicyUploadResponse)
def upload_policy(
    title: str = Form(...),
    version: str = Form(...),
    effective_date: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    try:
        parsed_date = datetime.strptime(effective_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="effective_date must be YYYY-MM-DD")
        
    # Check if active policy with same title exists and archive it
    old_policy = db.query(CompanyPolicy).filter(
        CompanyPolicy.title == title,
        CompanyPolicy.is_active == True
    ).first()
    
    if old_policy:
        old_policy.is_active = False
        db.add(old_policy)
        
    # Save file
    file_path = os.path.join(UPLOAD_DIR, f"{title.replace(' ', '_')}_v{version}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    new_policy = CompanyPolicy(
        title=title,
        version=version,
        effective_date=parsed_date,
        file_url=file_path,
        is_active=True
    )
    db.add(new_policy)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPLOAD_POLICY",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Uploaded policy '{title}' version {version}"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(new_policy)
    
    return PolicyUploadResponse(
        id=new_policy.id,
        title=new_policy.title,
        version=new_policy.version,
        effective_date=new_policy.effective_date,
        file_url=new_policy.file_url,
        is_active=new_policy.is_active
    )

@router.get("/acceptances", response_model=List[PolicyAcceptanceStat])
def get_policy_acceptances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    active_policies = db.query(CompanyPolicy).filter(CompanyPolicy.is_active == True).all()
    total_employees = db.query(func.count(Employee.id)).scalar() or 0
    
    result = []
    for p in active_policies:
        accepted_count = db.query(func.count(PolicyAcceptance.id)).filter(
            PolicyAcceptance.policy_id == p.id
        ).scalar() or 0
        
        pending = total_employees - accepted_count
        percentage = (accepted_count / total_employees * 100) if total_employees > 0 else 0.0
        
        result.append(PolicyAcceptanceStat(
            policy_id=p.id,
            title=p.title,
            version=p.version,
            total_employees=total_employees,
            accepted=accepted_count,
            pending=pending,
            acceptance_percentage=round(percentage, 2)
        ))
    return result

@router.delete("/{policy_id}")
def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    policy = db.query(CompanyPolicy).filter(CompanyPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    # Delete from DB
    db.delete(policy)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE_POLICY",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Deleted policy {policy.title} (ID {policy.id})"
    )
    db.add(audit_log)
    db.commit()
    return {"message": "Policy deleted successfully"}

@router.put("/{policy_id}/deactivate")
def deactivate_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    policy = db.query(CompanyPolicy).filter(CompanyPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    policy.is_active = False
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="DEACTIVATE_POLICY",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Deactivated policy {policy.title} (ID {policy.id})"
    )
    db.add(audit_log)
    db.add(audit_log)
    db.commit()
    return {"message": "Policy deactivated successfully"}

from fastapi.responses import FileResponse
import os

@router.get("/{policy_id}/download")
def download_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    policy = db.query(CompanyPolicy).filter(CompanyPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    if not policy.file_url or not os.path.exists(policy.file_url):
        raise HTTPException(status_code=404, detail="Policy file not found on disk")
        
    return FileResponse(
        path=policy.file_url,
        filename=os.path.basename(policy.file_url),
        media_type='application/octet-stream'
    )
