import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { useForm as useRHForm } from 'react-hook-form';
import { hrApiClient } from '../../lib/api/hr';
import { useToastStore } from '../../store/toastStore';

interface EmployeeFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId?: number | null; // If null, create. If number, edit.
}

export default function EmployeeFormDrawer({ isOpen, onClose, onSuccess, employeeId }: EmployeeFormDrawerProps) {
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useRHForm();
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDependencies();
      if (employeeId) {
        fetchEmployee(employeeId);
      } else {
        reset({});
      }
    }
  }, [isOpen, employeeId]);

  const fetchDependencies = async () => {
    try {
      const [deptRes, roleRes, empRes] = await Promise.all([
        hrApiClient.get('/departments/'),
        hrApiClient.get('/roles/'),
        hrApiClient.get('/employees/')
      ]);
      setDepartments(deptRes.data);
      setRoles(roleRes.data);
      
      const managerRole = roleRes.data.find((r: any) => r.role_name === 'Manager');
      if (managerRole) {
        setManagers(empRes.data.filter((e: any) => e.role_id === managerRole.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployee = async (id: number) => {
    setLoading(true);
    try {
      const res = await hrApiClient.get(`/employees/${id}`);
      const emp = res.data;
      Object.keys(emp).forEach(key => {
        if (key === 'joining_date' && emp[key]) {
           setValue(key, emp[key].split('T')[0]);
        } else {
           setValue(key, emp[key]);
        }
      });
    } catch (e) {
      useToastStore.getState().addToast('Failed to load employee details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (employeeId) {
        await hrApiClient.put(`/employees/${employeeId}`, data);
        useToastStore.getState().addToast('Employee updated successfully.', 'success');
      } else {
        await hrApiClient.post('/employees/', data);
        useToastStore.getState().addToast('Employee added successfully.', 'success');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      useToastStore.getState().addToast(error.response?.data?.detail || 'An error occurred', 'error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col text-card-foreground"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold">
                {employeeId ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
              ) : (
                <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">First Name</label>
                      <input {...register('first_name', { required: true })} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                      <input {...register('last_name', { required: true })} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Employee ID / Code</label>
                    <input {...register('employee_code', { required: true })} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Official Email</label>
                    <input type="email" {...register('official_email', { required: true })} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <input {...register('phone')} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Department</label>
                      <select {...register('department_id', { valueAsNumber: true })} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground">
                        <option value="">Select Dept</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Role</label>
                      <select {...register('role_id', { valueAsNumber: true })} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground">
                        <option value="">Select Role</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Manager</label>
                    <select {...register('manager_id', { valueAsNumber: true })} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground">
                      <option value="">No Manager (Top Level)</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Joining Date</label>
                    <input type="date" {...register('joining_date')} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Employment Type</label>
                      <select {...register('employment_type')} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground">
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <select {...register('employment_status')} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground">
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Terminated">Terminated</option>
                      </select>
                    </div>
                  </div>
                </form>
              )}
            </div>
            
            <div className="p-6 border-t border-border bg-muted/50 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted">
                Cancel
              </button>
              <button 
                type="submit" 
                form="employee-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-70"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
