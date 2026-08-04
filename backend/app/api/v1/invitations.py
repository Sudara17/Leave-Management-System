from datetime import datetime, timedelta, timezone
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.invitation import Invitation as InvitationModel
from app.models.audit_log import AuditLog
from app.security.rbac import get_current_hr
from app.models.user import User
from pydantic import BaseModel, EmailStr

router = APIRouter()

class InvitationCreate(BaseModel):
    employee_name: str
    official_email: EmailStr
    department_id: int | None = None
    role_id: int | None = None
    manager_id: int | None = None
    employment_type: str | None = None
    valid_days: int = 7

class InvitationResponse(BaseModel):
    id: int
    employee_name: str
    official_email: str
    status: str
    invitation_expiry: datetime
    
    class Config:
        from_attributes = True

@router.post("/", response_model=InvitationResponse)
def create_invitation(
    *,
    db: Session = Depends(get_db),
    invitation_in: InvitationCreate,
    current_user: User = Depends(get_current_hr),
) -> Any:
    # Check if already invited or already employee
    existing_inv = db.query(InvitationModel).filter(InvitationModel.official_email == invitation_in.official_email).first()
    if existing_inv and existing_inv.status in ["Pending", "Accepted"]:
        raise HTTPException(status_code=400, detail="An invitation or employee with this email already exists.")
        
    expiry = datetime.now(timezone.utc) + timedelta(days=invitation_in.valid_days)
    
    invitation = InvitationModel(
        employee_name=invitation_in.employee_name,
        official_email=invitation_in.official_email,
        department_id=invitation_in.department_id,
        role_id=invitation_in.role_id,
        manager_id=invitation_in.manager_id,
        employment_type=invitation_in.employment_type,
        invitation_expiry=expiry,
        status="Pending",
        invited_by_id=current_user.id
    )
    db.add(invitation)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE_INVITATION",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Invited {invitation_in.official_email}"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(invitation)
    
    # In a real app, we would send an email here with a secure token link.
    
    return invitation

@router.get("/", response_model=List[InvitationResponse])
def list_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr),
) -> Any:
    invitations = db.query(InvitationModel).all()
    return invitations

@router.post("/{invitation_id}/cancel")
def cancel_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr),
) -> Any:
    invitation = db.query(InvitationModel).filter(InvitationModel.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    if invitation.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Cannot cancel invitation with status {invitation.status}")
        
    invitation.status = "Cancelled"
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CANCEL_INVITATION",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Cancelled invitation for {invitation.official_email}"
    )
    db.add(audit_log)
    
    db.commit()
    return {"message": "Invitation cancelled successfully"}
