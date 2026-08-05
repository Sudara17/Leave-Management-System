import { useState, useEffect } from 'react';
import { Calendar, FileUp, Send, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { applyLeave, getLeaveBalances, calculateLeave } from '../../lib/api/employee';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function EmployeeLeave() {
  useDocumentTitle('Apply Leave');
  const [submittedReq, setSubmittedReq] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [splitValidation, setSplitValidation] = useState<{available_sick: number, available_annual: number, requested_days: number, remaining_days: number, lwp_required: boolean, message: string} | null>(null);
  const [confirmLeaveSplit, setConfirmLeaveSplit] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    duration: 'full',
    reason: '',
  });

  useEffect(() => {
    getLeaveBalances().then(setBalances).catch(console.error);
  }, []);

  useEffect(() => {
    setSplitValidation(null);
    setConfirmLeaveSplit(false);
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        setCalculatedDays(null);
        return;
      }
      setCalculating(true);
      calculateLeave({
        start_date: formData.start_date,
        end_date: formData.end_date,
        half_day: formData.duration !== 'full'
      })
      .then(res => setCalculatedDays(res.days))
      .catch(() => setCalculatedDays(null))
      .finally(() => setCalculating(false));
    } else {
      setCalculatedDays(null);
    }
  }, [formData.start_date, formData.end_date, formData.duration]);

  useEffect(() => {
    setSplitValidation(null);
    setConfirmLeaveSplit(false);
  }, [formData.leave_type_id]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        leave_type_id: parseInt(formData.leave_type_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        half_day: formData.duration !== 'full',
        half_day_session: formData.duration !== 'full' ? (formData.duration === 'first_half' ? 'Morning' : 'Afternoon') : null,
        reason: formData.reason,
        confirm_leave_split: confirmLeaveSplit
      };
      
      const res = await applyLeave(payload);
      setSubmittedReq(res);
      addToast('Leave request submitted successfully.', 'success');
      setSplitValidation(null);
      setConfirmLeaveSplit(false);
    } catch (error: any) {
      const errDetail = error.response?.data?.detail;
      if (errDetail && errDetail.error === 'INSUFFICIENT_LEAVE_BALANCE') {
        setSplitValidation({
          available_sick: errDetail.available_sick,
          available_annual: errDetail.available_annual,
          requested_days: errDetail.requested_days,
          remaining_days: errDetail.remaining_days,
          lwp_required: errDetail.lwp_required,
          message: errDetail.message
        });
      } else {
        addToast(typeof errDetail === 'string' ? errDetail : 'Failed to apply for leave.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getBalanceColor = (type: string) => {
    if (type.toLowerCase().includes('annual')) return 'bg-blue-500';
    if (type.toLowerCase().includes('sick')) return 'bg-rose-500';
    if (type.toLowerCase().includes('casual')) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  if (submittedReq) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-xl border border-border bg-card p-8 shadow-xl text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Request Submitted</h2>
          <p className="text-muted-foreground mb-6">
            Your leave request has been successfully submitted and is pending review.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 text-left mb-8 space-y-3">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Request ID</span>
              <span className="text-sm font-medium text-foreground">{submittedReq.reference_code}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{submittedReq.status}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Reporting Manager</span>
              <span className="text-sm font-medium text-foreground">{submittedReq.manager_name || 'HR Department'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">Deducted Days</span>
              <span className="text-sm font-medium text-foreground">{submittedReq.days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Submitted At</span>
              <span className="text-sm font-medium text-foreground">{submittedReq.submitted_at ? new Date(submittedReq.submitted_at).toLocaleString() : 'N/A'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => navigate(user?.role === 'Manager' ? '/manager/history' : '/employee/history')}
              className="w-full rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Go to Leave History
            </button>
            <button 
              onClick={() => {
                setSubmittedReq(null);
                setFormData({ ...formData, start_date: '', end_date: '', reason: '' });
              }}
              className="w-full rounded-md border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-all"
            >
              Apply Another Leave
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Apply for Leave</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fill out the form below to request time off.</p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="bg-muted/30 border-b border-border p-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {balances.map(bal => (
              <div key={bal.leave_type_id} className="flex items-center gap-2 text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${getBalanceColor(bal.leave_type_name)}`}></span>
                {bal.leave_type_name}: {bal.available} days
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Leave Type <span className="text-rose-500">*</span></label>
              <select 
                required 
                value={formData.leave_type_id}
                onChange={e => setFormData({...formData, leave_type_id: e.target.value})}
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="">Select type</option>
                {balances.map(bal => (
                  <option key={bal.leave_type_id} value={bal.leave_type_id}>{bal.leave_type_name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Duration <span className="text-rose-500">*</span></label>
              <select 
                required 
                value={formData.duration}
                onChange={e => setFormData({...formData, duration: e.target.value})}
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="full">Full Day(s)</option>
                <option value="first_half">First Half</option>
                <option value="second_half">Second Half</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-foreground">Start Date <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="date" 
                  required
                  value={formData.start_date}
                  onChange={e => setFormData({...formData, start_date: e.target.value})}
                  className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">End Date <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="date" 
                  required
                  value={formData.end_date}
                  min={formData.start_date}
                  onChange={e => setFormData({...formData, end_date: e.target.value})}
                  className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>
          </div>

          {formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date) && (
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              End Date cannot be before Start Date.
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Number of Days <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              readOnly
              value={calculating ? 'Calculating...' : (calculatedDays !== null ? `${calculatedDays} Day${calculatedDays !== 1 ? 's' : ''}` : '')}
              className="w-full rounded-md border border-border bg-muted/50 py-2.5 px-3 text-sm shadow-sm outline-none text-muted-foreground cursor-not-allowed"
              placeholder="Auto-calculated based on dates..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason for Leave <span className="text-rose-500">*</span></label>
            <textarea 
              required
              rows={4}
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
              placeholder="Please provide a brief reason for your leave..."
              className="w-full rounded-md border border-border bg-background p-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
            ></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Supporting Document (Optional)</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp className="w-8 h-8 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-medium">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PDF, PNG, JPG (MAX. 5MB)</p>
                </div>
                <input type="file" className="hidden" />
              </label>
            </div>
          </div>
          
          {splitValidation && (
            <div className="rounded-md bg-amber-50 p-4 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 space-y-3">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{splitValidation.message}</h4>
              <div className="flex flex-wrap gap-4 text-sm text-amber-700 dark:text-amber-400">
                {splitValidation.available_sick > 0 && (
                  <div>Available Sick: <br/><span className="font-medium text-lg">{splitValidation.available_sick} days</span></div>
                )}
                {splitValidation.available_annual >= 0 && splitValidation.available_sick > 0 && (
                  <div>Available Annual: <br/><span className="font-medium text-lg">{splitValidation.available_annual} days</span></div>
                )}
                {splitValidation.available_annual > 0 && splitValidation.available_sick === 0 && (
                  <div>Available Annual: <br/><span className="font-medium text-lg">{splitValidation.available_annual} days</span></div>
                )}
                <div>Requested: <br/><span className="font-medium text-lg">{splitValidation.requested_days} days</span></div>
                {splitValidation.remaining_days > 0 && (
                  <div>Remaining (LWP): <br/><span className="font-medium text-lg">{splitValidation.remaining_days} days</span></div>
                )}
              </div>
              <label className="flex items-start gap-3 cursor-pointer mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/50">
                <input 
                  type="checkbox" 
                  checked={confirmLeaveSplit} 
                  onChange={(e) => setConfirmLeaveSplit(e.target.checked)} 
                  className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" 
                />
                <span className="text-sm text-amber-800 dark:text-amber-300">
                  {splitValidation.lwp_required 
                    ? (splitValidation.available_sick > 0 
                        ? "Use available Sick Leave first, then use Annual Leave, then use Leave Without Pay (LWP) for the remaining days." 
                        : "Use available Annual Leave, then use Leave Without Pay (LWP) for the remaining days.")
                    : "Use available Sick Leave first, then use Annual Leave for the remaining days."}
                </span>
              </label>
            </div>
          )}

          {/* Calculated Preview */}
          {calculating ? (
            <div className="rounded-md bg-muted/50 p-4 border border-border flex items-center justify-center">
              <span className="text-sm text-muted-foreground animate-pulse">Calculating days...</span>
            </div>
          ) : calculatedDays !== null && (
            <div className={`rounded-md p-4 border flex flex-col sm:flex-row sm:items-center justify-between ${calculatedDays === 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-primary/10 border-primary/20'}`}>
              <div>
                <h4 className={`text-sm font-semibold ${calculatedDays === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-primary'}`}>Leave Calculation</h4>
                <p className={`text-xs ${calculatedDays === 0 ? 'text-rose-600/80' : 'text-primary/80'} mt-0.5`}>
                  {calculatedDays === 0 ? 'The selected duration contains zero working days (weekends/holidays).' : 'Excludes weekends and company holidays.'}
                </p>
              </div>
              <div className={`text-xl font-bold mt-2 sm:mt-0 ${calculatedDays === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-primary'}`}>
                {calculatedDays} Day{calculatedDays !== 1 ? 's' : ''} Deducted
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/employee')} className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted">
              Cancel
            </button>
            <button disabled={loading || calculating || calculatedDays === 0 || calculatedDays === null || (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date) ? true : false) || (splitValidation !== null && !confirmLeaveSplit)} type="submit" className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50">
              <Send className="h-4 w-4" /> {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
