import { useState, useEffect } from 'react';
import { 
  CheckSquare, XSquare, Filter, Search, X, Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// Badge Component
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    default: 'bg-muted text-foreground',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default function LeaveApprovals() {
  useDocumentTitle('Leave Approvals');
  const [requests, setRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', department_id: '', leave_type_id: '', start_date: '', end_date: '' });
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [comments, setComments] = useState('');
  const [commentsError, setCommentsError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    import('../../lib/api/hr').then(({ getLeaveTypes }) => {
      getLeaveTypes().then(setLeaveTypes).catch(console.error);
    });
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filters.status) params.append('status', filters.status);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const res = await hrApiClient.get(`/hr/leave-requests/?${params.toString()}`);
      setRequests(res.data);
    } catch (error) {
      console.error('Failed to fetch leave requests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchRequests();
    }, 300);
    return () => clearTimeout(delay);
  }, [search, filters]);

  const handleProcess = async (status: 'Approved' | 'Rejected') => {
    if (!selectedReq) return;
    if (!comments.trim()) {
      setCommentsError('HR comments are required.');
      return;
    }
    setCommentsError('');
    setProcessing(true);
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      const action = status === 'Approved' ? 'approve' : 'reject';
      await hrApiClient.post(`/hr/leave-requests/${selectedReq.id}/${action}`, { hr_comments: comments });
      setSelectedReq(null);
      setComments('');
      await fetchRequests();
    } catch (error) {
      console.error(`Failed to ${status.toLowerCase()} request`, error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscribeCalendar = async () => {
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      const response = await hrApiClient.get('/hr/leave-requests/calendar.ics', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/calendar' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'leave_calendar.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast('Calendar downloaded successfully', 'success');
    } catch (error) {
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast('Failed to download calendar', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'danger';
      case 'Awaiting HR': return 'warning';
      case 'Pending': return 'default';
      default: return 'default';
    }
  };

  // Safe mapping of employee name as it might be nested
  const getEmployeeName = (req: any) => {
    if (req.employee_name) return req.employee_name;
    if (req.employee) return `${req.employee.first_name} ${req.employee.last_name}`;
    return `Unknown Employee`;
  };

  return (
    <div className="flex h-full w-full flex-col p-6 overflow-hidden pb-20 bg-background text-foreground">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review and process employee leave requests.</p>
        </div>
        <div className="relative flex gap-2">
          <div className="relative group">
            <button onClick={handleSubscribeCalendar} className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-all">
              <CalendarIcon className="h-4 w-4" /> Export Calendar
            </button>
            <div className="absolute top-full mt-2 w-48 rounded bg-popover text-popover-foreground text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-border shadow-lg">
              Download an .ics file that can be imported into Google Calendar, Outlook, or Apple Calendar.
            </div>
          </div>
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-all">
            <Filter className="h-4 w-4" /> Filters
          </button>
          {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-md border border-border bg-card text-card-foreground shadow-lg z-20 p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-semibold text-sm">Filters</h3>
                  <button onClick={() => setIsFilterOpen(false)}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <select 
                      value={filters.status}
                      onChange={e => setFilters({...filters, status: e.target.value})}
                      className="mt-1 w-full text-sm border-border bg-background text-foreground rounded p-1"
                    >
                      <option value="">All</option>
                      <option value="Pending">Pending</option>
                      <option value="Awaiting HR">Awaiting HR</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Department</label>
                    <select 
                      value={filters.department_id}
                      onChange={e => setFilters({...filters, department_id: e.target.value})}
                      className="mt-1 w-full text-sm border-border bg-background text-foreground rounded p-1"
                    >
                      <option value="">All</option>
                      <option value="1">Engineering</option>
                      <option value="2">Sales</option>
                      <option value="3">Marketing</option>
                      <option value="4">HR</option>
                      <option value="5">Finance</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Leave Type</label>
                    <select 
                      value={filters.leave_type_id}
                      onChange={e => setFilters({...filters, leave_type_id: e.target.value})}
                      className="mt-1 w-full text-sm border-border bg-background text-foreground rounded p-1"
                    >
                      <option value="">All</option>
                      {leaveTypes.map(lt => (
                        <option key={lt.id} value={lt.id}>{lt.leave_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                      <input 
                        type="date"
                        value={filters.start_date}
                        onChange={e => setFilters({...filters, start_date: e.target.value})}
                        className="mt-1 w-full text-sm border-border bg-background text-foreground rounded p-1 [color-scheme:dark_light]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">End Date</label>
                      <input 
                        type="date"
                        value={filters.end_date}
                        onChange={e => setFilters({...filters, end_date: e.target.value})}
                        className="mt-1 w-full text-sm border-border bg-background text-foreground rounded p-1 [color-scheme:dark_light]"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border mt-2">
                  <button onClick={() => { setFilters({ department_id: '', status: '', leave_type_id: '', start_date: '', end_date: '' }); }} className="flex-1 text-xs border border-border rounded p-1 hover:bg-muted text-foreground">Reset</button>
                </div>
              </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm text-card-foreground">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="sticky top-0 bg-muted/90 text-xs uppercase text-muted-foreground backdrop-blur-sm z-10 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Leave Type</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Applied On</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </td>
                </tr>
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted cursor-pointer transition-colors" onClick={() => setSelectedReq(req)}>
                    <td className="px-6 py-4 font-medium text-foreground">{req.employee_name || 'Unknown'}</td>
                    <td className="px-6 py-4">{req.leave_type_name}</td>
                    <td className="px-6 py-4">
                      {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{new Date(req.applied_on).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadge(req.status)}>{req.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedReq(req); }}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedReq && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
              onClick={() => setSelectedReq(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-card shadow-2xl flex flex-col text-card-foreground"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <h2 className="text-lg font-semibold">Review Leave Request</h2>
                <button 
                  onClick={() => setSelectedReq(null)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold">{getEmployeeName(selectedReq)}</h3>
                  <p className="text-sm text-muted-foreground">{selectedReq.leave_type?.leave_name || 'Leave'}</p>
                  <div className="mt-3">
                    <Badge variant={getStatusBadge(selectedReq.status)}>{selectedReq.status}</Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/50">
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Department</dt>
                      <dd className="font-medium text-foreground">{selectedReq.department_name || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Manager</dt>
                      <dd className="font-medium text-foreground">{selectedReq.manager_name || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="font-medium text-foreground">
                        {new Date(selectedReq.start_date).toLocaleDateString()} - {new Date(selectedReq.end_date).toLocaleDateString()} ({selectedReq.days} days)
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Applied On</dt>
                      <dd className="font-medium text-foreground">{new Date(selectedReq.applied_on).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                  
                  {(selectedReq.sick_leave_days !== null || selectedReq.annual_leave_days !== null || selectedReq.lwp_days !== null) && (
                    <div className="mt-4 pt-3 border-t border-border space-y-1.5">
                      {selectedReq.sick_leave_days !== null && selectedReq.sick_leave_days > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Sick Leave Used:</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400">{selectedReq.sick_leave_days} Day(s)</span>
                        </div>
                      )}
                      {selectedReq.annual_leave_days !== null && selectedReq.annual_leave_days > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Annual Leave Used:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{selectedReq.annual_leave_days} Day(s)</span>
                        </div>
                      )}
                      {selectedReq.lwp_days !== null && selectedReq.lwp_days > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Leave Without Pay (LWP):</span>
                          <span className="font-medium text-purple-600 dark:text-purple-400">{selectedReq.lwp_days} Day(s)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Reason</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg border border-border">
                    {selectedReq.reason || "No reason provided."}
                  </p>
                </div>

                {/* Workflow Timeline */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Approval Workflow</h4>
                  <div className="relative border-l-2 border-border ml-3 space-y-6">
                    {/* Employee Step */}
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary"></div>
                      <div className="text-sm font-medium">Submitted by {getEmployeeName(selectedReq)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(selectedReq.applied_on).toLocaleDateString()}</div>
                    </div>

                    {/* Manager Step */}
                    <div className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${selectedReq.manager_decision_date ? (selectedReq.status === 'Rejected' && !selectedReq.hr_decision_date ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-muted'}`}></div>
                      <div className="text-sm font-medium">Manager Review</div>
                      {selectedReq.manager_decision_date ? (
                        <>
                          <div className="text-xs text-muted-foreground">Reviewed on {new Date(selectedReq.manager_decision_date).toLocaleDateString()} by {selectedReq.manager_name}</div>
                          {selectedReq.manager_comments && (
                            <div className="mt-1 text-xs italic text-muted-foreground bg-muted p-2 rounded">"{selectedReq.manager_comments}"</div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">Pending</div>
                      )}
                    </div>

                    {/* HR Step */}
                    <div className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${selectedReq.hr_decision_date ? (selectedReq.status === 'Rejected' ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-muted'}`}></div>
                      <div className="text-sm font-medium">HR Review</div>
                      {selectedReq.hr_decision_date ? (
                        <>
                          <div className="text-xs text-muted-foreground">Reviewed on {new Date(selectedReq.hr_decision_date).toLocaleDateString()} by {selectedReq.hr_name}</div>
                          {selectedReq.hr_comments && (
                            <div className="mt-1 text-xs italic text-muted-foreground bg-muted p-2 rounded">"{selectedReq.hr_comments}"</div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">{selectedReq.status === 'Pending' ? 'Waiting for Manager' : 'Pending HR Decision'}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedReq.status === 'Awaiting HR' && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">HR Comments (Required)</h4>
                    <textarea 
                      value={comments}
                      onChange={(e) => {
                        setComments(e.target.value);
                        if (e.target.value.trim()) setCommentsError('');
                      }}
                      className={`w-full rounded-md border ${commentsError ? 'border-rose-500 focus:ring-rose-500' : 'border-border focus:ring-primary'} bg-background p-3 text-sm outline-none focus:border-primary focus:ring-1 text-foreground placeholder:text-muted-foreground`}
                      rows={3}
                      placeholder="Add mandatory remarks before approving/rejecting..."
                    />
                    {commentsError && (
                      <p className="mt-1 text-xs text-rose-500">{commentsError}</p>
                    )}
                  </div>
                )}
              </div>
              
              {selectedReq.status === 'Awaiting HR' && (
                <div className="border-t border-border p-4 flex gap-2">
                  <button 
                    onClick={() => handleProcess('Rejected')}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <XSquare className="h-4 w-4" /> Reject
                  </button>
                  <button 
                    onClick={() => handleProcess('Approved')}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <CheckSquare className="h-4 w-4" /> Approve
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
