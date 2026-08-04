import { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { getDashboardSummary, getLeaveBalances, getLeaveHistory } from '../../lib/api/employee';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function EmployeeDashboard() {
  useDocumentTitle('Employee Portal');
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [, balData, histData] = await Promise.all([
          getDashboardSummary(),
          getLeaveBalances(),
          getLeaveHistory()
        ]);
        setBalances(balData);
        setHistory(histData.slice(0, 5)); // Just recent 5
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {balances.map((bal, i) => {
          const isLow = bal.available < 3;
          return (
            <motion.div
              key={bal.leave_type_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col">
          <div className="border-b border-border p-6 flex justify-between items-center bg-muted/30">
            <h3 className="text-lg font-semibold text-foreground">Recent Applications</h3>
            <button onClick={() => navigate('/employee/history')} className="text-sm font-medium text-primary hover:text-primary/80">View History</button>
          </div>
          <div className="flex-1 p-0">
            <ul className="divide-y divide-border">
              {history.length > 0 ? history.map((req, i) => {
                let statusColor = 'text-foreground bg-muted';
                if (req.status === 'Approved') statusColor = 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
                else if (req.status === 'Rejected') statusColor = 'text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400';
                else if (req.status === 'Pending' || req.status === 'Awaiting HR') statusColor = 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';

                return (
                  <li key={i} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate('/employee/history')}>
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
                <li className="p-6 text-center text-muted-foreground text-sm">No recent applications</li>
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Upcoming Holidays</h3>
          <div className="space-y-4">
            {[
              { name: 'Thanksgiving Day', date: 'Nov 28, 2026', day: 'Thursday' },
              { name: 'Christmas Day', date: 'Dec 25, 2026', day: 'Friday' },
              { name: 'New Year\'s Day', date: 'Jan 1, 2027', day: 'Friday' },
            ].map((holiday, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/50">
                <div>
                  <p className="font-medium text-foreground">{holiday.name}</p>
                  <p className="text-xs text-muted-foreground">{holiday.day}</p>
                </div>
                <div className="text-sm font-medium text-foreground bg-background px-3 py-1 rounded-md border border-border">
                  {holiday.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
