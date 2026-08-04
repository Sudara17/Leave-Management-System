import traceback
from app.database.session import SessionLocal
from app.models.employee import Employee
from app.models.leave_balance import LeaveBalance
from app.models.leave_request import LeaveRequest
from app.models.audit_log import AuditLog
import uuid
from datetime import datetime, timezone, date

db = SessionLocal()
try:
    employee = db.query(Employee).first()
    balance = db.query(LeaveBalance).filter(LeaveBalance.employee_id == employee.id).first()
    
    reference_code = f"LV-TEST-{str(uuid.uuid4())[:6].upper()}"
    leave_req = LeaveRequest(
        employee_id=employee.id,
        leave_type_id=balance.leave_type_id,
        start_date=date.today(),
        end_date=date.today(),
        days=1.0,
        half_day=False,
        reason="Test",
        status="Pending",
        manager_id=employee.manager_id,
        reference_code=reference_code,
        applied_on=datetime.now(timezone.utc)
    )
    db.add(leave_req)
    
    balance.available -= 1
    balance.pending += 1
    
    audit_log = AuditLog(
        user_id=employee.user.id if employee.user else 1,
        action="APPLY_LEAVE",
        role=employee.role.role_name if employee.role else "Employee",
        timestamp=datetime.now(timezone.utc),
        details=f"Applied for 1 days of leave. Reference: {reference_code}"
    )
    db.add(audit_log)
    
    db.commit()
    print("Success")
except Exception as e:
    db.rollback()
    traceback.print_exc()
