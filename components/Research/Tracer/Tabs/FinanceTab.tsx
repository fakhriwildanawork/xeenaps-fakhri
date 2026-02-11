import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TracerFinanceItem } from '../../../../types';
import { fetchTracerFinance, deleteTracerFinance, exportFinanceLedger } from '../../../../services/TracerService';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  X,
  Clock,
  Banknote,
  Eye,
  Download,
  Loader2,
  FileText
} from 'lucide-react';
import { SmartSearchBox } from '../../../Common/SearchComponents';
import { 
  StandardTableContainer, 
  StandardTableWrapper, 
  StandardTh, 
  StandardTr, 
  StandardTd
} from '../../../Common/TableComponents';
import { TableSkeletonRows } from '../../../Common/LoadingComponents';
import { showXeenapsDeleteConfirm } from '../../../../utils/confirmUtils';
import { showXeenapsToast } from '../../../../utils/toastUtils';
import FinanceFormModal from '../Modals/FinanceFormModal';
import { FormDropdown } from '../../../Common/FormComponents';

interface FinanceTabProps {
  projectId: string;
}

const CURRENCIES = [
  { code: 'IDR', symbol: 'Rp' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'CHF', symbol: 'Fr' },
  { code: 'CNY', symbol: '¥' },
  { code: 'HKD', symbol: 'HK$' },
  { code: 'KRW', symbol: '₩' },
  { code: 'MYR', symbol: 'RM' },
  { code: 'THB', symbol: '฿' },
  { code: 'PHP', symbol: '₱' },
  { code: 'INR', symbol: '₹' },
  { code: 'SAR', symbol: 'SR' },
  { code: 'AED', symbol: 'dh' },
  { code: 'RUB', symbol: '₽' },
  { code: 'BRL', symbol: 'R$' },
  { code: 'ZAR', symbol: 'R' },
  { code: 'TRY', symbol: '₺' }
];

const FinanceTab: React.FC<FinanceTabProps> = ({ projectId }) => {
  // allItems stores the complete dataset for accurate totals and export
  const [allItems, setAllItems] = useState<TracerFinanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [currency, setCurrency] = useState(CURRENCIES[0]);

  // Filters (Cumulative Logic for Table View)
  const [localSearch, setLocalSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<TracerFinanceItem | undefined>();

  // Fetches ALL data (empty filters) to ensure complete dataset is available for summary/export
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await fetchTracerFinance(projectId, "", "", "");
      setAllItems(data);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApplyFilters = () => {
    setAppliedSearch(localSearch);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  const formatMoney = (val: number) => {
    return `${currency.symbol} ${new Intl.NumberFormat('id-ID').format(val)}`;
  };

  const formatDisplayTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear().toString().substring(2)} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return "-"; }
  };

  // Totals derived from ALL items (unfiltered)
  const totals = useMemo(() => {
    const credit = allItems.reduce((sum, item) => sum + (item.credit || 0), 0);
    const debit = allItems.reduce((sum, item) => sum + (item.debit || 0), 0);
    const balance = credit - debit;
    return { credit, debit, balance };
  }, [allItems]);

  // Visible items filtered client-side for the table view
  const visibleItems = useMemo(() => {
    return allItems.filter(item => {
      // Search Filter
      if (appliedSearch) {
        const s = appliedSearch.toLowerCase();
        if (!item.description.toLowerCase().includes(s)) return false;
      }
      
      // Date Range Filter
      if (startDate) {
        if (new Date(item.date) < new Date(startDate)) return false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        if (new Date(item.date) > e) return false;
      }
      
      return true;
    });
  }, [allItems, appliedSearch, startDate, endDate]);

  const latestDate = useMemo(() => {
    if (allItems.length === 0) return null;
    const sorted = [...allItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].date;
  }, [allItems]);

  const handleOptimisticSave = (newItem: TracerFinanceItem) => {
    setAllItems(prev => {
      const exists = prev.find(i => i.id === newItem.id);
      if (exists) return prev.map(i => i.id === newItem.id ? newItem : i);
      
      // Since it's chronological usually, just append or insert at correct position?
      // For simple ledger, append. Backend handles balance integrity on reload.
      // But we recalculate balance optimistically for UI consistency?
      // Actually balance is in item itself from form modal logic (usually). 
      // The modal doesn't calc balance, backend/service does.
      // We will rely on loadData(true) after save for strict balance.
      
      return [...prev, newItem];
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      const originalItems = [...allItems];
      // 1. OPTIMISTIC REMOVE
      setAllItems(prev => prev.filter(i => i.id !== id));
      
      // 2. SILENT BACKGROUND SYNC
      try {
        const result = await deleteTracerFinance(id);
        if (result.status !== 'success') {
          setAllItems(originalItems);
        } else {
          loadData(true); // Silent refresh to ensure balance integrity
        }
      } catch {
        setAllItems(originalItems);
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    showXeenapsToast('info', `Synthesizing Report...`);
    
    try {
      // Export call uses projectId, so backend logic (which fetches all items for project) is preserved.
      // The active filters (date/search) on UI do NOT affect this export.
      const result = await exportFinanceLedger(projectId, currency.code);
      if (result && result.base64) {
        // Direct Blob Download Implementation (No Gmail login required)
        const byteCharacters = atob(result.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showXeenapsToast('success', 'Document Downloaded');
      } else {
        showXeenapsToast('error', 'Cloud Synthesis Interrupt');
      }
    } catch (err) {
      showXeenapsToast('error', 'Export Engine Failure');
    } finally {
      setIsExporting(false);
    }
  };

  const currencyOptions = useMemo(() => CURRENCIES.map(c => `${c.code} (${c.symbol})`), []);
  const currentCurrencyLabel = `${currency.code} (${currency.symbol})`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      
      {/* 1. TOP HEADER: ADAPTIVE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Currency Matrix</h4>
            <FormDropdown 
              value={currentCurrencyLabel}
              onChange={(val: string) => {
                const code = val.split(' ')[0];
                const found = CURRENCIES.find(c => c.code === code);
                if (found) setCurrency(found);
              }}
              options={currencyOptions}
              placeholder="Select Currency"
              allowCustom={false}
              showSearch={true}
            />
         </div>

         <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Income</p>
               <TrendingUp size={16} className="text-green-500 opacity-30" />
            </div>
            <h3 className="text-xl font-black text-green-600 truncate whitespace-nowrap mt-2 relative z-10">{formatMoney(totals.credit)}</h3>
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-green-50 rounded-full opacity-50" />
         </div>

         <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Expense</p>
               <TrendingDown size={16} className="text-red-500 opacity-30" />
            </div>
            <h3 className="text-xl font-black text-red-600 truncate whitespace-nowrap mt-2 relative z-10">{formatMoney(totals.debit)}</h3>
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-red-50 rounded-full opacity-50" />
         </div>

         <div className="bg-[#004A74] p-6 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -translate-y-16 translate-x-16 rounded-full" />
            <div className="flex items-center justify-between relative z-10">
               <p className="text-[9px] font-black text-[#FED400] uppercase tracking-widest">Total Balance</p>
               <Wallet size={16} className="text-[#FED400] opacity-40" />
            </div>
            <h3 className="text-2xl font-black text-white truncate whitespace-nowrap mt-2 relative z-10">{formatMoney(totals.balance)}</h3>
         </div>
      </div>

      {/* 2. FILTER & ACTIONS BAR */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[2.5rem] border border-gray-100 shadow-sm">
         <div className="flex flex-col md:flex-row gap-3 w-full lg:max-w-5xl flex-1">
            <SmartSearchBox 
              value={localSearch} 
              onChange={setLocalSearch} 
              onSearch={handleApplyFilters} 
              phrases={["Find specific transaction...", "Find specific transaction..."]}
              className="w-full lg:max-w-md"
            />
            
            <div className="flex flex-col items-stretch md:flex-row md:items-center gap-2 bg-gray-100/50 p-1 rounded-2xl border border-gray-100">
               <div className="flex items-center gap-2 px-3 py-2 md:py-0">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">From</span>
                  <input type="date" className="bg-transparent text-[10px] font-bold text-[#004A74] outline-none" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} />
               </div>
               <div className="hidden md:block w-px h-4 bg-gray-300" />
               <div className="flex items-center gap-2 px-3 py-2 md:py-0">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">To</span>
                  <input type="date" className="bg-transparent text-[10px] font-bold text-[#004A74] outline-none" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} />
               </div>
               {(tempStartDate || tempEndDate) && (
                 <button onClick={handleApplyFilters} className="px-4 py-2 bg-[#004A74] text-[#FFFFFF] rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all">Apply</button>
               )}
               {(startDate || endDate) && (
                 <button onClick={() => { setTempStartDate(''); setTempEndDate(''); setStartDate(''); setEndDate(''); }} className="p-2 text-red-500 hover:bg-white rounded-lg transition-all"><X size={14} /></button>
               )}
            </div>
         </div>
         
         <div className="flex items-center gap-3 w-full lg:w-auto relative">
            <button 
                onClick={handleExport}
                disabled={isExporting || allItems.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-200 text-[#004A74] rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
            >
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Export PDF
            </button>
            <button 
              onClick={() => { setViewingItem(undefined); setIsFormOpen(true); }}
              className="flex-[2] lg:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} /> Add Entry
            </button>
         </div>
      </div>

      {/* 3. TABLE LEDGER - SCALED FOR MOBILE */}
      <div className="flex-1">
        <StandardTableContainer>
          <StandardTableWrapper>
            <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px] table-fixed">
               <thead className="sticky top-0 z-20">
                  <tr>
                     <StandardTh width="160px" className="px-2 md:px-4 py-3 md:py-4 text-[8px] md:text-[10px]">Timestamp</StandardTh>
                     <StandardTh width="180px" className="px-2 md:px-4 py-3 md:py-4 text-[8px] md:text-[10px]">Credit (+)</StandardTh>
                     <StandardTh width="180px" className="px-2 md:px-4 py-3 md:py-4 text-[8px] md:text-[10px]">Debit (-)</StandardTh>
                     <StandardTh width="200px" className="px-2 md:px-4 py-3 md:py-4 text-[8px] md:text-[10px]">Balance</StandardTh>
                     <StandardTh width="400px" className="text-left px-2 md:px-4 py-3 md:py-4 text-[8px] md:text-[10px]">Description</StandardTh>
                     <StandardTh width="100px" className="sticky right-0 bg-gray-50 px-2 md:px-4 py-3 md:py-4 text-[8px] md:text-[10px]">Action</StandardTh>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <TableSkeletonRows count={5} />
                  ) : visibleItems.length === 0 ? (
                    <tr><td colSpan={6} className="py-32 text-center opacity-30"><Banknote size={64} className="mx-auto mb-4 text-[#004A74]" /><p className="text-[10px] font-black uppercase tracking-widest">Financial Ledger Null</p></td></tr>
                  ) : (
                    [...visibleItems].reverse().map((item, idx) => {
                       const isLastEntry = idx === 0; // Relative to visible list, but only strict latest can delete. 
                       // Note: Deletion integrity check is done backend/service side based on logic.
                       // For visual simplicity, showing delete button on row, action validates.
                       return (
                        <StandardTr key={item.id} onClick={() => { setViewingItem(item); setIsFormOpen(true); }} className="cursor-pointer">
                           <StandardTd className="px-2 md:px-4 py-2 md:py-4 text-[9px] md:text-[10px] font-mono font-bold text-gray-400">
                              <div className="flex items-center gap-2">
                                 <Clock size={12} className="text-gray-200" />
                                 {formatDisplayTime(item.date)}
                              </div>
                           </StandardTd>
                           <StandardTd className="px-2 md:px-4 py-2 md:py-4 text-[9px] md:text-sm text-center font-black text-green-600">
                              {item.credit > 0 ? `+ ${formatMoney(item.credit)}` : '-'}
                           </StandardTd>
                           <StandardTd className="px-2 md:px-4 py-2 md:py-4 text-[9px] md:text-sm text-center font-black text-red-500">
                              {item.debit > 0 ? `- ${formatMoney(item.debit)}` : '-'}
                           </StandardTd>
                           <StandardTd className="px-2 md:px-4 py-2 md:py-4 text-[9px] md:text-sm text-center font-black text-[#004A74] bg-gray-50/50">
                              {formatMoney(item.balance)}
                           </StandardTd>
                           <StandardTd className="px-2 md:px-4 py-2 md:py-4 w-[400px] overflow-hidden text-[9px] md:text-sm">
                              <div className="flex items-center gap-2 min-w-0 w-full">
                                 <span className="font-bold text-gray-600 truncate whitespace-nowrap block flex-1 min-w-0">{item.description}</span>
                                 {item.attachmentsJsonId && <div className="w-1.5 h-1.5 rounded-full bg-[#FED400] shrink-0" />}
                              </div>
                           </StandardTd>
                           <StandardTd className="sticky right-0 bg-white group-hover:bg-[#f0f7fa] px-2 md:px-4 py-2 md:py-4">
                              <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                 <button onClick={() => { setViewingItem(item); setIsFormOpen(true); }} className="p-1 md:p-2 text-blue-500 hover:bg-white rounded-lg transition-all"><Eye size={16} /></button>
                                 <button onClick={(e) => handleDelete(e, item.id)} className="p-1 md:p-2 text-red-200 hover:text-red-500 hover:bg-white rounded-lg transition-all"><Trash2 size={16} /></button>
                              </div>
                           </StandardTd>
                        </StandardTr>
                       );
                    })
                  )}
               </tbody>
            </table>
          </StandardTableWrapper>
        </StandardTableContainer>
      </div>

      {isFormOpen && (
        <FinanceFormModal 
          projectId={projectId} 
          item={viewingItem} 
          currencySymbol={currency.symbol}
          latestDate={latestDate}
          onClose={() => setIsFormOpen(false)} 
          onSave={async (data) => { 
            handleOptimisticSave(data);
            setIsFormOpen(false); 
            await loadData(true);
          }} 
        />
      )}
    </div>
  );
};

export default FinanceTab;