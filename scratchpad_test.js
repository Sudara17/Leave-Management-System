const event = {
  start_date: '2026-08-10T00:00:00.000Z',
  end_date: '2026-08-12T00:00:00.000Z',
  leave_type_name: 'Annual Leave',
  status: 'Approved',
  days: 3,
  reason: 'Going on vacation'
};

function generateGoogleCalendarUrl(event) {
  const start = new Date(event.start_date).toISOString().replace(/-|:|\.\d+/g, '');
  const endDate = new Date(event.end_date);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString().replace(/-|:|\.\d+/g, '');
  const title = encodeURIComponent(`${event.leave_type_name} (${event.status})`);
  const details = encodeURIComponent(`Status: ${event.status}\nDays: ${event.days}\nReason: ${event.reason || 'N/A'}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

function generateOutlookCalendarUrl(event) {
  const start = new Date(event.start_date).toISOString();
  const endDate = new Date(event.end_date);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.toISOString();
  const title = encodeURIComponent(`${event.leave_type_name} (${event.status})`);
  const body = encodeURIComponent(`Status: ${event.status}\nDays: ${event.days}\nReason: ${event.reason || 'N/A'}`);
  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${start}&enddt=${end}&subject=${title}&body=${body}&allday=true`;
}

console.log('Google:', generateGoogleCalendarUrl(event));
console.log('Outlook:', generateOutlookCalendarUrl(event));
