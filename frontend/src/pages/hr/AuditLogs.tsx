import { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, Filter, Activity, Server, Clock, Download
} from 'lucide-react';
import { getAuditLogs } from '../../lib/api/hr';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// Badge Component
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    default: 'bg-muted text-foreground',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    info: 'bg-primary/10 text-primary',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default function AuditLogs() {
  useDocumentTitle('Audit Logs');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [filters, setFilters] = useState({ action: '', role: '' });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { skip: page * limit, limit };
      if (filters.action) params.action = filters.action;
      if (filters.role) params.role = filters.role;
      if (search) params.search = search;
      
      const data = await getAuditLogs(params);
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Adding debounce for search to prevent too many requests
    const delay = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(delay);
  }, [page, filters, search]);

  const handleExport = async (format: string) => {
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filters.action) params.append('action', filters.action);
      if (filters.role) params.append('role', filters.role);
      
      const response = await hrApiClient.get(`/hr/audit-logs/export/${format}?${params.toString()}`, { responseType: 'blob' });
      
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
      link.setAttribute('download', `audit_logs_export${extensions[format]}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast(`Export downloaded successfully`, 'success');
      setIsExportOpen(false);
    } catch (error) {
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast(`Failed to export logs`, 'error');
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.details?.toLowerCase().includes(search.toLowerCase()) ||
    log.role?.toLowerCase().includes(search.toLowerCase())
  );

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toUpperCase();
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('APPROVE')) return 'success';
    if (action.includes('DELETE') || action.includes('REJECT') || action.includes('TERMINATE')) return 'danger';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'warning';
    return 'default';
  };

  return (
    <div className="flex h-full w-full flex-col p-6 overflow-hidden pb-20 bg-background text-foreground">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Company security and activity tracking.</p>
        </div>
        <div className="flex gap-2 relative">
          <button onClick={() => setIsExportOpen(!isExportOpen)} className="flex items-center gap-2 rounded-md bg-card px-4 py-2 text-sm font-medium shadow-sm border border-border hover:bg-muted transition-all">
            <Download className="h-4 w-4" /> Export Logs
          </button>
          {isExportOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 rounded-md border border-border bg-card shadow-lg p-1 z-10">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted rounded">CSV</button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted rounded">Excel</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted rounded">PDF</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm text-card-foreground">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search actions, details, roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <div className="flex items-center gap-2 relative">
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
              <Filter className="h-4 w-4" /> Filter
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-md border border-border bg-card shadow-lg p-4 z-10 flex flex-col gap-3">
                <div className="text-sm font-semibold mb-1 border-b border-border pb-2">Filter Logs</div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Action Type</label>
                  <select 
                    value={filters.action}
                    onChange={e => setFilters({...filters, action: e.target.value})}
                    className="w-full text-sm border-border bg-background text-foreground rounded p-1"
                  >
                    <option value="">All Actions</option>
                    <option value="ADD_HOLIDAY">ADD HOLIDAY</option>
                    <option value="UPDATE_COMPANY_SETTINGS">UPDATE SETTINGS</option>
                    <option value="CREATE_USER">CREATE USER</option>
                    <option value="UPDATE_USER">UPDATE USER</option>
                    <option value="CREATE_EMPLOYEE">CREATE EMPLOYEE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Role</label>
                  <select 
                    value={filters.role}
                    onChange={e => setFilters({...filters, role: e.target.value})}
                    className="w-full text-sm border-border bg-background text-foreground rounded p-1"
                  >
                    <option value="">All Roles</option>
                    <option value="HR">HR</option>
                    <option value="Manager">Manager</option>
                    <option value="System">System</option>
                  </select>
                </div>
                <button 
                  onClick={() => setFilters({ action: '', role: '' })}
                  className="mt-2 w-full text-xs border border-border rounded py-1.5 hover:bg-muted"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* List / Table */}
        <div className="flex-1 overflow-auto bg-background">
          {loading && logs.length === 0 ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className="hidden sm:flex flex-col items-center justify-start pt-1">
                    <div className={`rounded-full p-2 ${getActionBadge(log.action) === 'success' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : getActionBadge(log.action) === 'danger' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : getActionBadge(log.action) === 'warning' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge variant={getActionBadge(log.action)}>{formatAction(log.action)}</Badge>
                      <span className="text-sm font-medium">User ID: {log.user_id}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> {log.role || 'System'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground break-words mt-2 font-mono bg-muted p-2 rounded border border-border">
                      {log.details || 'No details provided.'}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      {log.ip_address && (
                        <div className="flex items-center gap-1">
                          <Server className="h-3.5 w-3.5" />
                          {log.ip_address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              No audit logs found matching your criteria.
            </div>
          )}
        </div>
        
        <div className="border-t border-border p-4 flex items-center justify-between bg-card">
          <span className="text-sm text-muted-foreground">Showing page {page + 1}</span>
          <div className="flex gap-2">
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="rounded px-3 py-1 text-sm border border-border hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              className="rounded px-3 py-1 text-sm border border-border hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
