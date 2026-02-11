import React from 'react';
import { EducationEntry, CareerEntry } from '../../types';
import { 
  School, 
  Calendar, 
  Trash2, 
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';

interface HistoryTimelineProps {
  type: 'education' | 'career';
  items: (EducationEntry | CareerEntry)[];
  onEdit: (item: EducationEntry | CareerEntry) => void;
  onDelete: (id: string) => void;
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ type, items, onEdit, onDelete }) => {
  
  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      onDelete(id);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const startA = type === 'education' ? (a as EducationEntry).startYear : (a as CareerEntry).startDate;
    const startB = type === 'education' ? (b as EducationEntry).startYear : (b as CareerEntry).startDate;
    
    if (startA !== startB) {
      return String(startB).localeCompare(String(startA));
    }

    const endA = type === 'education' ? (a as EducationEntry).endYear : (a as CareerEntry).endDate;
    const endB = type === 'education' ? (b as EducationEntry).endYear : (b as CareerEntry).endDate;
    
    const getSortVal = (v: string) => v === 'Present' ? '9999' : (v || '0000');
    return String(getSortVal(endB)).localeCompare(String(getSortVal(endA)));
  });

  if (items.length === 0) {
    return (
      <div className="p-10 text-center bg-white border border-dashed border-gray-200 rounded-[2rem] opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">No entries added yet</p>
      </div>
    );
  }

  return (
    <div className="relative pl-3 md:pl-4 border-l-2 border-gray-100 space-y-4 md:space-y-6 ml-3 md:ml-4 pb-10">
      {sortedItems.map((item, idx) => {
        const isEdu = type === 'education';
        const e = item as EducationEntry;
        const c = item as CareerEntry;

        const mainTitle = isEdu ? e.institution : c.company;
        const subTitle = isEdu ? `${e.level} • ${e.major}` : c.position;
        const dateRange = isEdu ? `${e.startYear} - ${e.endYear}` : `${c.startDate} - ${c.endDate}`;
        const detail = isEdu ? e.degree : c.description;

        return (
          <div key={item.id} className="relative group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            {/* Timeline Dot */}
            <div className="absolute -left-[24px] md:-left-[25px] top-1 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border-4 border-white bg-[#004A74] shadow-sm group-hover:scale-125 transition-transform" />
            
            {/* Entry Card */}
            <div 
              onClick={() => onEdit(item)}
              className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#FED400]/50 transition-all cursor-pointer relative overflow-hidden"
            >
               {/* Hover Actions */}
               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all z-10">
                  <button onClick={(e) => handleDeleteClick(e, item.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={14} />
                  </button>
               </div>

               <div className="flex gap-3 md:gap-4">
                  <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center text-[#004A74]/40 group-hover:bg-[#004A74] group-hover:text-[#FED400] transition-all shadow-inner">
                     {isEdu ? <School size={20} className="md:size-6" /> : <Briefcase size={20} className="md:size-6" />}
                  </div>
                  
                  <div className="flex-1 space-y-0.5 md:space-y-1 pr-6 md:pr-10">
                     <div className="flex items-center gap-2 text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <Calendar size={12} className="text-[#FED400]" /> {dateRange}
                     </div>
                     <h4 className="text-[13px] md:text-sm font-black text-[#004A74] uppercase tracking-tight leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">{mainTitle}</h4>
                     <p className="text-[10px] md:text-[11px] font-bold text-gray-500 line-clamp-1">{subTitle}</p>
                     
                     {detail && (
                       <p className="text-[9px] md:text-[10px] text-gray-400 font-medium pt-1 md:pt-2 line-clamp-2 leading-relaxed italic">
                         {detail}
                       </p>
                     )}
                  </div>
               </div>

               <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 text-gray-200 group-hover:text-[#FED400] group-hover:translate-x-1 transition-all">
                  <ChevronRight size={20} className="md:size-6" />
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryTimeline;