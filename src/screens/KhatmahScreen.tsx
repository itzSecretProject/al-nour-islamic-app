import React from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, Check, RotateCcw, Bell, BellOff } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useScrollLock } from '../utils/useScrollLock';
import { localDateKey } from '../context/SalahTrackerContext';

const QURAN_PAGES = 604;

const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Khatmah Plan', sub: 'Finish the Quran, page by page',
    start: 'Start a plan', finishIn: 'Finish in', days: 'days', perDay: 'pages/day',
    todayGoal: "Today's reading", pages: 'Pages', of: 'of', read: 'Mark as read',
    progress: 'Progress', done: 'completed', remaining: 'remaining',
    onTrack: 'On track', behind: 'pages behind', ahead: 'pages ahead',
    reminder: 'Daily reminder', reminderAt: 'Remind me at', reset: 'Reset plan',
    complete: 'Khatmah complete — taqabbal Allah! 🤲', resetConfirm: 'Reset this plan?',
    estDone: 'Estimated finish',
  },
  es: {
    title: 'Plan de Khatmah', sub: 'Termina el Corán, página a página',
    start: 'Empezar un plan', finishIn: 'Terminar en', days: 'días', perDay: 'págs/día',
    todayGoal: 'Lectura de hoy', pages: 'Páginas', of: 'de', read: 'Marcar como leído',
    progress: 'Progreso', done: 'completado', remaining: 'restante',
    onTrack: 'Al día', behind: 'páginas atrasado', ahead: 'páginas adelantado',
    reminder: 'Recordatorio diario', reminderAt: 'Recordarme a las', reset: 'Reiniciar plan',
    complete: '¡Khatmah completa — taqabbal Allah! 🤲', resetConfirm: '¿Reiniciar este plan?',
    estDone: 'Fin estimado',
  },
  ar: {
    title: 'خطة الختمة', sub: 'أكمل القرآن صفحة بصفحة',
    start: 'ابدأ خطة', finishIn: 'الإنهاء خلال', days: 'يوم', perDay: 'صفحة/يوم',
    todayGoal: 'ورد اليوم', pages: 'صفحات', of: 'من', read: 'تحديد كمقروء',
    progress: 'التقدم', done: 'مكتمل', remaining: 'متبقٍ',
    onTrack: 'في الموعد', behind: 'صفحات متأخر', ahead: 'صفحات متقدم',
    reminder: 'تذكير يومي', reminderAt: 'ذكّرني عند', reset: 'إعادة الخطة',
    complete: 'تمت الختمة — تقبل الله! 🤲', resetConfirm: 'إعادة هذه الخطة؟',
    estDone: 'الإنهاء المتوقع',
  },
};

const DAY_PRESETS = [7, 10, 15, 30, 60, 90];

interface Props { onClose: () => void; }

export function KhatmahScreen({ onClose }: Props) {
  useScrollLock();
  const { settings, updateSetting } = useSettings();
  const lang = settings.language || 'es';
  const loc = lang === 'ar' ? 'ar-SA' : lang;
  const t = T[lang] || T.en;

  const active = settings.khatmahActive;
  const totalDays = settings.khatmahTotalDays || 30;
  const pagesRead = settings.khatmahPagesRead || 0;
  const pagesPerDay = Math.ceil(QURAN_PAGES / totalDays);

  // Days elapsed since the plan started (inclusive of today).
  const daysElapsed = (() => {
    if (!settings.khatmahStartDate) return 1;
    const start = new Date(settings.khatmahStartDate + 'T00:00:00');
    const today = new Date(localDateKey() + 'T00:00:00');
    return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
  })();

  const expectedByNow = Math.min(QURAN_PAGES, daysElapsed * pagesPerDay);
  const diff = pagesRead - expectedByNow; // + ahead, - behind
  const pct = Math.round((pagesRead / QURAN_PAGES) * 100);
  const remaining = QURAN_PAGES - pagesRead;
  const isComplete = pagesRead >= QURAN_PAGES;

  // Today's target page range (next unread pages, capped at the plan's daily amount).
  const todayStart = pagesRead + 1;
  const todayEnd = Math.min(QURAN_PAGES, pagesRead + pagesPerDay);

  // Estimated finish at current pace.
  const estDoneDate = (() => {
    const pace = pagesRead > 0 ? pagesRead / daysElapsed : pagesPerDay;
    const daysLeft = Math.ceil(remaining / Math.max(1, pace));
    const d = new Date();
    d.setDate(d.getDate() + daysLeft);
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const startPlan = (days: number) => {
    updateSetting('khatmahTotalDays', days);
    updateSetting('khatmahStartDate', localDateKey());
    updateSetting('khatmahStartPage', 1);
    updateSetting('khatmahPagesRead', 0);
    updateSetting('khatmahActive', true);
  };

  const markTodayRead = () => {
    updateSetting('khatmahPagesRead', Math.min(QURAN_PAGES, todayEnd));
  };

  const resetPlan = () => {
    if (!window.confirm(t.resetConfirm)) return;
    updateSetting('khatmahActive', false);
    updateSetting('khatmahPagesRead', 0);
    updateSetting('khatmahStartDate', '');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-[#011410]/95 backdrop-blur-xl overflow-y-auto app-scroll text-[#F3F4F6]"
    >
      <div className="max-w-lg mx-auto px-5 pt-safe pb-12">
        <div className="flex items-center justify-between mb-6 pt-2">
          <div>
            <h1 className="text-xl font-bold text-[#FCD34D]">{t.title}</h1>
            <p className="text-[10px] text-[#A7F3D0]/60 uppercase tracking-widest font-semibold mt-0.5">{t.sub}</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-full text-[#A7F3D0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {!active ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-[#FCD34D]/15 border border-[#FCD34D]/30 flex items-center justify-center mb-4">
              <BookOpen size={26} className="text-[#FCD34D]" />
            </div>
            <p className="text-sm text-[#A7F3D0]/85 leading-relaxed mb-5">{t.start} — {QURAN_PAGES} {t.pages}.</p>
            <div className="grid grid-cols-3 gap-2.5">
              {DAY_PRESETS.map((d) => (
                <button
                  key={d}
                  onClick={() => startPlan(d)}
                  className="py-4 rounded-2xl bg-black/20 border border-white/10 hover:border-[#FCD34D]/40 hover:bg-[#FCD34D]/5 transition-all active:scale-95 flex flex-col items-center"
                >
                  <span className="text-2xl font-black text-white tabular-nums">{d}</span>
                  <span className="text-[9px] text-[#A7F3D0]/60 font-bold uppercase tracking-wider">{t.days}</span>
                  <span className="text-[9px] text-[#FCD34D]/70 font-mono mt-1">{Math.ceil(QURAN_PAGES / d)} {t.perDay}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Progress ring/bar */}
            <div className="bg-gradient-to-br from-[#FCD34D]/12 via-[#059669]/10 to-transparent border border-[#FCD34D]/25 rounded-[2rem] p-6 mb-5 shadow-2xl">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-5xl font-black text-white tabular-nums leading-none">{pct}%</div>
                  <p className="text-xs text-[#A7F3D0] font-bold uppercase tracking-widest mt-1.5">{t.progress}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white tabular-nums">{pagesRead} / {QURAN_PAGES}</p>
                  <p className="text-[10px] text-[#A7F3D0]/60">{remaining} {t.remaining}</p>
                </div>
              </div>
              <div className="h-3 rounded-full bg-black/30 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#059669] to-[#FCD34D] transition-all" style={{ width: `${pct}%` }} />
              </div>
              {!isComplete && (
                <div className="flex items-center justify-between mt-3 text-[10px] font-bold">
                  <span className={diff >= 0 ? 'text-emerald-300' : 'text-amber-300'}>
                    {diff === 0 ? t.onTrack : diff > 0 ? `+${diff} ${t.ahead}` : `${-diff} ${t.behind}`}
                  </span>
                  <span className="text-[#A7F3D0]/50">{t.estDone}: {estDoneDate}</span>
                </div>
              )}
            </div>

            {isComplete ? (
              <div className="bg-[#059669]/15 border border-[#059669]/30 rounded-3xl p-6 text-center mb-5">
                <Check size={32} className="text-emerald-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-white">{t.complete}</p>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 mb-5 shadow-xl">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest opacity-70 mb-3">{t.todayGoal}</h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-3xl font-black text-[#FCD34D] tabular-nums leading-none">
                      {t.pages} {todayStart}–{todayEnd}
                    </p>
                    <p className="text-[11px] text-[#A7F3D0]/60 mt-1.5">{todayEnd - todayStart + 1} {t.perDay.replace('/day', '').replace('/día', '').replace('/يوم', '')}</p>
                  </div>
                </div>
                <button
                  onClick={markTodayRead}
                  className="w-full py-3.5 rounded-2xl bg-[#059669] text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
                >
                  <Check size={17} strokeWidth={3} /> {t.read}
                </button>
              </div>
            )}

            {/* Reminder toggle */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 mb-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.khatmahReminder ? <Bell size={18} className="text-[#FCD34D]" /> : <BellOff size={18} className="text-[#A7F3D0]/50" />}
                  <span className="text-sm font-bold text-white">{t.reminder}</span>
                </div>
                <button
                  onClick={() => updateSetting('khatmahReminder', !settings.khatmahReminder)}
                  className={`w-12 h-7 rounded-full transition-all relative ${settings.khatmahReminder ? 'bg-[#059669]' : 'bg-white/15'}`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.khatmahReminder ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              {settings.khatmahReminder && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs text-[#A7F3D0]/70">{t.reminderAt}</span>
                  <select
                    value={settings.khatmahReminderHour}
                    onChange={(e) => updateSetting('khatmahReminderHour', parseInt(e.target.value))}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-bold text-white"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={resetPlan}
              className="w-full py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-[#A7F3D0]/60 text-xs font-bold flex items-center justify-center gap-2 hover:text-red-300 hover:border-red-500/30 transition-all"
            >
              <RotateCcw size={14} /> {t.reset}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
