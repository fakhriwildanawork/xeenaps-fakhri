import React, { useRef, useState } from 'react';
import { UserProfile } from '../../types';
import { BRAND_ASSETS } from '../../assets';
import { Camera, Trash2, Loader2, Sparkles, ShieldCheck, Edit3, Copy, Check } from 'lucide-react';
import { uploadProfilePhoto, deleteProfilePhoto } from '../../services/ProfileService';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsConfirm } from '../../utils/swalUtils';

interface IDCardSectionProps {
  profile: UserProfile;
  onUpdate: (field: keyof UserProfile, value: string) => void;
  onPhotoChange: (url: string, id: string, node: string) => void;
  onEditUniqueId: () => void;
}

const IDCardSection: React.FC<IDCardSectionProps> = ({ profile, onUpdate, onPhotoChange, onEditUniqueId }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // STEP 1: INSTANT PREVIEW (Optimistic UI)
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const url = event.target.result as string;
        setPreviewUrl(url);
        window.dispatchEvent(new CustomEvent('xeenaps-instant-photo', { detail: url }));
      }
    };
    reader.readAsDataURL(file);

    // STEP 2: BACKEND SYNC
    try {
      const result = await uploadProfilePhoto(file);
      if (result) {
        onPhotoChange(result.photoUrl, result.fileId, result.nodeUrl);
        showXeenapsToast('success', 'Profile photo updated');
      } else {
        showXeenapsToast('error', 'Upload failed. Check storage quota.');
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!profile.photoFileId || !profile.photoNodeUrl) return;
    
    const confirm = await showXeenapsConfirm(
      'DELETE PHOTO?', 
      'This will permanently remove your profile image from the storage node.',
      'DELETE'
    );

    if (confirm.isConfirmed) {
      onPhotoChange(BRAND_ASSETS.USER_DEFAULT, "", ""); 
      setPreviewUrl(null);
      
      const success = await deleteProfilePhoto(profile.photoFileId, profile.photoNodeUrl);
      if (!success) {
        showXeenapsToast('error', 'Server removal failed, but display updated.');
      }
    }
  };

  const handleUniqueIdRequest = async () => {
    const confirm = await showXeenapsConfirm(
      'MODIFY SYSTEM IDENTITY?', 
      'Changing your Unique App ID is a critical action. Proceed?',
      'AUTHORIZE'
    );
    if (confirm.isConfirmed) {
      onEditUniqueId();
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.uniqueAppId);
    setIsCopied(true);
    showXeenapsToast('success', 'App ID Copied');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const photoDisplay = previewUrl || profile.photoUrl || BRAND_ASSETS.USER_DEFAULT;

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-full animate-in slide-in-from-left duration-700 min-h-[550px] md:min-h-[650px]">
      
      {/* CARD HEADER */}
      <div className="bg-[#004A74] px-6 md:px-8 py-8 md:py-10 relative overflow-hidden shrink-0">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 -translate-y-24 translate-x-24 rounded-full" />
         <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
               <h2 className="text-white text-lg md:text-xl font-black tracking-tighter uppercase leading-none">PROFILE</h2>
               <p className="text-[#FED400] text-[7px] md:text-[8px] font-black uppercase tracking-[0.5em]">Xeenaps user id</p>
            </div>
            <img src={BRAND_ASSETS.LOGO_ICON} className="w-8 h-8 md:w-10 md:h-10 brightness-0 invert opacity-40" alt="Logo" />
         </div>
      </div>

      {/* CARD BODY */}
      <div className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center space-y-8 md:space-y-10 relative bg-gradient-to-b from-white to-gray-50/30">
         
         {/* 1. PHOTO AREA */}
         <div className="relative group">
            <div className="absolute inset-0 bg-[#FED400]/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-48 h-60 md:w-56 md:h-72 rounded-[2.5rem] p-1.5 bg-white shadow-xl border border-gray-100 overflow-hidden group">
               <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-gray-50 border border-gray-100 relative">
                  <img src={photoDisplay} className="w-full h-full object-cover transition-all duration-700" alt="Profile" />
                  
                  {/* IN-FRAME SPINNER */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                      <Loader2 size={40} className="text-[#004A74] animate-spin" />
                    </div>
                  )}
               </div>

               {/* HOVER OVERLAY */}
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-3 md:p-4 bg-white text-[#004A74] rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                  >
                    <Camera size={24} />
                  </button>
                  {profile.photoUrl && profile.photoUrl !== BRAND_ASSETS.USER_DEFAULT && (
                    <button 
                      onClick={handleDeletePhoto}
                      disabled={isUploading}
                      className="p-3 md:p-4 bg-red-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                    >
                      <Trash2 size={24} />
                    </button>
                  )}
               </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
         </div>

         {/* 2. IDENTITY INPUTS - NAME & DEGREE */}
         <div className="w-full space-y-2 text-center px-2">
            <div className="space-y-1">
               <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] block mb-2">Authenticated Name & Degree</span>
               <textarea 
                 className="w-full bg-transparent border-none text-xl md:text-3xl font-black text-[#004A74] text-center focus:ring-0 placeholder:text-gray-100 outline-none resize-none overflow-hidden tracking-tight leading-tight whitespace-normal break-words"
                 defaultValue={profile.fullName}
                 onBlur={(e) => onUpdate('fullName', e.target.value)}
                 onInput={(e) => {
                   const target = e.target as HTMLTextAreaElement;
                   target.style.height = 'auto';
                   target.style.height = target.scrollHeight + 'px';
                 }}
                 placeholder="Full Name & Academic Degree..."
                 rows={1}
                 ref={(el) => {
                   if (el) {
                     el.style.height = 'auto';
                     el.style.height = el.scrollHeight + 'px';
                   }
                 }}
               />
            </div>
         </div>

         {/* 3. UNIQUE ID */}
         <div className="w-full pt-1 md:pt-2 flex flex-col items-center gap-3 border-t border-dashed border-gray-100">
            <div className="flex items-center gap-3 px-4 md:px-6 py-2 md:py-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm relative group/id max-w-full">
               <ShieldCheck size={14} className="text-[#004A74] shrink-0" />
               <span className="text-[10px] md:text-[11px] font-mono font-bold text-[#004A74] tracking-widest truncate line-clamp-1">{profile.uniqueAppId}</span>
               <div className="flex items-center gap-1 shrink-0 ml-1 md:ml-2">
                  <button 
                    onClick={handleCopyId}
                    className="p-1 text-gray-300 hover:text-[#004A74] transition-all opacity-0 group-hover/id:opacity-100"
                    title="Copy ID"
                  >
                    {isCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                  <button 
                    onClick={handleUniqueIdRequest}
                    className="p-1 text-gray-300 hover:text-red-400 transition-all opacity-0 group-hover/id:opacity-100"
                    title="Edit ID"
                  >
                    <Edit3 size={12} />
                  </button>
               </div>
            </div>
         </div>

      </div>

      <div className="h-3 md:h-4 bg-[#FED400] w-full shrink-0" />

    </div>
  );
};

export default IDCardSection;