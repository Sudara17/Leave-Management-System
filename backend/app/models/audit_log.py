from datetime import datetime
from sqlalchemy import String, ForeignKey, BigInteger, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    user_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    device: Mapped[str | None] = mapped_column(String(100), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    details: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User")
