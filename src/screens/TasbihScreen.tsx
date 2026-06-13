import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, ChevronRight, ChevronLeft, Check, History, Trash2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../hooks/useSettings';
import { translations } from '../utils/translations';
import { playBeadClickSound } from '../utils/audio';
import { useUI } from '../context/UIContext';

interface Zikr {
  id: number;
  arabic: string;
  transliteration: string;
  translation: string;
  target: number;
  custom?: boolean;
}

const defaultZikrs: Zikr[] = [
  { id: 1, arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'Subhanallah', translation: 'Glory be to Allah', target: 33 },
  { id: 2, arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', translation: 'All praise is to Allah', target: 33 },
  { id: 3, arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', translation: 'Allah is the Greatest', target: 34 },
  { id: 4, arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', transliteration: 'La ilaha illallah', translation: 'There is no god but Allah', target: 100 },
  { id: 5, arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', transliteration: 'La hawla wa la quwwata illa billah', translation: 'There is no power except with Allah', target: 100 },
  { id: 6, arabic: 'أَسْتَغْفِرُ اللَّهَ', transliteration: 'Astaghfirullah', translation: 'I seek forgiveness from Allah', target: 100 },
];

const CUSTOM_KEY = 'tasbih_custom_v1';

const PRESET_T: Record<string, Record<string, string>> = {
  en: { add: 'New dhikr', name: 'Name / transliteration', arabic: 'Arabic (optional)', target: 'Target', save: 'Save', cancel: 'Cancel', delete: 'Delete this dhikr' },
  es: { add: 'Nuevo dhikr', name: 'Nombre / transliteración', arabic: 'Árabe (opcional)', target: 'Objetivo', save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar este dhikr' },
  ar: { add: 'ذكر جديد', name: 'الاسم / النطق', arabic: 'العربية (اختياري)', target: 'الهدف', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف هذا الذكر' },
  fr: { add: 'Nouveau dhikr', name: 'Nom / translittération', arabic: 'Arabe (optionnel)', target: 'Objectif', save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer ce dhikr' },
  de: { add: 'Neuer Dhikr', name: 'Name / Transliteration', arabic: 'Arabisch (optional)', target: 'Ziel', save: 'Speichern', cancel: 'Abbrechen', delete: 'Diesen Dhikr löschen' },
  tr: { add: 'Yeni zikir', name: 'Ad / okunuş', arabic: 'Arapça (isteğe bağlı)', target: 'Hedef', save: 'Kaydet', cancel: 'İptal', delete: 'Bu zikri sil' },
  pt: { add: 'Novo dhikr', name: 'Nome / transliteração', arabic: 'Árabe (opcional)', target: 'Objetivo', save: 'Salvar', cancel: 'Cancelar', delete: 'Excluir este dhikr' },
};

function loadCustomZikrs(): Zikr[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

interface TasbihRecord {
  date: string;
  zikr: string;
  count: number;
}

export function TasbihScreen() {
  const { settings } = useSettings();
  const [count, setCount] = useState(0);
  const [activeZikrIndex, setActiveZikrIndex] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  
  // History states
  const [history, setHistory] = useState<TasbihRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Custom dhikr presets
  const [customZikrs, setCustomZikrs] = useState<Zikr[]>(loadCustomZikrs);
  const [showAdd, setShowAdd] = useState(false);
  const [formName, setFormName] = useState('');
  const [formArabic, setFormArabic] = useState('');
  const [formTarget, setFormTarget] = useState('33');

  // Hide the bottom nav while the new-dhikr sheet is open.
  const { pushModal, popModal } = useUI();
  useEffect(() => {
    if (!showAdd) return;
    pushModal();
    return () => popModal();
  }, [showAdd, pushModal, popModal]);

  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;
  const pt = PRESET_T[lang] || PRESET_T.en;

  const allZikrs = [...defaultZikrs, ...customZikrs];
  const safeIndex = Math.min(activeZikrIndex, allZikrs.length - 1);
  const activeZikr = allZikrs[safeIndex];

  const persistCustom = (list: Zikr[]) => {
    setCustomZikrs(list);
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); } catch {}
  };

  const saveCustomZikr = () => {
    const name = formName.trim();
    if (!name) return;
    const target = Math.max(1, Math.min(10000, parseInt(formTarget) || 33));
    const newZikr: Zikr = {
      id: Date.now(),
      arabic: formArabic.trim() || name,
      transliteration: name,
      translation: '',
      target,
      custom: true,
    };
    persistCustom([...customZikrs, newZikr]);
    setActiveZikrIndex(defaultZikrs.length + customZikrs.length); // jump to the new one
    setCount(0);
    setFormName('');
    setFormArabic('');
    setFormTarget('33');
    setShowAdd(false);
  };

  const deleteActiveCustom = () => {
    if (!activeZikr.custom) return;
    persistCustom(customZikrs.filter(z => z.id !== activeZikr.id));
    setActiveZikrIndex(0);
    setCount(0);
  };
  const isComplete = count >= activeZikr.target;
  const progress = Math.min((count / activeZikr.target) * 100, 100);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('tasbih_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
      } catch {}
    }
  }, []);



  const saveCurrentProgressToHistory = (amount: number) => {
    if (amount <= 0) return;
    
    const dateStr = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');
    const newRecord: TasbihRecord = {
      date: dateStr,
      zikr: activeZikr.transliteration,
      count: amount
    };

    setHistory(prev => {
      let updated = [...prev];
      // Check if entry for same date and zikr exists
      const idx = updated.findIndex(h => h.date === dateStr && h.zikr === activeZikr.transliteration);
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          count: updated[idx].count + amount
        };
      } else {
        updated.push(newRecord);
      }
      
      // Limit size to 15 items
      if (updated.length > 15) updated.shift();
      
      localStorage.setItem('tasbih_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePress = () => {
    if (isComplete) return;
    
    // Play bead click sound if enabled in settings
    if (settings.tasbihSounds) {
      playBeadClickSound();
    }
    
    // Trigger vibration based on strength setting if enabled
    if (settings.tasbihHaptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      let duration = 35; // Default medium strength
      if (settings.tasbihHapticStrength === 'light') {
        duration = 15;
      } else if (settings.tasbihHapticStrength === 'heavy') {
        duration = 65;
      }
      navigator.vibrate(duration);
    }
    
    setCount(prev => {
      const newVal = prev + 1;
      setSessionTotal(s => s + 1);

      // If we reach target, auto save to history
      if (newVal === activeZikr.target) {
        saveCurrentProgressToHistory(activeZikr.target);
        // Distinct completion buzz so you feel the cycle end without looking.
        if (settings.tasbihHaptics && navigator.vibrate) navigator.vibrate([60, 70, 60, 70, 140]);
      } else if (newVal % 33 === 0 && settings.tasbihHaptics && navigator.vibrate) {
        // Milestone tick every 33 (subhanallah / alhamdulillah / allahu-akbar boundaries).
        navigator.vibrate([40, 50, 40]);
      }
      return newVal;
    });
  };

  const handleReset = () => {
    if (count > 0 && !isComplete) {
      saveCurrentProgressToHistory(count);
    }
    setCount(0);
  };

  const nextZikr = () => {
    if (count > 0 && !isComplete) {
      saveCurrentProgressToHistory(count);
    }
    setActiveZikrIndex(prev => (prev + 1) % allZikrs.length);
    setCount(0);
  };

  const prevZikr = () => {
    if (count > 0 && !isComplete) {
      saveCurrentProgressToHistory(count);
    }
    setActiveZikrIndex(prev => (prev - 1 + allZikrs.length) % allZikrs.length);
    setCount(0);
  };

  const clearHistory = () => {
    localStorage.removeItem('tasbih_history');
    setHistory([]);
    setConfirmClear(false);
  };

  return (
    <div className="flex flex-col min-h-full font-sans bg-transparent items-center px-6 pt-12 pb-24 text-[#F3F4F6]">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#FCD34D] tracking-tight">{t.tabTasbih}</h1>
          {sessionTotal > 0 && (
            <p className="text-xs text-[#A7F3D0] opacity-75 mt-0.5">
              {t.tasbihSessionTotal}: {sessionTotal}
            </p>
          )}
        </div>
        <button
          onClick={handleReset}
          className="p-2.5 text-[#A7F3D0] hover:text-white bg-white/5 border border-white/10 rounded-full transition-all active:scale-95 shadow-lg"
          title="Reset current counter"
        >
          <RotateCcw size={18} />
        </button>
      </div>



      {/* Zikr Carousel */}
      <div className="flex items-center w-full mb-6 bg-white/[0.03] backdrop-blur-md rounded-3xl p-5 border border-white/10 shadow-xl">
        <button onClick={prevZikr} className="p-2 text-[#A7F3D0] hover:text-[#FCD34D] transition-colors shrink-0">
          <ChevronLeft size={22} />
        </button>

        <div className="flex flex-col items-center flex-1 overflow-hidden px-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeZikr.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <div className="text-3xl font-arabic text-white mb-2 leading-relaxed">
                {activeZikr.arabic}
              </div>
              <div className="text-sm font-bold text-[#FCD34D] tracking-wide mb-1">
                {activeZikr.transliteration}
              </div>
              {activeZikr.translation && (
                <div className="text-xs text-[#A7F3D0] opacity-70">
                  {activeZikr.translation}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <button onClick={nextZikr} className="p-2 text-[#A7F3D0] hover:text-[#FCD34D] transition-colors shrink-0">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Pagination dots + add preset */}
      <div className="flex items-center gap-1.5 mb-6">
        {allZikrs.map((z, i) => (
          <button
            key={z.id}
            onClick={() => {
              if (count > 0 && !isComplete) saveCurrentProgressToHistory(count);
              setActiveZikrIndex(i);
              setCount(0);
            }}
            className={`rounded-full transition-all duration-300 ${
              i === safeIndex ? 'w-4 h-2 bg-[#FCD34D]' : z.custom ? 'w-2 h-2 bg-[#FCD34D]/40' : 'w-2 h-2 bg-[#065F46]'
            }`}
          />
        ))}
        <button
          onClick={() => setShowAdd(true)}
          className="ml-1.5 w-6 h-6 rounded-full bg-white/5 border border-white/10 text-[#A7F3D0] hover:text-[#FCD34D] flex items-center justify-center transition-colors active:scale-90"
          title={pt.add}
        >
          <Plus size={13} />
        </button>
        {activeZikr.custom && (
          <button
            onClick={deleteActiveCustom}
            className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 hover:text-red-200 flex items-center justify-center transition-colors active:scale-90"
            title={pt.delete}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Add custom dhikr sheet */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#022C22]/95 border-t border-white/10 rounded-t-[2.5rem] px-6 pt-5 pb-8 space-y-4 shadow-2xl"
            >
              <div className="w-12 h-1 bg-white/25 rounded-full mx-auto mb-1" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">{pt.add}</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 bg-white/5 border border-white/10 rounded-full text-white">
                  <X size={15} />
                </button>
              </div>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder={pt.name}
                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FCD34D]"
              />
              <input
                type="text"
                value={formArabic}
                onChange={e => setFormArabic(e.target.value)}
                placeholder={pt.arabic}
                dir="rtl"
                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-base font-arabic text-white placeholder-white/30 focus:outline-none focus:border-[#FCD34D]"
              />
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-[#A7F3D0] shrink-0">{pt.target}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={formTarget}
                  onChange={e => setFormTarget(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#FCD34D]"
                />
              </div>
              <button
                onClick={saveCustomZikr}
                disabled={!formName.trim()}
                className="w-full bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white font-bold text-sm py-3 rounded-2xl active:scale-95 transition-all"
              >
                {pt.save}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Counter Button */}
      <div className="flex-1 flex flex-col items-center justify-center w-full mb-6">
        <div className="relative w-60 h-60 flex items-center justify-center select-none">
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
            <motion.circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke={isComplete ? '#059669' : '#FCD34D'}
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ strokeDasharray: 289, strokeDashoffset: 289 }}
              animate={{ strokeDashoffset: 289 - (289 * progress) / 100 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          </svg>

          <motion.button
            whileTap={{ scale: isComplete ? 1 : 0.92 }}
            onClick={handlePress}
            className={`w-48 h-48 rounded-full shadow-2xl flex flex-col items-center justify-center z-10 focus:outline-none select-none touch-manipulation transition-all duration-300 ${
              isComplete
                ? 'bg-[#059669] shadow-[#059669]/30 cursor-default border border-[#10B981]'
                : 'bg-[#FCD34D] shadow-[#FCD34D]/20 active:brightness-95 border border-[#FCD34D]/40'
            }`}
          >
            <AnimatePresence mode="popLayout">
              {isComplete ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <Check size={48} className="text-white mb-1" strokeWidth={3} />
                  <span className="text-white text-xs font-bold uppercase tracking-widest">Done!</span>
                </motion.div>
              ) : (
                <motion.div
                  key={count}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-6xl font-black mb-1 font-mono text-[#022C22] tracking-tighter">{count}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-[#022C22]">
                    / {activeZikr.target}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* History Drawer at the bottom */}
      <div className="w-full mt-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-[#A7F3D0] hover:text-white transition-all hover:bg-white/10"
        >
          <History size={14} />
          {t.tasbihHistory}
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden mt-3"
            >
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 space-y-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                    {t.tasbihRecentSessions}
                  </span>
                  {history.length > 0 && (
                    confirmClear ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={clearHistory}
                          className="text-red-400 hover:text-red-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20"
                        >
                          {t.tasbihConfirmClear}
                        </button>
                        <button
                          onClick={() => setConfirmClear(false)}
                          className="text-[#A7F3D0]/60 hover:text-white text-[10px] font-bold uppercase tracking-wider"
                        >
                          {t.tasbihCancelClear}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmClear(true)}
                        className="text-red-400 hover:text-red-300 p-1 flex items-center gap-1 text-[10px] font-bold uppercase"
                      >
                        <Trash2 size={11} />
                        {t.tasbihClear}
                      </button>
                    )
                  )}
                </div>

                {history.length === 0 ? (
                  <p className="text-center text-xs text-[#A7F3D0]/40 py-6">
                    {t.tasbihNoRecords}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {[...history].reverse().map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-black/10 border border-white/5 py-2 px-3.5 rounded-xl text-xs"
                      >
                        <div>
                          <p className="font-bold text-white leading-tight">{rec.zikr}</p>
                          <span className="text-[9px] text-[#A7F3D0] opacity-50 block mt-0.5">{rec.date}</span>
                        </div>
                        <span className="text-sm font-extrabold text-[#FCD34D] font-mono">
                          +{rec.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
