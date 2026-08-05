import sys
import os
import traceback
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.api.v1.calendar import get_employee_calendar
from app.api.v1.employee_dashboard import get_leave_history
from app.api.v1.manager_dashboard import get_upcoming_leaves, get_approval_queue
from app.api.v1.hr_dashboard import get_hr_dashboard_summary

def main():
    db = SessionLocal()
    
    print("Fetching users...")
    hr_user = db.query(User).join(Employee).filter(Employee.official_email == "hr@example.com").first()
    manager_user = db.query(User).join(Employee).filter(Employee.official_email == "manager@example.com").first()
    emp_user = db.query(User).join(Employee).filter(Employee.official_email == "employee@example.com").first()
    
    print(f"hr={hr_user}, manager={manager_user}, emp={emp_user}")
    
    tests = [
        ("GET /api/v1/calendar/employee", get_employee_calendar, {'db': db, 'current_user': emp_user}),
        ("GET /api/v1/employee/leave/history", get_leave_history, {'db': db, 'current_user': emp_user}),
        ("GET /api/v1/manager/dashboard/upcoming-leaves", get_upcoming_leaves, {'db': db, 'current_user': manager_user}),
        ("GET /api/v1/manager/approvals/queue", get_approval_queue, {'db': db, 'current_user': manager_user}),
        ("GET /api/v1/hr/dashboard/summary", get_hr_dashboard_summary, {'db': db, 'current_user': hr_user})
    ]
    
    for name, func, kwargs in tests:
        print(f"\n--- Testing {name} ---")
        try:
            res = func(**kwargs)
            print("SUCCESS")
            print(res)
        except Exception as e:
            db.rollback()
            print(f"FAILED with {type(e).__name__}: {e}")
            traceback.print_exc()

if __name__ == '__main__':
    main()
