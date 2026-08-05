
import { XCircle, Calendar, Download } from 'lucide-react';
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl, downloadIcs } from '../lib/calendar';

interface LeaveDetailsDrawerProps {
  selectedRequest: any;
  reqDetails: any;
  detailsLoading: boolean;
  onClose: () => void;
  onWithdraw?: (id: number) => void;
  showAddToCalendar?: boolean;
}

export default function LeaveDetailsDrawer({
  selectedRequest,
  reqDetails,
  detailsLoading,
  onClose,
  onWithdraw,
  showAddToCalendar = true
}: LeaveDetailsDrawerProps) {
  if (!selectedRequest) return null;

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (status === 'Rejected') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    if (status === 'Withdrawn') return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-card shadow-xl border-l border-border flex flex-col animate-in slide-in-from-right">
        
        <div className="flex items-center justify-between border-b border-border p-6 bg-muted/30">
          <h3 className="text-lg font-semibold text-foreground">Leave Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
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

          {showAddToCalendar && selectedRequest.status === 'Approved' && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2">Add to Calendar</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={generateGoogleCalendarUrl(selectedRequest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Google
                </a>
                <a
                  href={generateOutlookCalendarUrl(selectedRequest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Calendar className="h-4 w-4 text-sky-600" />
                  Outlook
                </a>
                <button
                  onClick={() => downloadIcs(selectedRequest.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Download className="h-4 w-4 text-slate-600" />
                  ICS
                </button>
              </div>
            </div>
          )}

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
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted"
          >
            Close
          </button>
          {onWithdraw && (selectedRequest.status === 'Pending' || selectedRequest.status === 'Approved') && new Date(selectedRequest.start_date) > new Date() && (
            <button 
              onClick={() => onWithdraw(selectedRequest.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700"
            >
              Withdraw Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
