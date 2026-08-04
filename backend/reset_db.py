import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import engine
from app.models.base import Base

# Import all models so metadata knows about them
from app.models.user import User
from app.models.employee import Employee
from app.models.role import Role
from app.models.department import Department
from app.models.leave_type import LeaveType
from app.models.leave_balance import LeaveBalance
from app.models.leave_request import LeaveRequest
from app.models.audit_log import AuditLog
from app.models.company_settings import CompanySettings
from app.models.company_policy import CompanyPolicy
from app.models.policy_acceptance import PolicyAcceptance

def reset():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")

if __name__ == "__main__":
    reset()
