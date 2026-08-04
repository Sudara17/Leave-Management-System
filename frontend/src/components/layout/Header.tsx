import { Bell, LogOut, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../theme-provider';
import { Button } from '../ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/axios';
import { AnimatePresence, motion } from 'framer-motion';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
      } catch (e) {
        console.error('Failed to load notifications', e);
      }
    };
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/mark-read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-950 transition-colors">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
          {user?.role} Portal
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="text-slate-500 dark:text-slate-400"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
        
        <div className="relative" ref={notifRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-slate-500 dark:text-slate-400"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950"></span>
            )}
          </Button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 z-50 overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer ${!notification.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                          onClick={() => !notification.is_read && markAsRead(notification.id)}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className={`text-sm ${!notification.is_read ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium uppercase tracking-wider">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
                      <Bell className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-sm font-medium">No notifications yet</p>
                      <p className="text-xs mt-1">When you get updates, they'll show up here.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-3">
          <Link to="/profile" className="flex flex-col items-end hover:opacity-80 transition-opacity">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {user?.email.split('@')[0]}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</span>
          </Link>
          <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:opacity-80 transition-opacity">
            {user?.email.charAt(0).toUpperCase()}
          </Link>
        </div>

        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 ml-2">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
