from sqlalchemy import String, Integer, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class LeaveType(Base):
    __tablename__ = "leave_types"

    leave_name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    calendar_year_entitlement: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    allow_half_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    require_hr_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    require_document: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    carry_forward: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expiry_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
