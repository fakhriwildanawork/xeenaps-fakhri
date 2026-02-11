import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertTriangle,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { manageApiKeys } from '../../services/gasService';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { StandardTableContainer, StandardTableWrapper, StandardTh, StandardTr, StandardTd } from '../Common/TableComponents';
import { FormPageContainer, FormStickyHeader, FormContentArea, FormField } from '../Common/FormComponents';

interface GeminiKey {
  id: string;
  key: string;
  label: string;
  status: string;
  addedAt: string;
}

interface GroqKey {
  id: string;
  api: string;
}

const ApiKeyManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'GEMINI' | 'GROQ'>('GEMINI');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({}); // Toggle mask state per row

  // Data States
  const [geminiKeys, setGeminiKeys] = useState<GeminiKey[]>([]);
  const [groqKeys, setGroqKeys] = useState<GroqKey[]>([]);

  // Form States
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await manageApiKeys({ subAction: 'get_keys' });
      if (res.status === 'success' && res.data) {
        setGeminiKeys(res.data.gemini || []);
        setGroqKeys(res.data.groq || []);
      }
    } catch (e) {
      showXeenapsToast('error', 'Failed to load keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const toggleMask = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderMaskedKey = (key: string, id: string) => {
    if (showKeys[id]) return <span className="font-mono text-[#004A74]">{key}</span>;
    if (!key) return <span className="text-gray-300 italic">No Key</span>;
    const start = key.substring(0, 8);
    const end = key.substring(key.length - 4);
    return <span className="font-mono text-gray-400">{start}••••••••{end}</span>;
  };

  const handleAddGemini = async () => {
    if (!newKey.trim() || !newLabel.trim()) return;
    setIsProcessing(true);
    const res = await manageApiKeys({ subAction: 'add_gemini', key: newKey, label: newLabel });
    if (res.status === 'success') {
      showXeenapsToast('success', 'Gemini Key Added');
      setNewKey('');
      setNewLabel('');
      loadKeys();
    } else {
      showXeenapsToast('error', 'Add Failed');
    }
    setIsProcessing(false);
  };

  const handleDeleteGemini = async (id: string) => {
    if (await showXeenapsDeleteConfirm(1)) {
      setIsProcessing(true);
      const res = await manageApiKeys({ subAction: 'delete_gemini', id });
      if (res.status === 'success') {
        showXeenapsToast('success', 'Key Deleted');
        loadKeys();
      } else {
        showXeenapsToast('error', 'Delete Failed');
      }
      setIsProcessing(false);
    }
  };

  const handleAddGroq = async () => {
    if (!newKey.trim()) return;
    setIsProcessing(true);
    const res = await manageApiKeys({ subAction: 'add_groq', api: newKey });
    if (res.status === 'success') {
      showXeenapsToast('success', 'Groq Key Added');
      setNewKey('');
      loadKeys();
    } else {
      showXeenapsToast('error', 'Add Failed');
    }
    setIsProcessing(false);
  };

  const handleDeleteGroq = async (id: string) => {
    if (await showXeenapsDeleteConfirm(1)) {
      setIsProcessing(true);
      const res = await manageApiKeys({ subAction: 'delete_groq', id });
      if (res.status === 'success') {
        showXeenapsToast('success', 'Key Deleted');
        loadKeys();
      } else {
        showXeenapsToast('error', 'Delete Failed');
      }
      setIsProcessing(false);
    }
  };

  return (
    <FormPageContainer>
      <FormStickyHeader 
        title="API Key Management" 
        subtitle="Manage secure access credentials" 
        onBack={() => navigate('/settings')} 
      />

      <FormContentArea>
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           
           {/* TABS */}
           <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 shrink-0 w-full md:w-auto self-start">
              {['GEMINI', 'GROQ'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => { setActiveTab(tab as any); setNewKey(''); setNewLabel(''); }}
                  className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#004A74] text-white shadow-md' : 'text-gray-400 hover:text-[#004A74] hover:bg-white'}`}
                >
                  {tab === 'GROQ' ? 'GROQ AI' : `${tab} AI`}
                </button>
              ))}
           </div>

           {/* CONTENT AREA */}
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm min-h-[400px]">
              
              {/* GEMINI SECTION */}
              {activeTab === 'GEMINI' && (
                <div className="space-y-8">
                   <div className="bg-[#004A74]/5 p-6 rounded-3xl border border-[#004A74]/10 flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 w-full space-y-4">
                         <h4 className="text-[10px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2">
                           <Key size={14} /> Add New Key
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              placeholder="Label" 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/20"
                              value={newLabel}
                              onChange={e => setNewLabel(e.target.value)}
                            />
                            <input 
                              placeholder="Paste Gemini API Key..." 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-mono text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/20"
                              value={newKey}
                              onChange={e => setNewKey(e.target.value)}
                            />
                         </div>
                      </div>
                      <button 
                        onClick={handleAddGemini}
                        disabled={isProcessing || !newKey || !newLabel}
                        className="w-full md:w-auto px-8 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {isProcessing ? null : null } Register
                      </button>
                   </div>

                   <StandardTableContainer>
                      <StandardTableWrapper>
                         <thead className="bg-gray-50">
                            <tr>
                               <StandardTh>Label</StandardTh>
                               <StandardTh>Masked Key</StandardTh>
                               <StandardTh>Status</StandardTh>
                               <StandardTh className="text-center">Action</StandardTh>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                              <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#004A74]" /></td></tr>
                            ) : geminiKeys.length === 0 ? (
                              <tr><td colSpan={4} className="p-12 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No keys found</td></tr>
                            ) : (
                              geminiKeys.map(k => (
                                <StandardTr key={k.id}>
                                   <StandardTd className="font-bold text-[#004A74]">{k.label}</StandardTd>
                                   <StandardTd>
                                      <div className="flex items-center gap-3">
                                         {renderMaskedKey(k.key, k.id)}
                                         <button onClick={() => toggleMask(k.id)} className="text-gray-400 hover:text-[#004A74] transition-colors">
                                            {showKeys[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                         </button>
                                      </div>
                                   </StandardTd>
                                   <StandardTd>
                                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                                   </StandardTd>
                                   <StandardTd className="text-center">
                                      <button onClick={() => handleDeleteGemini(k.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                         <Trash2 size={14} />
                                      </button>
                                   </StandardTd>
                                </StandardTr>
                              ))
                            )}
                         </tbody>
                      </StandardTableWrapper>
                   </StandardTableContainer>
                </div>
              )}

              {/* GROQ SECTION */}
              {activeTab === 'GROQ' && (
                <div className="space-y-8">
                   <div className="bg-[#FED400]/10 p-6 rounded-3xl border border-[#FED400]/20 flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 w-full space-y-4">
                         <h4 className="text-[10px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2">
                           <Key size={14} /> Add Groq Key
                         </h4>
                         <input 
                           placeholder="gsk_..." 
                           className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-mono text-[#004A74] outline-none focus:ring-2 focus:ring-[#FED400]/40"
                           value={newKey}
                           onChange={e => setNewKey(e.target.value)}
                         />
                      </div>
                      <button 
                        onClick={handleAddGroq}
                        disabled={isProcessing || !newKey}
                        className="w-full md:w-auto px-8 py-3 bg-[#004A74] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />} Register
                      </button>
                   </div>

                   <StandardTableContainer>
                      <StandardTableWrapper>
                         <thead className="bg-gray-50">
                            <tr>
                               <StandardTh>Masked API Key</StandardTh>
                               <StandardTh className="text-center">Action</StandardTh>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                              <tr><td colSpan={2} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#004A74]" /></td></tr>
                            ) : groqKeys.length === 0 ? (
                              <tr><td colSpan={2} className="p-12 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No keys found</td></tr>
                            ) : (
                              groqKeys.map(k => (
                                <StandardTr key={k.id}>
                                   <StandardTd>
                                      <div className="flex items-center gap-3">
                                         {renderMaskedKey(k.api, k.id)}
                                         <button onClick={() => toggleMask(k.id)} className="text-gray-400 hover:text-[#004A74] transition-colors">
                                            {showKeys[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                         </button>
                                      </div>
                                   </StandardTd>
                                   <StandardTd className="text-center">
                                      <button onClick={() => handleDeleteGroq(k.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                         <Trash2 size={14} />
                                      </button>
                                   </StandardTd>
                                </StandardTr>
                              ))
                            )}
                         </tbody>
                      </StandardTableWrapper>
                   </StandardTableContainer>
                </div>
              )}

           </div>

           {/* Security Footer */}
           <div className="flex items-center justify-center gap-2 opacity-40">
              <AlertTriangle size={12} className="text-[#004A74]" />
              <p className="text-[9px] font-black text-[#004A74] uppercase tracking-[0.2em]">Keys are stored securely in Private Google Sheet</p>
           </div>

        </div>
      </FormContentArea>
    </FormPageContainer>
  );
};

export default ApiKeyManagerPage;
