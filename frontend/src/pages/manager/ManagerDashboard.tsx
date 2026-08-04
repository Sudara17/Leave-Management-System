import { useState, useEffect } from 'react';
import { 
  Users, Clock, Calendar, 
  ChevronRight, AlertCircle, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getManagerDashboardSummary, getApprovalQueue, getUpcomingLeaves } from '../../lib/api/manager';
import { useNavigate } from 'react-router-dom';

export default function ManagerDashboard() {
  useDocumentTitle('Manager Portal');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getManagerDashboardSummary(),
      getApprovalQueue(),
      getUpcomingLeaves()
    ]).then(([sumData, appData, upcomingData]) => {
      setSummary(sumData);
      setApprovals(appData.slice(0, 3)); // Top 3 pending
      setUpcoming(upcomingData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

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
            className="cursor-pointer hover:border-blue-300 transition-colors rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`rounded-full p-3 ${stat.bg} dark:bg-opacity-20`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/50 flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Action Required</h3>
            <button onClick={() => navigate('/manager/approvals')} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View All</button>
          </div>
          <div className="flex-1 p-0">
            {approvals.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No pending approvals.</div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {approvals.map((req) => (
                  <li key={req.id} onClick={() => navigate('/manager/approvals')} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold dark:bg-slate-800 dark:text-slate-300">
                          {req.employee_name?.substring(0, 2).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{req.employee_name}</p>
                          <p className="text-xs text-slate-500">{req.leave_type_name} • {req.days} Days</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full dark:bg-amber-900/30">Pending</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Team Activity */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/50 flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Absences</h3>
            <button onClick={() => navigate('/manager/team')} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">View Team</button>
          </div>
          <div className="flex-1 p-6">
            <div className="space-y-6">
              {upcoming.length === 0 ? (
                <div className="text-center text-slate-500 py-4">No upcoming absences found for your team.</div>
              ) : (
                upcoming.map((absence, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 shadow-sm bg-blue-500" style={{ backgroundColor: 'currentColor' }}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{absence.employee_name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">{absence.leave_type_name}</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {new Date(absence.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8 rounded-lg bg-blue-50 p-4 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Project Deadline Approaching</h4>
                  <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                    3 team members have approved leave during the Q4 delivery week (Oct 24-28). Ensure coverage plans are in place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
