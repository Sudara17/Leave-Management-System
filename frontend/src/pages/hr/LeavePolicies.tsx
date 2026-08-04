import { useState, useEffect } from 'react';
import { 
  FileText, UploadCloud, FileDown, MoreVertical, Plus
} from 'lucide-react';
import { getPolicies } from '../../lib/api/hr';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function LeavePolicies() {
  useDocumentTitle('Leave Policies');
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await getPolicies();
      setPolicies(data);
    } catch (error) {
      console.error('Failed to fetch policies', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handlePreview = async (policy: any) => {
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      const response = await hrApiClient.get(`/hr/policies/${policy.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error) {
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast('Failed to preview document', 'error');
    }
  };

  const handleAction = async (action: 'deactivate' | 'delete', policy: any) => {
    setActiveDropdown(null);
    if (!window.confirm(`Are you sure you want to ${action} ${policy.title}?`)) return;
    
    try {
      const { hrApiClient } = await import('../../lib/api/hr');
      if (action === 'deactivate') {
        await hrApiClient.put(`/hr/policies/${policy.id}/deactivate`);
      } else {
        await hrApiClient.delete(`/hr/policies/${policy.id}`);
      }
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast(`Policy ${action}d successfully`, 'success');
      fetchPolicies();
    } catch (error) {
      const { useToastStore } = await import('../../store/toastStore');
      useToastStore.getState().addToast(`Failed to ${action} policy`, 'error');
    }
  };

  // Dynamically import modal
  const [UploadModal, setUploadModal] = useState<any>(null);
  useEffect(() => {
    import('../../components/hr/UploadPolicyModal').then(mod => setUploadModal(() => mod.default));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 bg-background text-foreground">
      {UploadModal && (
        <UploadModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)} 
          onSuccess={fetchPolicies} 
        />
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Policies</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage company policies and track employee acceptance.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all">
            <Plus className="h-4 w-4" /> Upload Policy
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {loading ? (
          <div className="p-12 flex justify-center">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : policies.length > 0 ? (
          <>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-border pb-2">Active Policies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {policies.filter(p => p.is_active).map(policy => (
                  <div key={policy.id} className="flex flex-col rounded-xl border border-border bg-card shadow-sm text-card-foreground overflow-visible relative group">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-lg bg-primary/10 p-3 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${policy.is_active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    {policy.is_active ? 'Active' : 'Archived'}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors cursor-pointer">
                  {policy.title}
                </h3>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium font-mono text-xs">v{policy.version}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Effective Date</span>
                    <span className="font-medium">{policy.effective_date ? new Date(policy.effective_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Uploaded By</span>
                    <span className="font-medium">{policy.created_by?.first_name ? `${policy.created_by.first_name} ${policy.created_by.last_name}` : 'HR Admin'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{(policy.updated_at || policy.created_at) ? new Date(policy.updated_at || policy.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border bg-muted/30 p-4 flex gap-2 relative">
                <button onClick={() => handlePreview(policy)} className="flex-1 flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
                  <FileDown className="h-4 w-4" /> Preview
                </button>
                <div className="relative">
                  <button onClick={() => setActiveDropdown(activeDropdown === policy.id ? null : policy.id)} className="rounded-md border border-border bg-card p-2 hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {activeDropdown === policy.id && (
                    <div className="absolute bottom-full right-0 mb-2 w-36 rounded-md border border-border bg-card shadow-lg z-30 py-1">
                      <button onClick={() => handleAction('deactivate', policy)} className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-muted">Deactivate</button>
                      <button onClick={() => handleAction('delete', policy)} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-muted">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {policies.filter(p => p.is_active).length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">No active policies found.</div>
          )}
          </div>
        </div>

        {policies.filter(p => !p.is_active).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b border-border pb-2 text-muted-foreground">Archived Policies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
              {policies.filter(p => !p.is_active).map(policy => (
                <div key={policy.id} className="flex flex-col rounded-xl border border-border bg-muted/50 shadow-sm text-muted-foreground overflow-visible relative group">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="rounded-lg bg-muted-foreground/10 p-3">
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                        Archived
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-1">
                      {policy.title}
                    </h3>
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span>Version</span>
                        <span className="font-mono text-xs">v{policy.version}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Effective Date</span>
                        <span>{policy.effective_date ? new Date(policy.effective_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-border p-4 flex gap-2">
                    <button onClick={() => handlePreview(policy)} className="flex-1 flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                      <FileDown className="h-4 w-4" /> Preview
                    </button>
                    <button onClick={() => handleAction('delete', policy)} className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-rose-600 hover:bg-muted">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card text-card-foreground">
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Policies Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">Upload your first employee handbook or leave policy to track employee acceptance.</p>
            <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Upload Policy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
