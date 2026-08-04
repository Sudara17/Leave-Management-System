import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const employeeApiClient = axios.create({
  baseURL: BASE_URL,
});

employeeApiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    if (config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

employeeApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getDashboardSummary = async () => {
  const response = await employeeApiClient.get('/employee/dashboard/summary');
  return response.data;
};

export const getLeaveBalances = async () => {
  const response = await employeeApiClient.get('/employee/dashboard/balances');
  return response.data;
};

export const calculateLeave = async (payload: any) => {
  const response = await employeeApiClient.post('/employee/leave/calculate', payload);
  return response.data;
};

export const applyLeave = async (data: any) => {
  const response = await employeeApiClient.post('/employee/leave/apply', data);
  return response.data;
};

export const withdrawLeave = async (requestId: number) => {
  const response = await employeeApiClient.post(`/employee/leave/${requestId}/withdraw`);
  return response.data;
};

export const getLeaveDetails = async (requestId: number) => {
  const response = await employeeApiClient.get(`/employee/leave/${requestId}/details`);
  return response.data;
};



export const getLeaveHistory = async () => {
  const response = await employeeApiClient.get('/employee/leave/history');
  return response.data;
};

export const getPolicies = async () => {
  const response = await employeeApiClient.get('/employee/policies');
  return response.data;
};

export const acceptPolicy = async (id: number) => {
  const response = await employeeApiClient.post(`/employee/policies/${id}/accept`);
  return response.data;
};

export const updateProfile = async (data: any) => {
  const response = await employeeApiClient.patch('/employee/profile', data);
  return response.data;
};
