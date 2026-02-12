import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ReviewItem, ReviewContent, ReviewMatrixRow, LibraryItem } from '../../../types';
import { saveReview, runMatrixExtraction } from '../../../services/ReviewService';
import { fetchFileContent } from '../../../services/gasService';
import { 
  ArrowLeft, 
  Plus, 
  Sparkles, 
  Save, 
  Trash2, 
  BookOpen, 
  Check, 
  X, 
  Loader2,
  FileText
} from 'lucide-react';
import { showXeenapsToast } from '../../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import { GlobalSavingOverlay } from '../../Common/LoadingComponents';
import { FormField } from '../../Common/FormComponents';
import ReviewSourceSelectorModal from './ReviewSourceSelectorModal';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../../utils/swalUtils';

const ReviewDetail: React.FC<{ libraryItems: LibraryItem[], isMobileSidebarOpen: boolean }> = ({ libraryItems, isMobileSidebarOpen }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [review, setReview] = useState<ReviewItem | null>((location.state as any)?.review || null);
  const [content, setContent] = useState<ReviewContent>({ matrix: [], finalSynthesis: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // States for row editing
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editAnswer, setEditAnswer] = useState('');
  const [editVerbatim, setEditVerbatim] = useState('');

  // Fallback load
  useEffect(() => {
    const load = async () => {
      if (!review && id) {
        // Fetch metadata logic here if needed (omitted for brevity, assume passed via nav usually)
        // For now, if no review, go back
        navigate('/research/literature-review');
        return;
      }
      
      if (review && review.reviewJsonId) {
        setIsLoading(true);
        const data = await fetchFileContent(review.reviewJsonId, review.storageNodeUrl);
        if (data) {
           setContent(data);
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };
    load();
  }, [id, review, navigate]);

  const handleUpdateMeta = (field: keyof ReviewItem, val: string) => {
    if (!review) return;
    setReview({ ...review, [field]: val, updatedAt: new Date().toISOString() });
  };

  const handleSave = async () => {
    if (!review) return;
    setIsSaving(true);
    try {
      const success = await saveReview(review, content);
      if (success) {
        showXeenapsToast('success', 'Review saved successfully');
      } else {
        showXeenapsToast('error', 'Save failed');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSources = async (selectedLibs: LibraryItem[]) => {
    if (!review) return;
    setIsSelectorOpen(false);
    setIsProcessing(true);
    
    const newRows: ReviewMatrixRow[] = [];
    
    for (const lib of selectedLibs) {
      try {
        // FIX: Pass extractedJsonId and storageNodeUrl directly to service to bypass backend lookup failure
        const result = await runMatrixExtraction(lib.id, review.centralQuestion, lib.extractedJsonId, lib.storageNodeUrl);
        if (result) {
          const completedRow: ReviewMatrixRow = {
            collectionId: lib.id,
            title: lib.title,
            answer: result.answer,
            verbatim: result.verbatim
          };
          newRows.push(completedRow);
        } else {
          // Fallback empty row
          newRows.push({
            collectionId: lib.id,
            title: lib.title,
            answer: "Extraction failed or content unavailable.",
            verbatim: ""
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (newRows.length > 0) {
      setContent(prev => ({
        ...prev,
        matrix: [...prev.matrix, ...newRows]
      }));
      showXeenapsToast('success', `${newRows.length} sources analyzed.`);
      handleSave(); // Auto save
    }
    setIsProcessing(false);
  };

  const handleRemoveRow = async (idx: number) => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const newMatrix = content.matrix.filter((_, i) => i !== idx);
      setContent({ ...content, matrix: newMatrix });
    }
  };

  const startEditRow = (idx: number, row: ReviewMatrixRow) => {
    setEditingRowIdx(idx);
    setEditAnswer(row.answer);
    setEditVerbatim(row.verbatim);
  };

  const saveEditRow = () => {
    if (editingRowIdx === null) return;
    const newMatrix = [...content.matrix];
    newMatrix[editingRowIdx] = {
      ...newMatrix[editingRowIdx],
      answer: editAnswer,
      verbatim: editVerbatim
    };
    setContent({ ...content, matrix: newMatrix });
    setEditingRowIdx(null);
  };

  if (!review) return null;

  return (
    <div className={`flex-1 flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 overflow-hidden ${isMobileSidebarOpen ? 'blur-sm pointer-events-none' : ''}`}>
      <GlobalSavingOverlay isVisible={isSaving} />
      
      {isSelectorOpen && (
        <ReviewSourceSelectorModal 
          onClose={() => setIsSelectorOpen(false)}
          onConfirm={handleAddSources}
          currentMatrixCount={content.matrix.length}
        />
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-6 md:px-10 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={() => navigate('/research/literature-review')} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90">
               <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
               <h2 className="text-lg font-black text-[#004A74] uppercase tracking-tighter truncate max-w-md">{review.label}</h2>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Literature Matrix</p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-70">
               {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32 space-y-10">
         {/* 1. CENTRAL QUESTION */}
         <section className="space-y-4">
            <FormField label="Central Research Question">
               <textarea 
                 className="w-full px-6 py-5 bg-white border border-gray-200 rounded-[2rem] text-lg font-bold text-[#004A74] outline-none focus:ring-4 focus:ring-[#004A74]/5 transition-all resize-none min-h-[100px]"
                 placeholder="What is the main question this review seeks to answer?"
                 value={review.centralQuestion}
                 onChange={e => handleUpdateMeta('centralQuestion', e.target.value)}
               />
            </FormField>
         </section>

         {/* 2. SYNTHESIS MATRIX */}
         <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2"><BookOpen size={14} /> Extraction Matrix</h3>
               <button 
                 onClick={() => setIsSelectorOpen(true)}
                 disabled={!review.centralQuestion.trim() || isProcessing}
                 className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-200 text-[#004A74] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#FED400]/10 transition-all disabled:opacity-50"
               >
                 {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Sources
               </button>
            </div>

            <div className="space-y-6">
               {content.matrix.length === 0 ? (
                 <div className="py-20 text-center opacity-30 border-2 border-dashed border-gray-200 rounded-[3rem]">
                    <p className="text-[10px] font-black uppercase tracking-widest">Matrix Empty</p>
                 </div>
               ) : (
                 content.matrix.map((row, idx) => (
                   <div key={idx} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative group">
                      <div className="flex justify-between items-start mb-6">
                         <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[#004A74] text-white flex items-center justify-center text-xs font-black">{idx + 1}</span>
                            <h4 className="text-sm font-black text-[#004A74] uppercase max-w-lg truncate">{row.title}</h4>
                         </div>
                         <div className="flex gap-2">
                            {editingRowIdx === idx ? (
                               <>
                                 <button onClick={saveEditRow} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><Check size={16} /></button>
                                 <button onClick={() => setEditingRowIdx(null)} className="p-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100"><X size={16} /></button>
                               </>
                            ) : (
                               <button onClick={() => handleRemoveRow(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                            )}
                         </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div className="space-y-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Answer Extraction</span>
                            {editingRowIdx === idx ? (
                               <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-medium text-[#004A74]" rows={6} value={editAnswer} onChange={e => setEditAnswer(e.target.value)} />
                            ) : (
                               <div 
                                 onClick={() => startEditRow(idx, row)}
                                 className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 text-xs font-medium text-[#004A74] leading-relaxed cursor-pointer hover:border-[#FED400] transition-all min-h-[120px]"
                               >
                                  {row.answer}
                               </div>
                            )}
                         </div>
                         <div className="space-y-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 ml-1">Verbatim Evidence</span>
                            {editingRowIdx === idx ? (
                               <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-medium text-gray-500 italic" rows={6} value={editVerbatim} onChange={e => setEditVerbatim(e.target.value)} />
                            ) : (
                               <div 
                                 onClick={() => startEditRow(idx, row)}
                                 className="p-5 bg-white border border-gray-200 rounded-[2rem] text-xs font-medium text-gray-500 italic leading-relaxed cursor-pointer hover:border-[#FED400] transition-all min-h-[120px]"
                               >
                                  "{row.verbatim}"
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </section>
         
         {/* 3. FINAL SYNTHESIS */}
         <section className="space-y-4 pt-8 border-t border-gray-100">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 flex items-center gap-2"><Sparkles size={14} /> Final Synthesis</h3>
            <textarea 
               className="w-full px-8 py-8 bg-white border border-gray-200 rounded-[3rem] text-sm font-medium text-[#004A74] outline-none focus:ring-4 focus:ring-[#004A74]/5 transition-all resize-none min-h-[200px] leading-relaxed"
               placeholder="Synthesize your findings here..."
               value={content.finalSynthesis}
               onChange={e => setContent({...content, finalSynthesis: e.target.value})}
            />
         </section>

      </div>
    </div>
  );
};

export default ReviewDetail;
