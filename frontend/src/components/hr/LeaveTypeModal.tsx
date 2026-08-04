import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { hrApiClient } from '../../lib/api/hr';
import { useToastStore } from '../../store/toastStore';

interface LeaveTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingType?: any;
}

export default function LeaveTypeModal({ isOpen, onClose, onSuccess, existingType }: LeaveTypeModalProps) {
  const [formData, setFormData] = useState({
    leave_name: '',
    calendar_year_entitlement: 0,
    carry_forward_days: 0,
    require_approval: true,
    require_document: false,
    allow_half_day: false,
    color: '#3b82f6'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingType) {
      setFormData({
        leave_name: existingType.leave_name,
        calendar_year_entitlement: existingType.calendar_year_entitlement,
        carry_forward_days: existingType.carry_forward_days || 0,
        require_approval: existingType.require_approval !== false,
        require_document: existingType.require_document || false,
        allow_half_day: existingType.allow_half_day || false,
        color: existingType.color || '#3b82f6'
      });
    } else {
      setFormData({
        leave_name: '',
        calendar_year_entitlement: 0,
        carry_forward_days: 0,
        require_approval: true,
        require_document: false,
        allow_half_day: false,
        color: '#3b82f6'
      });
    }
  }, [existingType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (existingType) {
        // Assume API has PUT endpoint for leave types
        await hrApiClient.put(`/leave-types/${existingType.id}`, formData);
        useToastStore.getState().addToast('Leave type updated successfully', 'success');
      } else {
        await hrApiClient.post('/leave-types/', formData);
        useToastStore.getState().addToast('Leave type created successfully', 'success');
      }
      onSuccess();
      onClose();
    } catch (error) {
      useToastStore.getState().addToast(`Failed to ${existingType ? 'update' : 'create'} leave type`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg text-card-foreground">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-xl font-bold">{existingType ? 'Edit Leave Type' : 'Add Leave Type'}</h2>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Leave Name</label>
              <input 
                type="text" 
                required 
                value={formData.leave_name} 
                onChange={e => setFormData({...formData, leave_name: e.target.value})}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                placeholder="e.g., Annual Leave"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Days Per Year</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.5"
                  required 
                  value={formData.calendar_year_entitlement} 
                  onChange={e => setFormData({...formData, calendar_year_entitlement: parseFloat(e.target.value)})}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Carry Forward Days</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.5"
                  required 
                  value={formData.carry_forward_days} 
                  onChange={e => setFormData({...formData, carry_forward_days: parseFloat(e.target.value)})}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Badge Color</label>
              <input 
                type="color" 
                required 
                value={formData.color} 
                onChange={e => setFormData({...formData, color: e.target.value})}
                className="w-full h-10 rounded-md border border-border bg-background px-1 py-1 text-sm shadow-sm cursor-pointer"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 text-sm">
                <input 
                  type="checkbox" 
                  checked={formData.require_approval} 
                  onChange={e => setFormData({...formData, require_approval: e.target.checked})}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                />
                Requires Manager / HR Approval
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input 
                  type="checkbox" 
                  checked={formData.require_document} 
                  onChange={e => setFormData({...formData, require_document: e.target.checked})}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                />
                Requires Medical Certificate / Document
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input 
                  type="checkbox" 
                  checked={formData.allow_half_day} 
                  onChange={e => setFormData({...formData, allow_half_day: e.target.checked})}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                />
                Half Day Allowed
              </label>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted text-foreground">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-70">
              {saving ? 'Saving...' : 'Save Leave Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
