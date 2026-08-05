import uuid
from datetime import datetime, timezone, date
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal

from app.database.session import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.leave_balance import LeaveBalance
from app.models.leave_request import LeaveRequest
from app.models.company_policy import CompanyPolicy
from app.models.policy_acceptance import PolicyAcceptance
from app.models.leave_type import LeaveType
from app.models.audit_log import AuditLog
from app.api.deps import get_current_active_user
from app.services.leave_calculator import LeaveCalculator
from app.schemas.employee_dashboard import (
    DashboardSummaryResponse, LeaveBalanceResponse, LeaveApplyRequest, 
    LeaveRequestResponse, PolicyResponse, ProfileUpdateRequest
)

router = APIRouter()

def get_employee(current_user: User) -> Employee:
    if not current_user.employee:
        raise HTTPException(status_code=403, detail="User is not associated with an employee profile.")
    return current_user.employee

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    current_year = datetime.now(timezone.utc).year
    
    # Calculate totals
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee.id,
        LeaveBalance.calendar_year == current_year
    ).all()
    
    total_eligible = sum([b.eligible for b in balances])
    total_used = sum([b.used for b in balances])
    total_available = sum([b.available for b in balances])
    
    # Count pending
    pending_count = db.query(func.count(LeaveRequest.id)).filter(
        LeaveRequest.employee_id == employee.id,
        LeaveRequest.status == "Pending"
    ).scalar() or 0
    
    manager_name = "None"
    if employee.manager:
        manager_name = f"{employee.manager.first_name} {employee.manager.last_name}"
        
    return DashboardSummaryResponse(
        employee_name=f"{employee.first_name} {employee.last_name}",
        employee_id=employee.employee_code,
        department=employee.department.department_name if employee.department else "None",
        manager=manager_name,
        joining_date=employee.joining_date,
        calendar_year=current_year,
        total_eligible_leave=total_eligible,
        used_leave=total_used,
        available_leave=total_available,
        pending_requests=pending_count,
        hr_eligibility_approved=employee.hr_eligibility_approved
    )

@router.get("/dashboard/balances", response_model=List[LeaveBalanceResponse])
def get_leave_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    current_year = datetime.now(timezone.utc).year
    
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee.id,
        LeaveBalance.calendar_year == current_year
    ).all()
    
    return [
        LeaveBalanceResponse(
            leave_type_id=b.leave_type_id,
            leave_type_name=b.leave_type.leave_name,
            eligible=b.eligible,
            used=b.used,
            pending=b.pending,
            available=b.available
        ) for b in balances
    ]

class LeaveCalculateRequest(BaseModel):
    start_date: date
    end_date: date
    half_day: bool = False

@router.post("/leave/calculate")
def calculate_leave(
    request: LeaveCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    days = LeaveCalculator.calculate_working_days(request.start_date, request.end_date, request.half_day)
    return {"days": days}

@router.post("/leave/apply", response_model=LeaveRequestResponse)
def apply_leave(
    request: LeaveApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    
    if not employee.hr_eligibility_approved:
        raise HTTPException(status_code=400, detail="Your leave eligibility must be reviewed and approved by HR before you can apply for leave.")
        
    if request.start_date > request.end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
        
    # Check overlapping
    overlap = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee.id,
        LeaveRequest.status.in_(["Pending", "Approved"]),
        LeaveRequest.start_date <= request.end_date,
        LeaveRequest.end_date >= request.start_date
    ).first()
    
    if overlap:
        raise HTTPException(status_code=400, detail="You already have an overlapping leave request.")
        
    # Calculate days
    days = LeaveCalculator.calculate_working_days(request.start_date, request.end_date, request.half_day)
    if days == 0:
        raise HTTPException(status_code=400, detail="The selected duration contains zero working days.")
        
    # Check balance
    current_year = datetime.now(timezone.utc).year
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee.id,
        LeaveBalance.leave_type_id == request.leave_type_id,
        LeaveBalance.calendar_year == current_year
    ).first()
    
    leave_type = db.query(LeaveType).filter(LeaveType.id == request.leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found.")
        
    sick_leave_days_used = None
    annual_leave_days_used = None
    annual_balance = None
    
    if not balance or balance.available < days:
        if "sick" in leave_type.leave_name.lower():
            if not request.use_annual_leave_fallback:
                raise HTTPException(status_code=400, detail={
                    "error": "INSUFFICIENT_SICK_LEAVE",
                    "message": "Insufficient Sick Leave Balance.",
                    "available": float(balance.available) if balance else 0.0,
                    "requested": float(days)
                })
            else:
                annual_leave_type = db.query(LeaveType).filter(LeaveType.leave_name.ilike("%Annual%")).first()
                if not annual_leave_type:
                    raise HTTPException(status_code=400, detail="Annual Leave type not found in the system.")
                
                annual_balance = db.query(LeaveBalance).filter(
                    LeaveBalance.employee_id == employee.id,
                    LeaveBalance.leave_type_id == annual_leave_type.id,
                    LeaveBalance.calendar_year == current_year
                ).first()
                
                available_sick = float(balance.available) if balance else 0.0
                remaining_days = float(days) - available_sick
                
                if not annual_balance or float(annual_balance.available) < remaining_days:
                    raise HTTPException(status_code=400, detail="Insufficient Annual Leave Balance to cover the remaining days.")
                
                sick_leave_days_used = available_sick
                annual_leave_days_used = remaining_days
        else:
            raise HTTPException(status_code=400, detail="Insufficient Leave Balance.")
        
    # Create request
    reference_code = f"LV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    
    try:
        leave_req = LeaveRequest(
            employee_id=employee.id,
            leave_type_id=request.leave_type_id,
            start_date=request.start_date,
            end_date=request.end_date,
            days=days,
            half_day=request.half_day,
            half_day_session=request.half_day_session,
            reason=request.reason,
            status="Pending" if employee.manager_id else "Awaiting HR",
            manager_id=employee.manager_id,
            reference_code=reference_code,
            applied_on=datetime.now(timezone.utc),
            submitted_at=datetime.now(timezone.utc),
            sick_leave_days=sick_leave_days_used,
            annual_leave_days=annual_leave_days_used
        )
        db.add(leave_req)
        
        # Block balance (move from available to pending)
        if sick_leave_days_used is not None and annual_leave_days_used is not None:
            if balance and sick_leave_days_used > 0:
                balance.available -= Decimal(str(sick_leave_days_used))
                balance.pending += Decimal(str(sick_leave_days_used))
            if annual_balance and annual_leave_days_used > 0:
                annual_balance.available -= Decimal(str(annual_leave_days_used))
                annual_balance.pending += Decimal(str(annual_leave_days_used))
        else:
            if balance:
                balance.available -= Decimal(str(days))
                balance.pending += Decimal(str(days))
        
        # Audit log
        audit_log = AuditLog(
            user_id=current_user.id,
            action="APPLY_LEAVE",
            role=employee.role.role_name if employee.role else "Employee",
            timestamp=datetime.now(timezone.utc),
            details=f"Applied for {days} days of leave. Reference: {reference_code}"
        )
        db.add(audit_log)
        
        db.commit()
        db.refresh(leave_req)
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database transaction failed during leave application: {str(e)}")
    
    manager_name = f"{leave_req.manager.first_name} {leave_req.manager.last_name}" if leave_req.manager else None
    
    return LeaveRequestResponse(
        id=leave_req.id,
        leave_type_name=leave_req.leave_type.leave_name,
        start_date=leave_req.start_date,
        end_date=leave_req.end_date,
        days=float(leave_req.days),
        status=leave_req.status,
        applied_on=leave_req.applied_on,
        reference_code=leave_req.reference_code,
        manager_name=manager_name,
        submitted_at=leave_req.submitted_at,
        sick_leave_days=float(leave_req.sick_leave_days) if leave_req.sick_leave_days is not None else None,
        annual_leave_days=float(leave_req.annual_leave_days) if leave_req.annual_leave_days is not None else None
    )

@router.post("/leave/{request_id}/withdraw")
def withdraw_leave(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    
    leave_req = db.query(LeaveRequest).filter(
        LeaveRequest.id == request_id,
        LeaveRequest.employee_id == employee.id
    ).first()
    
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    if leave_req.status not in ["Pending", "Approved"]:
        raise HTTPException(status_code=400, detail="Can only withdraw Pending or Approved requests.")
        
    # Prevent withdrawal if past start date (for MVP simplicity, we allow it if HR/Manager hasn't blocked it)
    if leave_req.start_date < datetime.now(timezone.utc).date():
         raise HTTPException(status_code=400, detail="Cannot withdraw leave that has already started.")
    
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee.id,
        LeaveBalance.leave_type_id == leave_req.leave_type_id,
        LeaveBalance.calendar_year == leave_req.applied_on.year
    ).first()
    
    if balance:
        if leave_req.status == "Pending":
            balance.pending -= leave_req.days
            balance.available += leave_req.days
        elif leave_req.status == "Approved":
            balance.used -= leave_req.days
            balance.available += leave_req.days
            
    leave_req.status = "Withdrawn"
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="WITHDRAW_LEAVE",
        role=employee.role.role_name if employee.role else "Employee",
        timestamp=datetime.now(timezone.utc),
        details=f"Withdrew leave request {leave_req.reference_code}"
    )
    db.add(audit_log)
    
    db.commit()
    return {"message": "Leave withdrawn successfully."}

@router.get("/leave/{request_id}/details")
def get_leave_details(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    
    leave_req = db.query(LeaveRequest).filter(
        LeaveRequest.id == request_id,
        LeaveRequest.employee_id == employee.id
    ).first()
    
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    logs = db.query(AuditLog).filter(
        AuditLog.details.like(f"%{leave_req.reference_code}%")
    ).order_by(AuditLog.timestamp.asc()).all()
    
    return {
        "request": {
            "id": leave_req.id,
            "leave_type_name": leave_req.leave_type.leave_name,
            "start_date": leave_req.start_date.isoformat(),
            "end_date": leave_req.end_date.isoformat(),
            "days": float(leave_req.days),
            "status": leave_req.status,
            "applied_on": leave_req.applied_on.isoformat(),
            "reason": leave_req.reason,
            "reference_code": leave_req.reference_code,
            "manager_comments": leave_req.manager_comments,
            "hr_comments": leave_req.hr_comments
        },
        "timeline": [
            {
                "action": log.action,
                "role": log.role,
                "timestamp": log.timestamp.isoformat(),
                "details": log.details
            } for log in logs
        ]
    }

@router.get("/leave/history", response_model=List[LeaveRequestResponse])
def get_leave_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    requests = db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee.id).order_by(LeaveRequest.applied_on.desc()).all()
    
    result = []
    for req in requests:
        manager_name = f"{req.manager.first_name} {req.manager.last_name}" if req.manager else None
        result.append(LeaveRequestResponse(
            id=req.id,
            leave_type_name=req.leave_type.leave_name,
            start_date=req.start_date,
            end_date=req.end_date,
            days=float(req.days),
            status=req.status,
            applied_on=req.applied_on,
            reference_code=req.reference_code,
            manager_name=manager_name
        ))
    return result

@router.get("/policies", response_model=List[PolicyResponse])
def list_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    policies = db.query(CompanyPolicy).filter(CompanyPolicy.is_active == True).all()
    
    result = []
    for p in policies:
        accepted = db.query(PolicyAcceptance).filter(
            PolicyAcceptance.policy_id == p.id,
            PolicyAcceptance.employee_id == employee.id
        ).first() is not None
        
        result.append(PolicyResponse(
            id=p.id,
            title=p.title,
            version=p.version,
            effective_date=p.effective_date,
            file_url=p.file_url,
            has_accepted=accepted
        ))
    return result

@router.post("/policies/{policy_id}/accept")
def accept_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    policy = db.query(CompanyPolicy).filter(CompanyPolicy.id == policy_id, CompanyPolicy.is_active == True).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found or inactive.")
        
    existing = db.query(PolicyAcceptance).filter(
        PolicyAcceptance.policy_id == policy_id,
        PolicyAcceptance.employee_id == employee.id
    ).first()
    
    if existing:
        return {"message": "Policy already accepted."}
        
    acceptance = PolicyAcceptance(
        employee_id=employee.id,
        policy_id=policy_id,
        accepted_at=datetime.now(timezone.utc)
    )
    db.add(acceptance)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="ACCEPT_POLICY",
        role=employee.role.role_name if employee.role else "Employee",
        timestamp=datetime.now(timezone.utc),
        details=f"Accepted policy {policy.title} v{policy.version}"
    )
    db.add(audit_log)
    
    db.commit()
    return {"message": "Policy accepted successfully."}

@router.patch("/profile")
def update_profile(
    profile_data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = get_employee(current_user)
    
    if profile_data.phone is not None:
        employee.phone = profile_data.phone
    if profile_data.address is not None:
        employee.address = profile_data.address
    if profile_data.emergency_contact is not None:
        employee.emergency_contact = profile_data.emergency_contact
    if profile_data.emergency_phone is not None:
        employee.emergency_phone = profile_data.emergency_phone
    if profile_data.profile_photo is not None:
        employee.profile_photo = profile_data.profile_photo
        
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE_PROFILE",
        role=employee.role.role_name if employee.role else "Employee",
        timestamp=datetime.now(timezone.utc),
        details="Updated profile information."
    )
    db.add(audit_log)
    
    db.commit()
    return {"message": "Profile updated successfully."}
