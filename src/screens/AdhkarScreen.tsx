import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sun, Moon, RotateCcw, Check, CheckCircle2 } from 'lucide-react';
import { adhkar, Dhikr } from '../data/adhkar';
import { useSettings } from '../hooks/useSettings';
import { localDateKey } from '../context/SalahTrackerContext';
import { useScrollLock } from '../utils/useScrollLock';

const T: Record<string, Record<string, string>> = {
  en: { title: 'Daily Adhkar', morning: 'Morning', evening: 'Evening', reset: 'Reset', times: 'times', completed: 'completed', allDone: 'Adhkar complete — may Allah accept it!', tapHint: 'Tap the count to add one' },
  es: { title: 'Adhkar Diario', morning: 'Mañana', evening: 'Tarde', reset: 'Reiniciar', times: 'veces', completed: 'completados', allDone: '¡Adhkar completado — que Allah lo acepte!', tapHint: 'Toca el contador para sumar' },
  ar: { title: 'الأذكار اليومية', morning: 'الصباح', evening: 'المساء', reset: 'إعادة', times: 'مرات', completed: 'مكتملة', allDone: 'اكتملت الأذكار — تقبّل الله!', tapHint: 'اضغط العدّاد للإضافة' },
  fr: { title: 'Adhkar Quotidien', morning: 'Matin', evening: 'Soir', reset: 'Réinitialiser', times: 'fois', completed: 'terminés', allDone: 'Adhkar terminé — qu’Allah l’accepte !', tapHint: 'Touchez le compteur pour ajouter' },
  de: { title: 'Tägliche Adhkar', morning: 'Morgen', evening: 'Abend', reset: 'Zurücksetzen', times: 'Mal', completed: 'erledigt', allDone: 'Adhkar fertig — möge Allah es annehmen!', tapHint: 'Tippe den Zähler zum Erhöhen' },
  tr: { title: 'Günlük Zikirler', morning: 'Sabah', evening: 'Akşam', reset: 'Sıfırla', times: 'kez', completed: 'tamamlandı', allDone: 'Zikirler tamam — Allah kabul etsin!', tapHint: 'Eklemek için sayaca dokun' },
  pt: { title: 'Adhkar Diário', morning: 'Manhã', evening: 'Tarde', reset: 'Redefinir', times: 'vezes', completed: 'concluídos', allDone: 'Adhkar concluído — que Allah aceite!', tapHint: 'Toque no contador para somar' },
};

const STORAGE_KEY = 'adhkar_progress_v1';
type Session = 'morning' | 'evening';
type Progress = { date: string; morning: Record<string, number>; evening: Record<string, number> };

function loadProgress(): Progress {
  const today = localDateKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p.date === today) return p;
    }
  } catch {}
  return { date: today, morning: {}, evening: {} };
}

interface Props {
  onClose: () => void;
}

export function AdhkarScreen({ onClose }: Props) {
  useScrollLock();
  const { settings } = useSettings();
  const lang = settings.language || 'es';
  const t = T[lang] || T.en;

  const [session, setSession] = useState<Session>(() => (new Date().getHours() < 15 ? 'morning' : 'evening'));
  const [progress, setProgress] = useState<Progress>(loadProgress);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress]);

  const list = useMemo<Dhikr[]>(
    () => adhkar.filter((d) => d.time === 'both' || d.time === session),
    [session]
  );

  const counts = progress[session];
  const completedCount = list.filter((d) => (counts[d.id] || 0) >= d.count).length;
  const allDone = completedCount === list.length;

  const inc = (d: Dhikr) => {
    if (settings.tasbihHaptics && navigator.vibrate) navigator.vibrate(12);
    setProgress((prev) => {
      const cur = prev[session][d.id] || 0;
      const next = cur >= d.count ? 0 : cur + 1; // tap again after complete to reset that dhikr
      return { ...prev, [session]: { ...prev[session], [d.id]: next } };
    });
  };

  const resetSession = () => {
    setProgress((prev) => ({ ...prev, [session]: {} }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-[#011410]/95 backdrop-blur-xl overflow-y-auto app-scroll text-[#F3F4F6]"
    >
      <div className="max-w-lg mx-auto px-5 pt-safe pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <h1 className="text-xl font-bold text-[#FCD34D]">{t.title}</h1>
          <div className="flex items-center gap-2">
            <button onClick={resetSession} className="p-2.5 bg-white/5 border border-white/10 rounded-full text-[#A7F3D0] hover:text-white transition-colors" title={t.reset}>
              <RotateCcw size={16} />
            </button>
            <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-full text-[#A7F3D0] hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Morning / Evening toggle */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl mb-4">
          {(['morning', 'evening'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSession(s)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                session === s ? 'bg-[#059669] text-white shadow' : 'text-[#A7F3D0]/60 hover:text-white'
              }`}
            >
              {s === 'morning' ? <Sun size={14} /> : <Moon size={14} />}
              {s === 'morning' ? t.morning : t.evening}
            </button>
          ))}
        </div>

        {/* Overall progress */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#A7F3D0]/70">
              {completedCount} / {list.length} {t.completed}
            </span>
            {allDone && <CheckCircle2 size={16} className="text-emerald-400" />}
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FCD34D] to-[#10B981] rounded-full"
              animate={{ width: `${(completedCount / list.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <AnimatePresence>
            {allDone && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-emerald-300 font-semibold mt-3 text-center"
              >
                {t.allDone}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Dhikr list */}
        <div className="space-y-3">
          {list.map((d) => {
            const cur = counts[d.id] || 0;
            const done = cur >= d.count;
            return (
              <div
                key={d.id}
                className={`rounded-3xl border p-5 transition-all ${
                  done ? 'bg-[#059669]/10 border-[#059669]/30' : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <p className="text-xl font-arabic text-white text-right leading-loose mb-3" dir="rtl">
                  {d.arabic}
                </p>
                <p className="text-xs italic text-[#FCD34D]/90 leading-relaxed mb-1.5">{d.transliteration}</p>
                <p className="text-xs text-[#A7F3D0]/90 leading-relaxed mb-3">{d.translation}</p>

                <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                  <span className="text-[9px] font-bold text-[#A7F3D0]/50 uppercase tracking-widest flex-1 truncate">
                    {d.reference}
                  </span>
                  <button
                    onClick={() => inc(d)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm tabular-nums active:scale-95 transition-all shrink-0 ${
                      done
                        ? 'bg-[#059669] text-white shadow-lg shadow-[#059669]/20'
                        : 'bg-[#FCD34D] text-[#022C22] shadow-md'
                    }`}
                    title={t.tapHint}
                  >
                    {done ? <Check size={16} strokeWidth={3} /> : null}
                    <span>{cur} / {d.count}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
