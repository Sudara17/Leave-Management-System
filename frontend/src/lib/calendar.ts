export function generateGoogleCalendarUrl(event: any) {
  const start = new Date(event.start_date).toISOString().replace(/-|:|\.\d+/g, '');
  
  // For all day events, end date must be the next day
  const endDate = new Date(event.end_date);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString().replace(/-|:|\.\d+/g, '');
  
  const title = encodeURIComponent(`${event.leave_type_name} (${event.status})`);
  const details = encodeURIComponent(
    `Status: ${event.status}\nDays: ${event.days}\nReason: ${event.reason || 'N/A'}`
  );
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

export function generateOutlookCalendarUrl(event: any) {
  const start = new Date(event.start_date).toISOString();
  
  const endDate = new Date(event.end_date);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString();
  
  const title = encodeURIComponent(`${event.leave_type_name} (${event.status})`);
  const body = encodeURIComponent(
    `Status: ${event.status}\nDays: ${event.days}\nReason: ${event.reason || 'N/A'}`
  );
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${start}&enddt=${end}&subject=${title}&body=${body}&allday=true`;
}

export function downloadIcs(requestId: number) {
  window.open(`http://localhost:8000/api/v1/calendar/download-ics/${requestId}`, '_blank');
}
