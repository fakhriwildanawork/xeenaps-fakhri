import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, EducationEntry, CareerEntry } from '../../types';
import { 
  fetchProfileFromSupabase,
  upsertProfileToSupabase,
  fetchEducationFromSupabase,
  upsertEducationToSupabase,
  deleteEducationFromSupabase,
  fetchCareerFromSupabase,
  upsertCareerToSupabase,
  deleteCareerFromSupabase
} from '../../services/ProfileSupabaseService';
import { 
  deleteProfilePhoto
} from '../../services/ProfileService';
import IDCardSection from './IDCardSection';
import AcademicGrid from './AcademicGrid';
import HistoryTimeline from './HistoryTimeline';
import { EducationModal, CareerModal, UniqueIdModal } from './ProfileModals';
import { 
  GraduationCap, 
  Briefcase, 
  Plus, 
  Award,
  BookMarked,
  Globe,
  Link as LinkIcon,
  Save,
  Loader2
} from 'lucide-react';
import { showXeenapsToast } from '../../utils/toastUtils';
import { BRAND_ASSETS } from '../../assets';
import { FormPageContainer, FormStickyHeader, FormContentArea } from '../Common/FormComponents';
import { GlobalSavingOverlay } from '../Common/LoadingComponents';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';

/**
 * XEENAPS PROFILE SKELETON
 * Menyerupai layout asli untuk mencegah layout shift.
 */
const ProfileSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto bg-[#fcfcfc] h-full">
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="h-[600px] skeleton rounded-[3rem]" />
        <div className="h-[600px] skeleton rounded-[3rem]" />
      </div>
      <div className="h-32 skeleton rounded-[2.5rem]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <div className="h-64 skeleton rounded-[2rem]" />
        <div className="h-64 skeleton rounded-[2rem]" />
      </div>
    </div>
  </div>
);

const UserProfileView: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [career, setCareer] = useState<CareerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // MANUAL SAVE STATES
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedEducationIds, setDeletedEducationIds] = useState<string[]>([]);
  const [deletedCareerIds, setDeletedCareerIds] = useState<string[]>([]);

  // Modals state
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [isUniqueIdModalOpen, setIsUniqueIdModalOpen] = useState(false);
  const [selectedEdu, setSelectedEdu] = useState<EducationEntry | undefined>();
  const [selectedCareer, setSelectedCareer] = useState<CareerEntry | undefined>();

  const loadAllData = useCallback(async (isInitial = true) => {
    if (isInitial) setIsLoading(true);
    try {
      const [p, e, c] = await Promise.all([
        fetchProfileFromSupabase(),
        fetchEducationFromSupabase(),
        fetchCareerFromSupabase()
      ]);
      
      const defaultProfile: UserProfile = {
        fullName: "Xeenaps User, Degree",
        photoUrl: "",
        photoFileId: "",
        photoNodeUrl: "",
        birthDate: "",
        address: "Not set",
        email: "user@xeenaps.app",
        phone: "-",
        sintaId: "",
        scopusId: "",
        wosId: "",
        googleScholarId: "",
        jobTitle: "Researcher",
        affiliation: "Independent",
        uniqueAppId: `XN-${Math.random().toString(36).substring(7).toUpperCase()}`,
        socialMedia: ""
      };

      const finalProfile = p || defaultProfile;
      setProfile(finalProfile);
      setLocalProfile(finalProfile);
      setEducation(e);
      setCareer(c);
      
      // Reset dirty state on load
      setIsDirty(false);
      setDeletedEducationIds([]);
      setDeletedCareerIds([]);
    } catch (err) {
      showXeenapsToast('error', 'Failed to synchronize profile data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // --- NAVIGATION GUARD ---
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

  useEffect(() => {
    (window as any).xeenapsIsDirty = isDirty;
    return () => { (window as any).xeenapsIsDirty = false; };
  }, [isDirty]);

  const dispatchProfileUpdate = (updatedProfile: UserProfile) => {
    window.dispatchEvent(new CustomEvent('xeenaps-profile-updated', { detail: updatedProfile }));
  };

  // --- BATCH SAVE LOGIC ---

  const handleSaveChanges = async () => {
    if (!localProfile) return;
    setIsSaving(true);

    try {
      // 1. Save Profile Identity
      await upsertProfileToSupabase(localProfile);
      dispatchProfileUpdate(localProfile); // Update global header instantly

      // 2. Process Education (Upsert & Delete)
      const eduUpsertPromises = education.map(e => upsertEducationToSupabase(e));
      const eduDeletePromises = deletedEducationIds.map(id => deleteEducationFromSupabase(id));

      // 3. Process Career (Upsert & Delete)
      const careerUpsertPromises = career.map(c => upsertCareerToSupabase(c));
      const careerDeletePromises = deletedCareerIds.map(id => deleteCareerFromSupabase(id));

      await Promise.all([
        ...eduUpsertPromises,
        ...eduDeletePromises,
        ...careerUpsertPromises,
        ...careerDeletePromises
      ]);

      // 4. Cleanup & Feedback
      setIsDirty(false);
      setDeletedEducationIds([]);
      setDeletedCareerIds([]);
      showXeenapsToast('success', 'Profile updated successfully');

    } catch (error) {
      console.error("Save failed:", error);
      showXeenapsToast('error', 'Failed to save changes. Please try again.');
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
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  };

  // --- OPTIMISTIC HISTORY HANDLERS (LOCAL STATE ONLY) ---

  const handleSaveEducation = (data: EducationEntry) => {
    const isEdit = education.some(item => item.id === data.id);
    setEducation(prev => isEdit 
      ? prev.map(item => item.id === data.id ? data : item)
      : [...prev, data]
    );
    setIsDirty(true);
    setIsEduModalOpen(false);
  };

  const handleDeleteEducation = (id: string) => {
    setEducation(prev => prev.filter(item => item.id !== id));
    setDeletedEducationIds(prev => [...prev, id]);
    setIsDirty(true);
  };

  const handleSaveCareer = (data: CareerEntry) => {
    const isEdit = career.some(item => item.id === data.id);
    setCareer(prev => isEdit 
      ? prev.map(item => item.id === data.id ? data : item)
      : [...prev, data]
    );
    setIsDirty(true);
    setIsCareerModalOpen(false);
  };

  const handleDeleteCareer = (id: string) => {
    setCareer(prev => prev.filter(item => item.id !== id));
    setDeletedCareerIds(prev => [...prev, id]);
    setIsDirty(true);
  };

  // --- IDENTITY HANDLERS (LOCAL STATE ONLY) ---

  const handleFieldUpdate = (field: keyof UserProfile, value: string) => {
    if (!localProfile) return;
    if (localProfile[field] === value) return;

    setLocalProfile({ ...localProfile, [field]: value });
    setIsDirty(true);
  };

  const handlePhotoUpdate = (url: string, fileId: string, nodeUrl: string) => {
    if (!localProfile) return;
    
    // Note: We don't delete the old photo immediately to allow "Cancel" without data loss.
    // The photo file upload is physical and immediate, but the linkage to profile is state-based.
    
    const updatedProfile = { 
      ...localProfile, 
      photoUrl: url, 
      photoFileId: fileId, 
      photoNodeUrl: nodeUrl 
    };

    setLocalProfile(updatedProfile);
    setIsDirty(true);
  };

  const handleUniqueIdUpdate = (newId: string) => {
    if (!localProfile) return;
    handleFieldUpdate('uniqueAppId', newId);
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const idCards = [
    { key: 'sintaId' as keyof UserProfile, label: 'SINTA ID', icon: Award, color: 'text-orange-500' },
    { key: 'scopusId' as keyof UserProfile, label: 'Scopus ID', icon: BookMarked, color: 'text-emerald-500' },
    { key: 'wosId' as keyof UserProfile, label: 'WoS ID', icon: Globe, color: 'text-blue-500' },
    { key: 'googleScholarId' as keyof UserProfile, label: 'Scholar ID', icon: LinkIcon, color: 'text-indigo-500' },
  ];

  return (
    <FormPageContainer>
      <GlobalSavingOverlay isVisible={isSaving} />

      <FormStickyHeader 
        title="User Profile" 
        subtitle="Manage personal identity & history" 
        onBack={handleSafeBack} 
        rightElement={
          isDirty && (
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
          )
        }
      />

      <FormContentArea>
        <div className="max-w-7xl mx-auto space-y-8 pb-32">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="h-full">
              <IDCardSection 
                profile={localProfile!} 
                onUpdate={handleFieldUpdate}
                onPhotoChange={handlePhotoUpdate}
                onEditUniqueId={() => setIsUniqueIdModalOpen(true)}
              />
            </div>

            <div className="h-full">
              <AcademicGrid 
                profile={localProfile!} 
                onUpdate={handleFieldUpdate}
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-6 px-2">Academic Identifiers</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {idCards.map((id) => (
                  <div key={id.key} className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-[#FED400] transition-all">
                     <label className={`text-[8px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${id.color}`}>
                        <id.icon size={12} /> {id.label}
                     </label>
                     <input 
                       className="w-full bg-transparent border-none p-0 text-[10px] font-mono font-bold text-[#004A74] outline-none placeholder:text-gray-200"
                       value={localProfile![id.key] || ''}
                       onChange={(e) => handleFieldUpdate(id.key, e.target.value)}
                       placeholder="CODE..."
                     />
                  </div>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#004A74] flex items-center gap-2">
                  <GraduationCap size={18} /> Education History
                </h3>
                <button 
                  onClick={() => { setSelectedEdu(undefined); setIsEduModalOpen(true); }}
                  className="p-2 bg-[#004A74] text-[#FED400] rounded-xl hover:scale-110 active:scale-95 transition-all shadow-md"
                >
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
              <HistoryTimeline 
                type="education"
                items={education}
                onEdit={(item) => { setSelectedEdu(item as EducationEntry); setIsEduModalOpen(true); }}
                onDelete={handleDeleteEducation}
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#004A74] flex items-center gap-2">
                  <Briefcase size={18} /> Career Journey
                </h3>
                <button 
                  onClick={() => { setSelectedCareer(undefined); setIsCareerModalOpen(true); }}
                  className="p-2 bg-[#004A74] text-[#FED400] rounded-xl hover:scale-110 active:scale-95 transition-all shadow-md"
                >
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
              <HistoryTimeline 
                type="career"
                items={career}
                onEdit={(item) => { setSelectedCareer(item as CareerEntry); setIsCareerModalOpen(true); }}
                onDelete={handleDeleteCareer}
              />
            </div>
          </div>
        </div>
      </FormContentArea>

      {isEduModalOpen && (
        <EducationModal 
          entry={selectedEdu} 
          onClose={() => setIsEduModalOpen(false)} 
          onOptimisticSave={handleSaveEducation}
        />
      )}

      {isCareerModalOpen && (
        <CareerModal 
          entry={selectedCareer} 
          onClose={() => setIsCareerModalOpen(false)} 
          onOptimisticSave={handleSaveCareer}
        />
      )}

      {isUniqueIdModalOpen && (
        <UniqueIdModal 
          currentId={localProfile?.uniqueAppId || ''} 
          onClose={() => setIsUniqueIdModalOpen(false)} 
          onConfirm={handleUniqueIdUpdate} 
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
      `}</style>
    </FormPageContainer>
  );
};

export default UserProfileView;