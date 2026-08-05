import sys
import os
from datetime import date, timedelta
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database.session import SessionLocal
from app.models.leave_request import LeaveRequest
from app.models.employee import Employee
from app.models.leave_type import LeaveType

def seed():
    db = SessionLocal()
    try:
        # Get first employee
        emp = db.query(Employee).first()
        if not emp:
            print("Employee not found")
            return
            
        # Get a leave type
        lt = db.query(LeaveType).first()
        
        # Create an Approved leave
        req1 = LeaveRequest(
            employee_id=emp.id,
            leave_type_id=lt.id,
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=7),
            days=3.0,
            reason="Test E2E Approved",
            status="Approved",
            reference_code="REF1",
            applied_on=date.today(),
            submitted_at=date.today()
        )
        db.add(req1)
        
        # Create a Pending leave
        req2 = LeaveRequest(
            employee_id=emp.id,
            leave_type_id=lt.id,
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=12),
            days=3.0,
            reason="Test E2E Pending",
            status="Pending",
            reference_code="REF2",
            applied_on=date.today(),
            submitted_at=date.today()
        )
        db.add(req2)
        
        # Create a Rejected leave
        req3 = LeaveRequest(
            employee_id=emp.id,
            leave_type_id=lt.id,
            start_date=date.today() + timedelta(days=15),
            end_date=date.today() + timedelta(days=17),
            days=3.0,
            reason="Test E2E Rejected",
            status="Rejected",
            reference_code="REF3",
            applied_on=date.today(),
            submitted_at=date.today()
        )
        db.add(req3)
        
        db.commit()
        print("Test leaves seeded successfully!")
        
    finally:
        db.close()

if __name__ == "__main__":
    seed()
