
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CollaborationItem } from '../../types';
import { fetchCollaborations } from '../../services/CollaborationService';
import { 
  Handshake, // Replaces HandshakeIcon
  Search,
  Filter
} from 'lucide-react';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { SmartSearchBox } from '../Common/SearchComponents';
import { StandardFilterButton } from '../Common/ButtonComponents';
import CollaborationDetail from './CollaborationDetail';
import { BRAND_ASSETS } from '../../assets';

const CollaborationMain: React.FC = () => {
  const [items, setItems] = useState<CollaborationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Detail Modal State
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await fetchCollaborations();
      setItems(data);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = activeCategory === 'All' || item.category === activeCategory;
      const s = appliedSearch.toLowerCase();
      const matchSearch = !s || 
         item.title.toLowerCase().includes(s) || 
         item.collaboratorName.toLowerCase().includes(s) || 
         item.campaign.toLowerCase().includes(s) || 
         item.keyword.toLowerCase().includes(s);
      
      return matchCategory && matchSearch;
    });
  }, [items, activeCategory, appliedSearch]);

  const handleOpenDetail = (index: number) => {
    // Note: index passed here is relative to filteredItems
    setSelectedItemIndex(index);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-1 animate-in fade-in duration-500">
      
      {/* Detail Overlay */}
      {selectedItemIndex !== null && (
        <CollaborationDetail 
          items={filteredItems}
          currentIndex={selectedItemIndex}
          onClose={() => setSelectedItemIndex(null)}
          onNavigate={setSelectedItemIndex}
        />
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between mb-8 shrink-0 px-1">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <Handshake size={24} />
           </div>
           <div>
              <h2 className="text-2xl font-black text-[#004A74] uppercase tracking-tight">Promotion</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">From Curated Partners</p>
           </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-6 mb-6 px-1 shrink-0">
         <div className="w-full">
            <SmartSearchBox 
              value={search}
              onChange={setSearch}
              onSearch={() => setAppliedSearch(search)}
              phrases={["Find collaborators...", "Search campaigns...", "Search by keyword..."]}
              className="w-full lg:max-w-2xl"
            />
         </div>
         
         <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
               <StandardFilterButton 
                  key={cat} 
                  isActive={activeCategory === cat} 
                  onClick={() => setActiveCategory(cat)}
               >
                  {cat}
               </StandardFilterButton>
            ))}
         </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 px-1">
         {isLoading ? (
            <CardGridSkeleton count={8} />
         ) : filteredItems.length === 0 ? (
            <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 opacity-30 grayscale">
               <Handshake size={80} strokeWidth={1} className="text-[#004A74]" />
               <p className="text-sm font-black uppercase tracking-[0.4em]">No Opportunities Found</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredItems.map((item, idx) => (
                  <div 
                    key={item.id}
                    onClick={() => handleOpenDetail(idx)}
                    className="group bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col h-full"
                  >
                     <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        <img 
                          src={item.images[0] || BRAND_ASSETS.LOGO_ICON} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          alt={item.title} 
                        />
                        <div className="absolute top-4 left-4">
                           <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm">
                              {item.category}
                           </span>
                        </div>
                     </div>
                     
                     <div className="p-6 flex-1 flex flex-col">
                        <div className="mb-3">
                           <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.collaboratorName}</h4>
                           <h3 className="text-sm font-black text-[#004A74] uppercase leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {item.title}
                           </h3>
                        </div>

                        <div className="mt-auto space-y-3">
                           <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-[#FED400]/20 text-[#004A74] text-[8px] font-bold uppercase rounded-md">
                                 {item.campaign}
                              </span>
                           </div>
                           <div className="pt-3 border-t border-gray-50 flex flex-wrap gap-1.5">
                              {item.keyword.split(',').slice(0, 3).map((k, i) => (
                                 <span key={i} className="text-[8px] font-medium text-gray-400 italic">#{k.trim()}</span>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

    </div>
  );
};

export default CollaborationMain;
