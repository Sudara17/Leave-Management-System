import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.session import Session as UserSession
from app.models.audit_log import AuditLog
from app.models.employee import Employee
from app.schemas.auth import Token
from app.security.jwt import create_access_token, create_refresh_token, verify_token
from app.security.hashing import verify_password, get_password_hash
from app.api.deps import get_current_active_user, CurrentUser
from pydantic import BaseModel

router = APIRouter()

class RefreshTokenRequest(BaseModel):
    refresh_token: str

def parse_user_agent(ua_string: str) -> dict:
    # A simple parser for the MVP. In a real app, use the `user-agents` package.
    browser = "Unknown"
    os = "Unknown"
    device = "Desktop"
    
    ua_lower = ua_string.lower()
    
    if "mobi" in ua_lower:
        device = "Mobile"
        
    if "windows" in ua_lower:
        os = "Windows"
    elif "mac os" in ua_lower:
        os = "MacOS"
    elif "linux" in ua_lower:
        os = "Linux"
    elif "android" in ua_lower:
        os = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os = "iOS"
        
    if "chrome" in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "edge" in ua_lower:
        browser = "Edge"
        
    return {"browser": browser, "os": os, "device": device}

@router.post("/login", response_model=Token)
def login_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Token:
    user = db.query(User).filter(User.email == form_data.username).first()
    
    ip_address = request.client.host if request.client else "Unknown"
    user_agent = request.headers.get("user-agent", "")
    ua_data = parse_user_agent(user_agent)
    
    if not user:
        # Avoid user enumeration by just raising bad credentials
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if user.is_locked:
        # Check if 15 minutes have passed since lock
        if user.last_login and (datetime.now(timezone.utc) - user.last_login).total_seconds() > 900:
            user.is_locked = False
            user.failed_attempts = 0
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Account is locked. Try again later.")
        
    if not verify_password(form_data.password, user.password_hash):
        user.failed_attempts += 1
        user.last_login = datetime.now(timezone.utc)
        if user.failed_attempts >= 5:
            user.is_locked = True
        db.commit()
        
        # Log failed attempt
        audit_log = AuditLog(
            user_id=user.id,
            action="FAILED_LOGIN",
            role=user.employee.role.role_name if user.employee and user.employee.role else None,
            timestamp=datetime.now(timezone.utc),
            device=ua_data["device"],
            browser=ua_data["browser"],
            ip_address=ip_address,
            details=f"Failed attempts: {user.failed_attempts}"
        )
        db.add(audit_log)
        db.commit()
        
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    # Reset failed attempts and update last_login
    user.failed_attempts = 0
    user.last_login = datetime.now(timezone.utc)
    
    # Create session
    session_id = str(uuid.uuid4())
    user_session = UserSession(
        session_id=session_id,
        user_id=user.id,
        device=ua_data["device"],
        browser=ua_data["browser"],
        operating_system=ua_data["os"],
        ip_address=ip_address,
        login_time=datetime.now(timezone.utc),
        session_status="Active"
    )
    db.add(user_session)
    
    role_name = user.employee.role.role_name if user.employee and user.employee.role else "Employee"
    dept_name = user.employee.department.department_name if user.employee and user.employee.department else "None"
    
    # Log successful login
    audit_log = AuditLog(
        user_id=user.id,
        action="LOGIN",
        role=role_name,
        timestamp=datetime.now(timezone.utc),
        device=ua_data["device"],
        browser=ua_data["browser"],
        ip_address=ip_address,
        session_id=session_id,
        details=f"Successful login via {ua_data['browser']} on {ua_data['os']} (IP: {ip_address})"
    )
    db.add(audit_log)
    db.commit()
    
    claims = {
        "employee_id": user.employee_id,
        "role": role_name,
        "department": dept_name,
        "session_id": session_id,
        "permissions": [] # Add real permissions if needed
    }
    
    user_response = {
        "id": user.id,
        "email": user.email,
        "is_active": not user.is_locked,
        "role": role_name,
        "employee_id": user.employee_id,
        "first_name": user.employee.first_name if user.employee else None,
        "last_name": user.employee.last_name if user.employee else None,
        "department_id": user.employee.department_id if user.employee else None
    }
    
    return Token(
        access_token=create_access_token(subject=user.id, additional_claims=claims),
        refresh_token=create_refresh_token(subject=user.id, session_id=session_id),
        token_type="bearer",
        user=user_response
    )

@router.post("/refresh", response_model=Token)
def refresh_token(
    request_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    token = request_data.refresh_token
    payload = verify_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    session_id = payload.get("session_id")
    
    # Validate session
    user_session = db.query(UserSession).filter(UserSession.session_id == session_id, UserSession.session_status == "Active").first()
    if not user_session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    role_name = user.employee.role.role_name if user.employee and user.employee.role else "Employee"
    dept_name = user.employee.department.department_name if user.employee and user.employee.department else "None"
    
    claims = {
        "employee_id": user.employee_id,
        "role": role_name,
        "department": dept_name,
        "session_id": session_id,
        "permissions": []
    }
    
    user_response = {
        "id": user.id,
        "email": user.email,
        "is_active": not user.is_locked,
        "role": role_name,
        "employee_id": user.employee_id,
        "first_name": user.employee.first_name if user.employee else None,
        "last_name": user.employee.last_name if user.employee else None,
        "department_id": user.employee.department_id if user.employee else None
    }
    
    return Token(
        access_token=create_access_token(subject=user.id, additional_claims=claims),
        refresh_token=create_refresh_token(subject=user.id, session_id=session_id),
        token_type="bearer",
        user=user_response
    )

@router.post("/logout")
def logout(
    request: Request,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    # Get session_id from token if possible. If using dependency, we need a way to get the token payload.
    # For MVP, we'll terminate all active sessions for the user or require session_id.
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        payload = verify_token(token)
        if payload and payload.get("session_id"):
            session_id = payload.get("session_id")
            user_session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
            if user_session:
                user_session.session_status = "Terminated"
                user_session.logout_time = datetime.now(timezone.utc)
                db.commit()
                
    # Log successful logout
    audit_log = AuditLog(
        user_id=current_user.id,
        action="LOGOUT",
        role=None,
        timestamp=datetime.now(timezone.utc),
        ip_address=request.client.host if request.client else "Unknown"
    )
    db.add(audit_log)
    db.commit()
    return {"message": "Logged out successfully"}

from pydantic import BaseModel

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    phone: str = None
    address: str = None
    emergency_contact: str = None
    emergency_phone: str = None
    profile_photo: str = None

@router.get("/me")
def get_my_profile(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    return {
        "id": user.employee_id,
        "email": user.email,
        "first_name": user.employee.first_name if user.employee else None,
        "last_name": user.employee.last_name if user.employee else None,
        "phone_number": user.employee.phone if user.employee else None,
        "address": user.employee.address if user.employee else None,
        "emergency_contact": user.employee.emergency_contact if user.employee else None,
        "emergency_phone": user.employee.emergency_phone if user.employee else None,
        "profile_photo": user.employee.profile_photo if user.employee else None,
        "role": user.employee.role.role_name if user.employee and user.employee.role else "Employee",
        "department": {
            "name": user.employee.department.department_name if user.employee and user.employee.department else None
        },
        "joining_date": user.employee.joining_date if user.employee else None
    }

@router.put("/me")
def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if user and user.employee:
        if payload.phone is not None:
            user.employee.phone = payload.phone
        if payload.address is not None:
            user.employee.address = payload.address
        if payload.emergency_contact is not None:
            user.employee.emergency_contact = payload.emergency_contact
        if payload.emergency_phone is not None:
            user.employee.emergency_phone = payload.emergency_phone
        if payload.profile_photo is not None:
            user.employee.profile_photo = payload.profile_photo
        db.commit()
    return {"message": "Profile updated"}

import os
import shutil
from fastapi import UploadFile, File

PROFILE_UPLOAD_DIR = "uploads/profiles"
os.makedirs(PROFILE_UPLOAD_DIR, exist_ok=True)

@router.post("/profile-image")
def upload_profile_image(
    file: UploadFile = File(...),
    current_user: CurrentUser = None,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user or not user.employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    file_path = os.path.join(PROFILE_UPLOAD_DIR, f"user_{user.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # URL path to serve the file
    url_path = f"/{file_path.replace('\\', '/')}"
    user.employee.profile_photo = url_path
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE_PROFILE_IMAGE",
        role=user.employee.role.role_name if user.employee.role else None,
        timestamp=datetime.now(timezone.utc),
        details="User updated profile image"
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "Profile image updated", "profile_photo": url_path}

@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    user.password_hash = get_password_hash(payload.new_password)
    
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CHANGE_PASSWORD",
        role=None,
        timestamp=datetime.now(timezone.utc),
        details="User changed password"
    )
    db.add(audit_log)
    db.commit()
    return {"message": "Password changed successfully"}
