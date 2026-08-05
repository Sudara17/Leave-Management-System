from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class DashboardSummaryResponse(BaseModel):
    employee_name: str
    employee_id: str
    department: str
    manager: str
    joining_date: date | None
    calendar_year: int
    total_eligible_leave: float
    used_leave: float
    available_leave: float
    pending_requests: int
    hr_eligibility_approved: bool

class LeaveBalanceResponse(BaseModel):
    leave_type_id: int
    leave_type_name: str
    eligible: float
    used: float
    pending: float
    available: float
    
    model_config = ConfigDict(from_attributes=True)

class LeaveApplyRequest(BaseModel):
    leave_type_id: int
    start_date: date
    end_date: date
    half_day: bool = False
    half_day_session: str | None = None
    reason: str
    confirm_leave_split: bool = False

class LeaveRequestResponse(BaseModel):
    id: int
    employee_name: str | None = None
    leave_type_name: str
    start_date: date
    end_date: date
    days: float
    status: str
    applied_on: datetime
    reference_code: str
    manager_name: str | None
    department_name: str | None = None
    reason: str | None = None
    manager_decision_date: datetime | None = None
    manager_comments: str | None = None
    hr_name: str | None = None
    hr_decision_date: datetime | None = None
    hr_comments: str | None = None
    submitted_at: datetime | None = None
    sick_leave_days: float | None = None
    annual_leave_days: float | None = None
    lwp_days: float | None = None
    calendar_synced: bool = False
    google_calendar_event_id: str | None = None
    outlook_calendar_event_id: str | None = None
    
    model_config = ConfigDict(from_attributes=True)

class PolicyResponse(BaseModel):
    id: int
    title: str
    version: str
    effective_date: date
    file_url: str
    has_accepted: bool

class ProfileUpdateRequest(BaseModel):
    phone: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    emergency_phone: str | None = None
    profile_photo: str | None = None
