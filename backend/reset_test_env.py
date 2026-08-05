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
from app.models.audit_log import AuditLog
from app.models.employee import Employee
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_db():
    db = SessionLocal()
    try:
        print("Deleting all Audit Logs...")
        db.query(AuditLog).delete()
        
        print("Deleting all Leave Requests...")
        db.query(LeaveRequest).delete()
        
        print("Resetting Leave Balances to eligible values...")
        balances = db.query(LeaveBalance).all()
        for b in balances:
            lt = db.query(LeaveType).filter(LeaveType.id == b.leave_type_id).first()
            if lt:
                print(f"Resetting {lt.leave_name} for Employee {b.employee_id} (Eligible: {b.eligible})")
                b.used = Decimal('0.00')
                b.pending = Decimal('0.00')
                # Reset available to be equal to their eligible limit
                b.available = b.eligible
        
        db.commit()
        print("Successfully reset the testing environment!")
    except Exception as e:
        db.rollback()
        print(f"Error resetting database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_db()
