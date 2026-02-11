
import React, { useState, useEffect, useCallback } from 'react';
import { ColleagueItem } from '../../types';
import { fetchColleaguesPaginated } from '../../services/ColleagueService';
import { 
  XMarkIcon, 
  UserIcon, 
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { SmartSearchBox } from '../Common/SearchComponents';
import { StandardTableFooter } from '../Common/TableComponents';
import { CardGridSkeleton } from '../Common/LoadingComponents';
import { BRAND_ASSETS } from '../../assets';

interface ColleaguePickerModalProps {
  onClose: () => void;
  onSelect: (colleague: ColleagueItem) => void;
}

const ColleaguePickerModal: React.FC<ColleaguePickerModalProps> = ({ onClose, onSelect }) => {
  const [dataList, setDataList] = useState<ColleagueItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const itemsPerPage = 10;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchColleaguesPaginated(currentPage, itemsPerPage, search);
      setDataList(result.items);
      setTotalCount(result.totalCount);
    } catch (e) {
      console.error("Colleague fetch error", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh] border border-white/20">
        
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
                 <UserIcon className="w-6 h-6" />
              </div>
              <div>
                 <h2 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Select Partner</h2>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identify Receiving Colleague</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><XMarkIcon className="w-8 h-8" /></button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden p-6 bg-[#fcfcfc]">
            <div className="mb-6">
               <SmartSearchBox 
                value={search} 
                onChange={setSearch} 
                onSearch={() => setCurrentPage(1)} 
                className="w-full"
                phrases={["Search colleague name...", "Search unique ID..."]}
               />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1 pb-4">
               {isLoading ? (
                 <CardGridSkeleton count={6} />
               ) : dataList.length === 0 ? (
                 <div className="py-20 text-center opacity-30 flex flex-col items-center">
                    <UserIcon className="w-12 h-12 mb-2 text-[#004A74]" />
                    <p className="text-[9px] font-black uppercase tracking-widest">No colleagues found</p>
                 </div>
               ) : (
                 dataList.map((li) => (
                   <div 
                     key={li.id}
                     className="bg-white border border-gray-100 rounded-2xl p-3.5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#004A74]/20 transition-all group cursor-pointer"
                     onClick={() => onSelect(li)}
                   >
                      <img src={li.photoUrl || BRAND_ASSETS.USER_DEFAULT} className="w-10 h-10 rounded-full border border-gray-50 object-cover shadow-sm shrink-0" alt="" />

                      <div className="flex-1 min-w-0">
                         <h4 className="text-sm font-black text-[#004A74] uppercase truncate leading-tight">{li.name}</h4>
                         <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest truncate">
                              {li.affiliation || 'Independent'}
                            </span>
                         </div>
                      </div>

                      <button className="shrink-0 px-5 py-2.5 bg-gray-50 text-[#004A74] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#FED400] transition-all border border-gray-100 flex items-center gap-2">
                         Select <ChevronRightIcon className="w-3 h-3 stroke-[4]" />
                      </button>
                   </div>
                 ))
               )}
            </div>

            <div className="shrink-0 border-t border-gray-100 pt-4 mt-2">
               <StandardTableFooter 
                totalItems={totalCount} 
                currentPage={currentPage} 
                itemsPerPage={itemsPerPage} 
                totalPages={Math.ceil(totalCount / itemsPerPage)} 
                onPageChange={setCurrentPage} 
               />
            </div>
        </div>
      </div>
    </div>
  );
};

export default ColleaguePickerModal;
