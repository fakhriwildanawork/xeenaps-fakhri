
import React, { useState, useEffect } from 'react';
import { LibraryItem, TracerReference } from '../../../../types';
import { linkTracerReference, unlinkTracerReference } from '../../../../services/TracerService';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  LibraryBig,
  BookOpen,
  Calendar
} from 'lucide-react';
import { showXeenapsToast } from '../../../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../../../utils/confirmUtils';
import ReferenceDetailView from '../Modals/ReferenceDetailView';
import ResourcePicker from '../../../Teaching/ResourcePicker'; // Path verified

interface ReferenceTabProps {
  projectId: string;
  libraryItems: LibraryItem[];
  references: TracerReference[];
  setReferences: React.Dispatch<React.SetStateAction<TracerReference[]>>;
  onRefresh: () => Promise<void>;
  reopenedRef?: (LibraryItem & { refRow: TracerReference }) | null;
  onOpenLibrary?: (item: LibraryItem, referenceContext: any) => void;
  onClearReopenRef?: () => void;
}

const ReferenceTab: React.FC<ReferenceTabProps> = ({ projectId, libraryItems, references, setReferences, onRefresh, reopenedRef, onOpenLibrary, onClearReopenRef }) => {
  const [selectedRef, setSelectedRef] = useState<LibraryItem & { refRow?: TracerReference } | null>(null);
  
  // State to track if the current view was restored from history (to disable slide animation)
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // AUTO-OPEN LOGIC
  useEffect(() => {
    if (reopenedRef) {
      setSelectedRef(reopenedRef);
      setIsRestoredSession(true); // Mark as restored
    }
  }, [reopenedRef]);

  const handleSelectSources = async (selectedItems: any[]) => {
    setIsPickerOpen(false);
    
    // Filter duplicates locally first
    const newItems = selectedItems.filter(item => !references.some(r => r.collectionId === item.id));
    
    if (newItems.length === 0) {
      showXeenapsToast('warning', 'Selected items already anchored.');
      return;
    }

    let successCount = 0;
    for (const item of newItems) {
      // Optimistic Add - Append to bottom
      const tempId = crypto.randomUUID();
      const mockRef: TracerReference = {
        id: tempId,
        projectId,
        collectionId: item.id,
        contentJsonId: '',
        storageNodeUrl: '',
        createdAt: new Date().toISOString()
      };
      setReferences(prev => [...prev, mockRef]);

      // Background Sync
      const realData = await linkTracerReference({ projectId, collectionId: item.id });
      if (realData) {
        setReferences(prev => prev.map(r => r.id === tempId ? realData : r));
        successCount++;
      } else {
        setReferences(prev => prev.filter(r => r.id !== tempId));
      }
    }
    
    if (successCount > 0) showXeenapsToast('success', `${successCount} sources anchored`);
  };

  const handleUnlink = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const originalRefs = [...references];
      // Optimistic Remove
      setReferences(prev => prev.filter(t => t.id !== id));

      // Background Sync
      const success = await unlinkTracerReference(id);
      if (success) {
        showXeenapsToast('success', 'Anchor removed');
      } else {
        // Rollback
        setReferences(originalRefs);
        showXeenapsToast('error', 'Removal failed. Rollback synchronized.');
      }
    }
  };

  const associatedItems = references.map(r => {
    const lib = libraryItems.find(it => it.id === r.collectionId);
    return lib ? { ...lib, refRow: r } : null;
  }).filter(Boolean) as (LibraryItem & { refRow: TracerReference })[];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {selectedRef && (
        <ReferenceDetailView 
          item={selectedRef} 
          refRow={selectedRef.refRow!} 
          isRestored={isRestoredSession}
          onClose={() => {
            setSelectedRef(null);
            setIsRestoredSession(false); // Reset restored state on manual close
            if (onClearReopenRef) onClearReopenRef();
          }}
          onOpenLibrary={(lib) => {
            if (onOpenLibrary) {
              onOpenLibrary(lib, selectedRef);
            }
          }}
        />
      )}

      {isPickerOpen && (
        <ResourcePicker 
          type="LIBRARY"
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleSelectSources}
        />
      )}

      {/* SEARCH SECTION REPLACED WITH ACTION BUTTON */}
      <section className="space-y-4">
         <div className="flex items-center justify-between">
           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Research References</h3>
           <button 
             onClick={() => setIsPickerOpen(true)}
             className="flex items-center gap-2 px-6 py-3 bg-[#004A74] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
           >
             <Plus size={16} /> ADD SOURCE
           </button>
         </div>
      </section>

      {/* ASSOCIATED REFERENCES - LIST MODEL */}
      <section className="space-y-6">
         <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#004A74] flex items-center gap-2">
               <LibraryBig size={16} className="text-[#FED400]" /> Selected References
            </h3>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{associatedItems.length} Sources Linked</span>
         </div>
         
         <div className="grid grid-cols-1 gap-3">
            {associatedItems.length === 0 ? (
              <div className="py-20 text-center opacity-20 bg-white border border-dashed border-gray-200 rounded-[2.5rem]">
                 <BookOpen size={48} className="mx-auto mb-2 text-[#004A74]" />
                 <p className="text-[10px] font-black uppercase tracking-widest">No references anchored yet</p>
              </div>
            ) : associatedItems.map((lib, idx) => (
              <div 
                key={lib.id} 
                onClick={() => {
                  setIsRestoredSession(false); // Clean opening from list, so use Slide Animation
                  setSelectedRef(lib);
                }}
                className="group bg-white p-5 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-xl hover:border-[#FED400]/40 transition-all duration-300 cursor-pointer relative overflow-hidden"
              >
                 <div className="absolute top-0 left-0 w-1 h-full bg-gray-100 group-hover:bg-[#FED400] transition-colors" />
                 
                 <div className="shrink-0 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#004A74] shadow-inner group-hover:bg-[#004A74] group-hover:text-white transition-all">
                    <span className="text-xs font-black">{idx + 1}</span>
                 </div>

                 <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-[#004A74] uppercase leading-tight truncate mb-1">{lib.title}</h4>
                    <div className="flex items-center gap-4 text-gray-400">
                       <span className="text-[9px] font-bold uppercase tracking-tight truncate max-w-[150px]">{lib.authors[0]}</span>
                       <div className="w-1 h-1 rounded-full bg-gray-200" />
                       <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter">
                          <Calendar size={10} /> {lib.year}
                       </div>
                       <div className="w-1 h-1 rounded-full bg-gray-200" />
                       <span className="text-[9px] font-black bg-gray-50 px-2 py-0.5 rounded-md text-gray-500 uppercase">{lib.topic}</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={(e) => handleUnlink(e, lib.refRow.id)} 
                      className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                      title="Remove Anchor"
                    >
                       <Trash2 size={16} />
                    </button>
                    <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl group-hover:bg-[#FED400]/20 group-hover:text-[#004A74] transition-all shadow-sm">
                       <ChevronRight size={20} />
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </section>
    </div>
  );
};

export default ReferenceTab;
