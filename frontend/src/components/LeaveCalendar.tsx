import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { EventClickArg } from '@fullcalendar/core';

interface LeaveEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string; // ISO date string
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: any;
}

interface LeaveCalendarProps {
  events: LeaveEvent[];
  onEventClick?: (info: EventClickArg) => void;
  height?: string | number;
  initialView?: string;
  headerToolbar?: any;
}

export default function LeaveCalendar({ 
  events, 
  onEventClick, 
  height = 'auto',
  initialView = 'dayGridMonth',
  headerToolbar = {
    left: 'title',
    center: '',
    right: 'prev,next today'
  }
}: LeaveCalendarProps) {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
      <style>
        {`
          .fc .fc-toolbar-title {
            font-size: 1.125rem;
            font-weight: 600;
          }
          .fc .fc-button-primary {
            background-color: transparent;
            border-color: #cbd5e1;
            color: #475569;
          }
          .dark .fc .fc-button-primary {
            border-color: #334155;
            color: #cbd5e1;
          }
          .fc .fc-button-primary:hover {
            background-color: #f1f5f9;
            border-color: #cbd5e1;
            color: #0f172a;
          }
          .dark .fc .fc-button-primary:hover {
            background-color: #1e293b;
            border-color: #334155;
            color: #f8fafc;
          }
          .fc .fc-button-primary:disabled {
            background-color: transparent;
            border-color: #e2e8f0;
            color: #94a3b8;
          }
          .dark .fc .fc-button-primary:disabled {
            border-color: #1e293b;
            color: #475569;
          }
          .fc-theme-standard td, .fc-theme-standard th, .fc-theme-standard .fc-scrollgrid {
            border-color: #e2e8f0;
          }
          .dark .fc-theme-standard td, .dark .fc-theme-standard th, .dark .fc-theme-standard .fc-scrollgrid {
            border-color: #1e293b;
          }
          .fc-day-today {
            background-color: #f8fafc !important;
          }
          .dark .fc-day-today {
            background-color: #0f172a !important;
          }
          .fc-event {
            cursor: pointer;
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 0.75rem;
            font-weight: 500;
            border: none;
            margin-bottom: 2px;
          }
        `}
      </style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView={initialView}
        headerToolbar={headerToolbar}
        events={events}
        height={height}
        eventClick={onEventClick}
        editable={false}
        selectable={false}
        dayMaxEvents={3}
      />
    </div>
  );
}
