import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Moon } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useScrollLock } from '../utils/useScrollLock';

const COLS: Record<string, Record<string, string>> = {
  en: { title: 'Monthly Timetable', day: 'Day', Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha', qiyam: 'Tahajjud (last third)', empty: 'Open the Home tab once while online to load this month.' },
  es: { title: 'Horario Mensual', day: 'Día', Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha', qiyam: 'Tahajjud (último tercio)', empty: 'Abre la pestaña Inicio con conexión para cargar el mes.' },
  ar: { title: 'الجدول الشهري', day: 'اليوم', Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء', qiyam: 'التهجد (الثلث الأخير)', empty: 'افتح الصفحة الرئيسية متصلاً بالإنترنت لتحميل الشهر.' },
};

function clean(t?: string) {
  return (t || '').replace(/ \(.*?\)/, '').trim();
}

interface Props {
  onClose: () => void;
}

export function MonthlyTimetableScreen({ onClose }: Props) {
  useScrollLock();
  const { settings } = useSettings();
  const lang = settings.language || 'es';
  const c = COLS[lang] || COLS.en;
  const loc = lang === 'ar' ? 'ar-SA' : lang;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayDay = now.getDate();

  const monthData = useMemo<any[]>(() => {
    const suffix = `_${year}_${month}_`;
    const key = Object.keys(localStorage).find(k => k.startsWith('monthly_prayers_') && k.includes(suffix));
    if (!key) return [];
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }, [year, month]);

  const monthName = now.toLocaleDateString(loc, { month: 'long', year: 'numeric' });
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-[#011410]/95 backdrop-blur-xl overflow-y-auto app-scroll text-[#F3F4F6]"
    >
      <div className="max-w-2xl mx-auto px-4 pt-safe pb-12">
        <div className="flex items-center justify-between mb-2 pt-2 px-1">
          <div>
            <h1 className="text-xl font-bold text-[#FCD34D]">{c.title}</h1>
            <p className="text-[11px] text-[#A7F3D0]/70 capitalize mt-0.5">{monthName}</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-full text-[#A7F3D0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {monthData.length === 0 ? (
          <p className="text-center text-sm text-[#A7F3D0]/60 py-20 px-8 leading-relaxed">{c.empty}</p>
        ) : (
          <div className="mt-3 bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="grid grid-cols-6 gap-0 bg-white/[0.04] border-b border-white/10 px-2 py-2.5">
              <span className="text-[9px] font-black text-[#FCD34D] uppercase tracking-wider text-center">{c.day}</span>
              {prayers.map(p => (
                <span key={p} className="text-[9px] font-black text-[#A7F3D0]/70 uppercase tracking-wider text-center">{c[p]}</span>
              ))}
            </div>
            {/* Rows */}
            <div className="divide-y divide-white/5">
              {monthData.map((d: any) => {
                const gDay = parseInt(d?.date?.gregorian?.day);
                const isToday = gDay === todayDay;
                const wd = new Date(year, month - 1, gDay).toLocaleDateString(loc, { weekday: 'short' });
                return (
                  <div key={gDay} className={`grid grid-cols-6 gap-0 px-2 py-2 items-center ${isToday ? 'bg-[#059669]/20' : ''}`}>
                    <div className="text-center">
                      <div className={`text-xs font-bold ${isToday ? 'text-[#FCD34D]' : 'text-white'}`}>{gDay}</div>
                      <div className="text-[8px] text-[#A7F3D0]/50 uppercase">{wd}</div>
                    </div>
                    {prayers.map(p => (
                      <span key={p} className={`text-[10px] font-mono text-center tabular-nums ${isToday ? 'text-white font-bold' : 'text-[#A7F3D0]/85'}`}>
                        {clean(d?.timings?.[p])}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
            {/* Tahajjud note (last third) for today */}
            {(() => {
              const today = monthData.find((d: any) => parseInt(d?.date?.gregorian?.day) === todayDay);
              const lastThird = clean(today?.timings?.Lastthird);
              if (!lastThird) return null;
              return (
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-t border-white/10">
                  <span className="text-[10px] font-bold text-[#A7F3D0]/70 uppercase tracking-wider flex items-center gap-1.5">
                    <Moon size={12} className="text-[#FCD34D]" /> {c.qiyam}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#FCD34D] tabular-nums">{lastThird}</span>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </motion.div>
  );
}
