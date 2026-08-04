from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.role import Role as RoleModel
from app.schemas.role import Role, RoleCreate, RoleUpdate
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[Role])
def read_roles(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_active_user),
) -> Any:
    roles = db.query(RoleModel).offset(skip).limit(limit).all()
    return roles

@router.post("/", response_model=Role)
def create_role(
    *,
    db: Session = Depends(get_db),
    role_in: RoleCreate,
    current_user = Depends(get_current_active_user),
) -> Any:
    role = db.query(RoleModel).filter(RoleModel.role_name == role_in.role_name).first()
    if role:
        raise HTTPException(status_code=400, detail="The role with this name already exists.")
    
    db_obj = RoleModel(
        role_name=role_in.role_name,
        description=role_in.description,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/{role_id}", response_model=Role)
def read_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
) -> Any:
    role = db.query(RoleModel).filter(RoleModel.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role

@router.put("/{role_id}", response_model=Role)
def update_role(
    *,
    db: Session = Depends(get_db),
    role_id: int,
    role_in: RoleUpdate,
    current_user = Depends(get_current_active_user),
) -> Any:
    role = db.query(RoleModel).filter(RoleModel.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    update_data = role_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
        
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

@router.delete("/{role_id}", response_model=Role)
def delete_role(
    *,
    db: Session = Depends(get_db),
    role_id: int,
    current_user = Depends(get_current_active_user),
) -> Any:
    role = db.query(RoleModel).filter(RoleModel.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    db.delete(role)
    db.commit()
    return role
