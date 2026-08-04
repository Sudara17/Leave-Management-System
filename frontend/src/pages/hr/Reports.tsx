import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { getDepartmentLeaveReport, getLeaveTypeReport } from '../../lib/api/hr';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function Reports() {
  useDocumentTitle('Reports');
  const [deptData, setDeptData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dept, type] = await Promise.all([
          getDepartmentLeaveReport(),
          getLeaveTypeReport()
        ]);
        setDeptData(dept);
        setTypeData(type);
      } catch (error) {
        console.error('Failed to fetch reports', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = async (format: string) => {
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      const response = await hrApiClient.get(`/hr/reports/dashboard/export/${format}`, { responseType: 'blob' });
      
      const mimeTypes: any = {
        'csv': 'text/csv',
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'pdf': 'application/pdf'
      };
      
      const extensions: any = {
        'csv': '.csv',
        'excel': '.xlsx',
        'pdf': '.pdf'
      };
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeTypes[format] }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hr_report${extensions[format]}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast(`Report downloaded successfully`, 'success');
    } catch (error) {
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast(`Failed to download report`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics & Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Export and view company data.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('excel')} className="flex items-center gap-2 rounded-md bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm border border-border hover:bg-muted transition-all">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
          <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 rounded-md bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm border border-border hover:bg-muted transition-all">
            <FileText className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Leave Usage by Department</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="department_name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: '#334155', opacity: 0.1 }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="total_used" name="Used Leaves" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="total_available" name="Available Leaves" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Leave Requests by Type</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="leave_type_name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: '#334155', opacity: 0.1 }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="approved_requests" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected_requests" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Table view of department data */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mt-2">
        <div className="border-b border-border p-4 flex justify-between items-center bg-muted/30">
          <h3 className="text-lg font-semibold text-foreground">Detailed Department Report</h3>
          <button onClick={() => handleExport('csv')} className="flex items-center gap-2 rounded-md bg-background px-3 py-1.5 text-sm font-medium text-foreground border border-border hover:bg-muted">
            <Download className="h-4 w-4" /> Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Total Eligible</th>
                <th className="px-6 py-4 font-medium">Total Used</th>
                <th className="px-6 py-4 font-medium">Total Pending</th>
                <th className="px-6 py-4 font-medium">Available</th>
                <th className="px-6 py-4 font-medium">Utilization %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deptData.map((dept, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium text-foreground">{dept.department_name}</td>
                  <td className="px-6 py-4">{dept.total_eligible}</td>
                  <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400">{dept.total_used}</td>
                  <td className="px-6 py-4 text-amber-600 dark:text-amber-400">{dept.total_pending}</td>
                  <td className="px-6 py-4">{dept.total_available}</td>
                  <td className="px-6 py-4 font-medium">
                    {dept.total_eligible > 0 ? ((dept.total_used / dept.total_eligible) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
