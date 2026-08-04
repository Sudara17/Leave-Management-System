from pydantic import BaseModel
from typing import Optional

class LeaveTypeBase(BaseModel):
    leave_name: str
    description: Optional[str] = None
    calendar_year_entitlement: float = 0.0
    allow_half_day: bool = False
    require_hr_approval: bool = False
    require_document: bool = False
    carry_forward: bool = False
    expiry_days: Optional[int] = None
    color: Optional[str] = None
    display_order: int = 0

class LeaveTypeCreate(LeaveTypeBase):
    pass

class LeaveTypeUpdate(BaseModel):
    leave_name: Optional[str] = None
    description: Optional[str] = None
    calendar_year_entitlement: Optional[float] = None
    allow_half_day: Optional[bool] = None
    require_hr_approval: Optional[bool] = None
    require_document: Optional[bool] = None
    carry_forward: Optional[bool] = None
    expiry_days: Optional[int] = None
    color: Optional[str] = None
    display_order: Optional[int] = None

class LeaveTypeInDBBase(LeaveTypeBase):
    id: int

    class Config:
        from_attributes = True

class LeaveType(LeaveTypeInDBBase):
    pass
