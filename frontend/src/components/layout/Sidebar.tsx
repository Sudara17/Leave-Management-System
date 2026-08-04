import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  BriefcaseBusiness, 
  LayoutDashboard, 
  CalendarDays, 
  History, 
  Wallet, 
  BookOpen, 
  Users, 
  CheckSquare, 
  Building2, 
  FileText,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  const getLinks = () => {
    const role = user?.role;
    if (role === 'HR') {
      return [
        { name: 'Dashboard', path: '/hr', icon: LayoutDashboard },
        { name: 'Employees', path: '/hr/employees', icon: Users },
        { name: 'Leave Approvals', path: '/hr/approvals', icon: CheckSquare },
        { name: 'Policies', path: '/hr/policies', icon: BookOpen },
        { name: 'Reports', path: '/hr/reports', icon: FileText },
        { name: 'Company Settings', path: '/hr/settings', icon: Building2 },
        { name: 'Audit Logs', path: '/hr/audit', icon: ShieldCheck },
      ];
    }
    if (role === 'Manager') {
      return [
        { name: 'Dashboard', path: '/manager', icon: LayoutDashboard },
        { name: 'Team Members', path: '/manager/team', icon: Users },
        { name: 'Leave Approvals', path: '/manager/approvals', icon: CheckSquare },
        { name: 'Apply Leave', path: '/manager/apply-leave', icon: CalendarDays },
        { name: 'My History', path: '/manager/history', icon: History },
      ];
    }
    return [
      { name: 'Dashboard', path: '/employee', icon: LayoutDashboard },
      { name: 'Apply Leave', path: '/employee/apply-leave', icon: CalendarDays },
      { name: 'My Balances', path: '/employee/balances', icon: Wallet },
      { name: 'Leave History', path: '/employee/history', icon: History },
      { name: 'Policies', path: '/employee/policies', icon: BookOpen },
    ];
  };

  const links = getLinks();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card transition-colors">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-md bg-primary p-1.5">
            <BriefcaseBusiness className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm">Leave Management</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1 px-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || (link.path !== '/hr' && link.path !== '/manager' && link.path !== '/employee' && location.pathname.startsWith(link.path));
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border p-4">
        <Link
          to="/profile"
          className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          My Profile
        </Link>
      </div>
    </div>
  );
}
