import { useState, useEffect } from 'react';
import { 
  Building2, Briefcase, CalendarDays, Bell, Shield, Wallet, Save, Plus, Trash2, Edit2
} from 'lucide-react';
import { getCompanySettings, getLeaveTypes, hrApiClient } from '../../lib/api/hr';
import { useToastStore } from '../../store/toastStore';
import LeaveTypeModal from '../../components/hr/LeaveTypeModal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function CompanySettings() {
  useDocumentTitle('Company Settings');
  const [activeTab, setActiveTab] = useState('general');
  const [generalForm, setGeneralForm] = useState<any>({});
  const [workingDays, setWorkingDays] = useState<any>({});
  const [notifications, setNotifications] = useState<any>({});
  const [security, setSecurity] = useState<any>({});
  
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<any>(null);

  const [newHoliday, setNewHoliday] = useState({ name: '', holiday_date: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [settingsData, leaveTypesData, holidaysData] = await Promise.all([
        getCompanySettings(),
        getLeaveTypes(),
        hrApiClient.get('/hr/settings/holidays').then(res => res.data)
      ]);
      
      const globalSettings = settingsData?.GLOBAL || {};
      const workingDaysSettings = settingsData?.WORKING_DAYS || {
        monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false,
        office_start_time: '09:00', office_end_time: '17:00', lunch_break_duration: 60
      };
      const notificationsSettings = settingsData?.NOTIFICATIONS || {
        leave_request_email: true, leave_approved_email: true, leave_rejected_email: true, policy_updated_email: true
      };
      const securitySettings = settingsData?.SECURITY || {
        min_password_length: 8, require_uppercase: true, require_number: true, require_special_char: true, session_timeout_minutes: 30
      };

      setGeneralForm({
        company_name: globalSettings.company_name || '',
        company_email: globalSettings.company_email || '',
        company_phone: globalSettings.company_phone || '',
        address: globalSettings.address || '',
        website: globalSettings.website || '',
        timezone: globalSettings.timezone || 'UTC',
        currency: globalSettings.currency || 'USD',
        country: globalSettings.country || 'USA',
        financial_year_start_month: globalSettings.financial_year_start_month || 1,
        leave_cycle_reset: globalSettings.leave_cycle_reset || 'Financial Year'
      });
      setWorkingDays(workingDaysSettings);
      setNotifications(notificationsSettings);
      setSecurity(securitySettings);

      setLeaveTypes(leaveTypesData || []);
      setHolidays(holidaysData || []);
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await hrApiClient.put('/hr/settings/company-settings', { 
        GLOBAL: generalForm,
        WORKING_DAYS: workingDays,
        NOTIFICATIONS: notifications,
        SECURITY: security
      });
      useToastStore.getState().addToast('Settings updated successfully', 'success');
    } catch (error) {
      useToastStore.getState().addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hrApiClient.post('/hr/settings/holidays', newHoliday);
      useToastStore.getState().addToast('Holiday added', 'success');
      setNewHoliday({ name: '', holiday_date: '' });
      fetchAll();
    } catch (error) {
      useToastStore.getState().addToast('Failed to add holiday', 'error');
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await hrApiClient.delete(`/hr/settings/holidays/${id}`);
      useToastStore.getState().addToast('Holiday deleted', 'success');
      fetchAll();
    } catch (error) {
      useToastStore.getState().addToast('Failed to delete holiday', 'error');
    }
  };

  const handleDeleteLeaveType = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this leave type? Note: You cannot delete leave types that have existing leave requests associated with them.")) return;
    try {
      await hrApiClient.delete(`/hr/leave-types/${id}`);
      useToastStore.getState().addToast('Leave type deleted successfully', 'success');
      fetchData();
    } catch (error: any) {
      if (error.response?.status === 400) {
         useToastStore.getState().addToast('Cannot delete leave type that is in use.', 'error');
      } else {
         useToastStore.getState().addToast('Failed to delete leave type', 'error');
      }
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'leave-types', label: 'Leave Types', icon: Wallet },
    { id: 'working-days', label: 'Working Days', icon: Briefcase },
    { id: 'holidays', label: 'Holidays', icon: CalendarDays },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  if (loading && Object.keys(generalForm).length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col p-6 overflow-hidden pb-20 bg-background text-foreground">
      {isLeaveModalOpen && (
        <LeaveTypeModal 
          isOpen={isLeaveModalOpen} 
          onClose={() => { setIsLeaveModalOpen(false); setSelectedLeaveType(null); }} 
          onSuccess={fetchAll} 
          existingType={selectedLeaveType} 
        />
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure global company HR settings.</p>
        </div>
        <div className="flex gap-2">
          {activeTab !== 'leave-types' && activeTab !== 'holidays' && (
            <button 
              onClick={handleSaveSettings} 
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-70"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm text-card-foreground">
        
        {/* Sidebar Tabs */}
        <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {activeTab === 'general' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Company Profile</h3>
                <p className="text-sm text-muted-foreground mb-6">Basic information about the company.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Company Name</label>
                    <input 
                      type="text" 
                      value={generalForm.company_name}
                      onChange={e => setGeneralForm({...generalForm, company_name: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Company Email</label>
                    <input 
                      type="email" 
                      value={generalForm.company_email}
                      onChange={e => setGeneralForm({...generalForm, company_email: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
                    <input 
                      type="text" 
                      value={generalForm.company_phone}
                      onChange={e => setGeneralForm({...generalForm, company_phone: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
                    <input 
                      type="text" 
                      value={generalForm.address}
                      onChange={e => setGeneralForm({...generalForm, address: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Website</label>
                    <input 
                      type="url" 
                      value={generalForm.website}
                      onChange={e => setGeneralForm({...generalForm, website: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Country</label>
                    <input 
                      type="text" 
                      value={generalForm.country}
                      onChange={e => setGeneralForm({...generalForm, country: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Time Zone</label>
                    <select 
                      value={generalForm.timezone}
                      onChange={e => setGeneralForm({...generalForm, timezone: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">EST</option>
                      <option value="America/Los_Angeles">PST</option>
                      <option value="Europe/London">GMT</option>
                      <option value="Asia/Tokyo">JST</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Currency</label>
                    <select 
                      value={generalForm.currency}
                      onChange={e => setGeneralForm({...generalForm, currency: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Financial Year Start</label>
                    <select 
                      value={generalForm.financial_year_start_month}
                      onChange={e => setGeneralForm({...generalForm, financial_year_start_month: Number(e.target.value)})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const date = new Date(0, i);
                        return <option key={i + 1} value={i + 1}>{date.toLocaleString('en', { month: 'long' })}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Leave Cycle Reset</label>
                    <select 
                      value={generalForm.leave_cycle_reset}
                      onChange={e => setGeneralForm({...generalForm, leave_cycle_reset: e.target.value})}
                      className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Financial Year">Financial Year</option>
                      <option value="Calendar Year">Calendar Year</option>
                      <option value="Employee Joining Date">Employee Joining Date</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leave-types' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium">Leave Types Configuration</h3>
                  <p className="text-sm text-muted-foreground">Manage accrual rules and limits for different leaves.</p>
                </div>
                <button 
                  onClick={() => { setSelectedLeaveType(null); setIsLeaveModalOpen(true); }}
                  className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  <Plus className="h-4 w-4" /> Add Leave Type
                </button>
              </div>

              <div className="space-y-4 max-w-4xl">
                {leaveTypes.map(lt => (
                  <div key={lt.id} className="border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: lt.color || '#3b82f6' }}>
                        {lt.leave_name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {lt.leave_name}
                          {!lt.is_active && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>}
                        </h4>
                        <p className="text-sm text-muted-foreground">{lt.calendar_year_entitlement} Days / Year</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t border-border sm:border-0 pt-4 sm:pt-0">
                      <div className="text-sm">
                        <span className="text-muted-foreground block text-xs mb-1">Requires Approval</span>
                        <span className="font-medium">{lt.require_approval !== false ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground block text-xs mb-1">Requires Doc</span>
                        <span className="font-medium">{lt.require_document ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground block text-xs mb-1">Half Day</span>
                        <span className="font-medium">{lt.allow_half_day ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => { setSelectedLeaveType(lt); setIsLeaveModalOpen(true); }}
                          className="text-muted-foreground hover:text-primary transition-colors p-2"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteLeaveType(lt.id)}
                          className="text-muted-foreground hover:text-rose-500 transition-colors p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {leaveTypes.length === 0 && (
                  <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground">
                    No leave types configured.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'working-days' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Work Hours & Days</h3>
                <p className="text-sm text-muted-foreground mb-6">Configure the standard work week for the company.</p>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">Standard Work Days</label>
                    <div className="flex flex-wrap gap-4">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <label key={day} className="flex items-center gap-2 text-sm capitalize">
                          <input 
                            type="checkbox" 
                            checked={workingDays[day] || false}
                            onChange={e => setWorkingDays({...workingDays, [day]: e.target.checked})}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 border-t border-border pt-6">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Start Time</label>
                      <input 
                        type="time" 
                        value={workingDays.office_start_time}
                        onChange={e => setWorkingDays({...workingDays, office_start_time: e.target.value})}
                        className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark_light]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">End Time</label>
                      <input 
                        type="time" 
                        value={workingDays.office_end_time}
                        onChange={e => setWorkingDays({...workingDays, office_end_time: e.target.value})}
                        className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark_light]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Lunch Break (mins)</label>
                      <input 
                        type="number" 
                        value={workingDays.lunch_break_duration}
                        onChange={e => setWorkingDays({...workingDays, lunch_break_duration: Number(e.target.value)})}
                        className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holidays' && (
            <div className="max-w-4xl space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Public Holidays</h3>
                  <p className="text-sm text-muted-foreground">Manage official company holidays.</p>
                </div>
              </div>

              <form onSubmit={handleAddHoliday} className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg border border-border">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Holiday Name</label>
                  <input 
                    type="text" 
                    required
                    value={newHoliday.name}
                    onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                    placeholder="e.g. New Year's Day"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newHoliday.holiday_date}
                    onChange={e => setNewHoliday({...newHoliday, holiday_date: e.target.value})}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none [color-scheme:dark_light]"
                  />
                </div>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2 h-9">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </form>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Holiday Name</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {holidays.map(holiday => (
                      <tr key={holiday.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{holiday.name}</td>
                        <td className="px-4 py-3">{new Date(holiday.holiday_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteHoliday(holiday.id)} className="text-rose-500 hover:text-rose-600 p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {holidays.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No holidays configured for this year.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h3 className="text-lg font-medium">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground mb-6">Manage system and email notification triggers.</p>
                
                <div className="space-y-4 border border-border rounded-lg divide-y divide-border">
                  {[
                    { id: 'leave_request_email', label: 'Leave Request Submitted', desc: 'Notify managers and HR when a new request is submitted' },
                    { id: 'leave_approved_email', label: 'Leave Approved', desc: 'Notify employee when their leave is approved' },
                    { id: 'leave_rejected_email', label: 'Leave Rejected', desc: 'Notify employee when their leave is rejected' },
                    { id: 'policy_updated_email', label: 'Policy Updated', desc: 'Notify all active employees when a new policy is published' }
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div>
                        <h4 className="text-sm font-medium">{item.label}</h4>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications[item.id] !== false}
                          onChange={e => setNotifications({...notifications, [item.id]: e.target.checked})}
                        />
                        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Access & Security</h3>
                <p className="text-sm text-muted-foreground mb-6">Enforce company security policies.</p>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Minimum Password Length</label>
                      <input 
                        type="number" 
                        min="6"
                        value={security.min_password_length}
                        onChange={e => setSecurity({...security, min_password_length: Number(e.target.value)})}
                        className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Session Timeout (minutes)</label>
                      <input 
                        type="number" 
                        min="5"
                        value={security.session_timeout_minutes}
                        onChange={e => setSecurity({...security, session_timeout_minutes: Number(e.target.value)})}
                        className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <label className="flex items-center gap-3 text-sm">
                      <input 
                        type="checkbox" 
                        checked={security.require_uppercase}
                        onChange={e => setSecurity({...security, require_uppercase: e.target.checked})}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                      />
                      Require uppercase letter
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <input 
                        type="checkbox" 
                        checked={security.require_number}
                        onChange={e => setSecurity({...security, require_number: e.target.checked})}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                      />
                      Require number
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <input 
                        type="checkbox" 
                        checked={security.require_special_char}
                        onChange={e => setSecurity({...security, require_special_char: e.target.checked})}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                      />
                      Require special character
                    </label>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-border">
                    <div className="flex items-center justify-between p-4 border border-rose-200 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-900/10 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-rose-800 dark:text-rose-400">Force Global Password Reset</h4>
                        <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">Force all users to reset their passwords on next login.</p>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-background border border-border rounded shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/30">
                        Trigger Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
