from typing import Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.models.employee import Employee as EmployeeModel
from app.models.audit_log import AuditLog
from app.schemas.employee import Employee, EmployeeCreate, EmployeeUpdate
from app.security.rbac import get_current_hr
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[Employee])
def read_employees(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    role_id: Optional[int] = None,
    employment_status: Optional[str] = None,
    current_user: User = Depends(get_current_hr),
) -> Any:
    query = db.query(EmployeeModel)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                EmployeeModel.first_name.ilike(search_filter),
                EmployeeModel.last_name.ilike(search_filter),
                EmployeeModel.official_email.ilike(search_filter),
                EmployeeModel.employee_code.ilike(search_filter)
            )
        )
        
    if department_id:
        query = query.filter(EmployeeModel.department_id == department_id)
        
    if role_id:
        query = query.filter(EmployeeModel.role_id == role_id)
        
    if employment_status:
        query = query.filter(EmployeeModel.employment_status == employment_status)
        
    employees = query.offset(skip).limit(limit).all()
    return employees

@router.post("/", response_model=Employee)
def create_employee(
    *,
    db: Session = Depends(get_db),
    employee_in: EmployeeCreate,
    current_user: User = Depends(get_current_hr),
) -> Any:
    employee = db.query(EmployeeModel).filter(
        (EmployeeModel.employee_code == employee_in.employee_code) |
        (EmployeeModel.official_email == employee_in.official_email)
    ).first()
    if employee:
        raise HTTPException(status_code=400, detail="The employee with this code or email already exists.")
    
    db_obj = EmployeeModel(**employee_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Audit Log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE_EMPLOYEE",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Created employee {db_obj.employee_code} ({db_obj.official_email})"
    )
    db.add(audit_log)
    db.commit()
    
    return db_obj

@router.get("/{employee_id}", response_model=Employee)
def read_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr),
) -> Any:
    employee = db.query(EmployeeModel).filter(EmployeeModel.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.put("/{employee_id}", response_model=Employee)
def update_employee(
    *,
    db: Session = Depends(get_db),
    employee_id: int,
    employee_in: EmployeeUpdate,
    current_user: User = Depends(get_current_hr),
) -> Any:
    employee = db.query(EmployeeModel).filter(EmployeeModel.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = employee_in.model_dump(exclude_unset=True)
    changes = []
    
    for field, value in update_data.items():
        old_value = getattr(employee, field)
        if old_value != value:
            changes.append(f"{field}: {old_value} -> {value}")
            setattr(employee, field, value)
        
    db.add(employee)
    
    if changes:
        audit_log = AuditLog(
            user_id=current_user.id,
            action="UPDATE_EMPLOYEE",
            role="HR",
            timestamp=datetime.now(timezone.utc),
            details=f"Updated employee {employee.employee_code}. Changes: " + ", ".join(changes)
        )
        db.add(audit_log)
        
    db.commit()
    db.refresh(employee)
    return employee

@router.delete("/{employee_id}", response_model=Employee)
def delete_employee(
    *,
    db: Session = Depends(get_db),
    employee_id: int,
    current_user: User = Depends(get_current_hr),
) -> Any:
    """
    Soft deletes an employee by setting their employment_status to 'Terminated'.
    Permanent deletion of employee records is not allowed by MVP rules.
    """
    employee = db.query(EmployeeModel).filter(EmployeeModel.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.employment_status = "Terminated"
    db.add(employee)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="TERMINATE_EMPLOYEE",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Terminated employee {employee.employee_code}"
    )
    db.add(audit_log)
    db.commit()
    db.refresh(employee)
    
    return employee
