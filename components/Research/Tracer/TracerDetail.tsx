


import React, { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore - Resolving TS error for missing exported members
import { useParams, useNavigate, useLocation } from 'react-router-dom';
// Fix: Added missing ResearchSource type import
import { TracerProject, TracerLog, TracerReference, TracerTodo, TracerFinanceItem, TracerFinanceContent, GASResponse, TracerLogContent, TracerReferenceContent, LibraryItem, TracerStatus, ResearchSource } from '../../../types';
import { 
  fetchTracerProjects, 
  saveTracerProject, 
  fetchTracerLogs, 
  fetchTracerReferences, 
  fetchTracerTodos,
  saveTracerLog,
  deleteTracerLog,
  deleteTracerProject
} from '../../../services/TracerService';
// Fix: Added missing service imports for auditing functionality
import { fetchProjectSources, saveProjectSource } from '../../../services/ResearchService';
import { fetchHybridSnippet, analyzeSingleSourceGap } from '../../../services/GapFinderService';
import { fetchFileContent } from '../../../services/gasService';
import { getCleanedProfileName } from '../../../services/ProfileService';
import { 
  ArrowLeft, 
  Layout, 
  BookOpen, 
  User, 
  CheckSquare,
  ChevronRight,
  Target,
  MessageSquare,
  FlaskConical,
  Users,
  Plus,
  Clock,
  Banknote,
  Trash2,
  // Fix: Added missing Bold and Italic icon imports
  Bold,
  Italic,
  Save,
  Loader2,
  Search
} from 'lucide-react';
// Fix: Added missing component imports for the modals used at the end of the file
import ResearchSourceSelectorModal from '../ResearchSourceSelectorModal';
import LibraryDetailView from '../../Library/LibraryDetailView';
import { FormPageContainer, FormField, FormDropdown } from '../../Common/FormComponents';
import { showXeenapsDeleteConfirm } from '../../../utils/confirmUtils';
import { showXeenapsToast } from '../../../utils/toastUtils';
import ReferenceTab from './Tabs/ReferenceTab';
import TodoTab from './Tabs/TodoTab';
import FinanceTab from './Tabs/FinanceTab';
import TracerLogModal from './Modals/TracerLogModal';
import { GlobalSavingOverlay } from '../../Common/LoadingComponents';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../../utils/swalUtils';
import TracerField from './TracerField';

// --- SAVE MEMORY CACHE ---
const logContentCache: Record<string, TracerLogContent> = {};

const TracerDetailSkeleton: React.FC = () => (
  <div className="animate-in fade-in duration-500 w-full flex flex-col">
    <div className="px-6 md:px-10 py-6 border-b border-gray-50 flex items-center justify-between">
       <div className="flex items-center gap-4">
          <div className="w-10 h-10 skeleton rounded-xl" />
          <div className="space-y-2">
             <div className="h-4 w-48 skeleton rounded-md" />
             <div className="h-3 w-24 skeleton rounded-md" />
          </div>
       </div>
       <div className="flex gap-1 bg-gray-50 p-1 rounded-2xl">
          {[1,2,3,4,5].map(i => <div key={i} className="w-24 h-9 skeleton rounded-xl" />)}
       </div>
    </div>
    <div className="p-10 space-y-8 max-w-5xl mx-auto w-full">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="h-16 skeleton rounded-2xl" /><div className="h-16 skeleton rounded-2xl" /></div>
       <div className="h-32 skeleton rounded-[2rem]" />
       <div className="h-16 skeleton rounded-2xl" />
    </div>
  </div>
);

const TracerDetail: React.FC<{ libraryItems: LibraryItem[] }> = ({ libraryItems }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [project, setProject] = useState<TracerProject | null>(() => (location.state as any)?.project || null);
  const [logs, setLogs] = useState<TracerLog[]>([]);
  const [todos, setTodos] = useState<TracerTodo[]>([]);
  const [references, setReferences] = useState<TracerReference[]>([]);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  
  const [selectedSourceForDetail, setSelectedSourceForDetail] = useState<LibraryItem | null>(null);
  const [returnToReferenceItem, setReturnToReferenceItem] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'identity' | 'todo' | 'log' | 'refs' | 'finance'>(
    (location.state as any)?.activeTab || 'identity'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [cleanedProfileName, setCleanedProfileName] = useState("Xeenaps User");

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [initialReopenRef, setInitialReopenRef] = useState<any>(null);
  
  const [logModal, setLogModal] = useState<{ open: boolean; log?: TracerLog; cachedContent?: TracerLogContent }>({ open: false });

  const projectRef = useRef<TracerProject | null>(null);

  const loadAllData = useCallback(async (showSkeleton = false) => {
    if (!id) return;
    if (showSkeleton) setIsLoading(true);
    
    try {
      const [resProjects, resLogs, resTodos, resRefs, cleanedName, resSources] = await Promise.all([
        fetchTracerProjects(1, 1000), 
        fetchTracerLogs(id),
        fetchTracerTodos(id),
        fetchTracerReferences(id),
        getCleanedProfileName(),
        fetchProjectSources(id)
      ]);
      
      setCleanedProfileName(cleanedName);
      const found = resProjects.items.find(p => p.id === id);
      
      if (found) {
        const hydrated = {
          ...found,
          keywords: Array.isArray(found.keywords) ? found.keywords : [],
          authors: Array.isArray(found.authors) ? found.authors : [cleanedName]
        };
        setProject(hydrated);
        projectRef.current = hydrated;
        setLogs(resLogs);
        setTodos(resTodos);
        setReferences(resRefs);
        setSources(resSources);

        const state = location.state as any;
        if (state?.reopenReference) {
           const refItem = state.reopenReference;
           const refRow = resRefs.find(r => r.collectionId === refItem.id);
           if (refRow) {
              setActiveTab('refs');
              setInitialReopenRef({ ...refItem, refRow });
           }
           navigate(location.pathname, { replace: true, state: {} });
        }
      } else {
        navigate('/research/tracer');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, location.state]);

  useEffect(() => {
    loadAllData(true);
  }, [loadAllData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeTab === 'identity' && isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, activeTab]);

  useEffect(() => {
    (window as any).xeenapsIsDirty = (activeTab === 'identity' && isDirty);
    return () => { (window as any).xeenapsIsDirty = false; };
  }, [isDirty, activeTab]);

  const handleUpdateField = (f: keyof TracerProject, v: any) => {
    if (!project || isLoading) return;
    setIsDirty(true);
    const updated = { ...project, [f]: v, updatedAt: new Date().toISOString() };
    setProject(updated);
  };

  const handleManualSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      const success = await saveTracerProject(project);
      if (success) {
        setIsDirty(false);
        projectRef.current = project; 
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

  const handleDiscard = () => {
    if (projectRef.current) {
      setProject(projectRef.current);
    }
    setIsDirty(false);
  };

  const handleSafeBack = async () => {
    if (activeTab === 'identity' && isDirty) {
      const result = await Swal.fire({
        ...XEENAPS_SWAL_CONFIG,
        title: 'Unsaved Changes',
        text: 'You have unsaved changes in Identity tab. Leaving will discard them.',
        showCancelButton: true,
        confirmButtonText: 'Discard & Leave',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444'
      });

      if (result.isConfirmed) {
        handleDiscard();
        navigate('/research/tracer');
      }
    } else {
      navigate('/research/tracer');
    }
  };

  const handleTabChange = async (newTab: typeof activeTab) => {
    if (activeTab === newTab) return;
    if (activeTab === 'identity' && isDirty) {
      const result = await Swal.fire({
        ...XEENAPS_SWAL_CONFIG,
        title: 'Unsaved Changes',
        text: 'You have unsaved changes in Identity tab. Switching tabs will discard them.',
        showCancelButton: true,
        confirmButtonText: 'Discard & Switch',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444'
      });
      if (result.isConfirmed) {
        handleDiscard();
        setActiveTab(newTab);
      }
    } else {
      setActiveTab(newTab);
    }
  };

  const handleOpenLog = async (log: TracerLog) => {
    const cached = logContentCache[log.id];
    setLogModal({ open: true, log, cachedContent: cached });
    if (!cached && log.logJsonId) {
      const data = await fetchFileContent(log.logJsonId, log.storageNodeUrl);
      if (data) {
        logContentCache[log.id] = data;
        setLogModal(prev => prev.log?.id === log.id ? { ...prev, cachedContent: data } : prev);
      }
    }
  };

  const handleSaveLogItem = async (logItem: TracerLog, content: TracerLogContent) => {
    const isEdit = logs.some(l => l.id === logItem.id);
    logContentCache[logItem.id] = content;
    setLogs(prev => {
      if (isEdit) return prev.map(l => l.id === logItem.id ? logItem : l);
      return [logItem, ...prev];
    });
    setLogModal({ open: false });
    await saveTracerLog(logItem, content);
  };

  const handleDeleteLogItem = async (logId: string) => {
    delete logContentCache[logId];
    setLogs(prev => prev.filter(l => l.id !== logId));
    setLogModal({ open: false });
    await deleteTracerLog(logId);
  };

  const handlePermanentDeleteProject = async () => {
    if (!project || isBusy) return;
    if (await showXeenapsDeleteConfirm(1)) {
      setIsBusy(true);
      showXeenapsToast('info', 'Purging project data...');
      if (await deleteTracerProject(project.id)) {
        showXeenapsToast('success', 'Project removed from cloud');
        navigate('/research/tracer');
      } else {
        showXeenapsToast('error', 'Critical: Deletion failed');
        setIsBusy(false);
      }
    }
  };

  const handleStartAudit = async (selectedLibs: LibraryItem[]) => {
    if (!project) return;
    setIsSelectorOpen(false);
    setIsBusy(true);

    const newSources: ResearchSource[] = selectedLibs.map(lib => ({
      id: crypto.randomUUID(),
      projectId: project.id,
      sourceId: lib.id,
      title: lib.title,
      findings: '',
      methodology: '',
      limitations: '',
      isFavorite: false,
      isUsed: false,
      createdAt: new Date().toISOString(),
      isAnalyzing: true
    }));

    setSources(prev => [...prev, ...newSources]);

    for (const newSrc of newSources) {
      const libItem = libraryItems.find(it => it.id === newSrc.sourceId) || selectedLibs.find(it => it.id === newSrc.sourceId);
      if (!libItem) continue;

      try {
        const snippet = await fetchHybridSnippet(libItem);
        if (snippet) {
          const analysis = await analyzeSingleSourceGap(snippet, libItem.title);
          if (analysis) {
            const completed: ResearchSource = {
              ...newSrc,
              findings: analysis.findings || '',
              methodology: analysis.methodology || '',
              limitations: analysis.limitations || '',
              isAnalyzing: false
            };
            await saveProjectSource(completed);
            setSources(prev => prev.map(s => s.id === newSrc.id ? completed : s));
          } else {
            setSources(prev => prev.map(s => s.id === newSrc.id ? { ...s, isAnalyzing: false } : s));
          }
        }
      } catch (e) {
        showXeenapsToast('error', 'Audit segment interrupted.');
        setSources(prev => prev.map(s => s.id === newSrc.id ? { ...s, isAnalyzing: false } : s));
      }
    }

    setIsBusy(false);
    showXeenapsToast('success', 'Matrix segments updated.');
  };

  const handleOpenLibraryFromRef = (lib: LibraryItem, referenceContext?: any) => {
    setSelectedSourceForDetail(lib);
    if (referenceContext) {
      setReturnToReferenceItem(referenceContext);
    }
  };
  
  const handleCloseLibraryDetail = () => {
    setSelectedSourceForDetail(null);
    if (returnToReferenceItem) {
      setInitialReopenRef(returnToReferenceItem);
      setReturnToReferenceItem(null); 
    }
  };

  const handleClearReopenRef = () => {
    setInitialReopenRef(null);
  };

  const formatLogTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDate().toString().padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return "-"; }
  };

  const tabs = [
    { id: 'identity', label: 'Identity', icon: User },
    { id: 'todo', label: 'To Do', icon: CheckSquare },
    { id: 'log', label: 'Journal', icon: Layout },
    { id: 'refs', label: 'References', icon: BookOpen },
    { id: 'finance', label: 'Finance', icon: Banknote }
  ] as const;

  if (isLoading) return <FormPageContainer><TracerDetailSkeleton /></FormPageContainer>;
  if (!project) return null;

  return (
    <FormPageContainer>
      <GlobalSavingOverlay isVisible={isSaving} />

      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-4 md:px-10 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button onClick={handleSafeBack} className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90"><ArrowLeft size={18} /></button>
          <div className="min-w-0 hidden lg:block">
            <h2 className="text-sm font-black text-[#004A74] truncate">RESEARCH TRACER</h2>
          </div>
          <button onClick={handlePermanentDeleteProject} disabled={isBusy} className="p-2.5 bg-white text-red-300 hover:text-red-500 hover:bg-red-50 border border-gray-100 rounded-xl transition-all shadow-sm active:scale-90 disabled:opacity-30">
            <Trash2 size={18} />
          </button>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl gap-0.5 md:gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-[#004A74] text-white shadow-lg' : 'text-gray-400 hover:text-[#004A74]'}`}>
              <t.icon size={14} /><span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex items-center justify-end w-[120px]">
           {activeTab === 'identity' && isDirty && (
              <button onClick={handleManualSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all animate-in fade-in zoom-in-95">
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save size={14} />} Save
              </button>
           )}
        </div>
      </div>

      <div className="p-6 md:p-10 pb-32">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'identity' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Research Label" required>
                     <input className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#004A74] outline-none focus:ring-4 focus:ring-[#004A74]/5 transition-all" value={project.label || ''} onChange={e => handleUpdateField('label', e.target.value)} />
                  </FormField>
                  <FormField label="Progress">
                     <div className="flex items-center gap-4 bg-gray-50 px-5 py-2 rounded-2xl border border-gray-200 h-[52px]">
                        <input type="range" className="flex-1 accent-[#004A74]" min="0" max="100" value={project.progress} onChange={e => handleUpdateField('progress', parseInt(e.target.value))} />
                        <span className="font-black text-sm text-[#004A74] w-10 text-right">{project.progress}%</span>
                     </div>
                  </FormField>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Research Start Date"><input type="date" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono font-bold text-[#004A74]" value={project.startDate} onChange={e => handleUpdateField('startDate', e.target.value)} /></FormField>
                  <FormField label="Target End Date"><input type="date" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono font-bold text-[#004A74]" value={project.estEndDate} onChange={e => handleUpdateField('estEndDate', e.target.value)} /></FormField>
               </div>
               
               {/* UPGRADED TEXTAREAS TO TRACERFIELD */}
               <div className="space-y-6">
                  <TracerField 
                    label={<span className="flex items-center gap-2"><Target size={14} /> Full Research Title</span>}
                    value={project.title}
                    fieldKey="title"
                    context={project}
                    onChange={(val) => handleUpdateField('title', val)}
                    className="w-full px-6 py-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-bold text-[#004A74] outline-none focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 transition-all min-h-[100px] resize-none"
                  />
                  
                  <TracerField 
                    label={<span className="flex items-center gap-2"><Target size={14} /> Research Topic / Domain</span>}
                    value={project.topic}
                    fieldKey="topic"
                    context={project}
                    onChange={(val) => handleUpdateField('topic', val)}
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#004A74] outline-none focus:bg-white focus:ring-4 focus:ring-[#004A74]/5 transition-all"
                  />

                  <TracerField 
                     label={<span className="flex items-center gap-2"><MessageSquare size={14} /> Problem Justification</span>}
                     value={project.problemStatement}
                     fieldKey="problemStatement"
                     context={project}
                     onChange={(val) => handleUpdateField('problemStatement', val)}
                     className="w-full px-6 py-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-medium text-gray-600 leading-relaxed outline-none focus:bg-white min-h-[120px] resize-none"
                  />

                  <TracerField 
                     label={<span className="flex items-center gap-2"><Search size={14} /> The White Space (Gap)</span>}
                     value={project.researchGap}
                     fieldKey="researchGap"
                     context={project}
                     onChange={(val) => handleUpdateField('researchGap', val)}
                     isDark={true}
                     className="w-full px-8 py-5 bg-[#004A74]/5 border border-[#004A74]/10 rounded-[1.5rem] text-xs font-bold text-[#004A74] leading-relaxed outline-none focus:bg-white min-h-[120px] resize-none"
                  />

                  <TracerField 
                     label={<span className="flex items-center gap-2"><MessageSquare size={14} /> Investigation Question</span>}
                     value={project.researchQuestion}
                     fieldKey="researchQuestion"
                     context={project}
                     onChange={(val) => handleUpdateField('researchQuestion', val)}
                     className="w-full pl-11 pr-6 py-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-bold text-[#004A74] italic leading-relaxed outline-none focus:bg-white min-h-[100px] resize-none"
                  />

                  <TracerField 
                     label={<span className="flex items-center gap-2"><FlaskConical size={14} /> Approach & Methodology</span>}
                     value={project.methodology}
                     fieldKey="methodology"
                     context={project}
                     onChange={(val) => handleUpdateField('methodology', val)}
                     className="w-full pl-11 pr-6 py-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-medium text-gray-600 leading-relaxed outline-none focus:bg-white min-h-[120px] resize-none"
                  />

                  <TracerField 
                     label={<span className="flex items-center gap-2"><Users size={14} /> Targeted Population</span>}
                     value={project.population}
                     fieldKey="population"
                     context={project}
                     onChange={(val) => handleUpdateField('population', val)}
                     className="w-full pl-11 pr-6 py-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-medium text-gray-600 leading-relaxed outline-none focus:bg-white min-h-[120px] resize-none"
                  />
               </div>

               <FormField label="Strategic Keywords"><FormDropdown isMulti multiValues={project.keywords || []} options={[]} onAddMulti={v => handleUpdateField('keywords', [...(project.keywords || []), v])} onRemoveMulti={v => handleUpdateField('keywords', (project.keywords || []).filter(k => k !== v))} placeholder="Keywords..." value="" onChange={()=>{}} /></FormField>
               
               <div className="pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Author Team"><FormDropdown isMulti multiValues={project.authors || []} options={[cleanedProfileName]} onAddMulti={v => handleUpdateField('authors', [...(project.authors || []), v])} onRemoveMulti={v => handleUpdateField('authors', (project.authors || []).filter(a => a !== v))} placeholder="Add members..." value="" onChange={()=>{}} /></FormField>
                  <FormField label="Status"><FormDropdown value={project.status} options={Object.values(TracerStatus)} onChange={v => handleUpdateField('status', v)} placeholder="Status" allowCustom={false} showSearch={false} /></FormField>
               </div>
            </div>
          )}

          {activeTab === 'todo' && <TodoTab projectId={project.id} todos={todos} setTodos={setTodos} onRefresh={() => loadAllData(false)} />}
          {activeTab === 'log' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
               <div className="flex justify-between items-center px-4">
                  <h3 className="text-[11px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2"><Layout size={18} /> Research Journal</h3>
                  <button onClick={() => setLogModal({ open: true })} className="flex items-center gap-2 px-6 py-2.5 bg-[#004A74] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"><Plus size={16} /> New Entry</button>
               </div>
               <div className="space-y-2">
                  {logs.length === 0 ? <div className="py-20 text-center opacity-20"><Layout size={48} className="mx-auto mb-2" /><p className="text-[10px] font-black uppercase">No entries yet</p></div> : 
                    [...logs].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(l => (
                      <div key={l.id} onClick={() => handleOpenLog(l)} className="bg-white px-6 py-4 rounded-2xl border border-gray-200 flex items-center gap-4 hover:bg-gray-50 hover:shadow-md transition-all cursor-pointer group">
                        <div className="px-3 py-1 bg-[#004A74]/5 border border-[#004A74]/10 rounded-full text-[10px] font-black text-[#004A74] whitespace-nowrap font-mono shadow-sm">
                          {formatLogTime(l.createdAt)}
                        </div>
                        <div className="w-px h-4 bg-gray-100" />
                        <h4 className="text-xs font-bold text-[#004A74] truncate flex-1 uppercase tracking-tight">
                          {l.title}
                        </h4>
                        <ChevronRight size={16} className="text-gray-200 group-hover:text-[#FED400] transition-colors" />
                      </div>
                    ))}
               </div>
            </div>
          )}
          {activeTab === 'refs' && (
             <ReferenceTab 
               projectId={project.id} 
               libraryItems={libraryItems} 
               references={references} 
               setReferences={setReferences}
               onRefresh={loadAllData} 
               reopenedRef={initialReopenRef}
               onOpenLibrary={handleOpenLibraryFromRef}
               onClearReopenRef={handleClearReopenRef}
             />
          )}
          {activeTab === 'finance' && <FinanceTab projectId={project.id} />}
        </div>
      </div>

      {isSelectorOpen && (
        <ResearchSourceSelectorModal 
          onClose={() => setIsSelectorOpen(false)}
          onAudit={handleStartAudit}
          currentMatrixCount={sources.length}
        />
      )}

      {selectedSourceForDetail && (
        <LibraryDetailView 
          item={selectedSourceForDetail} 
          onClose={handleCloseLibraryDetail} 
          isLoading={false}
          isLocalOverlay={true}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
      `}</style>

      {logModal.open && (
        <TracerLogModal 
          projectId={project.id} 
          log={logModal.log} 
          initialContent={logModal.cachedContent}
          onClose={() => setLogModal({ open: false })} 
          onSave={handleSaveLogItem}
          onDelete={handleDeleteLogItem}
        />
      )}
    </FormPageContainer>
  );
};

export default TracerDetail;
