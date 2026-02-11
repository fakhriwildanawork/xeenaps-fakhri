
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CollaborationItem } from '../../types';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ArrowTopRightOnSquareIcon,
  UserIcon,
  ArrowsPointingOutIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { BRAND_ASSETS } from '../../assets';

interface CollaborationDetailProps {
  items: CollaborationItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const CollaborationDetail: React.FC<CollaborationDetailProps> = ({ items, currentIndex, onClose, onNavigate }) => {
  const item = items[currentIndex];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Reset image index when item changes
    setCurrentImageIndex(0);
  }, [item]);

  if (!item) return null;

  const hasMultipleImages = item.images.length > 1;
  const currentImage = item.images[currentImageIndex] || BRAND_ASSETS.LOGO_ICON; // Fallback image

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + item.images.length) % item.images.length);
  };

  const nextItem = () => {
    if (currentIndex < items.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  const prevItem = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
      
      {/* FULLSCREEN IMAGE OVERLAY */}
      {isFullscreen && (
         <div className="fixed inset-0 z-[2100] bg-black flex flex-col items-center justify-center">
            <button 
              onClick={() => setIsFullscreen(false)} 
              className="absolute top-6 right-6 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all z-50"
            >
               <XCircleIcon className="w-8 h-8" />
            </button>
            <div className="relative w-full h-full flex items-center justify-center p-4">
               <img src={currentImage} className="max-w-full max-h-full object-contain" alt="Fullscreen" />
               
               {hasMultipleImages && (
                 <>
                   <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 text-white rounded-full hover:bg-black/80 transition-all"><ChevronLeftIcon className="w-8 h-8" /></button>
                   <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/50 text-white rounded-full hover:bg-black/80 transition-all"><ChevronRightIcon className="w-8 h-8" /></button>
                 </>
               )}
            </div>
         </div>
      )}

      {/* NAVIGATION ARROWS (DESKTOP) */}
      <button 
        onClick={prevItem}
        disabled={currentIndex === 0}
        className="hidden md:flex absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-[#FED400] text-white hover:text-[#004A74] rounded-full items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none z-50 backdrop-blur-md"
      >
        <ChevronLeftIcon className="w-6 h-6 stroke-[3]" />
      </button>

      <button 
        onClick={nextItem}
        disabled={currentIndex === items.length - 1}
        className="hidden md:flex absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-[#FED400] text-white hover:text-[#004A74] rounded-full items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none z-50 backdrop-blur-md"
      >
        <ChevronRightIcon className="w-6 h-6 stroke-[3]" />
      </button>

      {/* MAIN CARD */}
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
         
         {/* CLOSE BUTTON (MOBILE) */}
         <button onClick={onClose} className="md:hidden absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full backdrop-blur-md">
            <XMarkIcon className="w-6 h-6" />
         </button>

         {/* LEFT: IMAGE SECTION */}
         <div className="w-full md:w-1/2 bg-gray-900 relative aspect-square md:aspect-auto flex items-center justify-center overflow-hidden group">
            <img 
               src={currentImage} 
               className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105 cursor-zoom-in" 
               alt={item.title}
               onClick={() => setIsFullscreen(true)}
            />
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
               <div className="flex gap-1.5">
                 {item.images.map((_, idx) => (
                    <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-[#FED400] w-4' : 'bg-white/50'}`} />
                 ))}
               </div>
               <button onClick={() => setIsFullscreen(true)} className="p-2 text-white/80 hover:text-white transition-colors">
                  <ArrowsPointingOutIcon className="w-5 h-5" />
               </button>
            </div>

            {hasMultipleImages && (
               <>
                 <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"><ChevronLeftIcon className="w-6 h-6" /></button>
                 <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"><ChevronRightIcon className="w-6 h-6" /></button>
               </>
            )}
         </div>

         {/* RIGHT: INFO SECTION */}
         <div className="w-full md:w-1/2 flex flex-col h-full bg-white relative">
            {/* CLOSE BUTTON (DESKTOP) */}
            <button onClick={onClose} className="hidden md:block absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-red-500 z-10">
               <XMarkIcon className="w-8 h-8" />
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-6">
               
               {/* b. Title (Bold Text) */}
               <h2 className="text-2xl md:text-3xl font-black text-[#004A74] uppercase leading-tight tracking-tight">
                  {item.title}
               </h2>

               {/* d. CollaboratorName (Bold seperti Akun instagram) */}
               <div className="flex items-center gap-2 text-gray-800">
                  <UserIcon className="w-5 h-5 text-[#004A74]" />
                  <span className="text-sm font-bold">{item.collaboratorName}</span>
               </div>

               {/* c. Campaign (Longtext seperti caption instagram) */}
               <div className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {item.campaign}
               </div>

            </div>

            {/* ACTION FOOTER */}
            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-3 shrink-0">
               {/* e. CTA Link (Tombol CTA redaksi "VISIT") */}
               <button 
                  onClick={() => window.open(item.ctaLink, '_blank')}
                  className="w-full py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
               >
                  VISIT <ArrowTopRightOnSquareIcon className="w-4 h-4 stroke-[3]" />
               </button>
               
               {/* Mobile Navigation */}
               <div className="flex md:hidden gap-3 mt-2">
                  <button 
                    onClick={prevItem} disabled={currentIndex === 0}
                    className="flex-1 py-3 bg-white border border-gray-200 text-[#004A74] rounded-xl font-bold uppercase text-[10px] disabled:opacity-50"
                  >
                     Previous
                  </button>
                  <button 
                    onClick={nextItem} disabled={currentIndex === items.length - 1}
                    className="flex-1 py-3 bg-white border border-gray-200 text-[#004A74] rounded-xl font-bold uppercase text-[10px] disabled:opacity-50"
                  >
                     Next
                  </button>
               </div>
            </div>

         </div>

      </div>
    </div>,
    document.body
  );
};

export default CollaborationDetail;
