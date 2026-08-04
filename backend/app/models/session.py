from datetime import datetime
from sqlalchemy import String, ForeignKey, BigInteger, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class Session(Base):
    __tablename__ = "sessions"

    session_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    
    device: Mapped[str | None] = mapped_column(String(100), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(100), nullable=True)
    operating_system: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    login_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    logout_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    session_status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False) # Active, Terminated, Expired
    
    user = relationship("User", backref="sessions")
