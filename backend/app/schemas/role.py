from pydantic import BaseModel
from typing import Optional

class RoleBase(BaseModel):
    role_name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    role_name: Optional[str] = None
    description: Optional[str] = None

class RoleInDBBase(RoleBase):
    id: int

    class Config:
        from_attributes = True

class Role(RoleInDBBase):
    pass
