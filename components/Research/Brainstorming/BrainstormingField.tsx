
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCcw, 
  Maximize2, 
  Loader2,
  X,
  Target,
  Languages,
  Check
} from 'lucide-react';
import { BrainstormingItem, TracerProject } from '../../../types';
import { refineBrainstormingField, translateSingleField } from '../../../services/BrainstormingService';
import { saveTracerProject } from '../../../services/TracerService';
import { showXeenapsToast } from '../../../utils/toastUtils';
import TracerProjectPicker from '../Tracer/TracerProjectPicker';

interface BrainstormingFieldProps {
  label: React.ReactNode;
  value: string;
  fieldKey: keyof BrainstormingItem; 
  context: BrainstormingItem; 
  onChange: (val: string) => void;
  onSave?: (val: string) => void; 
  className?: string; 
  isDark?: boolean; 
  placeholder?: string;
  minHeight?: string;
}

const LANG_OPTIONS = [
  { label: "English", code: "en" },
  { label: "Indonesian", code: "id" },
  { label: "Portuguese", code: "pt" },
  { label: "Spanish", code: "es" },
  { label: "German", code: "de" },
  { label: "French", code: "fr" },
  { label: "Dutch", code: "nl" },
  { label: "Mandarin", code: "zh" },
  { label: "Japanese", code: "ja" },
  { label: "Vietnamese", code: "vi" },
  { label: "Thai", code: "th" },
  { label: "Hindi", code: "hi" },
  { label: "Turkish", code: "tr" },
  { label: "Russian", code: "ru" },
  { label: "Arabic", code: "ar" }
];

const BrainstormingField: React.FC<BrainstormingFieldProps> = ({
  label,
  value,
  fieldKey,
  context,
  onChange,
  onSave,
  className = "",
  isDark = false,
  placeholder = "...",
  minHeight = "100px"
}) => {
  const [activeMenu, setActiveMenu] = useState<'ai' | 'lang' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracerPickerOpen, setIsTracerPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMagicAction = async (mode: 'REWRITE' | 'EXPAND') => {
    setActiveMenu(null);
    setIsLoading(true);
    
    const modeLabel = mode === 'REWRITE' ? 'Rewriting' : 'Expanding';
    
    try {
      const result = await refineBrainstormingField(fieldKey as string, value, context, mode);
      if (result) {
        onChange(result);
        if (onSave) onSave(result);
      }
    } catch (e) {
      console.error(e);
      showXeenapsToast('error', `Failed to ${modeLabel.toLowerCase()} content.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async (langCode: string) => {
    setActiveMenu(null);
    setIsLoading(true);
    try {
       const result = await translateSingleField(value, langCode);
       if (result) {
         onChange(result);
         if (onSave) onSave(result);
       }
    } catch (e) {
      showXeenapsToast('error', 'Translation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getTracerKey = (bsKey: string): keyof TracerProject | null => {
    if (bsKey === 'proposedTitle') return 'title';
    if (bsKey === 'problemStatement') return 'problemStatement';
    if (bsKey === 'researchGap') return 'researchGap';
    if (bsKey === 'researchQuestion') return 'researchQuestion';
    if (bsKey === 'methodology') return 'methodology';
    if (bsKey === 'population') return 'population';
    return null;
  };

  const handleExportToTracer = async (project: TracerProject) => {
    setIsTracerPickerOpen(false);
    const targetKey = getTracerKey(fieldKey as string);
    
    if (!targetKey) {
      showXeenapsToast('warning', 'This field cannot be mapped to Tracer.');
      return;
    }

    try {
      const updatedProject = { ...project, [targetKey]: value, updatedAt: new Date().toISOString() };
      const success = await saveTracerProject(updatedProject);
      if (success) {
        showXeenapsToast('success', `Exported to ${project.label}`);
      } else {
        throw new Error("Save failed");
      }
    } catch (e) {
      showXeenapsToast('error', 'Export failed');
    }
  };

  const buttonClass = `p-1.5 rounded-lg transition-all shadow-sm active:scale-90 flex items-center justify-center ${
    isDark 
      ? 'bg-white/10 text-white hover:bg-white hover:text-[#004A74] border border-white/10' 
      : 'bg-white border border-gray-100 text-gray-400 hover:text-[#004A74] hover:bg-gray-50'
  }`;

  const activeButtonClass = `p-1.5 rounded-lg transition-all shadow-md active:scale-90 flex items-center justify-center ${
    isDark 
      ? 'bg-white text-[#004A74] border border-white' 
      : 'bg-[#004A74] text-white border border-[#004A74]'
  }`;

  return (
    <div className="space-y-3 relative group/field">
      {/* Label */}
      <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-[#004A74]'}`}>
        {label}
      </label>

      {/* Picker Modal */}
      {isTracerPickerOpen && (
        <TracerProjectPicker 
          onClose={() => setIsTracerPickerOpen(false)} 
          onSelect={handleExportToTracer} 
        />
      )}

      <div className="relative">
        {/* Toolbar (Absolute Top Right) */}
        {!isLoading && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity" ref={menuRef}>
            
            {/* 1. Translate Button */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'lang' ? null : 'lang')}
                className={activeMenu === 'lang' ? activeButtonClass : buttonClass}
                title="Translate"
                type="button"
              >
                <Languages size={12} />
              </button>
              {activeMenu === 'lang' && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-30 animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="p-2 border-b border-gray-50 mb-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Select Language</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {LANG_OPTIONS.map((lang) => (
                      <button 
                        key={lang.code}
                        onClick={() => handleTranslate(lang.code)}
                        className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center justify-between"
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Export Button */}
            <button
              onClick={() => setIsTracerPickerOpen(true)}
              className={buttonClass + " hover:!text-[#FED400] hover:!border-[#FED400]/30"}
              title="Export to Tracer"
              type="button"
            >
              <Target size={12} />
            </button>

            {/* 3. AI Co-Pilot Button */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'ai' ? null : 'ai')}
                className={activeMenu === 'ai' ? activeButtonClass : buttonClass}
                title="AI Co-Pilot"
                type="button"
              >
                <Sparkles size={12} />
              </button>
              {activeMenu === 'ai' && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-30 animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="p-2 border-b border-gray-50 mb-1 flex justify-between items-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Co-Pilot</p>
                    <button onClick={() => setActiveMenu(null)}><X size={12} className="text-gray-300 hover:text-red-400"/></button>
                  </div>
                  <button
                    onClick={() => handleMagicAction('REWRITE')}
                    className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2"
                    type="button"
                  >
                    <RefreshCcw size={12} /> Rewrite
                  </button>
                  <button
                    onClick={() => handleMagicAction('EXPAND')}
                    className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2"
                    type="button"
                  >
                    <Maximize2 size={12} /> Expand
                  </button>
                </div>
              )}
            </div>
            
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-3xl">
             <div className="flex items-center gap-2 px-4 py-2 bg-white shadow-lg rounded-full border border-gray-100">
                <Loader2 size={14} className="animate-spin text-[#004A74]" />
                <span className="text-[9px] font-black text-[#004A74] uppercase tracking-widest">Processing...</span>
             </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className={`${className} min-h-[${minHeight}]`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            adjustHeight();
          }}
          onFocus={adjustHeight}
          rows={1}
        />
      </div>
    </div>
  );
};

export default BrainstormingField;
