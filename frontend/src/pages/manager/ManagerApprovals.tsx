import { useState, useEffect } from 'react';
import { 
  CheckSquare, XSquare, Filter, Search, X, Calendar as CalendarIcon, ArrowRight, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApprovalQueue, approveLeave, rejectLeave, forwardToHR, managerApiClient, getLeaveDetails } from '../../lib/api/manager';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToastStore } from '../../store/toastStore';

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

export default function ManagerApprovals() {
  useDocumentTitle('Leave Approvals');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', leave_type: '' });
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [reqDetails, setReqDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const handleSelectReq = async (req: any) => {
    setSelectedReq(req);
    setReqDetails(null);
    setComments('');
    setDetailsLoading(true);
    try {
      const details = await getLeaveDetails(req.id);
      setReqDetails(details);
    } catch (e) {
      console.error(e);
      addToast('Failed to load request details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getApprovalQueue();
      setRequests(res);
    } catch (error) {
      console.error('Failed to fetch leave requests', error);
      addToast('Failed to load approvals.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleProcess = async (action: 'Approve' | 'Reject' | 'Forward') => {
    if (!selectedReq) return;
    
    if ((action === 'Reject' || action === 'Forward' || action === 'Approve') && !comments.trim()) {
      addToast('Manager comments are required.', 'error');
      return;
    }
    
    setProcessing(true);
    try {
      if (action === 'Approve') {
        await approveLeave(selectedReq.id, comments);
        addToast('Leave request approved successfully.', 'success');
      } else if (action === 'Reject') {
        await rejectLeave(selectedReq.id, comments);
        addToast('Leave request rejected successfully.', 'success');
      } else if (action === 'Forward') {
        await forwardToHR(selectedReq.id, comments);
        addToast('Leave request forwarded to HR.', 'success');
      }
      setSelectedReq(null);
      setComments('');
      await fetchRequests();
    } catch (error: any) {
      addToast(error.response?.data?.detail || `Failed to process request`, 'error');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscribeCalendar = async () => {
    try {
      const response = await managerApiClient.get('/manager/approvals/calendar.ics', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/calendar' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'team_leave_calendar.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast('Calendar downloaded successfully', 'success');
    } catch (error) {
      addToast('Failed to download calendar', 'error');
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

  // Client side filtering since manager queue is small
  const filteredRequests = requests.filter(req => {
    const matchesSearch = (req.employee_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
                          (req.reference_code?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesStatus = filters.status ? req.status === filters.status : true;
    const matchesLeaveType = filters.leave_type ? req.leave_type_name.includes(filters.leave_type) : true;
    return matchesSearch && matchesStatus && matchesLeaveType;
  });

  return (
    <div className="flex h-full w-full flex-col p-6 overflow-hidden pb-20 bg-background text-foreground">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review and process your team's leave requests.</p>
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
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Leave Type</label>
                    <input 
                      type="text"
                      placeholder="e.g. Annual, Sick"
                      value={filters.leave_type}
                      onChange={e => setFilters({...filters, leave_type: e.target.value})}
                      className="mt-1 w-full text-sm border-border bg-background text-foreground rounded p-1 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border mt-2">
                  <button onClick={() => { setFilters({ status: '', leave_type: '' }); }} className="flex-1 text-xs border border-border rounded p-1 hover:bg-muted text-foreground">Reset</button>
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
              placeholder="Search by name or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-muted-foreground min-w-[800px]">
            <thead className="sticky top-0 bg-muted/90 text-xs uppercase text-muted-foreground backdrop-blur-sm z-10 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Leave Type</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Applied On</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </td>
                </tr>
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted cursor-pointer transition-colors" onClick={() => handleSelectReq(req)}>
                    <td className="px-6 py-4 font-medium text-foreground">{req.employee_name || 'Unknown'}</td>
                    <td className="px-6 py-4">{req.leave_type_name}</td>
                    <td className="px-6 py-4">
                      {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{new Date(req.applied_on).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadge(req.status)}>{req.status}</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No pending requests found.
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
                  <h3 className="text-lg font-bold">{selectedReq.employee_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedReq.leave_type_name}</p>
                  <div className="mt-3">
                    <Badge variant={getStatusBadge(selectedReq.status)}>{selectedReq.status}</Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/50">
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Reference</dt>
                      <dd className="font-medium text-foreground">{selectedReq.reference_code}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Department</dt>
                      <dd className="font-medium text-foreground">{selectedReq.department_name || 'N/A'}</dd>
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
                  
                  {reqDetails?.request?.sick_leave_days !== undefined && (reqDetails.request.sick_leave_days !== null || reqDetails.request.annual_leave_days !== null || reqDetails.request.lwp_days !== null) && (
                    <div className="mt-4 pt-3 border-t border-border space-y-1.5">
                      {reqDetails.request.sick_leave_days !== null && reqDetails.request.sick_leave_days > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Sick Leave Used:</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400">{reqDetails.request.sick_leave_days} Day(s)</span>
                        </div>
                      )}
                      {reqDetails.request.annual_leave_days !== null && reqDetails.request.annual_leave_days > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Annual Leave Used:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{reqDetails.request.annual_leave_days} Day(s)</span>
                        </div>
                      )}
                      {reqDetails.request.lwp_days !== null && reqDetails.request.lwp_days > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Leave Without Pay (LWP):</span>
                          <span className="font-medium text-purple-600 dark:text-purple-400">{reqDetails.request.lwp_days} Day(s)</span>
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

                {/* Advanced Details from API */}
                {detailsLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : reqDetails ? (
                  <>
                    {/* Employee Balance */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Leave Balances</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {reqDetails.balances.map((b: any) => (
                          <div key={b.leave_type} className="bg-muted p-2 rounded text-xs">
                            <span className="text-muted-foreground">{b.leave_type}:</span> <span className="font-medium text-foreground">{b.available} days</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Overlaps Warning */}
                    {reqDetails.overlaps && reqDetails.overlaps.length > 0 && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                        <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" /> Overlapping Leaves Detected
                        </h4>
                        <ul className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80 list-disc list-inside">
                          {reqDetails.overlaps.map((o: any) => (
                            <li key={o.id}>Overlap from {new Date(o.start_date).toLocaleDateString()} to {new Date(o.end_date).toLocaleDateString()} ({o.status})</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Timeline */}
                    <div>
                      <h4 className="text-sm font-medium mb-4">Approval Timeline</h4>
                      <div className="relative border-l-2 border-border ml-3 space-y-6">
                        {reqDetails.timeline.map((log: any, idx: number) => (
                          <div key={idx} className="relative pl-6">
                            <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${log.action.includes('REJECT') ? 'bg-rose-500' : 'bg-primary'}`}></div>
                            <div className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()} • {log.role}</div>
                            {log.details && <p className="text-xs mt-1 text-foreground">{log.details}</p>}
                          </div>
                        ))}
                        {selectedReq.status === 'Pending' && (
                          <div className="relative pl-6">
                            <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background bg-muted"></div>
                            <div className="text-sm font-medium">Pending Manager Action</div>
                            <div className="text-xs text-muted-foreground">Waiting for your review</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4">Failed to load advanced details.</div>
                )}
                
                {selectedReq.status === 'Pending' && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Manager Comments (Required)</h4>
                    <textarea 
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                      rows={3}
                      placeholder="Add mandatory remarks before approving/rejecting..."
                    />
                  </div>
                )}
              </div>
              
              {selectedReq.status === 'Pending' && (
                <div className="border-t border-border p-4 flex gap-2">
                  <button 
                    onClick={() => handleProcess('Reject')}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:border-rose-900 dark:text-rose-400"
                  >
                    <XSquare className="h-4 w-4" /> Reject
                  </button>
                  <button 
                    onClick={() => handleProcess('Forward')}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" /> HR
                  </button>
                  <button 
                    onClick={() => handleProcess('Approve')}
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
