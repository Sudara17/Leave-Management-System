import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPolicies, acceptPolicy } from '../../lib/api/employee';
import { useToastStore } from '../../store/toastStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuthStore } from '../../store/authStore';

export default function Policies() {
  useDocumentTitle('Company Policies');
  const API_BASE = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "http://localhost:8000";
  const user = useAuthStore((state) => state.user);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  
  const addToast = useToastStore(state => state.addToast);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await getPolicies();
      setPolicies(data);
    } catch (error) {
      console.error('Failed to fetch policies', error);
      addToast('Failed to load company policies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleAccept = async (id: number) => {
    try {
      await acceptPolicy(id);
      addToast('Policy accepted successfully', 'success');
      setSelectedPolicy(null);
      fetchPolicies(); // refresh status
    } catch (error: any) {
      addToast(error.response?.data?.detail || 'Failed to accept policy', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Company Policies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and acknowledge important company documents and guidelines.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {policies.map((policy, i) => (
          <motion.div
            key={policy.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-xl border ${policy.has_accepted ? 'border-border' : 'border-amber-200 dark:border-amber-900/50'} bg-card shadow-sm overflow-hidden flex flex-col`}
          >
            <div className={`p-6 border-b ${policy.has_accepted ? 'border-border bg-muted/30' : 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${policy.has_accepted ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                  <FileText className="h-6 w-6" />
                </div>
                {policy.has_accepted ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-400">
                    <ShieldAlert className="h-3.5 w-3.5" /> Required
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground line-clamp-1">{policy.title}</h3>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Version: {policy.version}</span>
                <span>Effective: {new Date(policy.effective_date).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="p-6 flex flex-col gap-3 mt-auto">
              {policy.file_url && (
                <a 
                  href={`${API_BASE}${policy.file_url}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex justify-center items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </a>
              )}
              
              {!policy.has_accepted && (
                <button 
                  onClick={() => setSelectedPolicy(policy)}
                  className="w-full flex justify-center items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  Acknowledge & Accept
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {policies.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-xl">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No Policies Available</h3>
            <p className="text-muted-foreground text-sm mt-1">There are currently no active company policies to review.</p>
          </div>
        )}
      </div>

      {/* Acceptance Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
          >
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Policy Acknowledgement</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <h3 className="font-semibold text-foreground">{selectedPolicy.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">Version {selectedPolicy.version} • Effective {new Date(selectedPolicy.effective_date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  By clicking "I Accept", you digitally sign that you have read, understood, and agree to abide by the guidelines outlined in this policy document. This action will be recorded in the company audit log.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30 rounded-b-xl">
              <button 
                onClick={() => setSelectedPolicy(null)}
                className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleAccept(selectedPolicy.id)}
                className="px-4 py-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                I Accept
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
