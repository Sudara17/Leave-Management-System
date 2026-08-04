from sqlalchemy import String, ForeignKey, BigInteger, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    employee_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=False, index=True)
    leave_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("leave_types.id"), nullable=False, index=True)
    
    calendar_year: Mapped[int] = mapped_column(Integer, nullable=False)
    
    eligible: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    used: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    available: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    pending: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    
    employee = relationship("Employee")
    leave_type = relationship("LeaveType")
