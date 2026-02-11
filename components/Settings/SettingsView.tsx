import React, { useState } from 'react';
import { 
  Cog6ToothIcon, 
  TableCellsIcon, 
  CloudArrowUpIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  BookOpenIcon,
  IdentificationIcon,
  ChatBubbleLeftRightIcon,
  InboxIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { StickyNote, BookOpen, ListTodo, Sparkles } from 'lucide-react';
import { GAS_WEB_APP_URL } from '../../constants';
import { initializeDatabase, initializeBrainstormingDatabase, initializePublicationDatabase } from '../../services/gasService';
import { initializeSharboxDatabase } from '../../services/SharboxService';
import { showXeenapsAlert } from '../../utils/swalUtils';
import { showXeenapsToast } from '../../utils/toastUtils';

const SettingsView: React.FC = () => {
  const isConfigured = !!GAS_WEB_APP_URL;
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitializingBrain, setIsInitializingBrain] = useState(false);
  const [isInitializingPub, setIsInitializingPub] = useState(false);
  const [isInitializingSharbox, setIsInitializingSharbox] = useState(false);

  const SPREADSHEET_IDS = {
    LIBRARY: '1ROW4iyHN10DfDWaXL7O54mZi6Da9Xx70vU6oE-YW-I8',
    KEYS: '1Ji8XL2ceTprNa1dYvhfTnMDkWwzC937kpfyP19D7NvI',
    BRAINSTORMING: '1nMC1fO5kLdzO4W9O_sPK2tfL1K_GGQ-lE7g2Un76OrM',
    PUBLICATION: '1logOZHQgiMW4fOAViF_fYbjL0mG9RetqKDAAzAmiQ3g',
    CONSULTATION: '1tWeM09na8DY0pjU5wwnLNvzl_BIK6pB90m2WToF98Ts',
    NOTEBOOK: '1LxDILaoTFkHV9ZRx67YUhLQmHANeySdvR8AcYO8NMQs',
    CV_REGISTRY: '1w_-GyH_gTansPBt_6tSR9twcAV0tQi4dan9rUfKdyKw',
    LITERATURE_REVIEW: '1l8P-jSZsj6Q6OuBjPDpM3nCNpDcxeoreYebhr0RMz_Y',
    SHARBOX: '1u4xS9R7N3Y6_J7vR9qK9L2xX7p8M5n9tV2B6W3U1S0'
  };

  const openSheet = (id: string) => {
    window.open(`https://docs.google.com/spreadsheets/d/${id}`, '_blank');
  };

  const handleInitDatabase = async () => {
    setIsInitializing(true);
    try {
      const result = await initializeDatabase();
      if (result.status === 'success') {
        showXeenapsAlert({
          icon: 'success',
          title: 'DATABASE READY',
          text: 'The "Collections" sheet has been created with all 40+ required columns.',
          confirmButtonText: 'GREAT'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      showXeenapsAlert({ icon: 'error', title: 'SETUP FAILED', text: err.message || 'Check GAS connection.' });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleInitNoteDatabase = async () => {
    // Notebook migrated to Supabase
    showXeenapsToast('success', 'Notebook Registry Managed by Supabase');
  };

  const handleInitCVDatabase = async () => {
    // CV migrated to Supabase
    showXeenapsToast('success', 'CV Registry Managed by Supabase');
  };

  const handleInitTeachingDatabase = async () => {
    // Teaching migrated to Supabase
    showXeenapsToast('success', 'Teaching Registry Managed by Supabase');
  };

  const handleInitBrainDatabase = async () => {
    setIsInitializingBrain(true);
    try {
      const result = await initializeBrainstormingDatabase();
      if (result.status === 'success') {
        showXeenapsAlert({
          icon: 'success',
          title: 'BRAINSTORMING READY',
          text: 'The Brainstorming registry sheet has been successfully initialized.',
          confirmButtonText: 'GREAT'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      showXeenapsAlert({ icon: 'error', title: 'SETUP FAILED', text: err.message || 'Check GAS connection.' });
    } finally {
      setIsInitializingBrain(false);
    }
  };

  const handleInitPubDatabase = async () => {
    setIsInitializingPub(true);
    try {
      const result = await initializePublicationDatabase();
      if (result.status === 'success') {
        showXeenapsAlert({
          icon: 'success',
          title: 'PUBLICATION READY',
          text: 'The Publication registry sheet has been successfully initialized.',
          confirmButtonText: 'GREAT'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      showXeenapsAlert({ icon: 'error', title: 'SETUP FAILED', text: err.message || 'Check GAS connection.' });
    } finally {
      setIsInitializingPub(false);
    }
  };

  const handleInitConsultDatabase = async () => {
    // Consultation migrated to Supabase
    showXeenapsToast('success', 'Consultation Registry Managed by Supabase');
  };

  const handleInitReviewDatabase = async () => {
    // Review migrated to Supabase
    showXeenapsToast('success', 'Review Registry Managed by Supabase');
  };

  const handleInitSharboxDatabase = async () => {
    setIsInitializingSharbox(true);
    try {
      const result = await initializeSharboxDatabase();
      if (result.status === 'success') {
        showXeenapsAlert({
          icon: 'success',
          title: 'SHARBOX READY',
          text: 'Sharbox Inbox and Sent sheets have been successfully initialized.',
          confirmButtonText: 'GREAT'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      showXeenapsAlert({ icon: 'error', title: 'SETUP FAILED', text: err.message || 'Check GAS connection.' });
    } finally {
      setIsInitializingSharbox(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="glass p-8 rounded-[2rem] border-white/40 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg shadow-[#004A74]/20">
            <Cog6ToothIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#004A74] tracking-tight">System Settings</h2>
            <p className="text-gray-500 font-medium">Manage your private cloud infrastructure</p>
          </div>
        </div>

        {/* Database Auto-Setup Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <TableCellsIcon className="w-4 h-4 text-[#FED400]" />
              Library
            </h3>
            <button 
              onClick={handleInitDatabase}
              disabled={isInitializing || !isConfigured}
              className="w-full py-2.5 bg-[#FED400] text-[#004A74] rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
            >
              {isInitializing ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Initialize
            </button>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <BookOpenIcon className="w-4 h-4 text-[#FED400]" />
              Teaching
            </h3>
            <div className="w-full py-2.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 opacity-60">
              <ShieldCheckIcon className="w-3 h-3" />
              Supabase Powered
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <ListTodo size={16} className="text-[#FED400]" />
              Questions
            </h3>
            <div className="w-full py-2.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 opacity-60">
              <ShieldCheckIcon className="w-3 h-3" />
              Supabase Powered
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <IdentificationIcon className="w-4 h-4 text-[#FED400]" />
              CV Architect
            </h3>
            <div className="w-full py-2.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 opacity-60">
              <ShieldCheckIcon className="w-3 h-3" />
              Supabase Powered
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <SparklesIcon className="w-4 h-4 text-[#FED400]" />
              Incubation
            </h3>
            <button 
              onClick={handleInitBrainDatabase}
              disabled={isInitializingBrain || !isConfigured}
              className="w-full py-2.5 bg-[#FED400] text-[#004A74] rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
            >
              {isInitializingBrain ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Initialize
            </button>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <TableCellsIcon className="w-4 h-4 text-[#FED400]" />
              Publication
            </h3>
            <button 
              onClick={handleInitPubDatabase}
              disabled={isInitializingPub || !isConfigured}
              className="w-full py-2.5 bg-white text-[#004A74] rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
            >
              {isInitializingPub ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Initialize
            </button>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-[#FED400]" />
              Consultation
            </h3>
            <div className="w-full py-2.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 opacity-60">
              <ShieldCheckIcon className="w-3 h-3" />
              Supabase Powered
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <TableCellsIcon className="w-4 h-4 text-[#FED400]" />
              Notebook
            </h3>
            <div className="w-full py-2.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 opacity-60">
              <ShieldCheckIcon className="w-3 h-3" />
              Supabase Powered
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black mb-3 flex items-center gap-2 uppercase tracking-widest">
              <BookOpen size={16} className="text-[#FED400]" />
              Lit. Review
            </h3>
            <div className="w-full py-2.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[8px] flex items-center justify-center gap-2 opacity-60">
              <ShieldCheckIcon className="w-3 h-3" />
              Supabase Powered
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className={`p-6 rounded-3xl border ${isConfigured ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'} transition-all`}>
            <div className="flex items-center gap-3 mb-4">
              {isConfigured ? (
                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ExclamationCircleIcon className="w-6 h-6 text-red-700" />
              )}
              <h3 className={`font-bold ${isConfigured ? 'text-green-700' : 'text-red-700'}`}>Connection Status</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isConfigured 
                ? 'Backend GAS & Supabase berhasil terhubung. Aplikasi siap melakukan sinkronisasi data.' 
                : 'VITE_GAS_URL belum terdeteksi. Silakan cek Environment Variables di Vercel.'}
            </p>
          </div>

          <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <CloudArrowUpIcon className="w-6 h-6 text-[#004A74]" />
              <h3 className="font-bold text-[#004A74]">AI Engine (Gemini Flash)</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Model aktif terdeteksi dari <span className="font-mono font-bold">AI_CONFIG</span>. 
              Sistem rotasi kunci dari <span className="font-mono font-bold">KEYS</span> aktif.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-[#004A74] mb-6 flex items-center gap-2">
            <TableCellsIcon className="w-6 h-6" />
            Manual Database Access
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => openSheet(SPREADSHEET_IDS.KEYS)}
              className="group flex items-center justify-between p-6 bg-white/40 hover:bg-[#FED400] rounded-2xl border border-white/60 transition-all duration-500 text-left shadow-sm"
            >
              <div>
                <h4 className="font-bold text-[#004A74] group-hover:scale-105 transition-transform origin-left">Audit Key Database</h4>
                <p className="text-sm text-gray-500 group-hover:text-[#004A74]/70">Review active keys in your pool.</p>
              </div>
              <TableCellsIcon className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => openSheet(SPREADSHEET_IDS.LIBRARY)}
              className="group flex items-center justify-between p-6 bg-white/40 hover:bg-[#004A74] rounded-2xl border border-white/60 transition-all duration-500 text-left shadow-sm"
            >
              <div>
                <h4 className="font-bold text-[#004A74] group-hover:text-white group-hover:scale-105 transition-all origin-left">Master Library Database</h4>
                <p className="text-sm text-gray-500 group-hover:text-white/70">Access raw collection data and full system backups.</p>
              </div>
              <TableCellsIcon className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-center pb-8">
        <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
          Xeenaps v1.0.0 • Personal Knowledge Management System
        </p>
      </div>
    </div>
  );
};

export default SettingsView;