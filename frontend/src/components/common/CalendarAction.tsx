import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl } from '../../lib/calendar';

interface CalendarActionProps {
  leave?: any;
  leaves?: any[];
  compact?: boolean;
  fullWidth?: boolean;
  label?: string;
}

export default function CalendarAction({ leave, leaves, compact = false, fullWidth = false, label = "Add to Calendar" }: CalendarActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const approvedLeaves = leaves ? leaves.filter((l: any) => l.status === 'Approved') : [];

  if (leave && leave.status !== 'Approved') {
    return null;
  }
  
  if (leaves && approvedLeaves.length === 0) {
    return null;
  }

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (leaves && approvedLeaves.length === 1) {
      window.open(generateGoogleCalendarUrl(approvedLeaves[0]), '_blank');
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={`relative inline-block text-left ${fullWidth ? 'w-full' : ''}`} ref={dropdownRef}>
      <button
        onClick={handleMainClick}
        className={`inline-flex items-center justify-center gap-2 rounded-md border border-primary text-primary bg-transparent hover:bg-primary/10 transition-colors font-medium ${compact ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} ${fullWidth ? 'w-full mt-4' : ''}`}
      >
        <CalendarIcon className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        {!compact && <span>{label}</span>}
        <ChevronDown className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-2 origin-top-right rounded-md bg-card shadow-lg ring-1 ring-border focus:outline-none overflow-hidden ${fullWidth ? 'left-0 right-0 max-h-64 overflow-y-auto' : 'right-0 w-48'}`}>
          <div className="py-1">
            {leaves ? (
              approvedLeaves.map((l: any, i: number) => {
                const dateRange = l.start_date === l.end_date 
                  ? new Date(l.start_date).toLocaleDateString()
                  : `${new Date(l.start_date).toLocaleDateString()} - ${new Date(l.end_date).toLocaleDateString()}`;
                
                return (
                  <a
                    key={i}
                    href={generateGoogleCalendarUrl(l)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="group flex w-full flex-col gap-0.5 px-4 py-2 text-sm text-foreground hover:bg-muted text-left border-b border-border last:border-0"
                  >
                    <div className="font-medium flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                      {l.employee_name || l.leave_type_name}
                    </div>
                    <div className="text-xs text-muted-foreground pl-5">
                      {l.employee_name ? `${l.leave_type_name} • ${dateRange}` : dateRange}
                    </div>
                  </a>
                );
              })
            ) : (
              <>
                <a
                  href={generateGoogleCalendarUrl(leave)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  Google Calendar
                </a>
                <a
                  href={generateOutlookCalendarUrl(leave)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <CalendarIcon className="h-4 w-4 text-sky-600" />
                  Outlook Calendar
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
