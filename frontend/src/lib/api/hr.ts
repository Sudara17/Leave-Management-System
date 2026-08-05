import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const hrApiClient = axios.create({
  baseURL: BASE_URL,
});

hrApiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    if (config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

hrApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard APIs
export const getHRDashboardSummary = async () => {
  const response = await hrApiClient.get('/hr/dashboard/summary');
  return response.data;
};

export const getHRRecentActivity = async (params?: { skip?: number; limit?: number }) => {
  const response = await hrApiClient.get('/hr/dashboard/recent-activity', { params });
  return response.data;
};

export const getHrCalendar = async () => {
  const response = await hrApiClient.get('/calendar/hr');
  return response.data;
};

// Employee APIs
export const getEmployees = async (params?: { search?: string; department_id?: number; role_id?: number; employment_status?: string; skip?: number; limit?: number }) => {
  const response = await hrApiClient.get('/employees/', { params });
  return response.data;
};

export const getEmployeeById = async (id: number) => {
  const response = await hrApiClient.get(`/employees/${id}`);
  return response.data;
};

export const createEmployee = async (data: any) => {
  const response = await hrApiClient.post('/employees/', data);
  return response.data;
};

export const updateEmployee = async (id: number, data: any) => {
  const response = await hrApiClient.put(`/employees/${id}`, data);
  return response.data;
};

export const deleteEmployee = async (id: number) => {
  const response = await hrApiClient.delete(`/employees/${id}`);
  return response.data;
};

// Leave Request APIs
export const getLeaveRequests = async (params?: { skip?: number; limit?: number; status?: string; department_id?: number }) => {
  const response = await hrApiClient.get('/hr/leave-requests/', { params });
  return response.data;
};

export const processLeaveRequest = async (id: number, data: { status: string; hr_comments?: string }) => {
  const response = await hrApiClient.put(`/hr/leave-requests/${id}/process`, data);
  return response.data;
};

// Leave Types APIs
export const getLeaveTypes = async () => {
  const response = await hrApiClient.get('/leave-types/');
  return response.data;
};

// Departments & Roles
export const getDepartments = async () => {
  const response = await hrApiClient.get('/departments/');
  return response.data;
};

export const getRoles = async () => {
  const response = await hrApiClient.get('/roles/');
  return response.data;
};

// Reports
export const getDepartmentLeaveReport = async () => {
  const response = await hrApiClient.get('/hr/reports/leave/departments');
  return response.data;
};

export const getLeaveTypeReport = async () => {
  const response = await hrApiClient.get('/hr/reports/leave/types');
  return response.data;
};

// Audit Logs
export const getAuditLogs = async (params?: { skip?: number; limit?: number; action?: string; role?: string; search?: string }) => {
  const response = await hrApiClient.get('/hr/audit-logs/', { params });
  return response.data;
};

// Company Settings
export const getCompanySettings = async () => {
  const response = await hrApiClient.get('/hr/settings/company-settings');
  return response.data;
};

export const updateCompanySettings = async (data: any) => {
  const response = await hrApiClient.put('/hr/settings/company-settings', data);
  return response.data;
};

export const getPolicies = async () => {
  const response = await hrApiClient.get('/hr/policies/');
  return response.data;
};
