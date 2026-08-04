from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.leave_balance import LeaveBalance
from app.models.leave_request import LeaveRequest
from app.models.invitation import Invitation
from app.models.company_policy import CompanyPolicy
from app.models.policy_acceptance import PolicyAcceptance
from app.models.audit_log import AuditLog
from app.security.rbac import get_current_hr
from app.schemas.hr_dashboard import HRDashboardSummary, RecentActivityResponse, HRDashboardCharts

router = APIRouter()

@router.get("/dashboard/summary", response_model=HRDashboardSummary)
def get_hr_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    current_year = datetime.now(timezone.utc).year
    
    total_employees = db.query(func.count(Employee.id)).scalar() or 0
    active_employees = db.query(func.count(Employee.id)).filter(Employee.employment_status == "Active").scalar() or 0
    inactive_employees = db.query(func.count(Employee.id)).filter(Employee.employment_status != "Active").scalar() or 0
    
    employees_on_leave = db.query(func.count(func.distinct(LeaveRequest.employee_id))).filter(
        LeaveRequest.status == "Approved",
        LeaveRequest.start_date <= datetime.now(timezone.utc).date(),
        LeaveRequest.end_date >= datetime.now(timezone.utc).date()
    ).scalar() or 0
    
    pending_invitations = db.query(func.count(Invitation.id)).filter(Invitation.status == "Pending").scalar() or 0
    pending_eligibility_reviews = db.query(func.count(Employee.id)).filter(Employee.hr_eligibility_approved == False).scalar() or 0
    pending_hr_approvals = db.query(func.count(LeaveRequest.id)).filter(LeaveRequest.status == "Awaiting HR").scalar() or 0
    
    # Calculate policy acceptance percentage
    active_policies_count = db.query(func.count(CompanyPolicy.id)).filter(CompanyPolicy.is_active == True).scalar() or 0
    if active_policies_count > 0 and total_employees > 0:
        total_possible_acceptances = active_policies_count * total_employees
        actual_acceptances = db.query(func.count(PolicyAcceptance.id)).scalar() or 0
        policy_acceptance_percentage = (actual_acceptances / total_possible_acceptances) * 100
    else:
        policy_acceptance_percentage = 0.0
        
    # Company leave stats
    balances = db.query(LeaveBalance).filter(LeaveBalance.calendar_year == current_year).all()
    total_company_leave = sum([b.eligible for b in balances])
    used_leave = sum([b.used for b in balances])
    available_leave = sum([b.available for b in balances])
    
    return HRDashboardSummary(
        total_employees=total_employees,
        active_employees=active_employees,
        inactive_employees=inactive_employees,
        employees_on_leave=employees_on_leave,
        pending_invitations=pending_invitations,
        pending_eligibility_reviews=pending_eligibility_reviews,
        pending_hr_approvals=pending_hr_approvals,
        policy_acceptance_percentage=round(policy_acceptance_percentage, 2),
        total_company_leave=total_company_leave,
        used_leave=used_leave,
        available_leave=available_leave
    )

@router.get("/dashboard/recent-activity", response_model=List[RecentActivityResponse])
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    # Fetch top 50 recent audit logs
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()
    
    result = []
    for log in logs:
        who = "System"
        if log.user:
            if log.user.employee:
                who = f"{log.user.employee.first_name} {log.user.employee.last_name}"
            else:
                who = log.user.username
                
        result.append(RecentActivityResponse(
            id=log.id,
            action=log.action,
            details=log.details or "",
            who=who,
            role=log.role or "Unknown",
            when=log.timestamp
        ))
        
    return result

@router.get("/dashboard/charts", response_model=HRDashboardCharts)
def get_hr_dashboard_charts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    current_year = datetime.now(timezone.utc).year
    
    # Department Distribution
    from app.models.department import Department
    dept_distribution = []
    departments = db.query(Department).all()
    for d in departments:
        count = db.query(func.count(Employee.id)).filter(
            Employee.department_id == d.id,
            Employee.employment_status == "Active"
        ).scalar() or 0
        if count > 0:
            dept_distribution.append({"name": d.department_name, "value": count})
            
    # Monthly Leave Trend (YTD)
    # Count approved leave days starting in each month of the current year
    monthly_trend = []
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for i, month in enumerate(months, start=1):
        # Extract month from start_date
        # Note: func.extract('month', ...) works in PostgreSQL/MySQL. SQLite needs strftime
        # For simplicity and cross-DB compatibility in SQLAlchemy, we can filter by date range
        import calendar
        from datetime import date
        _, last_day = calendar.monthrange(current_year, i)
        start_dt = date(current_year, i, 1)
        end_dt = date(current_year, i, last_day)
        
        leaves_in_month = db.query(func.sum(LeaveRequest.days)).filter(
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date >= start_dt,
            LeaveRequest.start_date <= end_dt
        ).scalar() or 0
        
        monthly_trend.append({"name": month, "leaves": float(leaves_in_month)})
        
    return HRDashboardCharts(
        department_distribution=dept_distribution,
        monthly_trend=monthly_trend
    )

