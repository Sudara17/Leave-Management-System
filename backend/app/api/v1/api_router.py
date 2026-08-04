from fastapi import APIRouter
from app.api.v1.auth import routes as auth_routes
from app.api.v1 import (
    departments, roles, leave_types, employees, invitations, 
    employee_dashboard, manager_dashboard, hr_dashboard,
    hr_leave_requests, hr_policies, hr_audit, hr_reports,
    hr_eligibility, hr_settings, notifications
)

api_router = APIRouter()
api_router.include_router(auth_routes.router, prefix="/auth", tags=["auth"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(leave_types.router, prefix="/leave-types", tags=["leave-types"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(invitations.router, prefix="/invitations", tags=["invitations"])
api_router.include_router(employee_dashboard.router, prefix="/employee", tags=["employee-portal"])
api_router.include_router(manager_dashboard.router, prefix="/manager", tags=["manager-portal"])
api_router.include_router(hr_dashboard.router, prefix="/hr", tags=["hr-portal"])
api_router.include_router(hr_leave_requests.router, prefix="/hr/leave-requests", tags=["hr-operations"])
api_router.include_router(hr_policies.router, prefix="/hr/policies", tags=["hr-operations"])
api_router.include_router(hr_audit.router, prefix="/hr/audit-logs", tags=["hr-operations"])
api_router.include_router(hr_reports.router, prefix="/hr/reports", tags=["hr-operations"])
api_router.include_router(hr_eligibility.router, prefix="/hr/eligibility", tags=["hr-operations"])
api_router.include_router(hr_settings.router, prefix="/hr/settings", tags=["hr-operations"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
