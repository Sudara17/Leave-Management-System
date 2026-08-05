export function generateGoogleCalendarUrl(event: any) {
  const start = new Date(event.start_date).toISOString().split('T')[0].replace(/-/g, '');
  
  // For all day events, end date must be the next day
  const endDate = new Date(event.end_date);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const title = encodeURIComponent(`${event.leave_type_name}`);
  
  let detailsText = '';
  if (event.employee_name) {
    detailsText += `Employee: ${event.employee_name}\n`;
  }
  detailsText += `Leave Type: ${event.leave_type_name}\nStatus: ${event.status}\nDays: ${event.days}\nReason: ${event.reason || 'N/A'}`;
  
  const details = encodeURIComponent(detailsText);
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

export function generateOutlookCalendarUrl(event: any) {
  const start = new Date(event.start_date).toISOString();
  
  const endDate = new Date(event.end_date);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString();
  
  const title = encodeURIComponent(`${event.leave_type_name}`);
  
  let bodyText = '';
  if (event.employee_name) {
    bodyText += `Employee: ${event.employee_name}\n`;
  }
  bodyText += `Leave Type: ${event.leave_type_name}\nStatus: ${event.status}\nDays: ${event.days}\nReason: ${event.reason || 'N/A'}`;
  
  const body = encodeURIComponent(bodyText);
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${start}&enddt=${end}&subject=${title}&body=${body}&allday=true`;
}

