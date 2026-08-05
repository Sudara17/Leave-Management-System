import { useState, useEffect } from 'react';
import { Search, Eye, XCircle } from 'lucide-react';
import { getLeaveHistory, withdrawLeave, getLeaveDetails } from '../../lib/api/employee';
import { useToastStore } from '../../store/toastStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function LeaveHistory() {
  useDocumentTitle('Leave History');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setStatus] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reqDetails, setReqDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  const addToast = useToastStore(state => state.addToast);

  const handleSelectReq = async (req: any) => {
    setSelectedRequest(req);
    setReqDetails(null);
    setDetailsLoading(true);
    try {
      const details = await getLeaveDetails(req.id);
      setReqDetails(details);
    } catch (error) {
      console.error(error);
      addToast('Failed to load request details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getLeaveHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch history', error);
      addToast('Failed to load leave history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleWithdraw = async (id: number) => {
    if (!confirm('Are you sure you want to withdraw this leave request?')) return;
    try {
      await withdrawLeave(id);
      addToast('Leave request withdrawn successfully', 'success');
      setSelectedRequest(null);
      fetchHistory();
    } catch (error: any) {
      addToast(error.response?.data?.detail || 'Failed to withdraw leave', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (status === 'Rejected') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    if (status === 'Withdrawn') return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  const filteredHistory = history.filter(req => {
    const matchesSearch = req.leave_type_name.toLowerCase().includes(search.toLowerCase()) || 
                          req.reference_code.toLowerCase().includes(search.toLowerCase());
    const matches= filterStatus ? req.status === filterStatus : true;
    return matchesSearch && matches;
  });

  return (
    <div className="flex h-full w-full flex-col p-6 overflow-hidden pb-20">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Leave History</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage your past and upcoming leave requests.</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by type or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select 
                value={filterStatus}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-md border border-border bg-background pl-8 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
              <div className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
             <div className="flex h-full items-center justify-center">
               <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
             </div>
          ) : (
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="sticky top-0 bg-muted text-xs uppercase border-b border-border z-10">
                <tr>
                  <th className="px-6 py-4 font-medium">Reference ID</th>
                  <th className="px-6 py-4 font-medium">Leave Type</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium">Dates</th>
                  <th className="px-6 py-4 font-medium">Submitted At</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistory.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{req.reference_code}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{req.leave_type_name}</td>
                    <td className="px-6 py-4">{req.days} Day(s)</td>
                    <td className="px-6 py-4">{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{req.submitted_at ? new Date(req.submitted_at).toLocaleString() : new Date(req.applied_on).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleSelectReq(req)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-card shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
              <h2 className="text-lg font-semibold text-foreground">Request Details</h2>
              <button onClick={() => setSelectedRequest(null)} className="rounded-md p-1 hover:bg-muted text-muted-foreground">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Reference ID</p>
                  <p className="font-medium text-foreground">{selectedRequest.reference_code}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Leave Type</p>
                  <p className="font-medium text-foreground">{selectedRequest.leave_type_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="font-medium text-foreground">{selectedRequest.days} Day(s)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                  <p className="font-medium text-foreground">{new Date(selectedRequest.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">End Date</p>
                  <p className="font-medium text-foreground">{new Date(selectedRequest.end_date).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Submitted At</p>
                  <p className="font-medium text-foreground">{selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleString() : new Date(selectedRequest.applied_on).toLocaleString()}</p>
                </div>
                {(selectedRequest.sick_leave_days !== null || selectedRequest.annual_leave_days !== null || selectedRequest.lwp_days !== null) && (
                  <>
                    {selectedRequest.sick_leave_days !== null && selectedRequest.sick_leave_days > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Sick Leave Used</p>
                        <p className="font-medium text-amber-600 dark:text-amber-400">{selectedRequest.sick_leave_days} Day(s)</p>
                      </div>
                    )}
                    {selectedRequest.annual_leave_days !== null && selectedRequest.annual_leave_days > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Annual Leave Used</p>
                        <p className="font-medium text-blue-600 dark:text-blue-400">{selectedRequest.annual_leave_days} Day(s)</p>
                      </div>
                    )}
                    {selectedRequest.lwp_days !== null && selectedRequest.lwp_days > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Leave Without Pay (LWP)</p>
                        <p className="font-medium text-purple-600 dark:text-purple-400">{selectedRequest.lwp_days} Day(s)</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Reason</p>
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground">
                  {(reqDetails?.request?.reason) || selectedRequest.reason || 'No reason provided.'}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-4">Approval Timeline</h4>
                {detailsLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : reqDetails && reqDetails.timeline ? (
                  <div className="relative border-l-2 border-border ml-3 space-y-6">
                    {reqDetails.timeline.map((log: any, idx: number) => (
                      <div key={idx} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${log.action.includes('REJECT') || log.action.includes('WITHDRAW') ? 'bg-rose-500' : 'bg-primary'}`}></div>
                        <div className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()} • {log.role}</div>
                        {log.details && <p className="text-xs mt-1 text-foreground">{log.details}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4">Timeline not available.</div>
                )}
              </div>

            </div>
            
            <div className="border-t border-border p-4 bg-muted/30 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted"
              >
                Close
              </button>
              {(selectedRequest.status === 'Pending' || selectedRequest.status === 'Approved') && new Date(selectedRequest.start_date) > new Date() && (
                <button 
                  onClick={() => handleWithdraw(selectedRequest.id)}
                  className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-900"
                >
                  Withdraw Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
