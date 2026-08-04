import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Save } from 'lucide-react';
import { hrApiClient } from '../../lib/api/hr';
import { useToastStore } from '../../store/toastStore';

interface UploadPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadPolicyModal({ isOpen, onClose, onSuccess }: UploadPolicyModalProps) {
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      useToastStore.getState().addToast('Please select a file to upload.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('version', version);
      formData.append('effective_date', effectiveDate);
      formData.append('file', file);
      
      await hrApiClient.post('/hr/policies/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      useToastStore.getState().addToast('Policy uploaded successfully.', 'success');
      onSuccess();
      onClose();
      // Reset
      setTitle(''); setVersion(''); setEffectiveDate(''); setFile(null);
    } catch (error: any) {
      useToastStore.getState().addToast(error.response?.data?.detail || 'Failed to upload policy.', 'error');
    } finally {
      setIsSubmitting(false);
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
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card text-card-foreground shadow-2xl p-6 border border-border"
          >
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <h2 className="text-xl font-bold">Upload New Policy</h2>
              <button type="button" onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Policy Title</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none placeholder:text-muted-foreground" placeholder="e.g. Employee Handbook" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Version</label>
                  <input required type="text" placeholder="1.0" value={version} onChange={e => setVersion(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Effective Date</label>
                  <input required type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none [color-scheme:dark_light]" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Policy Document (PDF)</label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Drag and drop or click to browse</p>
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 mt-2" 
                  />
                </div>
                {file && <p className="mt-2 text-sm font-medium text-primary">Selected: {file.name}</p>}
              </div>
              
              <div className="pt-4 border-t border-border flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-md hover:bg-muted text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-70 text-sm font-medium">
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
