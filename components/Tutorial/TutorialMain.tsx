import React, { useState, useEffect } from 'react';
import { TutorialItem } from '../../types';
import { fetchTutorials } from '../../services/TutorialService';
import { 
  Youtube, 
  ChevronDown, 
  ChevronUp, 
  FileVideo
} from 'lucide-react';
import { CardGridSkeleton } from '../Common/LoadingComponents';

const TutorialMain: React.FC = () => {
  const [groupedTutorials, setGroupedTutorials] = useState<Record<string, TutorialItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchTutorials();
      setGroupedTutorials(data);
      
      // Default: Open all categories
      const initialOpenState: Record<string, boolean> = {};
      Object.keys(data).forEach(cat => {
        initialOpenState[cat] = true;
      });
      setOpenCategories(initialOpenState);
      
      setLoading(false);
    };
    loadData();
  }, []);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-1 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between mb-8 shrink-0 px-1">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <Youtube size={24} />
           </div>
           <div>
              <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tight">TUTORIAL</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Application Guidance & Help</p>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 px-1">
        {loading ? (
          <CardGridSkeleton count={4} />
        ) : Object.keys(groupedTutorials).length === 0 ? (
           <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-30 grayscale">
             <FileVideo size={80} strokeWidth={1} className="text-[#004A74]" />
             <p className="text-sm font-black uppercase tracking-[0.4em]">Tutorials coming soon</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
             {Object.entries(groupedTutorials).map(([category, items]) => (
               <div key={category} className="bg-white border border-gray-100 rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <button 
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                  >
                     <h3 className="text-xs font-black text-[#004A74] tracking-wide flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-[#004A74] rounded-full" />
                        {category}
                     </h3>
                     <div className="p-1.5 bg-white rounded-lg text-[#004A74] shadow-sm">
                        {openCategories[category] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                     </div>
                  </button>
                  
                  {openCategories[category] && (
                    <div className="p-3 space-y-1 bg-white">
                       {items.map(item => (
                         <div 
                           key={item.id}
                           onClick={() => handleOpenLink(item.link)}
                           className="group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-gray-100 hover:bg-[#004A74]/5 cursor-pointer transition-all"
                         >
                            <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-[#FED400] group-hover:bg-[#004A74] group-hover:text-white transition-all shadow-sm">
                               <Youtube size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                               <h4 className="text-xs font-medium text-[#004A74] group-hover:text-[#003859] transition-colors line-clamp-2 leading-relaxed">
                                 {item.title}
                               </h4>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
             ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default TutorialMain;