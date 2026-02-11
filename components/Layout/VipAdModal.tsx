
import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { VipAdItem } from '../../types';

interface VipAdModalProps {
  data: VipAdItem;
  onClose: () => void;
}

const VipAdModal: React.FC<VipAdModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Container - Square 1:1 Aspect Ratio */}
      <div className="relative w-full max-w-[450px] aspect-square bg-transparent animate-in zoom-in-95 duration-500">
        
        {/* Close Button - Outside Top Right */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors group"
          title="Close Ad"
        >
          <XMarkIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
        </button>

        {/* Clickable Image Area */}
        <a 
          href={data.ctaLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group cursor-pointer"
        >
          <img 
            src={data.imageUrl} 
            alt="VIP Offer" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </a>
      </div>
    </div>
  );
};

export default VipAdModal;
