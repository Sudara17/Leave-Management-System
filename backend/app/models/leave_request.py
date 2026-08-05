from datetime import datetime, date
from sqlalchemy import String, ForeignKey, BigInteger, DateTime, Date, Boolean, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    employee_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=False, index=True)
    leave_type_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("leave_types.id"), nullable=False)
    
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    days: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    sick_leave_days: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    annual_leave_days: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    lwp_days: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    
    half_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    half_day_session: Mapped[str | None] = mapped_column(String(50), nullable=True) # Morning, Afternoon
    
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False) # Pending, Approved, Rejected, Cancelled, Withdrawn
    
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    manager_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=True)
    hr_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=True)
    
    reference_code: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    applied_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    manager_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    hr_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    submitted_on_behalf: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    submitted_by_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=True)
    
    # Calendar Integration
    google_calendar_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    outlook_calendar_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    calendar_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    calendar_synced: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    calendar_sync_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    employee = relationship("Employee", foreign_keys=[employee_id])
    leave_type = relationship("LeaveType")
    manager = relationship("Employee", foreign_keys=[manager_id])
    hr = relationship("Employee", foreign_keys=[hr_id])
    submitted_by = relationship("Employee", foreign_keys=[submitted_by_id])
