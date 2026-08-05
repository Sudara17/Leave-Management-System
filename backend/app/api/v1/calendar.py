from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ics import Calendar, Event

from app.database.session import get_db
from app.models.leave_request import LeaveRequest
from app.models.employee import Employee
from app.models.leave_type import LeaveType
from app.models.audit_log import AuditLog
from app.models.department import Department
from app.schemas.employee_dashboard import LeaveRequestResponse
from app.api.deps import get_current_user
from datetime import datetime, timezone, date
from typing import List

router = APIRouter()

@router.get("/employee", response_model=List[LeaveRequestResponse], summary="Get employee calendar events")
def get_employee_calendar(
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    employee = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    query = db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee.id)
    if start_date:
        query = query.filter(LeaveRequest.end_date >= start_date)
    if end_date:
        query = query.filter(LeaveRequest.start_date <= end_date)
        
    requests = query.all()
    
    # Format response
    response = []
    for req in requests:
        leave_type = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
        manager = db.query(Employee).filter(Employee.id == req.manager_id).first()
        
        response.append({
            "id": req.id,
            "employee_name": f"{employee.first_name or ''} {employee.last_name or ''}".strip(),
            "leave_type_name": leave_type.leave_name if leave_type else "Unknown",
            "start_date": req.start_date,
            "end_date": req.end_date,
            "days": float(req.days),
            "status": req.status,
            "applied_on": req.applied_on,
            "reference_code": req.reference_code,
            "manager_name": f"{manager.first_name or ''} {manager.last_name or ''}".strip() if manager else None,
            "reason": req.reason,
            "submitted_at": req.submitted_at,
            "sick_leave_days": float(req.sick_leave_days) if req.sick_leave_days else 0,
            "annual_leave_days": float(req.annual_leave_days) if req.annual_leave_days else 0,
            "lwp_days": float(req.lwp_days) if req.lwp_days else 0,
            "calendar_synced": req.calendar_synced,
            "google_calendar_event_id": req.google_calendar_event_id,
            "outlook_calendar_event_id": req.outlook_calendar_event_id
        })
    return response

@router.get("/manager", response_model=List[LeaveRequestResponse], summary="Get manager team calendar events")
def get_manager_calendar(
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    manager = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
        
    query = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.id).filter(
        Employee.manager_id == manager.id
    )
    if start_date:
        query = query.filter(LeaveRequest.end_date >= start_date)
    if end_date:
        query = query.filter(LeaveRequest.start_date <= end_date)
        
    requests = query.all()
    
    response = []
    for req in requests:
        emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
        leave_type = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
        
        response.append({
            "id": req.id,
            "employee_name": f"{emp.first_name or ''} {emp.last_name or ''}".strip() if emp else "Unknown",
            "leave_type_name": leave_type.leave_name if leave_type else "Unknown",
            "start_date": req.start_date,
            "end_date": req.end_date,
            "days": float(req.days),
            "status": req.status,
            "applied_on": req.applied_on,
            "reference_code": req.reference_code,
            "manager_name": f"{manager.first_name or ''} {manager.last_name or ''}".strip(),
            "reason": req.reason,
            "submitted_at": req.submitted_at,
            "sick_leave_days": float(req.sick_leave_days) if req.sick_leave_days else 0,
            "annual_leave_days": float(req.annual_leave_days) if req.annual_leave_days else 0,
            "lwp_days": float(req.lwp_days) if req.lwp_days else 0,
            "calendar_synced": req.calendar_synced,
            "google_calendar_event_id": req.google_calendar_event_id,
            "outlook_calendar_event_id": req.outlook_calendar_event_id
        })
    return response

@router.get("/hr", response_model=List[LeaveRequestResponse], summary="Get HR organization calendar events")
def get_hr_calendar(
    start_date: date = None,
    end_date: date = None,
    department_id: int = None,
    employee_id: int = None,
    manager_id: int = None,
    leave_type_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.id)
    
    if start_date:
        query = query.filter(LeaveRequest.end_date >= start_date)
    if end_date:
        query = query.filter(LeaveRequest.start_date <= end_date)
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if manager_id:
        query = query.filter(Employee.manager_id == manager_id)
    if leave_type_id:
        query = query.filter(LeaveRequest.leave_type_id == leave_type_id)
    if status:
        query = query.filter(LeaveRequest.status == status)
        
    requests = query.all()
    
    response = []
    for req in requests:
        emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
        leave_type = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
        mgr = db.query(Employee).filter(Employee.id == emp.manager_id).first() if emp and emp.manager_id else None
        dept = db.query(Department).filter(Department.id == emp.department_id).first() if emp else None
        
        response.append({
            "id": req.id,
            "employee_name": f"{emp.first_name or ''} {emp.last_name or ''}".strip() if emp else "Unknown",
            "department_name": dept.department_name if dept else None,
            "leave_type_name": leave_type.leave_name if leave_type else "Unknown",
            "start_date": req.start_date,
            "end_date": req.end_date,
            "days": float(req.days),
            "status": req.status,
            "applied_on": req.applied_on,
            "reference_code": req.reference_code,
            "manager_name": f"{mgr.first_name or ''} {mgr.last_name or ''}".strip() if mgr else None,
            "reason": req.reason,
            "submitted_at": req.submitted_at,
            "sick_leave_days": float(req.sick_leave_days) if req.sick_leave_days else 0,
            "annual_leave_days": float(req.annual_leave_days) if req.annual_leave_days else 0,
            "lwp_days": float(req.lwp_days) if req.lwp_days else 0,
            "calendar_synced": req.calendar_synced,
            "google_calendar_event_id": req.google_calendar_event_id,
            "outlook_calendar_event_id": req.outlook_calendar_event_id
        })
    return response

@router.get("/download-ics/{request_id}", summary="Download ICS file for a leave request")
def download_ics(request_id: int, db: Session = Depends(get_db)):
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    employee = db.query(Employee).filter(Employee.id == leave_req.employee_id).first()
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_req.leave_type_id).first()
    
    if not employee or not leave_type:
        raise HTTPException(status_code=404, detail="Required data missing")
        
    # Mark as generated in DB
    if not leave_req.ics_generated:
        leave_req.ics_generated = True
        
        # Add audit log for ICS generation
        audit_log = AuditLog(
            action="Calendar Exported",
            entity_type="leave_requests",
            entity_id=str(leave_req.id),
            performed_by_id=leave_req.employee_id,  # Assume the employee is downloading
            details="ICS file downloaded for leave request",
            created_at=datetime.now(timezone.utc)
        )
        db.add(audit_log)
        db.commit()

    # Create the ICS calendar
    c = Calendar()
    e = Event()
    
    # Event details
    status_text = leave_req.status
    if status_text == 'Pending':
        status_text = 'Pending Approval'
        
    e.name = f"{leave_type.name} ({status_text})"
    
    # We use start_date and end_date. For all-day events, we just set begin and end dates.
    from datetime import timedelta
    e.begin = leave_req.start_date
    e.end = leave_req.end_date + timedelta(days=1)
    e.make_all_day()
    
    e.description = (
        f"Employee: {employee.first_name} {employee.last_name}\n"
        f"Leave Type: {leave_type.name}\n"
        f"Status: {leave_req.status}\n"
        f"Days: {leave_req.days}\n"
        f"Reason: {leave_req.reason}"
    )
    
    c.events.add(e)
    
    ics_content = c.serialize()
    
    # Return as an ICS file download
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="leave_{leave_req.reference_code}.ics"'
        }
    )
