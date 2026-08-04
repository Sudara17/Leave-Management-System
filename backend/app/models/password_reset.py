from datetime import datetime
from sqlalchemy import String, ForeignKey, BigInteger, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    expiry: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    user = relationship("User")
