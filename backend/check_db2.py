import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import sys
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.models.leave_request import LeaveRequest
from app.models.leave_balance import LeaveBalance
from app.models.leave_type import LeaveType
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_db():
    db = SessionLocal()
    try:
        # Just grab the last 5 leave requests
        requests = db.query(LeaveRequest).order_by(LeaveRequest.id.desc()).limit(5).all()
        for req in requests:
            print(f"Req ID: {req.id} | Emp ID: {req.employee_id} | Status: {req.status} | Days: {req.days} | Sick: {req.sick_leave_days} | Annual: {req.annual_leave_days}")
            
        print("\nBalances for the most recent employee:")
        if requests:
            emp_id = requests[0].employee_id
            balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == emp_id).all()
            for b in balances:
                lt = db.query(LeaveType).filter(LeaveType.id == b.leave_type_id).first()
                print(f"{lt.leave_name}: Avail={b.available}, Pending={b.pending}, Used={b.used}")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
