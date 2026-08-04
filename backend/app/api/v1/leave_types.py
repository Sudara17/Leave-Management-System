from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.leave_type import LeaveType as LeaveTypeModel
from app.schemas.leave_type import LeaveType, LeaveTypeCreate, LeaveTypeUpdate
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[LeaveType])
def read_leave_types(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_active_user),
) -> Any:
    leave_types = db.query(LeaveTypeModel).offset(skip).limit(limit).all()
    return leave_types

@router.post("/", response_model=LeaveType)
def create_leave_type(
    *,
    db: Session = Depends(get_db),
    leave_type_in: LeaveTypeCreate,
    current_user = Depends(get_current_active_user),
) -> Any:
    leave_type = db.query(LeaveTypeModel).filter(LeaveTypeModel.leave_name == leave_type_in.leave_name).first()
    if leave_type:
        raise HTTPException(status_code=400, detail="The leave type with this name already exists.")
    
    db_obj = LeaveTypeModel(**leave_type_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/{leave_type_id}", response_model=LeaveType)
def read_leave_type(
    leave_type_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
) -> Any:
    leave_type = db.query(LeaveTypeModel).filter(LeaveTypeModel.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    return leave_type

@router.put("/{leave_type_id}", response_model=LeaveType)
def update_leave_type(
    *,
    db: Session = Depends(get_db),
    leave_type_id: int,
    leave_type_in: LeaveTypeUpdate,
    current_user = Depends(get_current_active_user),
) -> Any:
    leave_type = db.query(LeaveTypeModel).filter(LeaveTypeModel.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    update_data = leave_type_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(leave_type, field, value)
        
    db.add(leave_type)
    db.commit()
    db.refresh(leave_type)
    return leave_type

from sqlalchemy.exc import IntegrityError

@router.delete("/{leave_type_id}", response_model=LeaveType)
def delete_leave_type(
    *,
    db: Session = Depends(get_db),
    leave_type_id: int,
    current_user = Depends(get_current_active_user),
) -> Any:
    leave_type = db.query(LeaveTypeModel).filter(LeaveTypeModel.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    try:
        db.delete(leave_type)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete this leave type because it is actively used in employee leave requests or balances."
        )
        
    return leave_type
