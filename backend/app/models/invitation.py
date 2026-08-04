from datetime import datetime
from sqlalchemy import String, ForeignKey, BigInteger, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class Invitation(Base):
    __tablename__ = "invitations"

    employee_name: Mapped[str] = mapped_column(String(200), nullable=False)
    official_email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    
    department_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("departments.id"), nullable=True)
    role_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("roles.id"), nullable=True)
    manager_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=True)
    
    joining_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    invitation_expiry: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Pending", nullable=False) # Pending, Accepted, Expired, Cancelled, Rejected
    
    invited_by_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    
    department = relationship("Department")
    role = relationship("Role")
    manager = relationship("Employee", foreign_keys=[manager_id])
    invited_by = relationship("User", foreign_keys=[invited_by_id])
