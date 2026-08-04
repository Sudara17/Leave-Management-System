import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { hrApiClient } from '../../lib/api/hr';
import { User, Mail, Building, Briefcase, Calendar, ShieldCheck, Lock, Save } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function Profile() {
  useDocumentTitle('My Profile');
  const API_BASE = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "http://localhost:8000";
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ phone: '', address: '', emergency_contact: '', emergency_phone: '' });
  
  // Password form state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await hrApiClient.get('/auth/me');
        setProfile(res.data);
        setFormData({ 
          phone: res.data.phone_number || '', 
          address: res.data.address || '',
          emergency_contact: res.data.emergency_contact || '',
          emergency_phone: res.data.emergency_phone || ''
        });
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Assuming a PUT endpoint exists for self-update or just dummy it
      await hrApiClient.put('/auth/me', formData);
      useToastStore.getState().addToast('Profile updated successfully', 'success');
      setProfile({ 
        ...profile, 
        phone_number: formData.phone, 
        address: formData.address,
        emergency_contact: formData.emergency_contact,
        emergency_phone: formData.emergency_phone
      });
      setIsEditing(false);
      setIsEditing(false);
    } catch (error) {
      useToastStore.getState().addToast('Failed to update profile', 'error');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      const res = await hrApiClient.post('/auth/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setProfile({ ...profile, profile_photo: res.data.profile_photo });
      useToastStore.getState().addToast('Profile picture updated', 'success');
    } catch (error) {
      useToastStore.getState().addToast('Failed to upload image', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.new !== passForm.confirm) {
      return useToastStore.getState().addToast('Passwords do not match', 'error');
    }
    try {
      await hrApiClient.post('/auth/change-password', { 
        old_password: passForm.current, 
        new_password: passForm.new 
      });
      useToastStore.getState().addToast('Password changed successfully', 'success');
      setIsChangingPassword(false);
      setPassForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      useToastStore.getState().addToast(error.response?.data?.detail || 'Failed to change password', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 bg-background text-foreground max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal information and security settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: ID Card */}
        <div className="col-span-1 rounded-xl border border-border bg-card shadow-sm text-card-foreground p-6 flex flex-col items-center text-center">
          <div className="relative group cursor-pointer mb-4">
            <div className="h-24 w-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden border-2 border-primary/20">
              {profile?.profile_photo ? (
                <img src={`${API_BASE}${profile.profile_photo}`} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                profile?.first_name?.charAt(0) || user?.email.charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
              <span className="text-xs font-medium">Upload</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <h2 className="text-xl font-bold">{profile?.first_name} {profile?.last_name}</h2>
          <p className="text-sm text-muted-foreground mb-4">{profile?.role}</p>
          
          <div className="w-full pt-4 border-t border-border space-y-3 text-sm text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> EMP ID</span>
              <span className="font-medium">{profile?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Building className="h-4 w-4" /> Dept</span>
              <span className="font-medium">{profile?.department?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4" /> Role</span>
              <span className="font-medium">{profile?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Joined</span>
              <span className="font-medium">{profile?.joining_date ? new Date(profile?.joining_date).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Settings */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          
          {/* Contact Info */}
          <div className="rounded-xl border border-border bg-card shadow-sm text-card-foreground overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Contact Information</h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Number</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Emergency Contact Name</label>
                    <input 
                      type="text" 
                      value={formData.emergency_contact}
                      onChange={e => setFormData({...formData, emergency_contact: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Emergency Contact </label>
                    <input 
                      type="text" 
                      value={formData.emergency_phone}
                      onChange={e => setFormData({...formData, emergency_phone: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
                    <textarea 
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                      <Save className="h-4 w-4" /> Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Email Address</label>
                    <div className="mt-1 text-sm font-medium">{profile?.email}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Number</label>
                    <div className="mt-1 text-sm font-medium">{profile?.phone_number || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Address</label>
                    <div className="mt-1 text-sm font-medium">{profile?.address || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Emergency Contact Name</label>
                    <div className="mt-1 text-sm font-medium">{profile?.emergency_contact || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Emergency Contact </label>
                    <div className="mt-1 text-sm font-medium">{profile?.emergency_phone || 'Not provided'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security */}
          <div className="rounded-xl border border-border bg-card shadow-sm text-card-foreground overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Security</h3>
            </div>
            <div className="p-6">
              {!isChangingPassword ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Password</h4>
                    <p className="text-xs text-muted-foreground mt-1">Change your password regularly to keep your account secure.</p>
                  </div>
                  <button 
                    onClick={() => setIsChangingPassword(true)}
                    className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    <Lock className="h-4 w-4" /> Change Password
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Current Password</label>
                    <input 
                      type="password" 
                      required
                      value={passForm.current}
                      onChange={e => setPassForm({...passForm, current: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
                    <input 
                      type="password" 
                      required
                      value={passForm.new}
                      onChange={e => setPassForm({...passForm, new: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      required
                      value={passForm.confirm}
                      onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsChangingPassword(false)}
                      className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
