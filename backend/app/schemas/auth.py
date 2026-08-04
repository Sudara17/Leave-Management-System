from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    role: str
    employee_id: int
    first_name: str | None = None
    last_name: str | None = None
    department_id: int | None = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None
    user: UserResponse | None = None


class TokenPayload(BaseModel):
    sub: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str