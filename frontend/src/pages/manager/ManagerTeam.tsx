import { useState, useEffect, useMemo } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Search, MoreVertical, Download, ArrowUpDown, ChevronLeft, ChevronRight, User as UserIcon, Calendar, PieChart, CheckSquare } from 'lucide-react';
import { getTeamMembers } from '../../lib/api/manager';
import { useNavigate } from 'react-router-dom';

export default function ManagerTeam() {
  useDocumentTitle('Team Members');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  
  // Sorting & Pagination
  const [sortField, setSortField] = useState<string>('employee_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Actions dropdown
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  useEffect(() => {
    getTeamMembers()
      .then(setTeamMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (teamMembers.length === 0) return;
    const headers = ['Employee Code', 'Name', 'Department', 'Role', 'Status', 'Eligible Leave', 'Used Leave', 'Available Leave'];
    const csvContent = [
      headers.join(','),
      ...teamMembers.map(emp => 
        [emp.employee_code, `"${emp.employee_name}"`, `"${emp.department}"`, `"${emp.role}"`, emp.current_status, emp.eligible_leave, emp.used_leave, emp.available_leave].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'team_members.csv';
    link.click();
  };

  const filteredTeam = useMemo(() => {
    return teamMembers.filter(emp => {
      const matchesSearch = emp.employee_name.toLowerCase().includes(search.toLowerCase()) || 
                            emp.employee_code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter ? emp.current_status === statusFilter : true;
      const matchesRole = roleFilter ? emp.role === roleFilter : true;
      const matchesDept = departmentFilter ? emp.department === departmentFilter : true;
      return matchesSearch && matchesStatus && matchesRole && matchesDept;
    });
  }, [teamMembers, search, statusFilter, roleFilter, departmentFilter]);

  const sortedTeam = useMemo(() => {
    const sorted = [...filteredTeam].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredTeam, sortField, sortOrder]);

  const paginatedTeam = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTeam.slice(start, start + pageSize);
  }, [sortedTeam, currentPage]);

  const totalPages = Math.ceil(sortedTeam.length / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const uniqueRoles = Array.from(new Set(teamMembers.map(emp => emp.role))).filter(Boolean);
  const uniqueDepts = Array.from(new Set(teamMembers.map(emp => emp.department))).filter(Boolean);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col p-6 overflow-hidden pb-20">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My Team</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your direct reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 gap-4">
          <div className="relative w-full sm:w-1/3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-md border border-slate-200 bg-transparent py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:text-white dark:focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
            >
              <option value="">All Departments</option>
              {uniqueDepts.map(dept => (
                <option key={dept} value={dept as string}>{dept as string}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role as string}>{role as string}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
            </select>
            <button 
              onClick={() => { setStatusFilter(''); setRoleFilter(''); setDepartmentFilter(''); setSearch(''); setCurrentPage(1); }}
              className="w-full sm:w-auto rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 min-w-[800px]">
            <thead className="sticky top-0 bg-slate-50/90 text-xs uppercase text-slate-500 backdrop-blur-sm dark:bg-slate-900/90 dark:text-slate-400 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('employee_name')}>
                  <div className="flex items-center gap-1">Team Member <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('role')}>
                  <div className="flex items-center gap-1">Role <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('available_leave')}>
                  <div className="flex items-center gap-1">Available Leave <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('current_status')}>
                  <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedTeam.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No team members found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedTeam.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold dark:bg-blue-900 dark:text-blue-300">
                          {emp.employee_name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {emp.employee_name}
                          </div>
                          <div className="text-xs text-slate-500">{emp.employee_code} • {emp.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{emp.role}</td>
                    <td className="px-6 py-4">{emp.available_leave} Days</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${emp.current_status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {emp.current_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === emp.id ? null : emp.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {openDropdownId === emp.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)}></div>
                          <div className="absolute right-6 top-10 z-50 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-slate-800 dark:ring-slate-700">
                            <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50">
                              <UserIcon className="h-4 w-4" /> View Profile
                            </button>
                            <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50">
                              <Calendar className="h-4 w-4" /> Leave History
                            </button>
                            <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50">
                              <PieChart className="h-4 w-4" /> Leave Balance
                            </button>
                            <button onClick={() => navigate('/manager/approvals')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50">
                              <CheckSquare className="h-4 w-4" /> Pending Requests
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-950/50">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedTeam.length)} of {sortedTeam.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
