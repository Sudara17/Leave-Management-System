import { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronRight, FileText, Bell } from 'lucide-react';
import { getDashboardSummary, getLeaveBalances, getLeaveHistory, getEmployeeCalendar, withdrawLeave, getLeaveDetails, getNotifications } from '../../lib/api/employee';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LeaveDetailsDrawer from '../../components/LeaveDetailsDrawer';
import LeaveCalendar from '../../components/LeaveCalendar';
import CalendarAction from '../../components/common/CalendarAction';
import { useToastStore } from '../../store/toastStore';

export default function EmployeeDashboard() {
  useDocumentTitle('Employee Portal');
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reqDetails, setReqDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const addToast = useToastStore(state => state.addToast);
  
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [, balData, histData, calData, notifData] = await Promise.all([
        getDashboardSummary(),
        getLeaveBalances(),
        getLeaveHistory(),
        getEmployeeCalendar(),
        getNotifications().catch(() => []) // Gracefully handle if notifications API fails
      ]);
      setBalances(balData);
      setHistory(histData);
      setNotifications(notifData);
      
      const formattedEvents = calData.map((req: any) => {
        let bgColor = '#f59e0b'; // amber-500 (Pending)
        if (req.status === 'Approved') bgColor = '#10b981'; // emerald-500
        else if (req.status === 'Rejected') bgColor = '#f43f5e'; // rose-500
        else if (req.status === 'Withdrawn') bgColor = '#64748b'; // slate-500
        
        return {
          id: req.id.toString(),
          title: `${req.leave_type_name} - ${req.status}`,
          start: req.start_date,
          end: req.end_date,
          backgroundColor: bgColor,
          borderColor: bgColor,
          extendedProps: req
        };
      });
      setCalendarEvents(formattedEvents);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      addToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleEventClick = (info: any) => {
    const req = info.event.extendedProps;
    handleSelectReq(req);
  };

  const handleWithdraw = async (id: number) => {
    if (!confirm('Are you sure you want to withdraw this leave request?')) return;
    try {
      await withdrawLeave(id);
      addToast('Leave request withdrawn successfully', 'success');
      setSelectedRequest(null);
      fetchData(); // Refresh everything to update calendars and history
    } catch (error: any) {
      addToast(error.response?.data?.detail || 'Failed to withdraw leave', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Determine current leave request (most recent pending or upcoming approved)
  const currentRequest = history.find(r => r.status === 'Pending' || r.status === 'Awaiting HR' || (r.status === 'Approved' && new Date(r.start_date) >= new Date()));
  const upcomingLeaves = history.filter(r => r.status === 'Approved' && new Date(r.start_date) >= new Date()).slice(0, 5);
  const recentHistory = history.filter(r => r.status !== 'Pending' && r.status !== 'Awaiting HR').slice(0, 5);

  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back! Here's your leave summary.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/employee/apply-leave')} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all">
            Apply for Leave
          </button>
        </div>
      </div>

      {/* Row 1: Balances */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {balances.map((bal, i) => {
          const isLow = bal.available < 3;
          return (
            <motion.div
              key={bal.leave_type_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">{bal.leave_type_name}</h3>
                <div className={`rounded-full p-2 bg-muted`}>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-4xl font-bold ${isLow ? 'text-rose-500' : 'text-foreground'}`}>{bal.available}</span>
                <span className="text-sm text-muted-foreground mb-1">/ {bal.eligible} days</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-4">
                <div className={`${isLow ? 'bg-rose-500' : 'bg-primary'} h-1.5 rounded-full`} style={{ width: `${(bal.available / (bal.eligible || 1)) * 100}%` }}></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Row 2: Current Leave Request */}
      {currentRequest && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Current Leave Request
              </h3>
              <p className="text-sm text-muted-foreground mt-1">You have a {currentRequest.status.toLowerCase()} request.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSelectReq(currentRequest)} className="px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-muted text-foreground transition-colors">
                View Details
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <p className="font-medium text-foreground">{currentRequest.leave_type_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Dates</p>
              <p className="font-medium text-foreground">{new Date(currentRequest.start_date).toLocaleDateString()} - {new Date(currentRequest.end_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="font-medium text-foreground">{currentRequest.days} Day(s)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                ${currentRequest.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                ${currentRequest.status === 'Pending' || currentRequest.status === 'Awaiting HR' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
              `}>
                {currentRequest.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Actions</p>
              <CalendarAction leave={currentRequest} />
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Monthly Calendar (1/3 width logic applied by constrained grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-foreground mb-4">Leave Calendar</h3>
          
          <div className="flex-1 min-h-[300px]">
            <LeaveCalendar 
              events={calendarEvents} 
              onEventClick={handleEventClick}
              height={400}
              headerToolbar={{
                left: 'title',
                right: 'prev,next'
              }}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Approved</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Pending</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Rejected</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-500"></div> Withdrawn</div>
          </div>
        </div>

        {/* Row 4: Upcoming Leave Table */}
        <div className="md:col-span-2 rounded-xl border border-border bg-card shadow-sm flex flex-col">
          <div className="border-b border-border p-6 bg-muted/30 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Upcoming Approved Leave</h3>
          </div>
          <div className="flex-1 p-0 overflow-x-auto">
            {upcomingLeaves.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium">Leave Type</th>
                    <th className="px-6 py-3 font-medium">Dates</th>
                    <th className="px-6 py-3 font-medium">Days</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {upcomingLeaves.map((req, i) => (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{req.leave_type_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-muted-foreground">{req.days}</td>
                      <td className="px-6 py-4 border-t border-border flex items-center gap-2">
                        <button onClick={() => handleSelectReq(req)} className="text-primary hover:text-primary/80 font-medium whitespace-nowrap">View Details</button>
                        <CalendarAction leave={req} compact={true} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No upcoming approved leave.</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Recent Leave History */}
      <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col">
        <div className="border-b border-border p-6 bg-muted/30 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">Recent Leave History</h3>
          <button onClick={() => navigate('/employee/history')} className="text-sm font-medium text-primary hover:text-primary/80">View All</button>
        </div>
        <div className="flex-1 p-0">
          <ul className="divide-y divide-border">
            {recentHistory.length > 0 ? recentHistory.map((req, i) => {
              let statusColor = 'text-foreground bg-muted';
              if (req.status === 'Approved') statusColor = 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
              else if (req.status === 'Rejected') statusColor = 'text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400';
              else if (req.status === 'Withdrawn') statusColor = 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';

              return (
                <li key={i} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleSelectReq(req)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{req.leave_type_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColor}`}>{req.status}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </li>
              );
            }) : (
              <li className="p-6 text-center text-muted-foreground text-sm">No recent history</li>
            )}
          </ul>
        </div>
      </div>

      {/* Row 6: Notifications */}
      <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col mt-6">
        <div className="border-b border-border p-6 bg-muted/30 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Recent Notifications
          </h3>
          <button className="text-sm font-medium text-primary hover:text-primary/80">View All</button>
        </div>
        <div className="flex-1 p-0">
          <ul className="divide-y divide-border">
            {notifications.length > 0 ? notifications.slice(0, 3).map((notif, i) => (
              <li key={i} className={`p-4 hover:bg-muted/50 transition-colors ${!notif.is_read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">{notif.title}</p>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                </div>
              </li>
            )) : (
              <li className="p-6 text-center text-muted-foreground text-sm">No new notifications</li>
            )}
          </ul>
        </div>
      </div>

      <LeaveDetailsDrawer
        selectedRequest={selectedRequest}
        reqDetails={reqDetails}
        detailsLoading={detailsLoading}
        onClose={() => setSelectedRequest(null)}
        onWithdraw={handleWithdraw}
        showAddToCalendar={true}
      />
    </div>
  );
}
