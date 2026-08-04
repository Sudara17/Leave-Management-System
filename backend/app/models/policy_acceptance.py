from datetime import datetime
from sqlalchemy import ForeignKey, BigInteger, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class PolicyAcceptance(Base):
    __tablename__ = "policy_acceptances"

    employee_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=False, index=True)
    policy_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("company_policies.id"), nullable=False, index=True)
    
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    employee = relationship("Employee")
    policy = relationship("CompanyPolicy")
