import React, { useState, useEffect, useRef } from 'react';
import { ConsultationItem, LibraryItem, ConsultationAnswerContent } from '../../types';
import { saveConsultation, callAiConsult, deleteConsultation } from '../../services/ConsultationService';
import { fetchFileContent } from '../../services/gasService';
import { deleteRemoteFile } from '../../services/ActivityService'; // Import generic file deletion
import { 
  ArrowLeftIcon, 
  SparklesIcon, 
  StarIcon,
  CpuChipIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';
import { Save } from 'lucide-react';
import { BRAND_ASSETS } from '../../assets';
import { GlobalSavingOverlay } from '../Common/LoadingComponents';

interface ConsultationResultViewProps {
  collection: LibraryItem;
  consultation: ConsultationItem;
  initialAnswer?: ConsultationAnswerContent | null;
  onBack: () => void;
  onUpdate?: (updated: ConsultationItem) => void;
  onDeleteOptimistic?: (id: string) => void;
}

const ConsultationResultView: React.FC<ConsultationResultViewProps> = ({ collection, consultation, initialAnswer, onBack, onUpdate, onDeleteOptimistic }) => {
  const [answerContent, setAnswerContent] = useState<ConsultationAnswerContent | null>(initialAnswer || null);
  const [localQuestion, setLocalQuestion] = useState(consultation.question);
  const [tempQuestion, setTempQuestion] = useState(consultation.question);
  const [isEditing, setIsEditing] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  const [isFavorite, setIsFavorite] = useState(consultation.isFavorite || false);
  const [isLoading, setIsLoading] = useState(!initialAnswer);
  const [isThinking, setIsThinking] = useState(false);
  
  // New State for Saving Overlay
  const [isSaving, setIsSaving] = useState(false);
  
  // Dirty State Management
  const [isDirty, setIsDirty] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadStoredAnswer = async () => {
      if (!initialAnswer && consultation.answerJsonId) {
        setIsLoading(true);
        const data = await fetchFileContent(consultation.answerJsonId, consultation.nodeUrl);
        if (data) setAnswerContent(data);
        setIsLoading(false);
      }
    };
    loadStoredAnswer();
  }, [consultation, initialAnswer]);

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [localQuestion, tempQuestion, isEditing]);

  const handleStartEdit = () => {
    setTempQuestion(localQuestion);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setTempQuestion(localQuestion);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const newQuestion = tempQuestion.trim();
    if (!newQuestion) return;

    // Optimistic Update UI
    setLocalQuestion(newQuestion);
    setIsEditing(false);
    
    // Mark as dirty instead of saving immediately
    setIsDirty(true);

    // Notify Parent instantly (Optimistic)
    const updatedItem = {
      ...consultation,
      question: newQuestion,
      updatedAt: new Date().toISOString()
    };
    onUpdate?.(updatedItem);
  };

  // Explicit Save Function
  const handleSaveChanges = async () => {
    // Validation Feedback
    if (!answerContent) {
      showXeenapsToast('error', 'Content not fully loaded. Please wait or refresh.');
      return;
    }
    
    setIsSaving(true); // Trigger Loading State Immediately
    
    const updatedItem = {
      ...consultation,
      question: localQuestion,
      isFavorite: isFavorite,
      updatedAt: new Date().toISOString()
    };

    try {
      const success = await saveConsultation(updatedItem, answerContent);
      if (success) {
        setIsDirty(false);
        onUpdate?.(updatedItem);
        showXeenapsToast('success', 'Changes saved successfully');
      } else {
        showXeenapsToast('error', 'Failed to save changes to server');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection error. Check your network.');
    } finally {
      setIsSaving(false); // Disable Loading State
    }
  };

  const handleReConsult = async () => {
    // Gunakan tempQuestion jika sedang editing, atau localQuestion jika sudah di save
    const targetQuestion = isEditing ? tempQuestion : localQuestion;
    if (!targetQuestion.trim() || isThinking) return;

    setIsThinking(true);
    showXeenapsToast('info', 'Re-architecting knowledge synthesis...');

    try {
      const result = await callAiConsult(collection.id, targetQuestion);
      if (result) {
        setAnswerContent(result);
        
        // Update Registry & Shard
        const updatedItem: ConsultationItem = {
          ...consultation,
          question: targetQuestion,
          updatedAt: new Date().toISOString()
        };

        onUpdate?.(updatedItem);
        const success = await saveConsultation(updatedItem, result);
        if (success) {
          setIsDirty(false); // Clean state after re-consultation (auto-saved)
          showXeenapsToast('success', 'Synthesis Re-synchronized');
        }
      } else {
        showXeenapsToast('error', 'AI Synthesis Interrupted');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection lost');
    } finally {
      setIsThinking(false);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    setIsDirty(true);
  };

  // Safe Navigation Guard
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
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      // 1. Instant UI Feedback & Navigation (Optimistic)
      if (onDeleteOptimistic) {
          onDeleteOptimistic(consultation.id);
      } else {
          onBack();
      }
      showXeenapsToast('success', 'Consultation deleted');

      // 2. Background Process (Fire and Forget)
      // Melakukan cleanup tanpa memblokir UI thread
      (async () => {
        try {
          // Physical Cleanup (GAS)
          if (consultation.answerJsonId && consultation.nodeUrl) {
             await deleteRemoteFile(consultation.answerJsonId, consultation.nodeUrl);
          }
          // Metadata Cleanup (Supabase)
          await deleteConsultation(consultation.id);
        } catch (e) {
          console.error("Background deletion error:", e);
        }
      })();
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white animate-in slide-in-from-right duration-500 overflow-hidden relative">
      
      {/* HEADER BAR (Navigation & Actions) */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 z-50">
         <div className="flex items-center gap-4">
            <button onClick={handleSafeBack} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90">
               <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
               <h2 className="text-sm md:text-base font-black text-[#004A74] uppercase tracking-widest truncate">Consultation Session</h2>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">Dig More Knowledge</p>
            </div>
         </div>

         <div className="flex items-center gap-3">
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
                <button onClick={toggleFavorite} className="p-2.5 rounded-xl border transition-all shadow-sm active:scale-90 border-gray-100 hover:bg-[#FED400]/10 text-[#FED400]">
                   {isFavorite ? <StarSolid className="w-5 h-5 text-[#FED400]" /> : <StarIcon className="w-5 h-5 text-[#FED400]" />}
                </button>
                <button onClick={handleDelete} className="p-2.5 bg-white border border-gray-100 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm active:scale-90">
                   <TrashIcon className="w-5 h-5" />
                </button>
              </>
            )}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-[#fcfcfc]">
         <div className="max-w-4xl mx-auto space-y-8 pb-32">
            
            {/* 1. SOURCE HEADER (Replaces Blue Banner) */}
            <header className="space-y-4">
               <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-[#FED400] text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">
                     {collection.topic}
                  </span>
               </div>
               
               <h1 className="text-2xl md:text-3xl font-black text-[#004A74] leading-tight uppercase tracking-tight">
                  {collection.title}
               </h1>

               <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                     <ClockIcon className="w-3.5 h-3.5" />
                     <span>Created: {formatDisplayDate(consultation.createdAt)}</span>
                  </div>
               </div>
            </header>

            {/* 2. QUESTION CARD (Clean & Structured) */}
            <section className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 relative overflow-hidden group/question transition-all">
               <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                     Consultation Inquiry
                  </h3>
                  
                  {/* EDIT BUTTONS */}
                  <div className="flex items-center gap-2">
                     {!isEditing ? (
                       <button 
                         onClick={handleStartEdit}
                         className="p-1.5 text-gray-400 hover:text-[#004A74] hover:bg-gray-100 rounded-lg transition-all"
                         title="Edit Question"
                       >
                         <PencilIcon className="w-4 h-4" />
                       </button>
                     ) : (
                       <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
                         <button 
                           onClick={handleSaveEdit}
                           className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"
                           title="Apply Edit"
                         >
                           <CheckIcon className="w-4 h-4 stroke-[3]" />
                         </button>
                         <button 
                           onClick={handleCancelEdit}
                           className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200 transition-all"
                           title="Cancel"
                         >
                           <XMarkIcon className="w-4 h-4" />
                         </button>
                       </div>
                     )}
                  </div>
               </div>
               
               <div className="space-y-6">
                  {isEditing ? (
                    <textarea 
                      ref={textareaRef}
                      autoFocus
                      className="w-full bg-gray-50 border-2 border-[#004A74]/10 p-5 rounded-2xl outline-none text-base md:text-lg font-bold text-[#004A74] leading-relaxed italic placeholder:text-gray-200 resize-none overflow-hidden focus:bg-white focus:border-[#FED400]/50 transition-all"
                      value={tempQuestion}
                      onChange={(e) => setTempQuestion(e.target.value)}
                      placeholder="Enter your inquiry for analysis..."
                      rows={1}
                    />
                  ) : (
                    <p className="text-base md:text-lg font-bold text-[#004A74] leading-relaxed italic border-l-4 border-[#FED400] pl-6">
                      "{localQuestion}"
                    </p>
                  )}

                  <div className="flex justify-end pt-2 border-t border-gray-50">
                    <button 
                      onClick={handleReConsult}
                      disabled={isThinking || (isEditing ? !tempQuestion.trim() : !localQuestion.trim())}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#004A74] text-[#FED400] rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale"
                    >
                      {isThinking ? (
                        <>
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          Re-Analyze Inquiry
                        </>
                      )}
                    </button>
                  </div>
               </div>
            </section>

            {(isLoading || isThinking) ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-24 w-full bg-gray-100 rounded-[2rem]" />
                <div className="h-96 w-full bg-gray-100 rounded-[2.5rem]" />
              </div>
            ) : answerContent && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                 
                 {/* 3. REASONING PROCESS BOX (Clean Accordion) */}
                 {answerContent.reasoning && (
                   <div className="bg-gray-50 border border-gray-100 rounded-[2rem] overflow-hidden transition-all hover:border-[#004A74]/10">
                      <button 
                        onClick={() => setShowReasoning(!showReasoning)}
                        className="w-full px-6 py-4 flex items-center justify-between text-[#004A74] hover:bg-gray-100 transition-all"
                      >
                         <div className="flex items-center gap-3">
                            <CpuChipIcon className="w-4 h-4 opacity-60" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">AI Reasoning Context</span>
                         </div>
                         {showReasoning ? <ChevronUpIcon className="w-4 h-4 opacity-50" /> : <ChevronDownIcon className="w-4 h-4 opacity-50" />}
                      </button>
                      
                      {showReasoning && (
                        <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                           <div className="p-5 bg-white border border-gray-100 rounded-2xl text-[10px] md:text-xs text-gray-500 font-medium italic leading-relaxed whitespace-pre-wrap">
                              {answerContent.reasoning}
                           </div>
                        </div>
                      )}
                   </div>
                 )}

                 {/* 4. FINAL SYNTHESIS BUBBLE (Clean Reading Layout) */}
                 <section className="space-y-4">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 px-2">
                      Consultation Response
                    </h3>
                    <div className="p-8 md:p-12 bg-white border border-gray-100 rounded-[3rem] shadow-xl relative min-h-[400px] overflow-hidden">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-[#FED400]/5 -translate-y-24 translate-x-24 rounded-full" />
                       <div 
                         className="text-sm md:text-base leading-[1.8] text-[#004A74] font-medium whitespace-pre-wrap consultation-result-body relative z-10"
                         dangerouslySetInnerHTML={{ __html: answerContent.answer }} 
                       />
                    </div>
                 </section>
              </div>
            )}

            <div ref={scrollRef} className="h-10" />
         </div>
      </div>
      
      {/* SAVING OVERLAY - Fixed Center */}
      <GlobalSavingOverlay isVisible={isSaving} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        
        .consultation-result-body b {
           color: #004A74;
           font-weight: 800;
        }

        .xeenaps-highlight {
           background-color: #FED40030;
           color: #004A74;
           padding: 0 4px;
           border-radius: 4px;
           font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default ConsultationResultView;