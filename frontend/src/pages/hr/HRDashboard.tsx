import { useEffect, useState } from 'react';
import { 
  Users, UserCheck, CalendarClock,
  Activity, ShieldAlert, FileText, CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Variants } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { getHRDashboardSummary, getHRRecentActivity, hrApiClient } from '../../lib/api/hr';
import EmployeeFormDrawer from '../../components/hr/EmployeeFormDrawer';
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
  const [loading, setLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      const [sumRes, actRes, chartsRes] = await Promise.all([
        hrApiClient.get('/hr/dashboard/summary').then(r => r.data),
        hrApiClient.get('/hr/dashboard/recent-activity').then(r => r.data),
        hrApiClient.get('/hr/dashboard/charts').then(r => r.data)
      ]);
      setSummary(sumRes);
      setActivities(actRes);
      setChartsData(chartsRes);
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
                  {deptData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card shadow-sm text-card-foreground overflow-hidden">
          <div className="border-b border-border p-6">
            <h3 className="text-lg font-semibold">Recent Audit Logs</h3>
          </div>
          <div className="p-0">
            <ul className="divide-y divide-border max-h-96 overflow-y-auto">
              {activities.length > 0 ? (
                activities.slice(0, 10).map((activity: any) => (
                  <li key={activity.id} className="p-4 hover:bg-muted transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Activity className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {activity.action.replace(/_/g, ' ')}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {activity.who} • {activity.role}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.when).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">No recent activity.</div>
              )}
            </ul>
          </div>
        </div>
        
        {/* Leave Utilization Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-card-foreground">
          <h3 className="text-lg font-semibold mb-6">Company Leave Utilization</h3>
          <div className="flex flex-col justify-center h-80 space-y-8 px-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Total Leaves Available</span>
                <span className="text-sm font-medium">{summary.total_company_leave} Days</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Total Leaves Used</span>
                <span className="text-sm font-medium">{summary.used_leave} Days</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${(summary.used_leave / (summary.total_company_leave || 1)) * 100}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Remaining Balance</span>
                <span className="text-sm font-medium">{summary.available_leave} Days</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${(summary.available_leave / (summary.total_company_leave || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
