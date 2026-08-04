import uuid
import io
from datetime import datetime, timezone
from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.leave_balance import LeaveBalance
from app.models.leave_request import LeaveRequest
from app.models.audit_log import AuditLog
from app.security.rbac import get_current_manager
from app.services.leave_calculator import LeaveCalculator
from app.schemas.manager_dashboard import (
    ManagerDashboardSummary, TeamMemberResponse, LeaveActionRequest, ApplyOnBehalfRequest
)
from app.schemas.employee_dashboard import LeaveRequestResponse

router = APIRouter()

def get_manager_employee(current_user: User) -> Employee:
    if not current_user.employee:
        raise HTTPException(status_code=403, detail="User is not associated with an employee profile.")
    return current_user.employee

@router.get("/dashboard/summary", response_model=ManagerDashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    current_year = datetime.now(timezone.utc).year
    
    # Get team members
    team = db.query(Employee).filter(Employee.manager_id == manager.id).all()
    team_ids = [e.id for e in team]
    
    # Stats
    employees_on_leave = db.query(func.count(func.distinct(LeaveRequest.employee_id))).filter(
        LeaveRequest.employee_id.in_(team_ids),
        LeaveRequest.status == "Approved",
        LeaveRequest.start_date <= datetime.now(timezone.utc).date(),
        LeaveRequest.end_date >= datetime.now(timezone.utc).date()
    ).scalar() or 0
    
    pending_approvals = db.query(func.count(LeaveRequest.id)).filter(
        LeaveRequest.employee_id.in_(team_ids),
        LeaveRequest.status == "Pending"
    ).scalar() or 0
    
    upcoming_approved = db.query(func.count(LeaveRequest.id)).filter(
        LeaveRequest.employee_id.in_(team_ids),
        LeaveRequest.status == "Approved",
        LeaveRequest.start_date > datetime.now(timezone.utc).date()
    ).scalar() or 0
    
    # Team balances
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id.in_(team_ids),
        LeaveBalance.calendar_year == current_year
    ).all()
    
    total_eligible = sum([b.eligible for b in balances])
    total_used = sum([b.used for b in balances])
    total_available = sum([b.available for b in balances])
    
    return ManagerDashboardSummary(
        manager_name=f"{manager.first_name} {manager.last_name}",
        employee_id=manager.employee_code,
        department=manager.department.department_name if manager.department else "None",
        team_size=len(team),
        calendar_year=current_year,
        employees_on_leave_today=employees_on_leave,
        pending_approvals=pending_approvals,
        upcoming_approved_leave=upcoming_approved,
        team_eligible_leave=total_eligible,
        team_used_leave=total_used,
        team_available_leave=total_available
    )

@router.get("/team", response_model=List[TeamMemberResponse])
def get_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    current_year = datetime.now(timezone.utc).year
    
    team = db.query(Employee).filter(Employee.manager_id == manager.id).all()
    
    result = []
    for member in team:
        balances = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == member.id,
            LeaveBalance.calendar_year == current_year
        ).all()
        
        # Check current status
        on_leave = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == member.id,
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date <= datetime.now(timezone.utc).date(),
            LeaveRequest.end_date >= datetime.now(timezone.utc).date()
        ).first()
        
        status = "On Leave" if on_leave else "Active"
        
        result.append(TeamMemberResponse(
            id=member.id,
            employee_name=f"{member.first_name} {member.last_name}",
            employee_code=member.employee_code,
            department=member.department.department_name if member.department else "None",
            role=member.role.role_name if member.role else "Employee",
            joining_date=member.joining_date,
            eligible_leave=sum([b.eligible for b in balances]),
            used_leave=sum([b.used for b in balances]),
            available_leave=sum([b.available for b in balances]),
            pending_leave=sum([b.pending for b in balances]),
            current_status=status
        ))
        
    return result

@router.get("/approvals/queue", response_model=List[LeaveRequestResponse])
def get_approval_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    
    # Get team member IDs
    team = db.query(Employee).filter(Employee.manager_id == manager.id).all()
    team_ids = [e.id for e in team]
    
    requests = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id.in_(team_ids),
        LeaveRequest.status == "Pending"
    ).order_by(LeaveRequest.applied_on.desc()).all()
    
    result = []
    for req in requests:
        result.append(LeaveRequestResponse(
            id=req.id,
            employee_name=f"{req.employee.first_name} {req.employee.last_name}",
            department_name=req.employee.department.department_name if req.employee.department else "None",
            reason=req.reason,
            leave_type_name=req.leave_type.leave_name,
            start_date=req.start_date,
            end_date=req.end_date,
            days=float(req.days),
            status=req.status,
            applied_on=req.applied_on,
            reference_code=req.reference_code,
            manager_name=f"{manager.first_name} {manager.last_name}",
            manager_comments=req.manager_comments,
            hr_comments=req.hr_comments
        ))
    return result

@router.get("/dashboard/upcoming-leaves", response_model=List[LeaveRequestResponse])
def get_upcoming_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    team = db.query(Employee).filter(Employee.manager_id == manager.id).all()
    team_ids = [e.id for e in team]
    
    requests = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id.in_(team_ids),
        LeaveRequest.status == "Approved",
        LeaveRequest.start_date >= datetime.now(timezone.utc).date()
    ).order_by(LeaveRequest.start_date.asc()).limit(5).all()
    
    result = []
    for req in requests:
        result.append(LeaveRequestResponse(
            id=req.id,
            employee_name=f"{req.employee.first_name} {req.employee.last_name}",
            department_name=req.employee.department.department_name if req.employee.department else "None",
            reason=req.reason,
            leave_type_name=req.leave_type.leave_name,
            start_date=req.start_date,
            end_date=req.end_date,
            days=float(req.days),
            status=req.status,
            applied_on=req.applied_on,
            reference_code=req.reference_code,
            manager_name=f"{manager.first_name} {manager.last_name}",
            manager_comments=req.manager_comments,
            hr_comments=req.hr_comments
        ))
    return result

@router.get("/approvals/calendar.ics")
def get_manager_leave_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    team = db.query(Employee).filter(Employee.manager_id == manager.id).all()
    team_ids = [e.id for e in team]
    
    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id.in_(team_ids),
        LeaveRequest.status == "Approved"
    ).all()
    
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Leave Management System//Manager Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]
    
    for req in approved_leaves:
        start_date = req.start_date.strftime("%Y%m%d")
        from datetime import timedelta
        end_date = (req.end_date + timedelta(days=1)).strftime("%Y%m%d")
        
        lines.extend([
            "BEGIN:VEVENT",
            f"SUMMARY:{req.employee.first_name} {req.employee.last_name} - {req.leave_type.leave_name}",
            f"DTSTART;VALUE=DATE:{start_date}",
            f"DTEND;VALUE=DATE:{end_date}",
            f"DESCRIPTION:Employee: {req.employee.first_name} {req.employee.last_name}\\nLeave Type: {req.leave_type.leave_name}\\nReference: {req.reference_code}\\nReason: {req.reason}\\nStatus: {req.status}",
            "LOCATION:Out of Office",
            "ORGANIZER;CN=\"Manager\":mailto:manager@example.com",
            "STATUS:CONFIRMED",
            f"UID:{req.reference_code}@leavemanagement",
            "END:VEVENT"
        ])
        
    lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(lines)
    
    output = io.StringIO()
    output.write(ics_content)
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=team_leave_calendar.ics"}
    )

@router.get("/approvals/{request_id}/details")
def get_leave_details(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    # Verify hierarchy
    if leave_req.employee.manager_id != manager.id:
        raise HTTPException(status_code=403, detail="Not authorized to view leave for this employee.")
        
    # Get audit logs
    logs = db.query(AuditLog).filter(
        AuditLog.details.like(f"%{leave_req.reference_code}%")
    ).order_by(AuditLog.timestamp.asc()).all()
    
    # Get employee balances
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == leave_req.employee_id,
        LeaveBalance.calendar_year == leave_req.applied_on.year
    ).all()
    
    # Check overlaps
    overlaps = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == leave_req.employee_id,
        LeaveRequest.id != leave_req.id,
        LeaveRequest.status.in_(["Approved", "Pending", "Awaiting HR"]),
        LeaveRequest.start_date <= leave_req.end_date,
        LeaveRequest.end_date >= leave_req.start_date
    ).all()
    
    return {
        "request": {
            "id": leave_req.id,
            "employee_name": f"{leave_req.employee.first_name} {leave_req.employee.last_name}",
            "department_name": leave_req.employee.department.department_name if leave_req.employee.department else "None",
            "leave_type_name": leave_req.leave_type.leave_name,
            "start_date": leave_req.start_date.isoformat(),
            "end_date": leave_req.end_date.isoformat(),
            "days": float(leave_req.days),
            "status": leave_req.status,
            "applied_on": leave_req.applied_on.isoformat(),
            "reason": leave_req.reason,
            "reference_code": leave_req.reference_code
        },
        "timeline": [
            {
                "action": log.action,
                "role": log.role,
                "timestamp": log.timestamp.isoformat(),
                "details": log.details
            } for log in logs
        ],
        "balances": [
            {
                "leave_type": b.leave_type.leave_name,
                "available": float(b.available)
            } for b in balances
        ],
        "overlaps": [
            {
                "id": o.id,
                "start_date": o.start_date.isoformat(),
                "end_date": o.end_date.isoformat(),
                "status": o.status
            } for o in overlaps
        ]
    }

@router.post("/approvals/{request_id}/approve")
def approve_leave(
    request_id: int,
    payload: LeaveActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    # Verify hierarchy
    if leave_req.employee.manager_id != manager.id:
        raise HTTPException(status_code=403, detail="Not authorized to approve leave for this employee.")
        
    if leave_req.status != "Pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be approved by manager.")
        
    # Move balance
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == leave_req.employee_id,
        LeaveBalance.leave_type_id == leave_req.leave_type_id,
        LeaveBalance.calendar_year == leave_req.applied_on.year
    ).first()
    
    if balance:
        balance.pending -= leave_req.days
        balance.used += leave_req.days
        
    leave_req.status = "Approved"
    leave_req.manager_comments = payload.reason_comments
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="APPROVE_LEAVE",
        role=manager.role.role_name if manager.role else "Manager",
        timestamp=datetime.now(timezone.utc),
        details=f"Approved leave {leave_req.reference_code} for {leave_req.employee.employee_code}"
    )
    db.add(audit_log)
    db.commit()
    return {"message": "Leave approved successfully."}

@router.post("/approvals/{request_id}/reject")
def reject_leave(
    request_id: int,
    payload: LeaveActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    if leave_req.employee.manager_id != manager.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    if leave_req.status not in ["Pending", "Awaiting HR"]:
        raise HTTPException(status_code=400, detail="Request cannot be rejected from this state.")
        
    if not payload.reason_comments or not payload.reason_comments.strip():
        raise HTTPException(status_code=400, detail="Comments are mandatory for rejecting a leave request.")
        
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == leave_req.employee_id,
        LeaveBalance.leave_type_id == leave_req.leave_type_id,
        LeaveBalance.calendar_year == leave_req.applied_on.year
    ).first()
    
    if balance:
        balance.pending -= leave_req.days
        balance.available += leave_req.days
        
    leave_req.status = "Rejected"
    leave_req.manager_comments = payload.reason_comments
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="REJECT_LEAVE",
        role=manager.role.role_name if manager.role else "Manager",
        timestamp=datetime.now(timezone.utc),
        details=f"Rejected leave {leave_req.reference_code}"
    )
    db.add(audit_log)
    db.commit()
    return {"message": "Leave rejected successfully."}

@router.post("/approvals/{request_id}/send-to-hr")
def send_to_hr(
    request_id: int,
    payload: LeaveActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req or leave_req.employee.manager_id != manager.id:
        raise HTTPException(status_code=404, detail="Request not found or not authorized.")
        
    if leave_req.status != "Pending":
        raise HTTPException(status_code=400, detail="Only Pending requests can be sent to HR.")
        
    if not payload.reason_comments or not payload.reason_comments.strip():
        raise HTTPException(status_code=400, detail="Comments are mandatory for forwarding a leave request to HR.")
        
    leave_req.status = "Awaiting HR"
    leave_req.manager_comments = payload.reason_comments
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="FORWARD_LEAVE_TO_HR",
        role=manager.role.role_name if manager.role else "Manager",
        timestamp=datetime.now(timezone.utc),
        details=f"Forwarded leave {leave_req.reference_code} to HR"
    )
    db.add(audit_log)
    db.commit()
    return {"message": "Request forwarded to HR."}

@router.post("/apply-on-behalf", response_model=LeaveRequestResponse)
def apply_on_behalf(
    request: ApplyOnBehalfRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    manager = get_manager_employee(current_user)
    
    target_emp = db.query(Employee).filter(Employee.id == request.employee_id).first()
    if not target_emp or target_emp.manager_id != manager.id:
        raise HTTPException(status_code=403, detail="Not authorized to apply for this employee.")
        
    if not target_emp.hr_eligibility_approved:
        raise HTTPException(status_code=400, detail="Employee leave eligibility is pending HR review.")
        
    days = LeaveCalculator.calculate_working_days(request.start_date, request.end_date, request.half_day)
    if days == 0:
        raise HTTPException(status_code=400, detail="Zero working days.")
        
    current_year = datetime.now(timezone.utc).year
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == target_emp.id,
        LeaveBalance.leave_type_id == request.leave_type_id,
        LeaveBalance.calendar_year == current_year
    ).first()
    
    if not balance or balance.available < days:
        raise HTTPException(status_code=400, detail="Insufficient Leave Balance.")
        
    reference_code = f"LVM-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    
    leave_req = LeaveRequest(
        employee_id=target_emp.id,
        leave_type_id=request.leave_type_id,
        start_date=request.start_date,
        end_date=request.end_date,
        days=days,
        half_day=request.half_day,
        half_day_session=request.half_day_session,
        reason=request.reason,
        status="Approved", # Manager applying directly, defaults to Approved
        manager_id=manager.id,
        reference_code=reference_code,
        applied_on=datetime.now(timezone.utc),
        submitted_on_behalf=True,
        submitted_by_id=manager.id
    )
    db.add(leave_req)
    # Update balance
    balance.available -= Decimal(str(days))
    balance.used += Decimal(str(days))
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="APPLY_ON_BEHALF",
        role=manager.role.role_name if manager.role else "Manager",
        timestamp=datetime.now(timezone.utc),
        details=f"Applied {days} days leave for {target_emp.employee_code}. Ref: {reference_code}"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(leave_req)
    
    return LeaveRequestResponse(
        id=leave_req.id,
        leave_type_name=leave_req.leave_type.leave_name,
        start_date=leave_req.start_date,
        end_date=leave_req.end_date,
        days=float(leave_req.days),
        status=leave_req.status,
        applied_on=leave_req.applied_on,
        reference_code=leave_req.reference_code,
        manager_name=f"{manager.first_name} {manager.last_name}"
    )
