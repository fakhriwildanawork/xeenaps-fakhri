import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  TeachingItem, 
  SessionMode, 
  TeachingRole, 
  SessionStatus,
  CourseType,
  EducationLevel,
  AssignmentType,
  LibraryItem
} from '../../types';
import { fetchTeachingPaginated, saveTeachingItem, deleteTeachingItem } from '../../services/TeachingService';
import { 
  ArrowLeft, 
  FolderOpen, 
  Trash2, 
  Calendar, 
  Clock, 
  BookOpen, 
  ClipboardCheck, 
  MapPin, 
  Users, 
  Plus, 
  Trash2 as TrashIcon,
  Zap,
  Eye,
  ExternalLink,
  Presentation,
  GraduationCap,
  Link as LinkIcon,
  Save,
  Loader2
} from 'lucide-react';
import { 
  FormPageContainer, 
  FormStickyHeader, 
  FormContentArea, 
  FormField, 
  FormDropdown 
} from '../Common/FormComponents';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import ResourcePicker, { PickerType } from './ResourcePicker';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';
import { GlobalSavingOverlay } from '../Common/LoadingComponents';

const TeachingDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [item, setItem] = useState<TeachingItem | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'substance' | 'report'>(
    (location.state as any)?.activeTab || 'schedule'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>('LIBRARY');

  // --- MANUAL SAVE STATE ---
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);

  const sanitizeTime = (val: any) => {
    if (!val || val === "-") return '';
    const str = String(val).trim();
    const match = str.match(/(\d{1,2}:\d{2})/);
    if (match) {
      const parts = match[1].split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1]}`;
    }
    return '';
  };

  const sanitizeDate = (val: any) => {
    if (!val || val === "-") return '';
    const str = String(val).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);
    const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch(e) {}
    return '';
  };

  const calculateDuration = (start?: string, end?: string) => {
    const s = sanitizeTime(start);
    const e = sanitizeTime(end);
    if (!s || !e) return "-";
    try {
      const [h1, m1] = s.split(':').map(Number);
      const [h2, m2] = e.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60; 
      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;
      return `${hours}h ${minutes}m`;
    } catch { return "-"; }
  };

  const calculateAttendancePercentDisplay = () => {
    if (!item?.plannedStudents || item.plannedStudents === 0) return "100%";
    if (!item?.totalStudentsPresent) return "0%";
    const pct = (item.totalStudentsPresent / item.plannedStudents) * 100;
    return `${pct.toFixed(1)}%`;
  };

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab]);

  useEffect(() => {
    const load = async () => {
      const stateItem = (location.state as any)?.item;
      let rawFound = null;

      if (stateItem && stateItem.id === sessionId) {
        rawFound = stateItem;
      } else {
        const res = await fetchTeachingPaginated(1, 1000);
        rawFound = res.items.find(i => i.id === sessionId);
      }

      if (rawFound) {
        setItem({
          ...rawFound,
          teachingDate: sanitizeDate(rawFound.teachingDate),
          startTime: sanitizeTime(rawFound.startTime),
          endTime: sanitizeTime(rawFound.endTime),
          actualStartTime: sanitizeTime(rawFound.actualStartTime),
          actualEndTime: sanitizeTime(rawFound.actualEndTime),
          eventColor: rawFound.eventColor || '#004A74',
          referenceLinks: Array.isArray(rawFound.referenceLinks) ? rawFound.referenceLinks : [],
          presentationId: Array.isArray(rawFound.presentationId) ? rawFound.presentationId : [],
          questionBankId: Array.isArray(rawFound.questionBankId) ? rawFound.questionBankId : [],
          attachmentLink: Array.isArray(rawFound.attachmentLink) ? rawFound.attachmentLink : []
        });
      } else {
        navigate('/teaching');
      }
      setIsLoading(false);
    };
    load();
  }, [sessionId, location.state, navigate]);

  // NAVIGATION GUARD
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

  // Global Sidebar Guard
  useEffect(() => {
    (window as any).xeenapsIsDirty = isDirty;
    return () => { (window as any).xeenapsIsDirty = false; };
  }, [isDirty]);

  const handleFieldChange = (field: keyof TeachingItem, val: any) => {
    if (!item) return;
    
    let cleanVal = val;
    if (['startTime', 'endTime', 'actualStartTime', 'actualEndTime'].includes(field)) {
      cleanVal = sanitizeTime(val);
    } else if (field === 'teachingDate') {
      cleanVal = sanitizeDate(val);
    }

    let updated = { ...item, [field]: cleanVal, updatedAt: new Date().toISOString() };

    if (field === 'actualStartTime' || field === 'actualEndTime') {
      updated.teachingDuration = calculateDuration(updated.actualStartTime, updated.actualEndTime);
    }

    if (field === 'plannedStudents' || field === 'totalStudentsPresent') {
      const planned = field === 'plannedStudents' ? (parseInt(cleanVal) || 0) : item.plannedStudents;
      const present = field === 'totalStudentsPresent' ? (parseInt(cleanVal) || 0) : (item.totalStudentsPresent || 0);
      if (planned > 0) {
        updated.attendancePercentage = parseFloat(((present / planned) * 100).toFixed(2));
      } else {
        updated.attendancePercentage = 100;
      }
    }

    // UPDATE LOCAL STATE & MARK DIRTY
    setItem(updated);
    setIsDirty(true);
  };

  const handleAutoSaveField = async (field: keyof TeachingItem, val: any, message: string) => {
    if (!item) return;
    const updated = { ...item, [field]: val, updatedAt: new Date().toISOString() };
    
    // 1. Optimistic Update
    setItem(updated);
    
    // 2. Immediate Save (Auto Save Strategy)
    try {
      await saveTeachingItem(updated);
      showXeenapsToast('success', message);
      // Since we saved, we can technically clean the dirty flag, 
      // but only if there are no other pending changes. 
      // For simplicity in this Hybrid model: We reset isDirty because we just synced the WHOLE object.
      setIsDirty(false);
    } catch (e) {
      showXeenapsToast('error', 'Auto-save failed');
    }
  };

  const handleSaveChanges = async () => {
    if (!item) return;
    setIsSaving(true);
    try {
      const success = await saveTeachingItem(item);
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
        navigate('/teaching');
      }
    } else {
      navigate('/teaching');
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      if (await deleteTeachingItem(item.id)) {
        showXeenapsToast('success', 'Record purged');
        navigate('/teaching');
      }
    }
  };

  const handleAddExternalLink = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'ADD EXTERNAL LINK',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Link Label (e.g. Video Case)">' +
        '<input id="swal-input2" class="swal2-input" placeholder="URL (https://...)">',
      focusConfirm: false,
      ...XEENAPS_SWAL_CONFIG,
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement).value,
          (document.getElementById('swal-input2') as HTMLInputElement).value
        ]
      }
    });

    if (formValues && formValues[0] && formValues[1]) {
      const newLinks = [...(item?.attachmentLink || []), { label: formValues[0], url: formValues[1] }];
      handleAutoSaveField('attachmentLink', newLinks, 'External link added');
    }
  };

  const openPicker = (type: PickerType) => {
    setPickerType(type);
    setIsPickerOpen(true);
  };

  const handleResourceSelect = (data: any[]) => {
    if (!item || !Array.isArray(data)) return;
    
    if (pickerType === 'LIBRARY') {
      const current = item.referenceLinks || [];
      const newItems = data.filter(res => !current.some(r => r.id === res.id))
                           .map(res => ({ id: res.id, title: res.title }));
      if (newItems.length > 0) {
        handleAutoSaveField('referenceLinks', [...current, ...newItems], 'Library resources attached');
      }
    } else if (pickerType === 'PRESENTATION') {
      const current = item.presentationId || [];
      const newItems = data.filter(res => !current.some(p => p.id === res.id))
                           .map(res => ({ id: res.id, title: res.title, gSlidesId: res.gSlidesId }));
      if (newItems.length > 0) {
        handleAutoSaveField('presentationId', [...current, ...newItems], 'Slides attached');
      }
    } else if (pickerType === 'QUESTION') {
      const current = item.questionBankId || [];
      const newItems = data.filter(res => !current.some(q => q.id === res.id))
                           .map(res => ({ 
                             id: res.id, 
                             label: res.customLabel || '', 
                             questionText: res.questionText 
                           }));
      if (newItems.length > 0) {
        handleAutoSaveField('questionBankId', [...current, ...newItems], 'Questions attached');
      }
    }
    setIsPickerOpen(false);
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-[#004A74] uppercase tracking-widest">Accessing Ledger...</div>;
  if (!item) return null;

  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'substance', label: 'Substance', icon: BookOpen },
    { id: 'report', label: 'Report', icon: ClipboardCheck }
  ] as const;

  return (
    <FormPageContainer>
      
      {/* GLOBAL SAVING OVERLAY */}
      <GlobalSavingOverlay isVisible={isSaving} />

      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-3 md:px-8 py-3 md:py-4 border-b border-gray-100 flex items-center justify-between gap-2 md:gap-4 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button 
            onClick={handleSafeBack}
            className="p-2 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="text-xs md:text-sm lg:text-base font-black text-[#004A74] uppercase truncate leading-tight">{item.label}</h2>
            <p className="hidden sm:block text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Teaching Session</p>
          </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl gap-0.5 md:gap-1">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-[#004A74] text-white shadow-lg' : 'text-gray-400 hover:text-[#004A74]'}`}
            >
              <tab.icon size={14} className="shrink-0" />
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
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
                   <Loader2 className="w-4 h-4 animate-spin" /> Saving...
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
                  onClick={() => navigate(`/teaching/${item.id}/vault`, { state: { item } })}
                  className="p-2 md:p-2.5 bg-white border border-gray-100 text-[#004A74] hover:bg-blue-50 rounded-xl transition-all shadow-sm active:scale-90"
                  title="Documentation Vault"
                >
                  <FolderOpen size={18} />
                </button>
                <button 
                  onClick={handleDelete}
                  className="p-2 md:p-2.5 bg-white border border-gray-100 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm active:scale-90"
                  title="Purge Record"
                >
                  <Trash2 size={18} />
                </button>
             </>
           )}
        </div>
      </div>

      <FormContentArea>
        <div ref={topRef} className="h-0 w-0 absolute top-0" aria-hidden="true" />
        
        <div className="max-w-5xl mx-auto space-y-12">
          
          {activeTab === 'schedule' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
                  <div className="lg:col-span-3">
                    <FormField label="Session Label" required>
                      <input className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-black text-[#004A74] uppercase transition-all focus:bg-white focus:ring-4 focus:ring-[#004A74]/5" 
                        value={item.label} onChange={e => handleFieldChange('label', e.target.value)} />
                    </FormField>
                  </div>
                  <div>
                    <FormField label="Color Identity">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                         <div 
                           className="w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0" 
                           style={{ backgroundColor: item.eventColor || '#004A74' }}
                         />
                         <input 
                           type="color" 
                           className="w-full h-8 p-0 border-none bg-transparent cursor-pointer"
                           value={item.eventColor || '#004A74'}
                           onChange={e => handleFieldChange('eventColor', e.target.value)}
                         />
                      </div>
                    </FormField>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField label="Session Date" required>
                    <input type="date" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#004A74]" value={item.teachingDate} onChange={e => handleFieldChange('teachingDate', e.target.value)} />
                  </FormField>
                  <FormField label="Start Time" required>
                    <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#004A74]" value={item.startTime} onChange={e => handleFieldChange('startTime', e.target.value)} />
                  </FormField>
                  <FormField label="End Time" required>
                    <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#004A74]" value={item.endTime} onChange={e => handleFieldChange('endTime', e.target.value)} />
                  </FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField label="Institution"><input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={item.institution} onChange={e => handleFieldChange('institution', e.target.value)} placeholder="e.g. Universitas Indonesia" /></FormField>
                  <FormField label="Faculty"><input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={item.faculty} onChange={e => handleFieldChange('faculty', e.target.value)} placeholder="e.g. Teknik" /></FormField>
                  <FormField label="Study Program"><input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={item.program} onChange={e => handleFieldChange('program', e.target.value)} placeholder="e.g. Arsitektur" /></FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField label="Academic Year">
                    <FormDropdown value={item.academicYear} options={[`${new Date().getFullYear()-1}/${new Date().getFullYear()}`, `${new Date().getFullYear()}/${new Date().getFullYear()+1}`]} onChange={v => handleFieldChange('academicYear', v)} placeholder="Year" />
                  </FormField>
                  <FormField label="Semester">
                    <FormDropdown value={item.semester} options={['1','2','3','4','5','6','7','8','Short Session']} onChange={v => handleFieldChange('semester', v)} placeholder="Semester" />
                  </FormField>
                  <FormField label="Class / Group"><input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={item.classGroup} onChange={e => handleFieldChange('classGroup', e.target.value)} placeholder="e.g. AR-A" /></FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField label="Meeting Number"><input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={item.meetingNo} onChange={e => handleFieldChange('meetingNo', parseInt(e.target.value) || 1)} /></FormField>
                  <FormField label="Session Mode"><FormDropdown value={item.mode} options={Object.values(SessionMode)} onChange={v => handleFieldChange('mode', v as SessionMode)} placeholder="Mode" /></FormField>
                  <FormField label="Planned Students"><input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={item.plannedStudents} onChange={e => handleFieldChange('plannedStudents', parseInt(e.target.value) || 0)} /></FormField>
               </div>

               <FormField label="Location / Room / Venue">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-[#004A74]" value={item.location} onChange={e => handleFieldChange('location', e.target.value)} placeholder="Room name or Zoom link..." />
                  </div>
               </FormField>
            </div>
          )}

          {activeTab === 'substance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Course Code" required><input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold uppercase" value={item.courseCode} onChange={e => handleFieldChange('courseCode', e.target.value.toUpperCase())} placeholder="e.g. AR123" /></FormField>
                  <FormField label="Full Course Title" required><input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={item.courseTitle} onChange={e => handleFieldChange('courseTitle', e.target.value)} placeholder="e.g. Architectural Design" /></FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <FormField label="Theory Credits"><input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={item.theoryCredits} onChange={e => handleFieldChange('theoryCredits', parseFloat(e.target.value) || 0)} /></FormField>
                  <FormField label="Practical Credits"><input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={item.practicalCredits} onChange={e => handleFieldChange('practicalCredits', parseFloat(e.target.value) || 0)} /></FormField>
                  <FormField label="Course Type"><FormDropdown value={item.courseType} options={Object.values(CourseType)} onChange={v => handleFieldChange('courseType', v as CourseType)} placeholder="Type" /></FormField>
                  <FormField label="Education Level"><FormDropdown value={item.educationLevel} options={Object.values(EducationLevel)} onChange={v => handleFieldChange('educationLevel', v as EducationLevel)} placeholder="Level" /></FormField>
               </div>

               <FormField label="Planned Topic / Subject Matter" required>
                  <input className="w-full px-5 py-4 bg-[#004A74]/5 border border-[#004A74]/10 rounded-2xl text-base font-bold text-[#004A74] uppercase" value={item.topic} onChange={e => handleFieldChange('topic', e.target.value)} placeholder="WHAT ARE YOU TEACHING TODAY?" />
               </FormField>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Teaching Method"><FormDropdown value={item.method} options={['Lecture', 'Case Method', 'Team-Based Project', 'Discussion', 'Laboratory Work', 'Field Study']} onChange={v => handleFieldChange('method', v)} placeholder="Method" /></FormField>
                  <FormField label="Lecturer Assigned Role"><FormDropdown value={item.role} options={Object.values(TeachingRole)} onChange={v => handleFieldChange('role', v as TeachingRole)} placeholder="Role" /></FormField>
               </div>

               <FormField label="Learning Outcomes">
                  <textarea className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[2rem] text-xs font-medium min-h-[120px] leading-relaxed" value={item.learningOutcomes} onChange={e => handleFieldChange('learningOutcomes', e.target.value)} placeholder="What should students achieve after this session?" />
               </FormField>

               <div className="space-y-4 pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004A74] flex items-center gap-2">
                     Resource Attachments
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="bg-[#004A74]/20 border border-gray-100 rounded-[2rem] p-5 shadow-sm flex flex-col min-h-[320px]">
                        <div className="flex items-center justify-between mb-4">
                           <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><BookOpen size={12} /> Library</span>
                           <button onClick={() => openPicker('LIBRARY')} className="p-1.5 bg-[#004A74]/5 text-[#004A74] rounded-lg hover:bg-[#004A74] hover:text-white transition-all"><Plus size={14} /></button>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                           {(!Array.isArray(item.referenceLinks) || item.referenceLinks.length === 0) ? <p className="text-[8px] font-bold text-gray-300 uppercase italic py-10 text-center">No Library Items</p> : 
                             item.referenceLinks.map(lib => (
                               <div key={lib.id} className="flex items-start justify-between gap-2 p-2.5 bg-white rounded-xl group border border-gray-100 hover:border-[#004A74]/20 transition-all shadow-sm">
                                  <span className="text-[9px] font-bold text-[#004A74] leading-tight break-words flex-1">{lib.title}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                     <button onClick={() => navigate('/', { state: { openItem: { id: lib.id, title: lib.title }, returnToTeaching: item.id, activeTab: 'substance', teachingItem: item } })} className="p-1 text-cyan-600 hover:bg-gray-50 rounded-md transition-all"><Eye size={12} /></button>
                                     <button onClick={() => handleAutoSaveField('referenceLinks', item.referenceLinks.filter(i => i.id !== lib.id), 'Resource removed')} className="p-1 text-red-400 hover:text-red-600 hover:bg-gray-50 rounded-md transition-all"><TrashIcon size={12} /></button>
                                  </div>
                               </div>
                             ))
                           }
                        </div>
                     </div>

                     <div className="bg-[#004A74]/20 border border-gray-100 rounded-[2rem] p-5 shadow-sm flex flex-col min-h-[320px]">
                        <div className="flex items-center justify-between mb-4">
                           <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><Presentation size={12} /> Slides</span>
                           <button onClick={() => openPicker('PRESENTATION')} className="p-1.5 bg-[#004A74]/5 text-[#004A74] rounded-lg hover:bg-[#004A74] hover:text-white transition-all"><Plus size={14} /></button>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                           {(!Array.isArray(item.presentationId) || item.presentationId.length === 0) ? <p className="text-[8px] font-bold text-gray-300 uppercase italic py-10 text-center">No Slides Attached</p> : 
                             item.presentationId.map(ppt => (
                               <div key={ppt.id} className="flex items-start justify-between gap-2 p-2.5 bg-white rounded-xl group border border-gray-100 hover:border-[#004A74]/20 transition-all shadow-sm">
                                  <span className="text-[9px] font-bold text-[#004A74] leading-tight break-words flex-1">{ppt.title}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                     <button 
                                       onClick={() => {
                                         if ((ppt as any).gSlidesId) {
                                            window.open(`https://docs.google.com/presentation/d/${(ppt as any).gSlidesId}/edit`, '_blank');
                                         } else {
                                            navigate('/presentations', { state: { reopenPPT: { id: ppt.id, title: ppt.title } } });
                                         }
                                       }} 
                                       className="p-1 text-cyan-600 hover:bg-gray-50 rounded-md transition-all"
                                     >
                                       <Eye size={12} />
                                     </button>
                                     <button onClick={() => handleAutoSaveField('presentationId', item.presentationId.filter(i => i.id !== ppt.id), 'Slide removed')} className="p-1 text-red-400 hover:text-red-600 hover:bg-gray-50 rounded-md transition-all"><TrashIcon size={12} /></button>
                                  </div>
                               </div>
                             ))
                           }
                        </div>
                     </div>

                     <div className="bg-[#004A74]/20 border border-gray-100 rounded-[2rem] p-5 shadow-sm flex flex-col min-h-[320px]">
                        <div className="flex items-center justify-between mb-4">
                           <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><GraduationCap size={12} /> Questions</span>
                           <div className="flex items-center gap-1.5">
                              {Array.isArray(item.questionBankId) && item.questionBankId.length > 0 && (
                                 <button 
                                   onClick={() => navigate(`/teaching/${item.id}/questions`, { state: { item } })}
                                   className="p-1.5 bg-[#004A74]/5 text-[#004A74] rounded-lg hover:bg-[#004A74] hover:text-white transition-all"
                                   title="Open Attached Question Bank"
                                 >
                                    <Eye size={14} />
                                 </button>
                              )}
                              <button onClick={() => openPicker('QUESTION')} className="p-1.5 bg-[#004A74]/5 text-[#004A74] rounded-lg hover:bg-[#004A74] hover:text-white transition-all"><Plus size={14} /></button>
                           </div>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                           {(!Array.isArray(item.questionBankId) || item.questionBankId.length === 0) ? <p className="text-[8px] font-bold text-gray-300 uppercase italic py-10 text-center">No Questions Bank</p> : 
                             item.questionBankId.map(q => (
                               <div key={q.id} className="flex items-start justify-between gap-2 p-2.5 bg-white rounded-xl group border border-gray-100 hover:border-[#004A74]/20 transition-all shadow-sm">
                                  <span className="text-[9px] font-bold text-[#004A74] leading-tight line-clamp-2 overflow-hidden flex-1 italic">
                                    {q.label || q.questionText}
                                  </span>
                                  <button onClick={() => handleAutoSaveField('questionBankId', item.questionBankId.filter(i => i.id !== q.id), 'Question set removed')} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 hover:bg-gray-50 rounded-md shrink-0"><TrashIcon size={12} /></button>
                               </div>
                             ))
                           }
                        </div>
                     </div>

                     <div className="bg-[#004A74]/20 border border-gray-100 rounded-[2rem] p-5 shadow-sm flex flex-col min-h-[320px]">
                        <div className="flex items-center justify-between mb-4">
                           <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><LinkIcon size={12} /> External</span>
                           <button onClick={handleAddExternalLink} className="p-1.5 bg-[#004A74]/5 text-[#004A74] rounded-lg hover:bg-[#004A74] hover:text-white transition-all"><Plus size={14} /></button>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                           {(!Array.isArray(item.attachmentLink) || item.attachmentLink.length === 0) ? <p className="text-[8px] font-bold text-gray-300 uppercase italic py-10 text-center">No External Links</p> : 
                             item.attachmentLink.map((link, idx) => (
                               <div key={idx} className="flex items-start justify-between gap-2 p-2.5 bg-white rounded-xl group border border-gray-100 hover:border-[#004A74]/20 transition-all shadow-sm">
                                  <a href={link.url} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 truncate hover:underline flex items-center gap-1 flex-1">
                                    {link.label} <ExternalLink size={8} />
                                  </a>
                                  <button onClick={() => handleAutoSaveField('attachmentLink', item.attachmentLink.filter((_, i) => i !== idx), 'Link removed')} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 hover:bg-gray-50 rounded-md shrink-0"><TrashIcon size={12} /></button>
                               </div>
                             ))
                           }
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <FormField label="Actual Start Time">
                    <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={item.actualStartTime} onChange={e => handleFieldChange('actualStartTime', e.target.value)} />
                  </FormField>
                  <FormField label="Actual End Time">
                    <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={item.actualEndTime} onChange={e => handleFieldChange('actualEndTime', e.target.value)} />
                  </FormField>
                  <FormField label="Duration">
                    <div className="w-full px-5 py-3 bg-white border border-gray-100 rounded-xl font-black text-[#004A74] flex items-center gap-2">
                       <Clock size={14} className="text-gray-400" /> {calculateDuration(item.actualStartTime, item.actualEndTime)}
                    </div>
                  </FormField>
                  <FormField label="Session Realization Status">
                    <FormDropdown value={item.status} options={Object.values(SessionStatus)} onChange={v => handleFieldChange('status', v as SessionStatus)} placeholder="Status" />
                  </FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <FormField label="Actual Student Attendance">
                    <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center" value={item.totalStudentsPresent} onChange={e => handleFieldChange('totalStudentsPresent', parseInt(e.target.value) || 0)} />
                  </FormField>
                  <FormField label="Percentage (%)">
                    <div className="w-full px-5 py-3 bg-[#004A74]/5 border border-[#004A74]/10 rounded-xl font-black text-[#004A74] flex items-center justify-center">
                        {calculateAttendancePercentDisplay()}
                    </div>
                  </FormField>
                  <FormField label="Attendance List (Link/ID)">
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-blue-500 underline" value={item.attendanceListLink} onChange={e => handleFieldChange('attendanceListLink', e.target.value)} placeholder="Sheet Link..." />
                    </div>
                  </FormField>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                  <FormField label="Assignment Plan"><FormDropdown value={item.assignmentType} options={Object.values(AssignmentType)} onChange={v => handleFieldChange('assignmentType', v as AssignmentType)} placeholder="Assignment" /></FormField>
                  <FormField label="Assessment Criteria"><input className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={item.assessmentCriteria} onChange={e => handleFieldChange('assessmentCriteria', e.target.value)} placeholder="e.g. rubrics, accuracy..." /></FormField>
               </div>

               <FormField label="Obstacles & Problems">
                 <textarea className="w-full px-6 py-4 bg-red-50/30 border border-red-100 rounded-[2rem] text-xs font-medium min-h-[100px] leading-relaxed" value={item.problems} onChange={e => handleFieldChange('problems', e.target.value)} placeholder="Describe constraints (Projector fail, Connection, etc.)..." />
               </FormField>

               <FormField label="Lecturer Self-Reflection">
                 <textarea className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[2rem] text-xs font-medium min-h-[150px] leading-relaxed italic" value={item.reflection} onChange={e => handleFieldChange('reflection', e.target.value)} placeholder="How to improve next session?" />
               </FormField>
            </div>
          )}

        </div>
      </FormContentArea>

      {isPickerOpen && (
        <ResourcePicker 
          type={pickerType}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleResourceSelect}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 74, 116, 0.1); }
      `}</style>
    </FormPageContainer>
  );
};

export default TeachingDetail;