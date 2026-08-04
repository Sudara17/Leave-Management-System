import sys
import os
import random
from datetime import date, datetime, timedelta, timezone

# Add backend directory to path if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from faker import Faker
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
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
from app.security.hashing import get_password_hash

fake = Faker()
Faker.seed(42)
random.seed(42)

def seed():
    db = SessionLocal()
    try:
        print("Starting seeding process...")

        # 1. Company Settings
        settings = db.query(CompanySettings).filter(CompanySettings.key == "GLOBAL").first()
        if not settings:
            settings = CompanySettings(
                key="GLOBAL",
                value={
                    "company_name": "Enterprise Corp",
                    "work_days_per_week": 5,
                    "financial_year_start_month": 4
                },
                description="Global company settings"
            )
            db.add(settings)
            db.commit()

        # 2. Roles
        roles_data = ["Employee", "Manager", "HR", "Admin"]
        roles = {}
        for r_name in roles_data:
            role = db.query(Role).filter(Role.role_name == r_name).first()
            if not role:
                role = Role(role_name=r_name, description=f"{r_name} role")
                db.add(role)
                db.commit()
                db.refresh(role)
            roles[r_name] = role

        # 3. Departments
        depts_data = [
            {"name": "Engineering", "code": "ENG"},
            {"name": "Human Resources", "code": "HR"},
            {"name": "Management", "code": "MGMT"},
            {"name": "Sales", "code": "SALES"},
            {"name": "Marketing", "code": "MKTG"},
            {"name": "Finance", "code": "FIN"}
        ]
        departments = {}
        for d_data in depts_data:
            dept = db.query(Department).filter(Department.department_code == d_data["code"]).first()
            if not dept:
                dept = Department(department_name=d_data["name"], department_code=d_data["code"], is_active=True)
                db.add(dept)
                db.commit()
                db.refresh(dept)
            departments[d_data["code"]] = dept

        # 4. Leave Types
        leave_types_data = [
            {"name": "Annual Leave", "days": 20, "color": "#3b82f6", "require_document": False},
            {"name": "Sick Leave", "days": 10, "color": "#ef4444", "require_document": True},
            {"name": "Casual Leave", "days": 5, "color": "#f59e0b", "require_document": False},
            {"name": "Maternity Leave", "days": 90, "color": "#ec4899", "require_document": True}
        ]
        leave_types = []
        for lt_data in leave_types_data:
            lt = db.query(LeaveType).filter(LeaveType.leave_name == lt_data["name"]).first()
            if not lt:
                lt = LeaveType(
                    leave_name=lt_data["name"],
                    calendar_year_entitlement=lt_data["days"],
                    color=lt_data["color"],
                    require_document=lt_data["require_document"]
                )
                db.add(lt)
                db.commit()
                db.refresh(lt)
            leave_types.append(lt)

        # 5. Policies
        policy = db.query(CompanyPolicy).filter(CompanyPolicy.title == "Employee Handbook 2025").first()
        if not policy:
            policy = CompanyPolicy(
                title="Employee Handbook 2025",
                version="1.0",
                effective_date=date(2025, 1, 1),
                file_url="https://example.com/handbook.pdf",
                is_active=True
            )
            db.add(policy)
            db.commit()
            db.refresh(policy)

        # 6. Generate Employees & Users
        print("Generating 100+ employees...")
        
        # Hardcoded users for testing
        test_users = [
            {"email": "hr@example.com", "role": "HR", "dept": "HR", "fname": "Alice", "lname": "Smith", "emp_code": "EMP001"},
            {"email": "manager@example.com", "role": "Manager", "dept": "MGMT", "fname": "Bob", "lname": "Johnson", "emp_code": "EMP002"},
            {"email": "employee@example.com", "role": "Employee", "dept": "ENG", "fname": "Charlie", "lname": "Brown", "emp_code": "EMP003"}
        ]
        
        all_employees = []
        managers = []
        
        password_hash = get_password_hash("password123")

        # Create test users first
        for tu in test_users:
            emp = db.query(Employee).filter(Employee.official_email == tu["email"]).first()
            if not emp:
                emp = Employee(
                    employee_code=tu["emp_code"],
                    first_name=tu["fname"],
                    last_name=tu["lname"],
                    official_email=tu["email"],
                    department_id=departments[tu["dept"]].id,
                    role_id=roles[tu["role"]].id,
                    joining_date=date(2022, 1, 15),
                    employment_status="Active",
                    hr_eligibility_approved=True
                )
                db.add(emp)
                db.commit()
                db.refresh(emp)
                
                user = User(employee_id=emp.id, email=tu["email"], password_hash=password_hash)
                db.add(user)
                db.commit()
                
            all_employees.append(emp)
            if tu["role"] == "Manager":
                managers.append(emp)

        # Generate managers (10 total, 1 already created)
        for i in range(4, 13):
            dept = random.choice(list(departments.values()))
            fname = fake.first_name()
            lname = fake.last_name()
            email = f"manager{i}@example.com"
            emp = Employee(
                employee_code=f"EMP{i:03d}",
                first_name=fname,
                last_name=lname,
                official_email=email,
                department_id=dept.id,
                role_id=roles["Manager"].id,
                joining_date=fake.date_between(start_date='-5y', end_date='today'),
                employment_status="Active",
                hr_eligibility_approved=True
            )
            db.add(emp)
            db.commit()
            db.refresh(emp)
            user = User(employee_id=emp.id, email=email, password_hash=password_hash)
            db.add(user)
            db.commit()
            all_employees.append(emp)
            managers.append(emp)

        # Generate HR (3 total, 1 already created)
        for i in range(13, 15):
            fname = fake.first_name()
            lname = fake.last_name()
            email = f"hr{i}@example.com"
            emp = Employee(
                employee_code=f"EMP{i:03d}",
                first_name=fname,
                last_name=lname,
                official_email=email,
                department_id=departments["HR"].id,
                role_id=roles["HR"].id,
                joining_date=fake.date_between(start_date='-5y', end_date='today'),
                employment_status="Active",
                hr_eligibility_approved=True
            )
            db.add(emp)
            db.commit()
            db.refresh(emp)
            user = User(employee_id=emp.id, email=email, password_hash=password_hash)
            db.add(user)
            db.commit()
            all_employees.append(emp)

        # Generate Employees (100 total, 1 already created)
        for i in range(15, 114):
            dept = random.choice(list(departments.values()))
            manager = random.choice(managers)
            fname = fake.first_name()
            lname = fake.last_name()
            email = f"emp{i}@example.com"
            status = random.choices(["Active", "On Leave", "Terminated"], weights=[85, 10, 5])[0]
            
            emp = Employee(
                employee_code=f"EMP{i:03d}",
                first_name=fname,
                last_name=lname,
                official_email=email,
                department_id=dept.id,
                role_id=roles["Employee"].id,
                manager_id=manager.id if random.random() > 0.1 else None,
                joining_date=fake.date_between(start_date='-3y', end_date='today'),
                employment_status=status,
                hr_eligibility_approved=True
            )
            db.add(emp)
            db.commit()
            db.refresh(emp)
            user = User(employee_id=emp.id, email=email, password_hash=password_hash)
            db.add(user)
            db.commit()
            all_employees.append(emp)

        print("Generating Leave Balances, Requests, and Policy Acceptances...")
        current_year = datetime.now().year
        
        # Give everyone leave balances and policy acceptance
        for emp in all_employees:
            if emp.employment_status == "Terminated":
                continue
                
            # Policy Acceptance
            acc = db.query(PolicyAcceptance).filter(PolicyAcceptance.employee_id == emp.id, PolicyAcceptance.policy_id == policy.id).first()
            if not acc and random.random() > 0.1: # 90% accepted
                acc = PolicyAcceptance(employee_id=emp.id, policy_id=policy.id, accepted_at=datetime.now(timezone.utc))
                db.add(acc)
            
            for lt in leave_types:
                # Leave Balances
                bal = db.query(LeaveBalance).filter(
                    LeaveBalance.employee_id == emp.id,
                    LeaveBalance.leave_type_id == lt.id,
                    LeaveBalance.calendar_year == current_year
                ).first()
                
                if not bal:
                    used = random.randint(0, int(lt.calendar_year_entitlement)) if random.random() > 0.4 else 0
                    pending = random.randint(0, 3) if random.random() > 0.8 else 0
                    if used + pending > int(lt.calendar_year_entitlement):
                        used = int(lt.calendar_year_entitlement)
                        pending = 0
                        
                    bal = LeaveBalance(
                        employee_id=emp.id,
                        leave_type_id=lt.id,
                        calendar_year=current_year,
                        eligible=int(lt.calendar_year_entitlement),
                        used=used,
                        pending=pending,
                        available=int(lt.calendar_year_entitlement) - used - pending
                    )
                    db.add(bal)
            
            # Leave Requests (some historical, some active)
            for _ in range(5): # Create 5 requests per employee to guarantee data
                if random.random() > 0.1: # 90% of employees have requests
                    lt = random.choice(leave_types)
                start_dt = fake.date_between(start_date='-1y', end_date='+2m')
                end_dt = start_dt + timedelta(days=random.randint(0, 5))
                status_opts = ["Approved", "Rejected", "Pending", "Awaiting HR"]
                
                # if start_dt is in the future, it's more likely to be pending
                if start_dt > date.today():
                    weights = [20, 5, 40, 35]
                else:
                    weights = [80, 15, 0, 5]
                    
                status = random.choices(status_opts, weights=weights)[0]
                
                req = LeaveRequest(
                    employee_id=emp.id,
                    leave_type_id=lt.id,
                    start_date=start_dt,
                    end_date=end_dt,
                    days=float((end_dt - start_dt).days + 1),
                    reason=fake.sentence(),
                    status=status,
                    applied_on=fake.date_between(start_date='-6m', end_date='today'),
                    reference_code=f"LR-{emp.id}-{random.randint(10000, 99999)}"
                )
                db.add(req)
                
                # Generate full timeline Audit Log for it
                emp_user = db.query(User).filter(User.employee_id == emp.id).first()
                if emp_user:
                    db.add(AuditLog(
                        user_id=emp_user.id,
                        action="APPLY_LEAVE",
                        role="Employee",
                        timestamp=datetime.now(timezone.utc) - timedelta(days=2),
                        details=f"Applied for leave. Reference: {req.reference_code}"
                    ))
                    
                if status != "Pending":
                    manager_user = db.query(User).filter(User.email == "manager@example.com").first()
                    if manager_user:
                        db.add(AuditLog(
                            user_id=manager_user.id,
                            action=f"LEAVE_REQUEST_{status.upper()}",
                            role="Manager",
                            timestamp=datetime.now(timezone.utc) - timedelta(days=1),
                            details=f"Processed leave request for {emp.first_name}"
                        ))
                    
        db.commit()
        print("Seeding completed successfully!")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
