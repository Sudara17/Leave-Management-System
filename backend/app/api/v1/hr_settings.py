from datetime import datetime, timezone
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date

from app.database.session import get_db
from app.models.user import User
from app.models.company_settings import Holiday, CompanySettings
from app.models.audit_log import AuditLog
from app.security.rbac import get_current_hr

router = APIRouter()

class HolidayCreate(BaseModel):
    name: str
    holiday_date: date

class HolidayResponse(BaseModel):
    id: int
    name: str
    holiday_date: date
    is_active: bool

@router.get("/holidays", response_model=List[HolidayResponse])
def get_holidays(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    holidays = db.query(Holiday).filter(Holiday.is_active == True).all()
    return holidays

@router.post("/holidays", response_model=HolidayResponse)
def add_holiday(
    payload: HolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    holiday = Holiday(
        name=payload.name,
        holiday_date=payload.holiday_date,
        is_active=True
    )
    db.add(holiday)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="ADD_HOLIDAY",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details=f"Added holiday {holiday.name} on {holiday.holiday_date}"
    )
    db.add(audit_log)
    db.commit()
    db.refresh(holiday)
    return holiday

@router.put("/holidays/{holiday_id}", response_model=HolidayResponse)
def update_holiday(
    holiday_id: int,
    payload: HolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    holiday.name = payload.name
    holiday.holiday_date = payload.holiday_date
    db.commit()
    db.refresh(holiday)
    return holiday

@router.delete("/holidays/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(holiday)
    db.commit()
    return {"status": "success", "message": "Holiday deleted"}

import json

@router.get("/company-settings")
def get_company_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    settings = db.query(CompanySettings).all()
    result = {}
    for setting in settings:
        try:
            # Attempt to parse as JSON first (for lists/dicts/booleans)
            result[setting.key] = json.loads(setting.value)
        except (ValueError, TypeError):
            # Fallback to raw string
            result[setting.key] = setting.value
    return result

@router.put("/company-settings")
def update_company_settings(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_hr)
):
    for key, value in payload.items():
        if isinstance(value, (dict, list, bool, int, float)):
            str_value = json.dumps(value)
        else:
            str_value = str(value)
            
        setting = db.query(CompanySettings).filter(CompanySettings.key == key).first()
        if setting:
            setting.value = str_value
        else:
            setting = CompanySettings(key=key, value=str_value, description=f"Setting for {key}")
            db.add(setting)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE_COMPANY_SETTINGS",
        role="HR",
        timestamp=datetime.now(timezone.utc),
        details="Updated company settings"
    )
    db.add(audit_log)
    db.commit()
    return {"status": "success", "message": "Settings updated successfully"}
