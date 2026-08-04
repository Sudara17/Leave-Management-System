import { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, UserX, 
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getEmployees } from '../../lib/api/hr';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// Simple Badge component
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' }) => {
  const variants = {
    default: 'bg-muted text-foreground',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default function EmployeeManagement() {
  useDocumentTitle('Employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [Drawer, setDrawer] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ department_id: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    import('../../components/hr/EmployeeFormDrawer').then(mod => setDrawer(() => mod.default));
  }, []);

  const handleExportCSV = async () => {
    try {
      const employeesList = filteredEmployees;
      
      const headers = ["Employee ID", "First Name", "Last Name", "Email", "Department", "Role", "Status", "Joining Date"];
      const rows = employeesList.map((emp: any) => [
        emp.employee_code,
        emp.first_name,
        emp.last_name,
        emp.official_email,
        emp.department_id,
        emp.role_id,
        emp.employment_status,
        emp.joining_date
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map((row: any) => row.join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "employees_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast('Exported successfully', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to deactivate this employee? This will set their status to Terminated.")) return;
    
    setProcessing(true);
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      await hrApiClient.delete(`/hr/employees/${empId}`);
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast('Employee deactivated successfully', 'success');
      await fetchEmployees();
    } catch (error) {
      console.error('Failed to deactivate employee', error);
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast('Failed to deactivate employee', 'error');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      (emp.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (emp.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (emp.employee_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (emp.official_email || '').toLowerCase().includes(search.toLowerCase());
      
    const matchesDept = filters.department_id ? String(emp.department_id) === filters.department_id : true;
    const matchesStatus = filters.status ? emp.employment_status === filters.status : true;
    
    return matchesSearch && matchesDept && matchesStatus;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'name') {
      aValue = `${a.first_name || ''} ${a.last_name || ''}`;
      bValue = `${b.first_name || ''} ${b.last_name || ''}`;
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);
  const paginatedEmployees = sortedEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex h-full w-full flex-col p-6 overflow-hidden pb-20 bg-background text-foreground">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your company workforce.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="rounded-md bg-card px-4 py-2 text-sm font-medium shadow-sm border border-border hover:bg-muted transition-all">
            Export CSV
          </button>
          <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all">
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm text-card-foreground">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-transparent py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <div className="relative flex items-center gap-2">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Filter className="h-4 w-4" /> Filter
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-md border border-border bg-card text-card-foreground shadow-lg z-20 p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-semibold text-sm">Filters</h3>
                  <button onClick={() => setIsFilterOpen(false)}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Department</label>
                    <select 
                      value={filters.department_id}
                      onChange={e => setFilters({...filters, department_id: e.target.value})}
                      className="mt-1 w-full text-sm border-border bg-background text-foreground rounded p-1"
                    >
                      <option value="">All</option>
                      <option value="1">Engineering</option>
                      <option value="2">Sales</option>
                      <option value="3">Marketing</option>
                      <option value="4">HR</option>
                      <option value="5">Finance</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <select 
                      value={filters.status}
                      onChange={e => setFilters({...filters, status: e.target.value})}
                      className="mt-1 w-full text-sm border-border bg-background text-foreground rounded p-1"
                    >
                      <option value="">All</option>
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border mt-2">
                  <button onClick={() => { setFilters({ department_id: '', status: '' }); }} className="flex-1 text-xs border border-border rounded p-1 hover:bg-muted">Reset</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="sticky top-0 bg-muted/90 text-xs uppercase text-muted-foreground backdrop-blur-sm z-10 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>
                  Employee {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('employee_code')}>
                  Emp Code {sortConfig?.key === 'employee_code' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('employment_status')}>
                  Status {sortConfig?.key === 'employment_status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('joining_date')}>
                  Joining Date {sortConfig?.key === 'joining_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </td>
                </tr>
              ) : paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted cursor-pointer transition-colors" onClick={() => setSelectedEmployee(emp)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{emp.official_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{emp.employee_code}</td>
                    <td className="px-6 py-4">
                      {emp.role_id === 1 ? 'Employee' : emp.role_id === 2 ? 'Manager' : emp.role_id === 3 ? 'HR' : 'Admin'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={emp.employment_status === 'Active' ? 'success' : emp.employment_status === 'On Leave' ? 'warning' : 'danger'}>
                        {emp.employment_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{new Date(emp.joining_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View
                        </button>
                        {emp.employment_status === 'Active' && (
                          <button 
                            disabled={processing}
                            onClick={(e) => handleDeactivate(emp.id, e)}
                            className="text-sm font-medium text-rose-600 hover:underline disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No employees found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 text-sm text-muted-foreground">
          <div>Showing {paginatedEmployees.length} of {filteredEmployees.length} records</div>
          <div className="flex gap-2 items-center">
            <span className="mr-2">Page {currentPage} of {totalPages || 1}</span>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-border p-2 hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="rounded-md border border-border p-2 hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Drawer */}
      <AnimatePresence>
        {selectedEmployee && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
              onClick={() => setSelectedEmployee(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-card shadow-2xl flex flex-col text-card-foreground"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <h2 className="text-lg font-semibold">Employee Profile</h2>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col items-center pb-8 border-b border-border">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-4xl text-primary font-bold mb-4 shadow-inner">
                    {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                  </div>
                  <h3 className="text-xl font-bold">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">{selectedEmployee.official_email}</p>
                  <Badge variant={selectedEmployee.employment_status === 'Active' ? 'success' : 'danger'}>
                    {selectedEmployee.employment_status}
                  </Badge>
                </div>
                
                <div className="py-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium uppercase tracking-wider mb-4">Employment Details</h4>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Employee Code</dt>
                        <dd className="font-medium text-foreground">{selectedEmployee.employee_code}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Joining Date</dt>
                        <dd className="font-medium text-foreground">{new Date(selectedEmployee.joining_date).toLocaleDateString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Role</dt>
                        <dd className="font-medium text-foreground">
                          {selectedEmployee.role_id === 1 ? 'Employee' : selectedEmployee.role_id === 2 ? 'Manager' : selectedEmployee.role_id === 3 ? 'HR' : 'Admin'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Manager</dt>
                        <dd className="font-medium text-foreground">
                          {selectedEmployee.manager_id ? `Manager ID: ${selectedEmployee.manager_id}` : 'None'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border p-4 flex gap-2">
                <button 
                  onClick={() => {
                    setEditingEmployeeId(selectedEmployee.id);
                    setIsDrawerOpen(true);
                  }}
                  className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to deactivate this employee?")) {
                      try {
                        const { hrApiClient } = await import('../../lib/api/hr');
                        await hrApiClient.delete(`/employees/${selectedEmployee.id}`);
                        const { useToastStore } = await import('../../store/toastStore');
                        useToastStore.getState().addToast('Employee deactivated successfully', 'success');
                        setSelectedEmployee(null);
                        fetchEmployees();
                      } catch (error) {
                        const { useToastStore } = await import('../../store/toastStore');
                        useToastStore.getState().addToast('Failed to deactivate employee', 'error');
                      }
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  <UserX className="h-4 w-4" /> Deactivate
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add / Edit Drawer */}
      {Drawer && (
        <Drawer 
          isOpen={isDrawerOpen} 
          onClose={() => {
            setIsDrawerOpen(false);
            setEditingEmployeeId(null);
          }} 
          onSuccess={() => {
            fetchEmployees();
            setSelectedEmployee(null);
          }} 
          employeeId={editingEmployeeId}
        />
      )}
    </div>
  );
}
