import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ActivityVaultItem, ActivityItem } from '../../types';
import { uploadVaultFile, deleteRemoteFile, saveActivity } from '../../services/ActivityService';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Link as LinkIcon, 
  X, 
  PlusCircle, 
  FileIcon, 
  Eye, 
  ArrowLeft, 
  LayoutGrid, 
  Loader2,
  CloudUpload,
  Globe,
  Save,
  ChevronRight,
  FileCode,
  FileCheck
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsConfirm } from '../../utils/swalUtils';

interface LinkQueueItem {
  url: string;
  label: string;
}

interface FileUploadQueueItem {
  file: File;
  label: string;
  previewUrl: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

const DocumentationVault: React.FC = () => {
  const { id: urlActivityId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [metadata, setMetadata] = useState<ActivityItem | null>((location.state as any)?.item || null);
  
  // DIRECT REGISTRY: Initialize items from metadata prop directly
  const [items, setItems] = useState<ActivityVaultItem[]>(metadata?.vault_items || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [fileQueue, setFileQueue] = useState<FileUploadQueueItem[]>([]);
  const [linkQueue, setLinkQueue] = useState<LinkQueueItem[]>([{ url: '', label: '' }]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recovery logic if metadata is missing
  useEffect(() => {
    const loadMetadata = async () => {
      if (!metadata && urlActivityId) {
        setIsLoading(true);
        // Fallback logic could be added here to fetch from Supabase by ID if needed
        setIsLoading(false);
      } else if (metadata) {
         setItems(metadata.vault_items || []);
      }
    };
    loadMetadata();
  }, [urlActivityId, metadata]);

  // DIRECT REGISTRY: Atomic Update Logic
  const handleSyncVault = async (newItems: ActivityVaultItem[]) => {
    if (!metadata || !urlActivityId) return;
    
    // Ensure data integrity
    const cleanItems = newItems.filter(i => i && !i.fileId?.startsWith('optimistic_'));

    const updatedMetadata: ActivityItem = { 
      ...metadata, 
      vault_items: cleanItems,
      updatedAt: new Date().toISOString()
    };
    
    // 1. Optimistic Update (UI Only)
    setMetadata(updatedMetadata);
    setItems(cleanItems);

    // 2. Persist to Supabase
    try {
      const success = await saveActivity(updatedMetadata);
      if (!success) {
        showXeenapsToast('error', 'Registry sync failed. Check connection.');
      }
    } catch (e) {
      console.error("Sync Error", e);
      showXeenapsToast('error', 'Network error during sync.');
    }
  };

  // --- FILE UPLOAD LOGIC ---
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newItems: FileUploadQueueItem[] = files.map(file => ({
      file,
      label: file.name,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending'
    }));
    setFileQueue(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBatchFileUpload = async () => {
    if (fileQueue.length === 0) return;
    setIsProcessing(true);
    setIsFileModalOpen(false);

    // 1. OPTIMISTIC UPDATE
    const optimisticBatchId = crypto.randomUUID();
    const optimisticItems: ActivityVaultItem[] = fileQueue.map((q, idx) => ({
      type: 'FILE',
      label: q.label,
      mimeType: q.file.type,
      fileId: `optimistic_${optimisticBatchId}_${idx}_${q.previewUrl || 'no-preview'}`,
      nodeUrl: metadata?.storageNodeUrl
    }));
    
    // Backup original state in case of failure
    const originalItems = [...items];
    setItems([...items, ...optimisticItems]);

    // 2. BACKGROUND UPLOAD PROCESS
    try {
      const uploadedItems: ActivityVaultItem[] = [];
      let failureCount = 0;

      for (const q of fileQueue) {
        const result = await uploadVaultFile(q.file);
        if (result) {
          uploadedItems.push({
            type: 'FILE',
            fileId: result.fileId,
            nodeUrl: result.nodeUrl,
            label: q.label,
            mimeType: q.file.type
          });
        } else {
          failureCount++;
        }
      }

      if (uploadedItems.length > 0) {
        // Replace optimistic items with real data
        const finalGallery = [...originalItems, ...uploadedItems];
        await handleSyncVault(finalGallery);
        
        if (failureCount > 0) {
           showXeenapsToast('warning', `${failureCount} files failed to upload due to network.`);
        } else {
           showXeenapsToast('success', 'Documents secured & registry updated.');
        }
      } else {
        // All failed
        throw new Error("All uploads failed");
      }

    } catch (err) {
      // Rollback on complete failure
      setItems(originalItems);
      showXeenapsToast('error', 'Upload failed. Please check your internet connection.');
    } finally {
      setFileQueue([]);
      setIsProcessing(false);
    }
  };

  // --- LINK LOGIC ---
  const handleBatchLinkSave = async () => {
    const validLinks = linkQueue.filter(l => l.url.trim() && l.label.trim());
    if (validLinks.length === 0) return;

    setIsLinkModalOpen(false);
    const newVaultItems: ActivityVaultItem[] = validLinks.map(l => ({
      type: 'LINK',
      url: l.url,
      label: l.label
    }));

    const updatedGallery = [...items, ...newVaultItems];
    await handleSyncVault(updatedGallery);
    setLinkQueue([{ url: '', label: '' }]);
  };

  const handleRemoveItem = async (idx: number) => {
    const item = items[idx];
    const confirm = await showXeenapsConfirm(
      'REMOVE DOCUMENT?', 
      `This action is permanent for stored files.`,
      'DELETE'
    );

    if (confirm.isConfirmed) {
      const prevItems = [...items];
      const newItems = items.filter((_, i) => i !== idx);
      
      // Update UI First
      setItems(newItems); 
      
      try {
        // Physical Cleanup (Fire & Forget)
        if (item.type === 'FILE' && item.fileId && item.nodeUrl && !item.fileId.startsWith('optimistic_')) {
           // We don't await this to speed up UI, but we log errors
           deleteRemoteFile(item.fileId, item.nodeUrl).catch(e => console.warn("Cleanup warning:", e));
        }
        
        // Metadata Sync
        await handleSyncVault(newItems);
      } catch (err) {
        setItems(prevItems);
        showXeenapsToast('error', 'Removal synchronization failed');
      }
    }
  };

  // --- HYBRID STATE LOCKING LOGIC ---
  const isLocked = isProcessing || items.some(i => i.fileId?.startsWith('optimistic_'));

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] animate-in slide-in-from-right duration-500 overflow-hidden">
      
      {/* PAGE HEADER */}
      <header className="px-6 md:px-10 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between shrink-0 z-50">
         <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (isLocked) return;
                navigate(`/activities/${urlActivityId}`, { state: { item: metadata } });
              }} 
              disabled={isLocked}
              className={`p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
               <ArrowLeft size={18} strokeWidth={3} />
            </button>
            <div className="min-w-0">
               <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight truncate max-w-xs md:max-w-md">{metadata?.eventName || 'Vault'}</h2>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Documentation Gallery</p>
            </div>
         </div>

         <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsLinkModalOpen(true)}
              disabled={isLocked}
              className={`flex items-center gap-2 px-5 py-2.5 bg-white text-[#004A74] rounded-2xl text-[9px] font-black uppercase tracking-widest border border-gray-200 transition-all hover:bg-gray-50 active:scale-95 shadow-sm ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <LinkIcon size={14} /> Add Links
            </button>
            <button 
              onClick={() => setIsFileModalOpen(true)}
              disabled={isLocked}
              className={`flex items-center gap-2 px-6 py-2.5 bg-[#004A74] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95 ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLocked ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Files
            </button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="aspect-square skeleton rounded-[2.5rem]" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-20">
             <LayoutGrid size={80} strokeWidth={1} className="text-[#004A74]" />
             <p className="text-sm font-black uppercase tracking-[0.4em]">Vault is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {items.map((item, idx) => {
              const isOptimistic = item.fileId?.startsWith('optimistic_');
              // Strictly detect if it is an image based on mimeType
              const isImage = item.type === 'FILE' && item.mimeType?.startsWith('image/');
              
              let displayUrl = '';
              if (item.type === 'LINK') {
                displayUrl = item.url || '';
              } else if (isOptimistic) {
                // For optimistic items, we rely on the blob URL stored in the ID
                const parts = item.fileId?.split('_') || [];
                const rawUrl = parts.length > 3 ? parts.slice(3).join('_') : '';
                displayUrl = rawUrl === 'no-preview' ? '' : rawUrl;
              } else if (item.fileId) {
                // FIXED LOGIC: Strict distinction between Image (LH3) and File (Drive Viewer)
                if (isImage) {
                  displayUrl = `https://lh3.googleusercontent.com/d/${item.fileId}`;
                } else {
                  displayUrl = `https://drive.google.com/file/d/${item.fileId}/view`;
                }
              }

              return (
                <div 
                  key={idx}
                  className={`group relative aspect-square bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col ${isOptimistic ? 'opacity-80 ring-2 ring-[#FED400]/50' : ''}`}
                >
                  <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden relative">
                    {/* Render Image only if it is actually an image */}
                    {isImage ? (
                      <img src={displayUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.label} />
                    ) : item.type === 'LINK' ? (
                      <div className="flex flex-col items-center gap-2 text-[#004A74]/30 group-hover:text-[#FED400] transition-colors">
                         <Globe size={40} strokeWidth={1.5} />
                         <span className="text-[8px] font-black uppercase tracking-tighter">Link</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#004A74]/30 group-hover:text-[#004A74] transition-colors">
                         <FileText size={40} strokeWidth={1.5} />
                         <span className="text-[8px] font-black uppercase tracking-tighter">File</span>
                      </div>
                    )}

                    {/* PER-ITEM IN-FRAME LOADER */}
                    {isOptimistic && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                        <Loader2 size={32} className="text-[#004A74] animate-spin" />
                        <span className="text-[7px] font-black uppercase mt-2 text-[#004A74] tracking-widest animate-pulse">Syncing...</span>
                      </div>
                    )}

                    {/* ACTIONS: ONLY SHOW IF READY */}
                    {!isOptimistic && (
                      <div className="absolute inset-0 bg-[#004A74]/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-30">
                         <button 
                            onClick={() => displayUrl && window.open(displayUrl, '_blank')}
                            className="p-3 bg-[#FED400] text-[#004A74] rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg"
                         >
                            <Eye size={18} />
                         </button>
                         <button 
                            onClick={() => handleRemoveItem(idx)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all active:scale-95"
                         >
                            <Trash2 size={14} />
                         </button>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-white shrink-0 border-t border-gray-50">
                     <p className="text-[9px] font-black text-[#004A74] truncate uppercase tracking-tight">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* UNIFIED FILE UPLOAD MODAL */}
      {isFileModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><CloudUpload size={24} /></div>
                    <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">File Upload</h2>
                 </div>
                 <button onClick={() => { setFileQueue([]); setIsFileModalOpen(false); }} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                 {fileQueue.length === 0 ? (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-gray-50 cursor-pointer hover:bg-white hover:border-[#004A74]/20 transition-all group">
                       <PlusCircle className="w-10 h-10 text-gray-300 group-hover:text-[#004A74] mb-3" />
                       <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Documents or Images</p>
                       <input type="file" className="hidden" multiple onChange={onFileSelect} />
                    </label>
                 ) : (
                    <div className="space-y-4">
                       {fileQueue.map((q, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 group animate-in slide-in-from-left-2">
                             <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center">
                                {q.previewUrl ? <img src={q.previewUrl} className="w-full h-full object-cover" /> : <FileIcon size={24} className="text-gray-300" />}
                             </div>
                             <div className="flex-1 space-y-2">
                                <label className="text-[8px] font-black uppercase text-gray-400">File Label</label>
                                <input className="w-full bg-white border border-gray-100 px-3 py-2 rounded-lg text-[11px] font-bold text-[#004A74]" value={q.label} onChange={e => setFileQueue(prev => prev.map((item, idx) => idx === i ? {...item, label: e.target.value} : item))} />
                             </div>
                             <button onClick={() => setFileQueue(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-red-300 hover:text-red-500"><X size={16} /></button>
                          </div>
                       ))}
                       <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-[#004A74] hover:bg-white transition-all">+ Add More Files</button>
                       <input type="file" ref={fileInputRef} className="hidden" multiple onChange={onFileSelect} />
                    </div>
                 )}
              </div>
              <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                 <button onClick={() => { setFileQueue([]); setIsFileModalOpen(false); }} className="px-8 py-3 bg-white text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                 <button onClick={handleBatchFileUpload} disabled={fileQueue.length === 0} className="px-10 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50">Confirm</button>
              </div>
           </div>
        </div>
      )}

      {/* UNIFIED LINK MODAL */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg"><LinkIcon size={24} /></div>
                    <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Links Insert</h2>
                 </div>
                 <button onClick={() => setIsLinkModalOpen(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                 {linkQueue.map((l, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group animate-in zoom-in-95">
                       <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-gray-400">Link</label>
                          <input type="url" className="w-full bg-white border border-gray-100 px-3 py-2 rounded-lg text-[11px] font-bold text-blue-500" value={l.url} placeholder="https://..." onChange={e => setLinkQueue(prev => prev.map((item, idx) => idx === i ? {...item, url: e.target.value} : item))} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-gray-400">Label</label>
                          <input className="w-full bg-white border border-gray-100 px-3 py-2 rounded-lg text-[11px] font-bold text-[#004A74]" value={l.label} placeholder="Custom Name" onChange={e => setLinkQueue(prev => prev.map((item, idx) => idx === i ? {...item, label: e.target.value} : item))} />
                       </div>
                       {linkQueue.length > 1 && (
                          <button onClick={() => setLinkQueue(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                       )}
                    </div>
                 ))}
                 <button onClick={() => setLinkQueue([...linkQueue, { url: '', label: '' }])} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-[#004A74] hover:bg-white transition-all">+ Add More Links</button>
              </div>
              <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                 <button onClick={() => { setLinkQueue([{ url: '', label: '' }]); setIsLinkModalOpen(false); }} className="px-8 py-3 bg-white text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                 <button onClick={handleBatchLinkSave} className="px-10 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase shadow-xl">Confirm</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DocumentationVault;