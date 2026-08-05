import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl } from '../../lib/calendar';

interface CalendarActionProps {
  leave: any;
  compact?: boolean;
}

export default function CalendarAction({ leave, compact = false }: CalendarActionProps) {
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

  if (leave?.status !== 'Approved') {
    return null;
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-md border border-primary text-primary bg-transparent hover:bg-primary/10 transition-colors font-medium ${compact ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'}`}
      >
        <CalendarIcon className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        {!compact && <span>Add to Calendar</span>}
        <ChevronDown className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md bg-card shadow-lg ring-1 ring-border focus:outline-none overflow-hidden">
          <div className="py-1">
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
          </div>
        </div>
      )}
    </div>
  );
}
