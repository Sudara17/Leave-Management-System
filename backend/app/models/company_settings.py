from datetime import date
from sqlalchemy import String, Date, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class Holiday(Base):
    __tablename__ = "holidays"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    holiday_date: Mapped[date] = mapped_column(Date, unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class CompanySettings(Base):
    """
    Singleton-like table to hold global HR configurations.
    """
    __tablename__ = "company_settings"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
