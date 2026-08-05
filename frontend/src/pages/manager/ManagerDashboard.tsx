import { useState, useEffect } from 'react';
import { 
  Users, Clock, Calendar, 
  ChevronRight, AlertCircle, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getManagerDashboardSummary, getApprovalQueue, getUpcomingLeaves, getManagerCalendar } from '../../lib/api/manager';
import { getLeaveDetails, approveLeave, rejectLeave, forwardToHR } from '../../lib/api/manager';
import { useNavigate } from 'react-router-dom';
import LeaveCalendar from '../../components/LeaveCalendar';
import LeaveDetailsDrawer from '../../components/LeaveDetailsDrawer';
import { useToastStore } from '../../store/toastStore';

export default function ManagerDashboard() {
  useDocumentTitle('Manager Portal');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reqDetails, setReqDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumData, appData, upcomingData, calData] = await Promise.all([
        getManagerDashboardSummary(),
        getApprovalQueue(),
        getUpcomingLeaves(),
        getManagerCalendar()
      ]);
      setSummary(sumData);
      setApprovals(appData.slice(0, 5)); // Top 5 pending
      setUpcoming(upcomingData);

      const formattedEvents = calData.map((req: any) => {
        let bgColor = '#f59e0b'; // amber-500
        if (req.status === 'Approved') bgColor = '#10b981'; // emerald-500
        else if (req.status === 'Rejected') bgColor = '#f43f5e'; // rose-500
        else if (req.status === 'Withdrawn') bgColor = '#64748b'; // slate-500
        
        return {
          id: req.id.toString(),
          title: `${req.employee_name} - ${req.leave_type_name}`,
          start: req.start_date,
          end: req.end_date,
          backgroundColor: bgColor,
          borderColor: bgColor,
          extendedProps: req
        };
      });
      setCalendarEvents(formattedEvents);
    } catch (error) {
      console.error(error);
      addToast('Failed to load manager dashboard', 'error');
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const teamStats = summary ? [
    { title: "Team Members", value: summary.team_size.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-100", link: "/manager/team" },
    { title: "On Leave Today", value: summary.employees_on_leave_today.toString(), icon: Calendar, color: "text-amber-600", bg: "bg-amber-100", link: "/manager/team" },
    { title: "Pending Approvals", value: summary.pending_approvals.toString(), icon: Clock, color: "text-purple-600", bg: "bg-purple-100", link: "/manager/approvals" },
    { title: "Leave Utilization", value: summary.team_eligible_leave > 0 ? `${Math.round((summary.team_used_leave / summary.team_eligible_leave) * 100)}%` : "0%", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100", link: "/manager/history" },
  ] : [];

  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manager Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Overview of your team's attendance and leaves.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {teamStats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(stat.link)}
            className="cursor-pointer hover:border-blue-300 transition-colors rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
              </div>
              <div className={`rounded-full p-3 ${stat.bg} dark:bg-opacity-20`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Approvals and Upcoming */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pending Approvals */}
          <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col">
            <div className="border-b border-border p-6 flex justify-between items-center bg-muted/30">
              <h3 className="text-lg font-semibold text-foreground">Action Required</h3>
              <button onClick={() => navigate('/manager/approvals')} className="text-sm font-medium text-primary hover:text-primary/80">View All</button>
            </div>
            <div className="flex-1 p-0">
              {approvals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No pending approvals.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {approvals.map((req) => (
                    <li key={req.id} onClick={() => handleSelectReq(req)} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold group-hover:text-primary transition-colors">
                            {req.employee_name?.substring(0, 2).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{req.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{req.leave_type_name} • {req.days} Days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full dark:bg-amber-900/30">Pending</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Upcoming Absences */}
          <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col">
            <div className="border-b border-border p-6 flex justify-between items-center bg-muted/30">
              <h3 className="text-lg font-semibold text-foreground">Upcoming Absences</h3>
              <button onClick={() => navigate('/manager/team')} className="text-sm font-medium text-primary hover:text-primary/80">View Team</button>
            </div>
            <div className="flex-1 p-0 overflow-x-auto">
              {upcoming.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No upcoming absences found for your team.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">Employee</th>
                      <th className="px-6 py-3 font-medium">Leave Type</th>
                      <th className="px-6 py-3 font-medium">Dates</th>
                      <th className="px-6 py-3 font-medium">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {upcoming.map((absence, i) => (
                      <tr key={i} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{absence.employee_name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{absence.leave_type_name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(absence.start_date).toLocaleDateString()} - {new Date(absence.end_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-muted-foreground">{absence.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Calendar and Alerts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-foreground mb-4">Team Calendar</h3>
            <div className="flex-1 min-h-[350px]">
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
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-500"></div> Withdrawn/Other</div>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50/50 dark:bg-blue-900/10 p-5 border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Coverage Alert</h4>
                <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                  Multiple team members are scheduled to be on leave during the last week of this month. Please review coverage plans.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <LeaveDetailsDrawer
        selectedRequest={selectedRequest}
        reqDetails={reqDetails}
        detailsLoading={detailsLoading}
        onClose={() => setSelectedRequest(null)}
        showAddToCalendar={false}
      />
    </div>
  );
}
