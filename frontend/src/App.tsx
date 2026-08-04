import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { ProtectedRoute, RoleRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import Login from './pages/auth/Login';

// Import HR Pages
import HRDashboard from './pages/hr/HRDashboard';
import EmployeeManagement from './pages/hr/EmployeeManagement';
import LeaveApprovals from './pages/hr/LeaveApprovals';
import LeavePolicies from './pages/hr/LeavePolicies';
import Reports from './pages/hr/Reports';
import CompanySettings from './pages/hr/CompanySettings';
import AuditLogs from './pages/hr/AuditLogs';

// Import Common Pages
import Profile from './pages/common/Profile';

// Import Manager Pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerTeam from './pages/manager/ManagerTeam';
import ManagerApprovals from './pages/manager/ManagerApprovals';

// Import Employee Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeLeave from './pages/employee/EmployeeLeave';
import LeaveBalances from './pages/employee/LeaveBalances';
import LeaveHistory from './pages/employee/LeaveHistory';
import Policies from './pages/employee/Policies';

import ToastContainer from './components/ui/ToastContainer';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="hrms-ui-theme">
        <ToastContainer />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              
              {/* Root Redirect based on Role - handled dynamically in Layout or AuthStore */}
              <Route index element={<Navigate to="/employee" replace />} />

              {/* Employee Routes */}
              <Route path="employee" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR']}><EmployeeDashboard /></RoleRoute>} />
              <Route path="employee/apply-leave" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR']}><EmployeeLeave /></RoleRoute>} />
              <Route path="employee/balances" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR']}><LeaveBalances /></RoleRoute>} />
              <Route path="employee/history" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR']}><LeaveHistory /></RoleRoute>} />
              <Route path="employee/policies" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR']}><Policies /></RoleRoute>} />
              
              {/* Manager Routes */}
              <Route path="manager" element={<RoleRoute allowedRoles={['Manager', 'HR']}><ManagerDashboard /></RoleRoute>} />
              <Route path="manager/team" element={<RoleRoute allowedRoles={['Manager', 'HR']}><ManagerTeam /></RoleRoute>} />
              <Route path="manager/approvals" element={<RoleRoute allowedRoles={['Manager', 'HR']}><ManagerApprovals /></RoleRoute>} />
              <Route path="manager/apply-leave" element={<RoleRoute allowedRoles={['Manager', 'HR']}><EmployeeLeave /></RoleRoute>} />
              <Route path="manager/history" element={<RoleRoute allowedRoles={['Manager', 'HR']}><LeaveHistory /></RoleRoute>} />
              <Route path="manager/profile" element={<RoleRoute allowedRoles={['Manager', 'HR']}><Profile /></RoleRoute>} />
              
              {/* HR Routes */}
              <Route path="hr" element={<RoleRoute allowedRoles={['HR']}><HRDashboard /></RoleRoute>} />
              <Route path="hr/employees" element={<RoleRoute allowedRoles={['HR']}><EmployeeManagement /></RoleRoute>} />
              <Route path="hr/approvals" element={<RoleRoute allowedRoles={['HR']}><LeaveApprovals /></RoleRoute>} />
              <Route path="hr/policies" element={<RoleRoute allowedRoles={['HR']}><LeavePolicies /></RoleRoute>} />
              <Route path="hr/reports" element={<RoleRoute allowedRoles={['HR']}><Reports /></RoleRoute>} />
              <Route path="hr/settings" element={<RoleRoute allowedRoles={['HR']}><CompanySettings /></RoleRoute>} />
              <Route path="hr/audit" element={<RoleRoute allowedRoles={['HR']}><AuditLogs /></RoleRoute>} />
              
              {/* Common Routes */}
              <Route path="profile" element={<RoleRoute allowedRoles={['Employee', 'Manager', 'HR']}><Profile /></RoleRoute>} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
