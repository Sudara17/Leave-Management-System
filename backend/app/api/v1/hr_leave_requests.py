from datetime import datetime, timezone
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.leave_balance import LeaveBalance
from app.models.leave_request import LeaveRequest
from app.models.leave_type import LeaveType
from app.models.audit_log import AuditLog
from app.security.rbac import get_current_hr
from app.schemas.employee_dashboard import LeaveRequestResponse
from app.schemas.hr_operations import HRLeaveActionRequest
from app.services.notification_service import NotificationService

router = APIRouter()

@router.get("/", response_model=List[LeaveRequestResponse])
def get_all_leave_requests(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    department_id: Optional[int] = None,
    leave_type_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_hr)
):
    query = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.id)
    
    if status:
        query = query.filter(LeaveRequest.status == status)
    else:
        query = query.filter(LeaveRequest.status.notin_(["Pending", "Withdrawn"]))
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if leave_type_id:
        query = query.filter(LeaveRequest.leave_type_id == leave_type_id)
    if start_date:
        query = query.filter(LeaveRequest.start_date >= datetime.strptime(start_date, "%Y-%m-%d").date())
    if end_date:
        query = query.filter(LeaveRequest.end_date <= datetime.strptime(end_date, "%Y-%m-%d").date())
        
    if search:
        search_filter = f"%{search}%"
        query = query.join(LeaveRequest.leave_type).filter(
            or_(
                Employee.first_name.ilike(search_filter),
                Employee.last_name.ilike(search_filter),
                LeaveRequest.leave_type.has(LeaveType.leave_name.ilike(search_filter))
            )
        )
        
    requests = query.order_by(LeaveRequest.applied_on.desc()).offset(skip).limit(limit).all()
    
    result = []
    for req in requests:
        manager_name = f"{req.manager.first_name or ''} {req.manager.last_name or ''}".strip() if req.manager else "None"
        employee_name = f"{req.employee.first_name or ''} {req.employee.last_name or ''}".strip()
        hr_name = f"{req.hr.first_name or ''} {req.hr.last_name or ''}".strip() if req.hr else None
        
        result.append(LeaveRequestResponse(
            id=req.id,
            employee_name=employee_name,
            leave_type_name=req.leave_type.leave_name,
            start_date=req.start_date,
            end_date=req.end_date,
            days=float(req.days),
            status=req.status,
            applied_on=req.applied_on,
            reference_code=req.reference_code,
            manager_name=manager_name,
            department_name=req.employee.department.department_name if req.employee.department else None,
            reason=req.reason,
            manager_decision_date=req.manager_decision_date if hasattr(req, 'manager_decision_date') else None,
            manager_comments=req.manager_comments,
            hr_name=hr_name,
            hr_decision_date=req.hr_decision_date if hasattr(req, 'hr_decision_date') else None,
            hr_comments=req.hr_comments
        ))
    return result

@router.get("/escalated", response_model=List[LeaveRequestResponse])
def get_escalated_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    requests = db.query(LeaveRequest).filter(
        LeaveRequest.status == "Awaiting HR"
    ).order_by(LeaveRequest.applied_on.desc()).all()
    
    result = []
    for req in requests:
        manager_name = f"{req.manager.first_name or ''} {req.manager.last_name or ''}".strip() if req.manager else "None"
        employee_name = f"{req.employee.first_name or ''} {req.employee.last_name or ''}".strip()
        hr_name = f"{req.hr.first_name or ''} {req.hr.last_name or ''}".strip() if req.hr else None
        
        result.append(LeaveRequestResponse(
            id=req.id,
            employee_name=employee_name,
            leave_type_name=req.leave_type.leave_name,
            start_date=req.start_date,
            end_date=req.end_date,
            days=float(req.days),
            status=req.status,
            applied_on=req.applied_on,
            reference_code=req.reference_code,
            manager_name=manager_name,
            department_name=req.employee.department.department_name if req.employee.department else None,
            reason=req.reason,
            manager_decision_date=req.manager_decision_date if hasattr(req, 'manager_decision_date') else None,
            manager_comments=req.manager_comments,
            hr_name=hr_name,
            hr_decision_date=req.hr_decision_date if hasattr(req, 'hr_decision_date') else None,
            hr_comments=req.hr_comments
        ))
    return result

@router.post("/{request_id}/approve")
def approve_escalated_leave(
    request_id: int,
    payload: HRLeaveActionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    if leave_req.status != "Awaiting HR":
        raise HTTPException(status_code=400, detail="Only requests 'Awaiting HR' can be approved here.")
        
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == leave_req.employee_id,
        LeaveBalance.leave_type_id == leave_req.leave_type_id,
        LeaveBalance.calendar_year == leave_req.applied_on.year
    ).first()
    
    try:
        if leave_req.sick_leave_days is not None or leave_req.annual_leave_days is not None or leave_req.lwp_days is not None:
            sick_bal = db.query(LeaveBalance).join(LeaveType).filter(
                LeaveBalance.employee_id == leave_req.employee_id,
                LeaveBalance.calendar_year == leave_req.applied_on.year,
                LeaveType.leave_name.ilike("%Sick%")
            ).first()
            
            annual_balance = db.query(LeaveBalance).join(LeaveType).filter(
                LeaveBalance.employee_id == leave_req.employee_id,
                LeaveBalance.calendar_year == leave_req.applied_on.year,
                LeaveType.leave_name.ilike("%Annual%")
            ).first()
            
            if sick_bal and leave_req.sick_leave_days is not None and leave_req.sick_leave_days > 0:
                sick_bal.pending = max(Decimal('0'), sick_bal.pending - Decimal(str(leave_req.sick_leave_days)))
                sick_bal.used += Decimal(str(leave_req.sick_leave_days))
                
            if annual_balance and leave_req.annual_leave_days is not None and leave_req.annual_leave_days > 0:
                annual_balance.pending = max(Decimal('0'), annual_balance.pending - Decimal(str(leave_req.annual_leave_days)))
                annual_balance.used += Decimal(str(leave_req.annual_leave_days))
        else:
            if balance:
                balance.pending = max(Decimal('0'), balance.pending - Decimal(str(leave_req.days)))
                balance.used += Decimal(str(leave_req.days))
            
        leave_req.status = "Approved"
        leave_req.hr_id = current_user.employee.id if current_user.employee else None
        leave_req.hr_comments = payload.hr_comments
        
        audit_log = AuditLog(
            user_id=current_user.id,
            action="HR_APPROVE_LEAVE",
            role="HR",
            timestamp=datetime.now(timezone.utc),
            details=f"HR Approved leave {leave_req.reference_code}"
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database transaction failed during approval.")
    
    background_tasks.add_task(
        NotificationService.send_notification,
        db,
        leave_req.employee.user.id,
        "Leave Approved",
        f"Your leave request {leave_req.reference_code} has been approved by HR.",
        "LEAVE_APPROVED"
    )
    
    return {"message": "Leave approved successfully by HR."}

@router.post("/{request_id}/reject")
def reject_escalated_leave(
    request_id: int,
    payload: HRLeaveActionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    if not payload.hr_comments:
        raise HTTPException(status_code=400, detail="Rejection reason is mandatory.")
        
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    if leave_req.status != "Awaiting HR":
        raise HTTPException(status_code=400, detail="Request cannot be rejected from this state.")
        
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == leave_req.employee_id,
        LeaveBalance.leave_type_id == leave_req.leave_type_id,
        LeaveBalance.calendar_year == leave_req.applied_on.year
    ).first()
    
    try:
        if leave_req.sick_leave_days is not None or leave_req.annual_leave_days is not None or leave_req.lwp_days is not None:
            sick_bal = db.query(LeaveBalance).join(LeaveType).filter(
                LeaveBalance.employee_id == leave_req.employee_id,
                LeaveBalance.calendar_year == leave_req.applied_on.year,
                LeaveType.leave_name.ilike("%Sick%")
            ).first()
            
            annual_balance = db.query(LeaveBalance).join(LeaveType).filter(
                LeaveBalance.employee_id == leave_req.employee_id,
                LeaveBalance.calendar_year == leave_req.applied_on.year,
                LeaveType.leave_name.ilike("%Annual%")
            ).first()
            
            if sick_bal and leave_req.sick_leave_days is not None and leave_req.sick_leave_days > 0:
                sick_bal.pending = max(Decimal('0'), sick_bal.pending - Decimal(str(leave_req.sick_leave_days)))
                sick_bal.available += Decimal(str(leave_req.sick_leave_days))
                
            if annual_balance and leave_req.annual_leave_days is not None and leave_req.annual_leave_days > 0:
                annual_balance.pending = max(Decimal('0'), annual_balance.pending - Decimal(str(leave_req.annual_leave_days)))
                annual_balance.available += Decimal(str(leave_req.annual_leave_days))
        else:
            if balance:
                balance.pending = max(Decimal('0'), balance.pending - Decimal(str(leave_req.days)))
                balance.available += Decimal(str(leave_req.days))
            
        leave_req.status = "Rejected"
        leave_req.hr_id = current_user.employee.id if current_user.employee else None
        leave_req.hr_comments = payload.hr_comments
        
        audit_log = AuditLog(
            user_id=current_user.id,
            action="HR_REJECT_LEAVE",
            role="HR",
            timestamp=datetime.now(timezone.utc),
            details=f"HR Rejected leave {leave_req.reference_code}. Reason: {payload.hr_comments}"
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database transaction failed during rejection.")
    
    background_tasks.add_task(
        NotificationService.send_notification,
        db,
        leave_req.employee.user.id,
        "Leave Rejected",
        f"Your leave request {leave_req.reference_code} has been rejected by HR. Reason: {payload.hr_comments}",
        "LEAVE_REJECTED"
    )
    
    return {"message": "Leave rejected successfully by HR."}

from fastapi.responses import StreamingResponse
import io

@router.get("/calendar.ics")
def get_leave_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    # Fetch all approved leaves
    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.status == "Approved"
    ).all()
    
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Enterprise HRMS//Leave Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]
    
    for req in approved_leaves:
        start_date = req.start_date.strftime("%Y%m%d")
        # iCal end date is exclusive, so add 1 day
        from datetime import timedelta
        end_date = (req.end_date + timedelta(days=1)).strftime("%Y%m%d")
        
        lines.extend([
            "BEGIN:VEVENT",
            f"SUMMARY:{req.employee.first_name} {req.employee.last_name} - {req.leave_type.leave_name}",
            f"DTSTART;VALUE=DATE:{start_date}",
            f"DTEND;VALUE=DATE:{end_date}",
            f"DESCRIPTION:Employee: {req.employee.first_name} {req.employee.last_name}\\nLeave Type: {req.leave_type.leave_name}\\nReference: {req.reference_code}\\nReason: {req.reason}\\nStatus: {req.status}",
            "LOCATION:Out of Office",
            "ORGANIZER;CN=\"HR Department\":mailto:hr@enterprisehrms.com",
            "STATUS:CONFIRMED",
            f"UID:{req.reference_code}@enterprisehrms",
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
        headers={"Content-Disposition": "attachment; filename=leave_calendar.ics"}
    )
