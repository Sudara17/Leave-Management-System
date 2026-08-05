import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.leave_type import LeaveType

def main():
    try:
        db = SessionLocal()
        leave_types = db.query(LeaveType).all()
        print("--- Leave Types in Database ---")
        for lt in leave_types:
            print(f"ID: {lt.id}, Name: '{lt.leave_name}'")
        print("-------------------------------")
    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
