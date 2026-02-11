
import React, { useState, useEffect } from 'react';
import { LibraryItem } from '../../types';
import { fetchFileContent, saveExtractedContentToDrive, createEmptyInsightFile } from '../../services/gasService';
import { upsertLibraryItemToSupabase } from '../../services/LibrarySupabaseService';
import { deleteRemoteFile } from '../../services/ActivityService'; // Reusing generic remote file deletion
import { 
  XMarkIcon, 
  ArrowPathIcon,
  CloudArrowUpIcon,
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Save, FileCode } from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { GlobalSavingOverlay } from '../Common/LoadingComponents';

interface ContentManagerModalProps {
  item: LibraryItem;
  onClose: () => void;
  onSuccess: (updatedItem: LibraryItem) => void;
}

const ContentManagerModal: React.FC<ContentManagerModalProps> = ({ item, onClose, onSuccess }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      if (item.extractedJsonId) {
        try {
          const data = await fetchFileContent(item.extractedJsonId, item.storageNodeUrl);
          if (data && data.fullText) {
            setContent(data.fullText);
          } else {
             // Fallback if structure is different
             setContent(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
          }
        } catch (e) {
          showXeenapsToast('error', 'Failed to load content source.');
        }
      }
      setIsLoading(false);
    };
    loadContent();
  }, [item]);

  const handleSave = async () => {
    if (!content.trim()) {
       showXeenapsToast('warning', 'Content cannot be empty. Use Clear to remove.');
       return;
    }

    setIsSaving(true);
    try {
      // 1. Save Physical File to GAS (Drive)
      const result = await saveExtractedContentToDrive(item, content);
      
      if (result && result.status === 'success') {
         
         // NEW: Check & Create Insight File if missing (Sharding Affinity)
         let finalInsightId = item.insightJsonId;
         if (!finalInsightId) {
            const createdId = await createEmptyInsightFile(item, result.nodeUrl);
            if (createdId) finalInsightId = createdId;
         }

         // 2. Update Metadata in Supabase
         const updatedItem = {
           ...item,
           extractedJsonId: result.fileId,
           insightJsonId: finalInsightId,
           storageNodeUrl: result.nodeUrl,
           updatedAt: new Date().toISOString()
         };

         const dbSuccess = await upsertLibraryItemToSupabase(updatedItem);
         
         if (dbSuccess) {
            showXeenapsToast('success', 'Content source updated successfully');
            onSuccess(updatedItem);
            onClose();
         } else {
            showXeenapsToast('error', 'Failed to update registry database');
         }
      } else {
         showXeenapsToast('error', 'Failed to save file to Cloud Storage');
      }
    } catch (e) {
       showXeenapsToast('error', 'Connection interrupted');
    } finally {
       setIsSaving(false);
    }
  };

  const handleClear = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (!confirmed) return;

    setIsSaving(true);
    try {
       // 1. Delete Physical File (Fire & Forget)
       if (item.extractedJsonId && item.storageNodeUrl) {
          await deleteRemoteFile(item.extractedJsonId, item.storageNodeUrl);
       }

       // 2. Update Metadata (Nullify ID)
       const updatedItem = {
         ...item,
         extractedJsonId: null as any, // Explicitly null
         updatedAt: new Date().toISOString()
       };

       // Note: Supabase might ignore null if type is strict string, but our schema allows text/null
       // If strict, sending empty string might be safer depending on DB constraints, 
       // but semantically NULL is correct for "No Content".
       // We cast to any to bypass strict TS check if needed for the update logic.
       const dbSuccess = await upsertLibraryItemToSupabase(updatedItem);

       if (dbSuccess) {
          showXeenapsToast('success', 'Content source cleared');
          onSuccess(updatedItem);
          onClose();
       } else {
          showXeenapsToast('error', 'Failed to update registry');
       }
    } catch (e) {
       showXeenapsToast('error', 'Clear operation failed');
    } finally {
       setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <GlobalSavingOverlay isVisible={isSaving} />

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh] border border-white/20">
        
        {/* HEADER */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                 <FileCode size={24} />
              </div>
              <div>
                 <h3 className="text-lg md:text-xl font-black text-[#004A74] uppercase tracking-tight">Content Source Manager</h3>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
              <XMarkIcon className="w-6 h-6 md:w-8 md:h-8" />
           </button>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 p-0 relative bg-[#fcfcfc]">
           {isLoading ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-[#004A74]/50">
                <ArrowPathIcon className="w-10 h-10 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Fetching Content...</p>
             </div>
           ) : (
             <textarea 
               className="w-full h-full p-6 md:p-10 bg-transparent border-none outline-none text-xs md:text-sm font-mono font-medium text-[#004A74] resize-none leading-relaxed custom-scrollbar focus:bg-white transition-all"
               placeholder="No content extracted yet. Paste raw text here..."
               value={content}
               onChange={(e) => setContent(e.target.value)}
               spellCheck={false}
             />
           )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-5 md:p-8 bg-white border-t border-gray-100 flex flex-col-reverse md:flex-row items-center justify-between gap-4 shrink-0">
           <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
              <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <DocumentTextIcon className="w-3 h-3" /> {content.length.toLocaleString()} Characters
                 </p>
              </div>
           </div>

           <div className="flex items-center gap-3 w-full md:w-auto">
              {item.extractedJsonId && (
                <button 
                  onClick={handleClear}
                  disabled={isSaving || isLoading}
                  className="flex-1 md:flex-none justify-center px-4 py-3 md:px-6 md:py-4 bg-white border-2 border-red-100 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" /> Clear Source
                </button>
              )}
              <button 
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="flex-1 md:flex-none justify-center px-6 py-3 md:px-10 md:py-4 bg-[#004A74] text-[#FED400] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
              >
                {isSaving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                Save Content
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ContentManagerModal;
