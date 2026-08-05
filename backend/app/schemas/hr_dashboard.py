from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

class HRDashboardSummary(BaseModel):
    total_employees: int
    active_employees: int
    inactive_employees: int
    employees_on_leave: int
    pending_invitations: int
    pending_eligibility_reviews: int
    pending_hr_approvals: int
    policy_acceptance_percentage: float
    total_company_leave: float
    used_leave: float
    available_leave: float

class RecentActivityResponse(BaseModel):
    id: int
    action: str
    details: str
    who: str
    role: str
    when: datetime

class PaginatedRecentActivityResponse(BaseModel):
    items: List[RecentActivityResponse]
    total: int

class HRDashboardCharts(BaseModel):
    department_distribution: List[dict]
    monthly_trend: List[dict]
