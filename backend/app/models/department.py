from sqlalchemy import String, ForeignKey, BigInteger, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class Department(Base):
    __tablename__ = "departments"

    department_name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    department_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    manager_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("employees.id", use_alter=True, name="fk_dept_manager"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    employees = relationship("Employee", back_populates="department", foreign_keys="Employee.department_id")
