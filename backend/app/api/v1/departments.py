from typing import Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.department import Department as DepartmentModel
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.department import Department, DepartmentCreate, DepartmentUpdate
from app.security.rbac import get_current_hr

router = APIRouter()

@router.get("/", response_model=List[Department])
def read_departments(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_hr),
) -> Any:
    departments = db.query(DepartmentModel).offset(skip).limit(limit).all()
    return departments

@router.post("/", response_model=Department)
def create_department(
    *,
    db: Session = Depends(get_db),
    department_in: DepartmentCreate,
    current_user: User = Depends(get_current_hr),
) -> Any:
    department = db.query(DepartmentModel).filter(DepartmentModel.department_code == department_in.department_code).first()
    if department:
        raise HTTPException(status_code=400, detail="The department with this code already exists.")
    
    db_obj = DepartmentModel(
        department_name=department_in.department_name,
        department_code=department_in.department_code,
        description=department_in.description,
        manager_id=department_in.manager_id,
        is_active=True
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE_DEPARTMENT",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Created department {db_obj.department_name} ({db_obj.department_code})"
    )
    db.add(audit_log)
    db.commit()
    
    return db_obj

@router.get("/{department_id}", response_model=Department)
def read_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr),
) -> Any:
    department = db.query(DepartmentModel).filter(DepartmentModel.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department

@router.put("/{department_id}", response_model=Department)
def update_department(
    *,
    db: Session = Depends(get_db),
    department_id: int,
    department_in: DepartmentUpdate,
    current_user: User = Depends(get_current_hr),
) -> Any:
    department = db.query(DepartmentModel).filter(DepartmentModel.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = department_in.model_dump(exclude_unset=True)
    changes = []
    
    for field, value in update_data.items():
        old_val = getattr(department, field)
        if old_val != value:
            changes.append(f"{field}: {old_val} -> {value}")
            setattr(department, field, value)
        
    db.add(department)
    
    if changes:
        audit_log = AuditLog(
            user_id=current_user.id,
            action="UPDATE_DEPARTMENT",
            role="HR",
            timestamp=datetime.now(timezone.utc),
            details=f"Updated department {department.department_code}. Changes: " + ", ".join(changes)
        )
        db.add(audit_log)
        
    db.commit()
    db.refresh(department)
    return department

@router.delete("/{department_id}", response_model=Department)
def delete_department(
    *,
    db: Session = Depends(get_db),
    department_id: int,
    current_user: User = Depends(get_current_hr),
) -> Any:
    department = db.query(DepartmentModel).filter(DepartmentModel.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Soft delete
    department.is_active = False
    db.add(department)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="DEACTIVATE_DEPARTMENT",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Deactivated department {department.department_code}"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(department)
    
    return department
