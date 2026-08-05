import { useEffect, useState } from 'react';
import { 
  Users, UserCheck, CalendarClock,
  Activity, ShieldAlert, FileText, CheckCircle, Clock, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Variants } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { hrApiClient, getHrCalendar } from '../../lib/api/hr';
import { getLeaveDetails } from '../../lib/api/employee';
import EmployeeFormDrawer from '../../components/hr/EmployeeFormDrawer';
import LeaveCalendar from '../../components/LeaveCalendar';
import LeaveDetailsDrawer from '../../components/LeaveDetailsDrawer';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToastStore } from '../../store/toastStore';

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function HRDashboard() {
  useDocumentTitle('HR Portal');
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [chartsData, setChartsData] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reqDetails, setReqDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, actRes, chartsRes, calRes] = await Promise.all([
        hrApiClient.get('/hr/dashboard/summary').then(r => r.data),
        hrApiClient.get('/hr/dashboard/recent-activity').then(r => r.data),
        hrApiClient.get('/hr/dashboard/charts').then(r => r.data),
        getHrCalendar()
      ]);
      setSummary(sumRes);
      setActivities(actRes);
      setChartsData(chartsRes);
      
      const formattedEvents = calRes.map((req: any) => {
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
      console.error("Error fetching dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await hrApiClient.get('/hr/reports/dashboard/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'hr_dashboard_report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      useToastStore.getState().addToast('Report downloaded successfully', 'success');
    } catch (error) {
      useToastStore.getState().addToast('Failed to download report', 'error');
    }
  };

  const handleSelectReq = async (req: any) => {
    setSelectedRequest(req);
    setReqDetails(null);
    setDetailsLoading(true);
    try {
      const details = await getLeaveDetails(req.id);
      setReqDetails(details);
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast('Failed to load request details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleEventClick = (info: any) => {
    const req = info.event.extendedProps;
    handleSelectReq(req);
  };

  if (loading && !summary) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-background">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Employees", value: summary?.total_employees || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100", link: "/hr/employees" },
    { title: "Active Employees", value: summary?.active_employees || 0, icon: UserCheck, color: "text-green-600", bg: "bg-green-100", link: "/hr/employees" },
    { title: "On Leave Today", value: summary?.employees_on_leave || 0, icon: CalendarClock, color: "text-amber-600", bg: "bg-amber-100", link: "/hr/leave-approvals" },
    { title: "Pending HR Approvals", value: summary?.pending_hr_approvals || 0, icon: CheckCircle, color: "text-purple-600", bg: "bg-purple-100", link: "/hr/leave-approvals" },
    { title: "Pending Eligibility", value: summary?.pending_eligibility_reviews || 0, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-100", link: "/hr/employees" },
    { title: "Policy Acceptance", value: `${summary?.policy_acceptance_percentage || 0}%`, icon: FileText, color: "text-teal-600", bg: "bg-teal-100", link: "/hr/settings" },
  ];

  const monthlyTrend = chartsData?.monthly_trend || [];
  const deptData = chartsData?.department_distribution || [];

  return (
    <div className="space-y-6 p-6 pb-20 bg-background text-foreground">
      <EmployeeFormDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          onSuccess={fetchDashboardData} 
        />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Executive Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Company overview and leave analytics.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadReport}
            className="rounded-md bg-card px-4 py-2 text-sm font-medium shadow-sm border border-border hover:bg-muted transition-all"
          >
            Download Report
          </button>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
          >
            Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            onClick={() => navigate(stat.link)}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all cursor-pointer text-card-foreground backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div className={`rounded-full p-3 ${stat.bg} dark:bg-opacity-20`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm flex flex-col">
          <div className="border-b border-border p-6 flex justify-between items-center bg-muted/30">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <button onClick={() => navigate('/hr/audit-logs')} className="text-sm font-medium text-primary hover:text-primary/80">View Logs</button>
          </div>
          <div className="flex-1 p-0">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No recent activity.</div>
            ) : (
              <ul className="divide-y divide-border">
                {activities.map((act, i) => (
                  <li key={i} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Activity className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{act.action}</p>
                          <p className="text-xs text-muted-foreground">{act.details}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{new Date(act.timestamp).toLocaleDateString()}</div>
                        <div>{new Date(act.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Calendar */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-foreground mb-4">Organization Calendar</h3>
          
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
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-500"></div> Other</div>
          </div>
        </div>
        
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm text-card-foreground">
          <h3 className="text-lg font-semibold mb-6">Leave Trend (Year-to-Date)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeaves" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="leaves" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeaves)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-card-foreground">
          <h3 className="text-lg font-semibold mb-6">Headcount by Department</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="45%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {deptData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
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
