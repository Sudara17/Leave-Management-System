from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

# HR Leave Requests
class HRLeaveActionRequest(BaseModel):
    hr_comments: str

# HR Policies
class PolicyUploadResponse(BaseModel):
    id: int
    title: str
    version: str
    effective_date: date
    file_url: str
    is_active: bool

class PolicyAcceptanceStat(BaseModel):
    policy_id: int
    title: str
    version: str
    total_employees: int
    accepted: int
    pending: int
    acceptance_percentage: float

# HR Audit Logs
class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    role: str
    details: str
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)

# HR Reports
class DepartmentLeaveReport(BaseModel):
    department_name: str
    total_eligible: float
    total_used: float
    total_available: float
    total_pending: float
    
class LeaveTypeReport(BaseModel):
    leave_type_name: str
    total_requests: int
    approved_requests: int
    rejected_requests: int
