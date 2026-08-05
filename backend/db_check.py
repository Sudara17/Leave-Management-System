import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from decimal import Decimal

# Add backend dir to sys.path so we can import app modules
import sys
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.models.leave_request import LeaveRequest
from app.models.leave_balance import LeaveBalance
from app.models.leave_type import LeaveType
from app.models.employee import Employee
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_db():
    db = SessionLocal()
    try:
        # Get latest requests
        requests = db.query(LeaveRequest).order_by(LeaveRequest.id.desc()).limit(3).all()
        for req in requests:
            print(f"Request ID: {req.id}")
            print(f"Employee ID: {req.employee_id}")
            print(f"Status: {req.status}")
            print(f"Days: {req.days}")
            print(f"Sick Leave Days: {req.sick_leave_days}")
            print(f"Annual Leave Days: {req.annual_leave_days}")
            
            # Print balances for this employee
            balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == req.employee_id).all()
            for b in balances:
                lt = db.query(LeaveType).filter(LeaveType.id == b.leave_type_id).first()
                print(f"  Balance {lt.leave_name}: Available={b.available}, Pending={b.pending}, Used={b.used}")
            print("-" * 50)
            
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
