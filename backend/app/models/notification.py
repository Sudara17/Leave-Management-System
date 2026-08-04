from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, BigInteger, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class Notification(Base):
    __tablename__ = "notifications"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g., 'LEAVE_APPROVED', 'POLICY_UPLOADED'
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", backref="notifications")
