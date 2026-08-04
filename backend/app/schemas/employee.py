from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

class EmployeeBase(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    display_name: Optional[str] = None
    official_email: EmailStr
    personal_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    manager_id: Optional[int] = None
    joining_date: Optional[date] = None
    employment_status: str = "Active"
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    profile_photo: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    employee_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    official_email: Optional[EmailStr] = None
    personal_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    manager_id: Optional[int] = None
    joining_date: Optional[date] = None
    employment_status: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    profile_photo: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None

class EmployeeInDBBase(EmployeeBase):
    id: int

    class Config:
        from_attributes = True

class Employee(EmployeeInDBBase):
    pass
