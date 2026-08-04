import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Umbrella, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { getLeaveBalances } from '../../lib/api/employee';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function LeaveBalances() {
  useDocumentTitle('Leave Balances');
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);

  useEffect(() => {
    getLeaveBalances()
      .then(setBalances)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getIcon = (type: string) => {
    if (type.toLowerCase().includes('annual')) return Calendar;
    if (type.toLowerCase().includes('sick')) return AlertCircle;
    if (type.toLowerCase().includes('casual')) return Umbrella;
    return ShieldCheck;
  };

  const getColorClass = (type: string) => {
    if (type.toLowerCase().includes('annual')) return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
    if (type.toLowerCase().includes('sick')) return 'text-rose-500 bg-rose-100 dark:bg-rose-900/30';
    if (type.toLowerCase().includes('casual')) return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30';
    return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30';
  };

  const getProgressColor = (type: string) => {
    if (type.toLowerCase().includes('annual')) return 'bg-blue-500';
    if (type.toLowerCase().includes('sick')) return 'bg-rose-500';
    if (type.toLowerCase().includes('casual')) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Leave Balances</h1>
        <p className="mt-1 text-sm text-muted-foreground">Detailed breakdown of your leave entitlements and usage.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((bal, i) => {
          const Icon = getIcon(bal.leave_type_name);
          const iconColor = getColorClass(bal.leave_type_name);
          const progressColor = getProgressColor(bal.leave_type_name);
          const isLow = bal.available < 3;
          
          return (
            <motion.div
              key={bal.leave_type_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">{bal.leave_type_name}</h3>
                <div className={`rounded-full p-2 ${iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-4xl font-bold ${isLow ? 'text-rose-500' : 'text-foreground'}`}>{bal.available}</span>
                <span className="text-sm text-muted-foreground mb-1">/ {bal.eligible} days</span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-1.5 mt-4">
                <div className={`${isLow ? 'bg-rose-500' : progressColor} h-1.5 rounded-full`} style={{ width: `${(bal.available / (bal.eligible || 1)) * 100}%` }}></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Leave Usage Overview</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balances} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8884d8" opacity={0.2} />
                <XAxis dataKey="leave_type_name" axisLine={false} tickLine={false} tick={{fill: '#8884d8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#8884d8'}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1f2937', borderColor: '#1f2937', color: '#fff'}} />
                <Bar dataKey="used" name="Used" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border bg-muted/30">
            <h3 className="text-lg font-semibold text-foreground">Detailed Breakdown</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="bg-muted text-xs uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Leave Type</th>
                  <th className="px-6 py-4 font-medium text-center">Eligible</th>
                  <th className="px-6 py-4 font-medium text-center">Used</th>
                  <th className="px-6 py-4 font-medium text-center">Pending</th>
                  <th className="px-6 py-4 font-medium text-center">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balances.map((bal, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium text-foreground">{bal.leave_type_name}</td>
                    <td className="px-6 py-4 text-center">{bal.eligible}</td>
                    <td className="px-6 py-4 text-center text-primary">{bal.used}</td>
                    <td className="px-6 py-4 text-center text-amber-500">{bal.pending}</td>
                    <td className="px-6 py-4 text-center font-bold text-foreground">{bal.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
