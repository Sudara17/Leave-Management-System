from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.schemas.employee_dashboard import LeaveRequestResponse, LeaveBalanceResponse

class ManagerDashboardSummary(BaseModel):
    manager_name: str
    employee_id: str
    department: str
    team_size: int
    calendar_year: int
    employees_on_leave_today: int
    pending_approvals: int
    upcoming_approved_leave: int
    team_eligible_leave: float
    team_used_leave: float
    team_available_leave: float

class TeamMemberResponse(BaseModel):
    id: int
    employee_name: str
    employee_code: str
    department: str
    role: str
    joining_date: date | None
    eligible_leave: float
    used_leave: float
    available_leave: float
    pending_leave: float
    current_status: str

class LeaveActionRequest(BaseModel):
    reason_comments: str | None = None

class ApplyOnBehalfRequest(BaseModel):
    employee_id: int
    leave_type_id: int
    start_date: date
    end_date: date
    half_day: bool = False
    half_day_session: str | None = None
    reason: str
    attachment_url: str | None = None
