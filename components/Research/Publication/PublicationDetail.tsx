
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore - Resolving TS error for missing exported members useParams, useNavigate, useLocation
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PublicationItem, PublicationStatus } from '../../../types';
import { savePublication, fetchPublicationsPaginated, deletePublication } from '../../../services/PublicationService';
import { getCleanedProfileName } from '../../../services/ProfileService';
import { 
  ArrowLeft, 
  ExternalLink, 
  BookOpen, 
  Target, 
  Layers, 
  FileText, 
  Link as LinkIcon, 
  Globe, 
  Loader2, 
  Tag, 
  Share2, 
  Star, 
  Trash2, 
  Save 
} from 'lucide-react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { showXeenapsToast } from '../../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import { FormField, FormDropdown } from '../../Common/FormComponents';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../../utils/swalUtils';
import { GlobalSavingOverlay } from '../../Common/LoadingComponents';

const PublicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [item, setItem] = useState<PublicationItem | null>(() => (location.state as any)?.item || null);
  
  // State Management for Manual Save
  const [isBusy, setIsBusy] = useState(false);
  // Initialize isDirty to true if it is a new draft
  const [isDirty, setIsDirty] = useState(() => (location.state as any)?.isNew || false);
  const [isSaving, setIsSaving] = useState(false);
  
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const load = async () => {
      // If item exists in state (passed from navigation), skip fetch
      if (item && item.id === id) return;
      
      const res = await fetchPublicationsPaginated(1, 1000);
      const found = res.items.find(i => i.id === id);
      if (found) setItem(found);
      else navigate('/research/publication');
    };
    load();
  }, [id, item, navigate]);

  // LAZY FETCH FOR NEW DRAFTS: Get Profile Name from Supabase if empty
  useEffect(() => {
    const initializeAuthor = async () => {
      const isNewDraft = (location.state as any)?.isNew;
      if (isNewDraft && item && (!item.authors || item.authors.length === 0)) {
        try {
          const name = await getCleanedProfileName();
          if (name) {
            setItem(prev => prev ? { ...prev, authors: [name] } : null);
            // Intentionally not setting isDirty true here to avoid blocking immediate exit if user did nothing else,
            // but effectively it will be part of the first save.
          }
        } catch (e) {
          console.error("Failed to lazy load profile name", e);
        }
      }
    };
    initializeAuthor();
  }, []);

  // Prevent accidental browser closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Sync Global Dirty Flag for Sidebar Interception
  useEffect(() => {
    (window as any).xeenapsIsDirty = isDirty;
    return () => {
      (window as any).xeenapsIsDirty = false;
    };
  }, [isDirty]);

  // Helper to update state and mark as dirty
  const handleManualChange = (updated: PublicationItem) => {
    setItem(updated);
    setIsDirty(true);
  };

  const handleSaveChanges = async () => {
    if (!item) return;
    setIsSaving(true); // Trigger Loading State Immediately
    
    try {
      const success = await savePublication({ ...item, updatedAt: new Date().toISOString() });
      if (success) {
        setIsDirty(false);
        showXeenapsToast('success', 'Changes saved successfully');
      } else {
        showXeenapsToast('error', 'Failed to save changes');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [item?.title]);

  const handleToggleFavorite = () => {
    if (!item) return;
    const updated = { ...item, isFavorite: !item.isFavorite };
    handleManualChange(updated);
  };

  const handleDelete = async () => {
    if (!item) return;
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      setIsBusy(true);
      const success = await deletePublication(item.id);
      if (success) {
        showXeenapsToast('success', 'Publication removed');
        navigate('/research/publication');
      } else {
        setIsBusy(false);
        showXeenapsToast('error', 'Failed to delete');
      }
    }
  };

  const handleSafeBack = async () => {
    if (isDirty) {
      const result = await Swal.fire({
        ...XEENAPS_SWAL_CONFIG,
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Are you sure you want to leave?',
        showCancelButton: true,
        confirmButtonText: 'Discard & Leave',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444'
      });
      if (result.isConfirmed) {
        navigate('/research/publication');
      }
    } else {
      navigate('/research/publication');
    }
  };

  if (!item) return <div className="p-10 text-center animate-pulse font-black text-[#004A74] uppercase tracking-widest">Initializing Workspace...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative animate-in slide-in-from-right duration-500">
      
      {/* SAVING OVERLAY */}
      <GlobalSavingOverlay isVisible={isSaving} />

      {/* HUD Header */}
      <header className="px-4 md:px-10 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex flex-row items-center justify-between gap-2 md:gap-4 shrink-0 z-[90]">
         <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <button onClick={handleSafeBack} className="p-2 md:p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90 shrink-0">
               <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
               <h2 className="text-sm md:text-xl font-black text-[#004A74] uppercase tracking-tighter truncate">Publication</h2>
               <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">Personal Publication Identity</p>
            </div>
         </div>
         <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {isDirty ? (
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className={`flex items-center gap-2 px-6 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all animate-in zoom-in-95 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
              >
                {isSaving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            ) : (
              <>
                <button 
                  onClick={handleToggleFavorite}
                  className={`p-2 md:p-3 rounded-xl transition-all shadow-sm active:scale-90 border border-gray-100 ${item.isFavorite ? 'bg-yellow-50 border-yellow-200 text-[#FED400]' : 'bg-white text-gray-300 hover:bg-[#FED400]/10 hover:text-[#FED400]'}`}
                  title="Toggle Favorite"
                >
                  <Star size={18} className={item.isFavorite ? "fill-[#FED400]" : ""} />
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="p-2 md:p-3 bg-white text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all shadow-sm active:scale-90 border border-gray-100 disabled:opacity-50"
                  title="Delete Publication"
                >
                  {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </>
            )}
         </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-10">
           
           {/* SECTION 1: FULL WIDTH (TOP) - IDENTITY */}
           <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
              <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">
                 <div className="flex-1 space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                       <FileText size={14} />Title
                    </label>
                    <textarea 
                      ref={titleRef}
                      className="w-full bg-transparent border-none outline-none text-xl md:text-3xl font-black text-[#004A74] uppercase tracking-tighter leading-tight placeholder:text-gray-100 resize-none overflow-hidden"
                      value={item.title}
                      placeholder="ENTER TITLE..."
                      onChange={(e) => handleManualChange({ ...item, title: e.target.value })}
                      rows={1}
                    />
                 </div>
                 <div className="shrink-0 space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400 flex justify-end">Publication Status</label>
                    <FormDropdown 
                      value={item.status}
                      options={Object.values(PublicationStatus)}
                      onChange={(v) => handleManualChange({ ...item, status: v as PublicationStatus })}
                      placeholder="Select Status"
                      allowCustom={false}
                    />
                 </div>
              </div>
           </div>

           {/* SECTION 2: 2 COLUMN GRID (MIDDLE) - CORE METADATA VS TECHNICAL/DATES */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Left Column: Core Metadata */}
              <div className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#004A74] flex items-center gap-2 mb-6">
                    <Layers size={16} className="text-[#FED400]" />Classification
                 </h3>
                 
                 <div className="grid grid-cols-2 gap-6">
                    <FormField label="Publication Type">
                       <FormDropdown 
                         value={item.type}
                         options={['Journal', 'Conference Paper', 'Book Chapter', 'Book', 'Preprint']}
                         onChange={(v) => handleManualChange({ ...item, type: v })}
                         placeholder="Type"
                       />
                    </FormField>
                    <FormField label="Publisher/Journal">
                       <input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-[#004A74]" 
                         value={item.publisherName || ''} onChange={(e) => handleManualChange({...item, publisherName: e.target.value})} />
                    </FormField>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <FormField label="Research Domain">
                       <FormDropdown 
                         value={item.researchDomain || ''}
                         options={[]}
                         onChange={(v) => handleManualChange({ ...item, researchDomain: v })}
                         placeholder="e.g. Cardiology"
                         allowCustom={true}
                       />
                    </FormField>
                    <FormField label="Affiliation">
                       <input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-[#004A74]" 
                         placeholder="Institution name..."
                         value={item.affiliation || ''} onChange={(e) => handleManualChange({...item, affiliation: e.target.value})} />
                    </FormField>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <FormField label="Indexing">
                       <FormDropdown 
                         value={item.indexing || ''}
                         options={['Scopus', 'Web of Science', 'Sinta', 'Google Scholar', 'Others']}
                         onChange={(v) => handleManualChange({ ...item, indexing: v })}
                         placeholder="Indexing"
                       />
                    </FormField>
                    <FormField label="Rank">
                       <FormDropdown 
                         value={item.quartile || ''}
                         options={['Q1', 'Q2', 'Q3', 'Q4', 'Non-Q']}
                         onChange={(v) => handleManualChange({ ...item, quartile: v })}
                         placeholder="Rank"
                       />
                    </FormField>
                 </div>

                 <FormField label="Author List">
                    <FormDropdown 
                      isMulti
                      multiValues={item.authors || []}
                      options={['Xeenaps User']}
                      onAddMulti={(v) => handleManualChange({...item, authors: [...(item.authors || []), v]})}
                      onRemoveMulti={(v) => handleManualChange({...item, authors: (item.authors || []).filter(a => a !== v)})}
                      placeholder="Add Authors..."
                      value="" onChange={() => {}}
                    />
                 </FormField>
                 
                 <FormField label="Link">
                    <div className="relative group">
                       <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#004A74]" />
                       <input className="w-full bg-gray-50 border-none pl-12 pr-4 py-3 rounded-xl text-xs font-bold text-blue-500 underline outline-none focus:bg-white focus:ring-2 focus:ring-[#004A74]/10 transition-all" 
                         placeholder="Paste Drive or Web link..."
                         value={item.manuscriptLink || ''} onChange={(e) => handleManualChange({...item, manuscriptLink: e.target.value})} />
                    </div>
                 </FormField>
              </div>

              {/* Right Column: Technical Details & Dates */}
              <div className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#004A74] flex items-center gap-2 mb-6">
                    <Globe size={16} className="text-[#FED400]" /> Metadata & Timeline
                 </h3>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="DOI Number">
                       <input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-mono font-bold text-[#004A74]" 
                         placeholder="10.xxxx/xxx"
                         value={item.doi || ''} onChange={(e) => handleManualChange({...item, doi: e.target.value})} />
                    </FormField>
                    <FormField label="ISSN / ISBN">
                       <input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-mono font-bold text-[#004A74]" 
                         value={item.issn_isbn || ''} onChange={(e) => handleManualChange({...item, issn_isbn: e.target.value})} />
                    </FormField>
                 </div>

                 <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1"><FormField label="Vol"><input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-center" value={item.volume || ''} onChange={(e) => handleManualChange({...item, volume: e.target.value})} /></FormField></div>
                    <div className="col-span-1"><FormField label="Issue"><input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-center" value={item.issue || ''} onChange={(e) => handleManualChange({...item, issue: e.target.value})} /></FormField></div>
                    <div className="col-span-1"><FormField label="Pages"><input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-center" value={item.pages || ''} onChange={(e) => handleManualChange({...item, pages: e.target.value})} /></FormField></div>
                    <div className="col-span-1"><FormField label="Year"><input className="w-full bg-gray-50 border-none px-4 py-3 rounded-xl text-xs font-bold text-center" value={item.year || ''} onChange={(e) => handleManualChange({...item, year: e.target.value})} /></FormField></div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Submission">
                       <input type="date" className="w-full bg-gray-50 border-none px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter" 
                         value={item.submissionDate || ''} onChange={(e) => handleManualChange({...item, submissionDate: e.target.value})} />
                    </FormField>
                    <FormField label="Acceptance">
                       <input type="date" className="w-full bg-gray-50 border-none px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter" 
                         value={item.acceptanceDate || ''} onChange={(e) => handleManualChange({...item, acceptanceDate: e.target.value})} />
                    </FormField>
                    <FormField label="Published">
                       <input type="date" className="w-full bg-gray-50 border-none px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter" 
                         value={item.publicationDate || ''} onChange={(e) => handleManualChange({...item, publicationDate: e.target.value})} />
                    </FormField>
                 </div>
              </div>
           </div>

           {/* SECTION 3: FULL WIDTH (BOTTOM) - CONTENT */}
           <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                    <BookOpen size={14} /> Abstract Content
                 </label>
                 <textarea 
                   className="w-full bg-gray-50 p-6 border border-gray-100 rounded-3xl outline-none text-sm font-medium text-[#004A74] leading-relaxed transition-all focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 min-h-[200px]"
                   placeholder="Enter final abstract here..."
                   value={item.abstract || ''}
                   onChange={(e) => handleManualChange({ ...item, abstract: e.target.value })}
                 />
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                    <Target size={14} /> Strategic Keywords
                 </label>
                 <FormDropdown 
                    isMulti
                    multiValues={item.keywords || []}
                    options={[]}
                    onAddMulti={(v) => handleManualChange({...item, keywords: [...(item.keywords || []), v]})}
                    onRemoveMulti={(v) => handleManualChange({...item, keywords: (item.keywords || []).filter(a => a !== v)})}
                    placeholder="Add keywords..."
                    value="" onChange={() => {}}
                 />
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2">
                    <Tag size={14} /> Process Remarks / Review Log
                 </label>
                 <textarea 
                   className="w-full bg-[#FED400]/5 p-6 border border-[#FED400]/10 rounded-3xl outline-none text-xs font-bold text-[#004A74] leading-relaxed transition-all focus:bg-white focus:ring-4 focus:ring-[#FED400]/5 min-h-[150px]"
                   placeholder="Notes on review process, editor feedback, etc..."
                   value={item.remarks || ''}
                   onChange={(e) => handleManualChange({ ...item, remarks: e.target.value })}
                 />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PublicationDetail;
