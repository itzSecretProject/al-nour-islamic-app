import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Bell, BellOff, X } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { translations } from '../utils/translations';
import { getIslamicDayInfo, IslamicSpecialDay } from '../utils/islamicDays';

// Tabular Islamic Calendar algorithm (Gregorian to Hijri offline conversion)
export function g2h(gYear: number, gMonth: number, gDay: number): { day: number; month: number; year: number } {
  let m = gMonth;
  let y = gYear;
  if (m < 3) {
    y -= 1;
    m += 12;
  }
  let a = Math.floor(y / 100);
  let b = 2 - a + Math.floor(a / 4);
  let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + gDay + b - 1524.5;
  
  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  let z = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - z) / 15) * Math.floor((17719 * z) / 50) - Math.floor(z / 2) * Math.floor((15238 * z) / 43) + 29;
  
  let hMonth = Math.floor((24 * l) / 709);
  let hDay = l - Math.floor((709 * hMonth) / 24);
  let hYear = 30 * n + z - 30;
  
  return { day: hDay, month: hMonth, year: hYear };
}

const HIJRI_MONTHS = {
  es: ["", "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban", "Ramadán", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"],
  en: ["", "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"]
};

const GREGORIAN_MONTHS = {
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};

interface HijriCalendarScreenProps {
  onClose: () => void;
}

export function HijriCalendarScreen({ onClose }: HijriCalendarScreenProps) {
  const { settings, updateSetting } = useSettings();
  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;

  // Calendar Year and Month states
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth(); // 0-11

  // Day selection state (default to today's date if selected month matches)
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
  const [selectedDay, setSelectedDay] = useState<number>(isCurrentMonth ? today.getDate() : 1);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, monthIndex - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, monthIndex + 1, 1));
    setSelectedDay(1);
  };

  // Calendar Calculations
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 = Sunday, 1 = Monday
  // Align Sunday first: padding cells equal firstDayOfWeek
  // If we align Monday first: padding = (firstDayOfWeek + 6) % 7
  const paddingCells = (firstDayOfWeek + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Selected Day Details
  const selectedHijri = g2h(year, monthIndex + 1, selectedDay);
  const selectedSpecialDayInfo = getIslamicDayInfo(selectedHijri.day, selectedHijri.month);
  
  const getFastingReason = (d: number, m: number, gregDayIndex: number) => {
    if (m === 9) return null; // Ramadan (obligatory, handled separately)
    
    // Day of Arafah
    if (m === 12 && d === 9) {
      return lang === 'es' ? 'Día de Arafah (Ayuno muy recomendado)' : 'Day of Arafah (Highly recommended)';
    }
    // Ashura & Tasua
    if (m === 1 && d === 9) {
      return lang === 'es' ? 'Día de Tasu\'a (Ayuno recomendado)' : 'Day of Tasu\'a (Recommended)';
    }
    if (m === 1 && d === 10) {
      return lang === 'es' ? 'Día de Ashura (Ayuno muy recomendado)' : 'Day of Ashura (Highly recommended)';
    }
    // Ayyam al-Bidh (White Days - 13, 14, 15 except 13th of Dhul-Hijjah)
    if ((d === 13 || d === 14 || d === 15) && !(m === 12 && d === 13)) {
      return lang === 'es' ? 'Día Blanco (Ayuno recomendado)' : 'White Day (Recommended)';
    }
    // Mondays and Thursdays
    if (gregDayIndex === 1) { // Monday
      return lang === 'es' ? 'Lunes (Ayuno de Sunnah)' : 'Monday (Sunnah Fast)';
    }
    if (gregDayIndex === 4) { // Thursday
      return lang === 'es' ? 'Jueves (Ayuno de Sunnah)' : 'Thursday (Sunnah Fast)';
    }
    return null;
  };

  const selectedDayOfWeek = new Date(year, monthIndex, selectedDay).getDay();
  const selectedFastingReason = getFastingReason(selectedHijri.day, selectedHijri.month, selectedDayOfWeek);

  // Month Display Header info
  const startHijri = g2h(year, monthIndex + 1, 1);
  const endHijri = g2h(year, monthIndex + 1, daysInMonth);
  const monthLabelAr = startHijri.month === endHijri.month
    ? (HIJRI_MONTHS[lang === 'es' ? 'es' : 'en'][startHijri.month])
    : `${HIJRI_MONTHS[lang === 'es' ? 'es' : 'en'][startHijri.month]} - ${HIJRI_MONTHS[lang === 'es' ? 'es' : 'en'][endHijri.month]}`;
  
  const yearLabelAr = startHijri.year === endHijri.year ? `${startHijri.year} AH` : `${startHijri.year}-${endHijri.year} AH`;

  const weekdays = lang === 'es' 
    ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="fixed inset-0 z-40 bg-[#022C22] text-[#F3F4F6] overflow-y-auto px-5 pt-12 pb-12 flex flex-col justify-start">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#022C22] to-[#011410] -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#FCD34D] tracking-tight">
              {lang === 'es' ? 'Calendario Hégira' : 'Hijri Calendar'}
            </h1>
            <p className="text-[9px] text-[#A7F3D0] uppercase tracking-widest font-semibold opacity-75 mt-0.5">
              {monthLabelAr} • {yearLabelAr}
            </p>
          </div>
        </div>

        {/* Global Notifications Shortcut */}
        <button
          onClick={() => updateSetting('fastingReminders', !settings.fastingReminders)}
          className={`p-2.5 border rounded-full transition-all active:scale-95 flex items-center justify-center ${
            settings.fastingReminders 
              ? 'bg-[#059669]/20 border-[#059669] text-white' 
              : 'bg-white/5 border-white/10 text-white/50'
          }`}
          title={t.fastingRemindersOpt}
        >
          {settings.fastingReminders ? <Bell size={16} /> : <BellOff size={16} />}
        </button>
      </div>

      {/* Month Navigation Control */}
      <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl p-2 mb-4 shrink-0">
        <button
          onClick={handlePrevMonth}
          className="p-2 bg-black/20 hover:bg-black/40 text-[#A7F3D0] rounded-xl transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-white uppercase tracking-wider font-sans">
          {(GREGORIAN_MONTHS[lang === 'es' ? 'es' : 'en'] as any)[monthIndex]} {year}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-2 bg-black/20 hover:bg-black/40 text-[#A7F3D0] rounded-xl transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekdays Labels Header */}
      <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5 shrink-0">
        {weekdays.map((day) => (
          <span key={day} className="text-[10px] uppercase font-bold text-[#A7F3D0]/65 tracking-wider font-sans">
            {day}
          </span>
        ))}
      </div>

      {/* Calendar Grid Cells */}
      <div className="grid grid-cols-7 gap-1.5 mb-6 shrink-0">
        {/* Padding spacer cells */}
        {Array.from({ length: paddingCells }).map((_, idx) => (
          <div key={`pad-${idx}`} className="aspect-square opacity-0 pointer-events-none" />
        ))}

        {/* Gregorian days cells */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const isSelected = selectedDay === dayNum;
          
          // Check if matches today
          const isToday = isCurrentMonth && today.getDate() === dayNum;
          
          // Convert to Hijri
          const dayHijri = g2h(year, monthIndex + 1, dayNum);
          
          // Check day of week
          const dayOfWeekIndex = new Date(year, monthIndex, dayNum).getDay();
          
          // Check events & fasts
          const fastReason = getFastingReason(dayHijri.day, dayHijri.month, dayOfWeekIndex);
          const hasSpecialEvent = getIslamicDayInfo(dayHijri.day, dayHijri.month).today !== null;

          return (
            <button
              key={dayNum}
              onClick={() => setSelectedDay(dayNum)}
              className={`aspect-square rounded-2xl border text-left p-1.5 flex flex-col justify-between relative transition-all active:scale-95 ${
                isSelected
                  ? 'bg-[#059669] border-[#10B981] text-white shadow-lg shadow-[#059669]/15'
                  : isToday
                  ? 'bg-[#059669]/15 border-[#059669] text-white'
                  : fastReason
                  ? 'bg-[#FCD34D]/5 border-[#FCD34D]/25 hover:border-[#FCD34D]/45 text-white'
                  : hasSpecialEvent
                  ? 'bg-[#3B82F6]/5 border-[#3B82F6]/25 hover:border-[#3B82F6]/45 text-white'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-white/90'
              }`}
            >
              {/* Gregorian Day (Top Left) */}
              <span className={`text-[11px] font-mono leading-none ${isSelected ? 'font-black' : 'font-semibold'}`}>
                {dayNum}
              </span>

              {/* Hijri Day (Bottom Right) */}
              <span className={`text-[9px] font-mono self-end leading-none ${
                isSelected ? 'text-[#FCD34D] font-bold' : fastReason ? 'text-[#FCD34D]' : 'text-[#A7F3D0]/60'
              }`}>
                {dayHijri.day}
              </span>

              {/* Highlight status markers */}
              {fastReason && !isSelected && (
                <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#FCD34D] animate-pulse" />
              )}
              {hasSpecialEvent && !isSelected && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Details Panel */}
      <div className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl space-y-4 text-left">
        <div className="border-b border-white/5 pb-3">
          <span className="text-[9px] text-[#A7F3D0] uppercase tracking-widest font-bold">
            {lang === 'es' ? 'Fecha Seleccionada' : 'Selected Date'}
          </span>
          <h3 className="font-bold text-white text-base mt-0.5">
            {selectedDay} {(GREGORIAN_MONTHS[lang === 'es' ? 'es' : 'en'] as any)[monthIndex]} {year}
          </h3>
          <p className="text-xs text-[#FCD34D] font-medium mt-0.5">
            {selectedHijri.day} de {HIJRI_MONTHS[lang === 'es' ? 'es' : 'en'][selectedHijri.month]} {selectedHijri.year} AH
          </p>
        </div>

        {/* Ramadan note */}
        {selectedHijri.month === 9 && (
          <div className="bg-[#059669]/15 border border-[#059669]/30 rounded-2xl p-4 flex gap-3 items-start">
            <span className="text-xl">🌙</span>
            <div>
              <h4 className="text-xs font-bold text-white">
                {lang === 'es' ? 'Mes Sagrado de Ramadán' : 'Holy Month of Ramadan'}
              </h4>
              <p className="text-[10px] text-[#A7F3D0]/80 mt-1 leading-relaxed">
                {lang === 'es' 
                  ? 'El ayuno diario es obligatorio para todos los musulmanes adultos sanos durante este mes bendito.'
                  : 'Daily fasting is obligatory for all healthy adult Muslims throughout this blessed month.'}
              </p>
            </div>
          </div>
        )}

        {/* Fasting Alert */}
        {selectedFastingReason && (
          <div className="bg-[#FCD34D]/5 border border-[#FCD34D]/25 rounded-2xl p-4 flex gap-3 items-start">
            <span className="text-xl">🗓️</span>
            <div>
              <h4 className="text-xs font-bold text-[#FCD34D]">
                {lang === 'es' ? 'Ayuno Recomendado (Sunnah)' : 'Recommended Fasting (Sunnah)'}
              </h4>
              <p className="text-[10px] text-white/80 mt-1 font-medium leading-normal">
                {selectedFastingReason}
              </p>
              <p className="text-[9px] text-[#A7F3D0]/65 mt-1.5 leading-relaxed">
                {selectedHijri.day === 13 || selectedHijri.day === 14 || selectedHijri.day === 15
                  ? (lang === 'es' 
                      ? 'El Profeta ﷺ solía ayunar en los Días Blancos (13, 14 y 15 de cada mes lunar) equiparándolo al ayuno continuo.'
                      : 'The Prophet ﷺ used to fast on the White Days (13th, 14th, and 15th of each lunar month), comparing it to continuous fasting.')
                  : (lang === 'es'
                      ? 'El ayuno de lunes y jueves es una práctica establecida de la Sunnah del Profeta Muhammad ﷺ.'
                      : 'Fasting on Mondays and Thursdays is a well-established practice from the Sunnah of the Prophet Muhammad ﷺ.')}
              </p>
            </div>
          </div>
        )}

        {/* Historical Hijri Special Events */}
        {selectedSpecialDayInfo.today && (
          <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/25 rounded-2xl p-4 flex gap-3 items-start">
            <span className="text-2xl">{selectedSpecialDayInfo.today.emoji}</span>
            <div className="flex-1">
              <span className="text-[8px] bg-[#3B82F6] text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {lang === 'es' ? 'Festividad Hégira' : 'Hijri Event'}
              </span>
              <h4 className="text-xs font-bold text-white mt-1.5">
                {selectedSpecialDayInfo.today.name}
              </h4>
              <p className="text-[10px] text-[#3B82F6] font-arabic mt-0.5">{selectedSpecialDayInfo.today.nameAr}</p>
              <p className="text-[10px] text-white/80 mt-2 leading-relaxed font-light">
                {selectedSpecialDayInfo.today.description}
              </p>
              
              {selectedSpecialDayInfo.today.recommendation && (
                <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
                  <span className="text-[9px] font-bold text-[#A7F3D0] uppercase tracking-widest block">
                    {lang === 'es' ? 'Práctica Recomendada' : 'Recommended Action'}
                  </span>
                  <p className="text-[10px] text-[#A7F3D0] italic leading-normal">
                    {selectedSpecialDayInfo.today.recommendation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No special events fallback */}
        {!selectedFastingReason && !selectedSpecialDayInfo.today && selectedHijri.month !== 9 && (
          <div className="text-center py-8 opacity-40">
            <Info size={24} className="mx-auto text-[#A7F3D0] mb-2" />
            <p className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-bold">
              {lang === 'es' ? 'Sin Eventos Especiales' : 'No Special Events'}
            </p>
            <p className="text-[9px] text-white mt-1 leading-normal max-w-[200px] mx-auto">
              {lang === 'es' 
                ? 'No hay ayunos recomendados ni festividades históricas en este día.' 
                : 'There are no voluntary fasts or historical events on this day.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
