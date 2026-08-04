from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.leave_type import LeaveType
from app.models.leave_balance import LeaveBalance
from app.models.audit_log import AuditLog
from app.security.rbac import get_current_hr
from app.services.notification_service import NotificationService

router = APIRouter()

@router.post("/{employee_id}/approve")
def approve_eligibility(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
) -> Any:
    """
    Approves an employee's HR eligibility and generates their initial prorated leave balances.
    """
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    if employee.hr_eligibility_approved:
        raise HTTPException(status_code=400, detail="Employee eligibility is already approved.")
        
    employee.hr_eligibility_approved = True
    
    current_year = datetime.now(timezone.utc).year
    
    # Calculate proration based on joining month
    # If joined in July (month 7), they get 6 months worth of leave
    joining_month = employee.joining_date.month if employee.joining_date else 1
    months_remaining = 12 - joining_month + 1
    proration_factor = months_remaining / 12.0
    
    leave_types = db.query(LeaveType).all()
    for lt in leave_types:
        # standard entitlement could be e.g., 20 days
        standard_days = 20.0
        if lt.leave_name == "Sick Leave":
            standard_days = 10.0
            
        prorated_days = round(standard_days * proration_factor * 2) / 2 # round to nearest 0.5
        
        balance = LeaveBalance(
            employee_id=employee.id,
            leave_type_id=lt.id,
            calendar_year=current_year,
            eligible=prorated_days,
            used=0.0,
            available=prorated_days,
            pending=0.0
        )
        db.add(balance)
        
    audit_log = AuditLog(
        user_id=current_user.id,
        action="APPROVE_ELIGIBILITY",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Approved HR eligibility for {employee.employee_code} and generated prorated leave balances."
    )
    db.add(audit_log)
    
    db.commit()
    
    # Notification could be triggered here
    if employee.user:
        NotificationService.send_notification(
            db,
            employee.user.id,
            "Eligibility Approved",
            "Your HR onboarding and leave eligibility has been approved. You can now apply for leave.",
            "ELIGIBILITY_APPROVED"
        )
        
    return {"message": "Employee eligibility approved successfully."}
