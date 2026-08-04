from typing import List, Callable
from fastapi import Depends, HTTPException, status
from app.api.deps import get_current_active_user
from app.models.user import User

class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        user_role = "Employee"
        if current_user.employee and current_user.employee.role:
            user_role = current_user.employee.role.role_name
            
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {', '.join(self.allowed_roles)}"
            )
            
        return current_user

def get_current_manager(current_user: User = Depends(RequireRole(["Manager", "HR"]))) -> User:
    return current_user

def get_current_hr(current_user: User = Depends(RequireRole(["HR"]))) -> User:
    return current_user
