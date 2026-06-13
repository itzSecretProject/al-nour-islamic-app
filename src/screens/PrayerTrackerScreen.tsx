import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, Check, Star, ChevronLeft, ChevronRight, Pencil, Download, Share2, RotateCcw } from 'lucide-react';
import { shareStreakCard } from '../utils/shareCard';
import { useSettings } from '../hooks/useSettings';
import { isAccountable } from '../context/SettingsContext';
import {
  useSalahTracker,
  OBLIGATORY_PRAYERS,
  ObligatoryPrayer,
  localDateKey,
  exportSalahLogCSV,
} from '../context/SalahTrackerContext';
import { useScrollLock } from '../utils/useScrollLock';

const PRAYER_LABELS: Record<string, Record<string, string>> = {
  en: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  es: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  ar: { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
};

const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Prayer Tracker', streak: 'Day streak', today: "Today's prayers",
    monthRate: 'completed', tap: 'Tap to log', kidStreak: 'Days you prayed',
    encAdult: 'Salah is an obligation before Allah — what is missed is made up, never lost.',
    encChild: 'Every prayer is a beautiful step. No pressure — you are learning!',
    history: 'History', editDay: 'Edit day', tapDay: 'Tap any day to log or fix it', back: 'Today',
    qadaTitle: 'Pending to make up (qada)', qadaDesc: 'Missed prayers are a debt before Allah — make them up when you can.',
    qadaDone: 'I made one up', qadaNone: 'Nothing pending to make up — ma sha Allah.',
    byPrayer: 'This month by prayer',
  },
  es: {
    title: 'Registro de Rezos', streak: 'Días seguidos', today: 'Rezos de hoy',
    monthRate: 'completados', tap: 'Toca para registrar', kidStreak: 'Días que rezaste',
    encAdult: 'El rezo es una obligación ante Allah — lo perdido se recupera, nunca se pierde.',
    encChild: 'Cada rezo es un paso precioso. Sin presión, ¡estás aprendiendo!',
    history: 'Historial', editDay: 'Editar día', tapDay: 'Toca cualquier día para registrarlo o corregirlo', back: 'Hoy',
    qadaTitle: 'Pendientes de recuperar (qada)', qadaDesc: 'Los rezos perdidos son una deuda ante Allah — recupéralos cuando puedas.',
    qadaDone: 'He recuperado uno', qadaNone: 'Nada pendiente de recuperar — ma sha Allah.',
    byPrayer: 'Este mes por rezo',
  },
  ar: {
    title: 'سجل الصلاة', streak: 'أيام متتالية', today: 'صلوات اليوم',
    monthRate: 'مكتملة', tap: 'اضغط للتسجيل', kidStreak: 'أيام صليت فيها',
    encAdult: 'الصلاة فرض أمام الله — ما فات يُقضى ولا يضيع.',
    encChild: 'كل صلاة خطوة جميلة. بلا ضغط، أنت تتعلم!',
    history: 'السجل', editDay: 'تعديل اليوم', tapDay: 'اضغط أي يوم لتسجيله أو تصحيحه', back: 'اليوم',
    qadaTitle: 'صلوات للقضاء', qadaDesc: 'الصلوات الفائتة دين أمام الله — اقضها متى استطعت.',
    qadaDone: 'قضيت واحدة', qadaNone: 'لا شيء للقضاء — ما شاء الله.',
    byPrayer: 'هذا الشهر حسب الصلاة',
  },
};

const QADA_KEY = 'qada_recovered_v1';

interface Props {
  onClose: () => void;
}

export function PrayerTrackerScreen({ onClose }: Props) {
  useScrollLock();
  const { settings } = useSettings();
  const { today, todayKey, setStatus, streak, log } = useSalahTracker();
  const lang = settings.language || 'es';
  const loc = lang === 'ar' ? 'ar-SA' : lang;
  const t = T[lang] || T.en;
  const pl = PRAYER_LABELS[lang] || PRAYER_LABELS.en;
  const accountable = isAccountable(settings.age);
  const isKid = !accountable;

  const now = new Date();
  const [view, setView] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ── Qada: missed prayers are an obligation to make up, not a "lost game" ──
  const [qadaRecovered, setQadaRecovered] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(QADA_KEY) || '0', 10) || 0; } catch { return 0; }
  });
  let totalMissed = 0;
  for (const day of Object.values(log)) {
    totalMissed += OBLIGATORY_PRAYERS.filter(p => (day as any)[p] === 'missed').length;
  }
  const qadaPending = Math.max(0, totalMissed - qadaRecovered);
  const recoverOne = () => {
    const next = Math.min(totalMissed, qadaRecovered + 1);
    setQadaRecovered(next);
    try { localStorage.setItem(QADA_KEY, String(next)); } catch {}
  };

  const cycle = (date: string, prayer: ObligatoryPrayer) => {
    const cur = log[date]?.[prayer];
    if (isKid) {
      setStatus(date, prayer, cur === 'prayed' ? null : 'prayed');
    } else {
      setStatus(date, prayer, cur === undefined ? 'prayed' : cur === 'prayed' ? 'missed' : null);
    }
  };

  // ---- Calendar for the viewed month ----
  const firstWeekday = new Date(view.y, view.m, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 0, 1 + i).toLocaleDateString(loc, { weekday: 'narrow' })
  );
  const monthTitle = new Date(view.y, view.m, 1).toLocaleDateString(loc, { month: 'long', year: 'numeric' });
  const isCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  // Month completion % + per-prayer breakdown (spot the weakest prayer, e.g. Fajr)
  let mPrayed = 0, mTotal = 0;
  const perPrayer: Record<ObligatoryPrayer, { prayed: number; total: number }> =
    Object.fromEntries(OBLIGATORY_PRAYERS.map(p => [p, { prayed: 0, total: 0 }])) as any;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = localDateKey(new Date(view.y, view.m, d));
    const day = log[key];
    if (!day) continue;
    for (const p of OBLIGATORY_PRAYERS) {
      if (day[p] === 'prayed') { mPrayed++; mTotal++; perPrayer[p].prayed++; perPrayer[p].total++; }
      else if (day[p] === 'missed') { mTotal++; perPrayer[p].total++; }
    }
  }
  const pct = mTotal > 0 ? Math.round((mPrayed / mTotal) * 100) : 0;

  const prevMonth = () => setView(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () => {
    if (isCurrentMonth) return; // don't go into the future
    setView(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  };

  const editorStatuses = selectedDay ? (log[selectedDay] || {}) : {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-[#011410]/95 backdrop-blur-xl overflow-y-auto app-scroll text-[#F3F4F6]"
    >
      <div className="max-w-lg mx-auto px-5 pt-safe pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <h1 className="text-xl font-bold text-[#FCD34D]">{t.title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSalahLogCSV(log)}
              title={lang === 'es' ? 'Exportar CSV' : lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              className="p-2.5 bg-white/5 border border-white/10 rounded-full text-[#A7F3D0] hover:text-[#FCD34D] transition-colors"
            >
              <Download size={16} />
            </button>
            <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-full text-[#A7F3D0] hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Streak hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#FCD34D]/15 via-[#059669]/10 to-transparent border border-[#FCD34D]/25 rounded-[2rem] p-6 mb-5 shadow-2xl">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#FCD34D]/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-4 relative">
            <div className="w-16 h-16 rounded-2xl bg-[#FCD34D]/15 border border-[#FCD34D]/30 flex items-center justify-center shrink-0">
              {isKid ? <Star size={30} className="text-[#FCD34D] fill-[#FCD34D]/40" /> : <Flame size={30} className="text-[#FCD34D]" />}
            </div>
            <div className="flex-1">
              <div className="text-5xl font-black text-white tabular-nums leading-none">{streak}</div>
              <p className="text-xs text-[#A7F3D0] font-bold uppercase tracking-widest mt-1.5">{isKid ? t.kidStreak : t.streak}</p>
            </div>
            {streak > 0 && (
              <button
                onClick={() => shareStreakCard(streak, lang)}
                className="p-3 rounded-2xl bg-[#FCD34D]/15 border border-[#FCD34D]/30 text-[#FCD34D] active:scale-90 transition-all shrink-0"
                title="Share"
              >
                <Share2 size={18} />
              </button>
            )}
          </div>
          <p className="text-xs text-[#A7F3D0]/80 leading-relaxed mt-4 relative">{isKid ? t.encChild : t.encAdult}</p>
        </div>

        {/* Qada — obligation framing for accountable users: missed = to make up, not "failed" */}
        {accountable && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 mb-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                  qadaPending > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#059669]/15 border-[#059669]/30'}`}>
                  <RotateCcw size={18} className={qadaPending > 0 ? 'text-amber-300' : 'text-emerald-300'} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t.qadaTitle}</p>
                  <p className="text-[10px] text-[#A7F3D0]/60 mt-0.5 leading-relaxed max-w-[200px]">
                    {qadaPending > 0 ? t.qadaDesc : t.qadaNone}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-2xl font-black tabular-nums ${qadaPending > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {qadaPending}
                </span>
                {qadaPending > 0 && (
                  <button
                    onClick={recoverOne}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#059669] text-white active:scale-95 transition-all"
                  >
                    {t.qadaDone}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Today quick row */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 mb-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest opacity-70">{t.today}</h3>
            <span className="text-[10px] text-[#A7F3D0]/50">{t.tap}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {OBLIGATORY_PRAYERS.map((p) => {
              const st = today[p];
              return (
                <button key={p} onClick={() => cycle(todayKey, p)} className="flex flex-col items-center gap-2 group">
                  <div className={`w-full aspect-square rounded-2xl border flex items-center justify-center transition-all active:scale-90 ${
                    st === 'prayed' ? 'bg-[#059669] border-[#10B981] shadow-lg shadow-[#059669]/25'
                    : st === 'missed' ? 'bg-red-500/15 border-red-500/40'
                    : 'bg-white/[0.02] border-white/10 group-hover:border-white/25'}`}>
                    {st === 'prayed' ? <Check size={20} className="text-white" strokeWidth={3} />
                      : st === 'missed' ? <X size={18} className="text-red-300" strokeWidth={3} />
                      : <div className="w-2 h-2 rounded-full bg-white/20" />}
                  </div>
                  <span className={`text-[9px] font-bold ${st === 'prayed' ? 'text-[#FCD34D]' : 'text-[#A7F3D0]/70'}`}>{pl[p]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* History calendar */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest opacity-70">{t.history}</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FCD34D]">
              <span className="tabular-nums">{pct}%</span>
              <span className="text-[#A7F3D0]/50 font-normal">{t.monthRate}</span>
            </div>
          </div>

          {/* Month navigator */}
          <div className="flex items-center justify-between my-3">
            <button onClick={prevMonth} className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#A7F3D0] hover:text-white active:scale-90 transition-all">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-white capitalize">{monthTitle}</span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#A7F3D0] hover:text-white active:scale-90 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Per-prayer completion bars for the viewed month */}
          {mTotal > 0 && (
            <div className="mb-4 space-y-1.5">
              <p className="text-[9px] font-bold text-[#A7F3D0]/40 uppercase tracking-widest mb-2">{t.byPrayer}</p>
              {OBLIGATORY_PRAYERS.map((p) => {
                const s = perPrayer[p];
                const ppc = s.total > 0 ? Math.round((s.prayed / s.total) * 100) : 0;
                return (
                  <div key={p} className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-[#A7F3D0]/70 w-14 shrink-0">{pl[p]}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${ppc >= 80 ? 'bg-[#059669]' : ppc >= 50 ? 'bg-[#FCD34D]/70' : 'bg-amber-600/70'}`}
                        style={{ width: `${ppc}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-[#A7F3D0]/50 w-8 text-right tabular-nums">{s.total > 0 ? `${ppc}%` : '—'}</span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-[#A7F3D0]/40 text-center mb-3">{t.tapDay}</p>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {weekdayNames.map((w, i) => (
              <span key={i} className="text-[9px] font-bold text-[#A7F3D0]/40 text-center uppercase">{w}</span>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const date = new Date(view.y, view.m, d);
              const key = localDateKey(date);
              const day = log[key] || {};
              const prayed = OBLIGATORY_PRAYERS.filter(p => day[p] === 'prayed').length;
              const missed = OBLIGATORY_PRAYERS.filter(p => day[p] === 'missed').length;
              const isFuture = date > now && key !== todayKey;
              const isToday = key === todayKey;
              const full = prayed === 5;
              return (
                <button
                  key={key}
                  disabled={isFuture}
                  onClick={() => setSelectedDay(selectedDay === key ? null : key)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center border text-[11px] font-bold transition-all active:scale-90 disabled:opacity-20 ${
                    selectedDay === key ? 'border-[#FCD34D] bg-[#FCD34D]/10'
                    : full ? 'bg-[#059669] border-[#10B981] text-white'
                    : prayed > 0 ? 'bg-[#059669]/25 border-[#059669]/40 text-white'
                    : missed > 0 ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : isToday ? 'border-[#FCD34D]/40 bg-white/[0.03] text-white'
                    : 'border-white/8 bg-white/[0.02] text-[#A7F3D0]/70'}`}
                >
                  <span>{d}</span>
                  {prayed > 0 && !full && <span className="text-[7px] font-mono opacity-80 leading-none">{prayed}/5</span>}
                </button>
              );
            })}
          </div>

          {/* Day editor */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Pencil size={13} className="text-[#FCD34D]" />
                    <span className="text-xs font-bold text-white">
                      {t.editDay}: {new Date(selectedDay + 'T00:00:00').toLocaleDateString(loc, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {OBLIGATORY_PRAYERS.map((p) => {
                      const st = editorStatuses[p];
                      return (
                        <button key={p} onClick={() => cycle(selectedDay, p)} className="flex flex-col items-center gap-1.5 group">
                          <div className={`w-full aspect-square rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                            st === 'prayed' ? 'bg-[#059669] border-[#10B981]'
                            : st === 'missed' ? 'bg-red-500/15 border-red-500/40'
                            : 'bg-white/[0.02] border-white/10 group-hover:border-white/25'}`}>
                            {st === 'prayed' ? <Check size={14} className="text-white" strokeWidth={3} />
                              : st === 'missed' ? <X size={12} className="text-red-300" strokeWidth={3} />
                              : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                          </div>
                          <span className="text-[8px] font-bold text-[#A7F3D0]/60">{pl[p]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
