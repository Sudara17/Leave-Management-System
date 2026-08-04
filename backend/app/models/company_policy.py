from datetime import date
from sqlalchemy import String, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class CompanyPolicy(Base):
    __tablename__ = "company_policies"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
