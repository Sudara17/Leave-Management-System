import { api } from '../axios';

export const managerApiClient = api;

// Dashboard
export const getManagerDashboardSummary = async () => {
  const response = await api.get('/manager/dashboard/summary');
  return response.data;
};

export const getUpcomingLeaves = async () => {
  const response = await api.get('/manager/dashboard/upcoming-leaves');
  return response.data;
};

// Team Members
export const getTeamMembers = async () => {
  const response = await api.get('/manager/team');
  return response.data;
};

// Approvals Queue
export const getApprovalQueue = async () => {
  const response = await api.get('/manager/approvals/queue');
  return response.data;
};

// Leave Details
export const getLeaveDetails = async (requestId: number) => {
  const response = await api.get(`/manager/approvals/${requestId}/details`);
  return response.data;
};

// Approve Leave
export const approveLeave = async (requestId: number, comments: string) => {
  const response = await api.post(`/manager/approvals/${requestId}/approve`, {
    reason_comments: comments
  });
  return response.data;
};

// Reject Leave
export const rejectLeave = async (requestId: number, comments: string) => {
  const response = await api.post(`/manager/approvals/${requestId}/reject`, {
    reason_comments: comments
  });
  return response.data;
};

// Forward to HR
export const forwardToHR = async (requestId: number, comments: string) => {
  const response = await api.post(`/manager/approvals/${requestId}/send-to-hr`, {
    reason_comments: comments
  });
  return response.data;
};

// Apply on Behalf
export const applyOnBehalf = async (data: any) => {
  const response = await managerApiClient.post('/manager/leave-requests/apply-on-behalf', data);
  return response.data;
};

export const getManagerCalendar = async () => {
  const response = await managerApiClient.get('/calendar/manager');
  return response.data;
};
