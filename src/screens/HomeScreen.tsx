import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { usePrayerData } from '../context/PrayerContext';
import { useSettings } from '../hooks/useSettings';
import { translations } from '../utils/translations';
import { MapPin, Loader2, X, Sparkles, BookOpen, Calendar, Compass, Bell, BellOff, Award, Flame, Star, Check, ChevronRight, Brain, Sun, Moon, Users, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getIslamicDayInfo } from '../utils/islamicDays';
import { dailyDuas } from '../data/duas';
import { NamesOfAllahScreen } from './NamesOfAllahScreen';
import { HijriCalendarScreen } from './HijriCalendarScreen';
import { HajjUmrahScreen } from './HajjUmrahScreen';
import { PrayerTrackerScreen } from './PrayerTrackerScreen';
import { MemorizeScreen } from './MemorizeScreen';
import { AdhkarScreen } from './AdhkarScreen';
import { MonthlyTimetableScreen } from './MonthlyTimetableScreen';
import { useSalahTracker, OBLIGATORY_PRAYERS } from '../context/SalahTrackerContext';

// Lazy-loaded overlays — keep the social stack (Supabase) and the prayer guide
// out of the initial Home bundle.
const LearnPrayerScreen = lazy(() => import('./LearnPrayerScreen').then(m => ({ default: m.LearnPrayerScreen })));
const CommunityScreen = lazy(() => import('./CommunityScreen').then(m => ({ default: m.CommunityScreen })));
const KhatmahScreen = lazy(() => import('./KhatmahScreen').then(m => ({ default: m.KhatmahScreen })));
import { isAccountable } from '../context/SettingsContext';
import { BookMarked } from 'lucide-react';

const ARABIC_PRAYER_NAMES: Record<string, string> = {
  Imsak: 'الإمساك',
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Sunset: 'الغروب',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

const ARABIC_MONTHS = [
  '', 'مُحَرَّم', 'صَفَر', 'رَبِيعٌ الأَوَّل', 'رَبِيعٌ الثَّانِي',
  'جُمَادَى الأُولَى', 'جُمَادَى الآخِرَة', 'رَجَب', 'شَعْبَان',
  'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة',
];

const PRAYER_NAMES: Record<string, Record<string, string>> = {
  en: { Imsak: 'Imsak', Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Sunset: 'Sunset', Maghrib: 'Maghrib', Isha: 'Isha' },
  es: { Imsak: 'Imsak', Fajr: 'Fajr', Sunrise: 'Amanecer', Dhuhr: 'Dhuhr', Asr: 'Asr', Sunset: 'Puesta del Sol', Maghrib: 'Maghrib', Isha: 'Isha' },
  ar: { Imsak: 'الإمساك', Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Sunset: 'غروب الشمس', Maghrib: 'المغرب', Isha: 'العشاء' },
  fr: { Imsak: 'Imsak', Fajr: 'Fajr', Sunrise: 'Lever du Soleil', Dhuhr: 'Dhuhr', Asr: 'Asr', Sunset: 'Coucher du Soleil', Maghrib: 'Maghrib', Isha: 'Isha' },
  de: { Imsak: 'Imsak', Fajr: 'Fajr', Sunrise: 'Sonnenaufgang', Dhuhr: 'Dhuhr', Asr: 'Asr', Sunset: 'Sonnenuntergang', Maghrib: 'Maghrib', Isha: 'Isha' },
  tr: { Imsak: 'İmsak', Fajr: 'Fajr', Sunrise: 'Güneş', Dhuhr: 'Öğle', Asr: 'İkindi', Sunset: 'Akşam (Gün Batımı)', Maghrib: 'Akşam', Isha: 'Yatsı' },
  pt: { Imsak: 'Imsak', Fajr: 'Fajr', Sunrise: 'Amanhecer', Dhuhr: 'Dhuhr', Asr: 'Asr', Sunset: 'Pôr do Sol', Maghrib: 'Maghrib', Isha: 'Isha' },
};

const RAKAT_MAP: Record<string, number> = {
  Fajr: 2,
  Dhuhr: 4,
  Asr: 4,
  Maghrib: 3,
  Isha: 4,
};

const ADHKAR_T: Record<string, { title: string }> = {
  en: { title: 'Morning & Evening Adhkar' },
  es: { title: 'Adhkar Mañana y Tarde' },
  ar: { title: 'أذكار الصباح والمساء' },
  fr: { title: 'Adhkar du Matin et du Soir' },
  de: { title: 'Morgen- & Abend-Adhkar' },
  tr: { title: 'Sabah & Akşam Zikirleri' },
  pt: { title: 'Adhkar da Manhã e Tarde' },
};

const MEMORIZE_T: Record<string, { title: string; sub: string }> = {
  en: { title: 'Memorize Duas', sub: 'Learn & test yourself' },
  es: { title: 'Memorizar Duas', sub: 'Aprende y ponte a prueba' },
  ar: { title: 'حفظ الأدعية', sub: 'تعلّم واختبر نفسك' },
  fr: { title: 'Mémoriser les Duas', sub: 'Apprends et teste-toi' },
  de: { title: 'Duas auswendig', sub: 'Lernen & testen' },
  tr: { title: 'Duaları Ezberle', sub: 'Öğren ve test et' },
  pt: { title: 'Memorizar Duas', sub: 'Aprenda e teste-se' },
};

const LEARN_T: Record<string, { title: string; sub: string; hide?: string }> = {
  en: { title: 'Learn to Pray', sub: 'Salah · Wudu · Ghusl — step by step', hide: 'Hide (find it in Settings)' },
  es: { title: 'Aprende a Rezar', sub: 'Salah · Wudu · Ghusl — paso a paso', hide: 'Ocultar (está en Ajustes)' },
  ar: { title: 'تعلّم الصلاة', sub: 'الصلاة · الوضوء · الغسل — خطوة بخطوة', hide: 'إخفاء (موجود في الإعدادات)' },
  fr: { title: 'Apprendre à Prier', sub: 'Salat · Woudou · Ghusl — étape par étape', hide: 'Masquer (dans Réglages)' },
  de: { title: 'Beten Lernen', sub: 'Salah · Wudu · Ghusl — Schritt für Schritt', hide: 'Ausblenden (in Einstellungen)' },
  tr: { title: 'Namaz Öğren', sub: 'Namaz · Abdest · Gusül — adım adım', hide: 'Gizle (Ayarlar\'da)' },
  pt: { title: 'Aprenda a Rezar', sub: 'Salah · Wudu · Ghusl — passo a passo', hide: 'Ocultar (está em Ajustes)' },
};

const COMMUNITY_T: Record<string, { title: string; sub: string }> = {
  en: { title: 'Community', sub: 'Friends · shared streaks · listen together' },
  es: { title: 'Comunidad', sub: 'Amigos · rachas compartidas · escuchar juntos' },
  ar: { title: 'المجتمع', sub: 'الأصدقاء · التتابع المشترك · الاستماع معًا' },
  fr: { title: 'Communauté', sub: 'Amis · séries partagées · écouter ensemble' },
  de: { title: 'Community', sub: 'Freunde · geteilte Serien · zusammen hören' },
  tr: { title: 'Topluluk', sub: 'Arkadaşlar · ortak seriler · birlikte dinle' },
  pt: { title: 'Comunidade', sub: 'Amigos · sequências · ouvir juntos' },
};

const TRACKER_T: Record<string, { title: string; streak: string; kidStreak: string }> = {
  en: { title: 'My prayers today', streak: 'day streak', kidStreak: 'days prayed' },
  es: { title: 'Mis rezos de hoy', streak: 'días seguidos', kidStreak: 'días rezados' },
  ar: { title: 'صلواتي اليوم', streak: 'أيام متتالية', kidStreak: 'أيام صليت' },
  fr: { title: "Mes prières d'aujourd'hui", streak: 'jours de suite', kidStreak: 'jours priés' },
  de: { title: 'Meine Gebete heute', streak: 'Tage-Serie', kidStreak: 'Tage gebetet' },
  tr: { title: 'Bugünkü namazlarım', streak: 'gün seri', kidStreak: 'gün kılındı' },
  pt: { title: 'Minhas orações de hoje', streak: 'dias seguidos', kidStreak: 'dias orados' },
};

function cleanTime(t: string) {
  return t.replace(/ \(.*?\)/, '').trim();
}

function parseMinutes(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const FASTING_ALERT_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    updateTitle: 'Fasting Alert Available',
    actionActive: 'Reminders Active ✓',
    actionEnable: 'Enable 07:30 AM Alert',
    dismiss: 'Dismiss',
    tomorrowFast: 'Tomorrow is recommended to fast',
  },
  es: {
    updateTitle: 'Alerta de Ayuno Disponible',
    actionActive: 'Alertas Activas ✓',
    actionEnable: 'Activar Alerta 07:30 AM',
    dismiss: 'Descartar',
    tomorrowFast: 'Se recomienda ayunar mañana',
  },
  ar: {
    updateTitle: 'تنبيه صيام الغد متوفر',
    actionActive: 'التنبيهات مفعلة ✓',
    actionEnable: 'تفعيل تنبيه 07:30 ص',
    dismiss: 'تجاهل',
    tomorrowFast: 'يُستحب صيام يوم غدٍ',
  },
  fr: {
    updateTitle: 'Alerte de Jeûne Disponible',
    actionActive: 'Rappels Actifs ✓',
    actionEnable: 'Activer l’alerte 07h30',
    dismiss: 'Ignorer',
    tomorrowFast: 'Il est recommandé de jeûner demain',
  },
  de: {
    updateTitle: 'Fasten-Empfehlung verfügbar',
    actionActive: 'Erinnerungen Aktiv ✓',
    actionEnable: '07:30 Uhr Alarm aktivieren',
    dismiss: 'Verwerfen',
    tomorrowFast: 'Morgen wird Fasten empfohlen',
  },
  tr: {
    updateTitle: 'Oruç Uyarısı Mevcut',
    actionActive: 'Hatırlatıcılar Aktif ✓',
    actionEnable: '07:30 Uyarısını Aç',
    dismiss: 'Kapat',
    tomorrowFast: 'Yarın oruç tutulması tavsiye edilir',
  },
  pt: {
    updateTitle: 'Alerta de Jejum Disponível',
    actionActive: 'Alertas Ativas ✓',
    actionEnable: 'Ativar Alerta 07:30 AM',
    dismiss: 'Descartar',
    tomorrowFast: 'Recomenda-se jejuar amanhã',
  }
};
export function HomeScreen() {
  const { prayerData, loading, error, resolvedCityName } = usePrayerData();
  const { settings, currentUser, updateSetting } = useSettings();
  const [now, setNow] = useState(new Date());
  const [dismissedDay, setDismissedDay] = useState<string | null>(null);

  // Navigation modal states
  const [showNamesOfAllah, setShowNamesOfAllah] = useState(false);
  const [showHijriCalendar, setShowHijriCalendar] = useState(false);
  const [showHajjUmrah, setShowHajjUmrah] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showMemorize, setShowMemorize] = useState(false);
  const [showKhatmah, setShowKhatmah] = useState(false);
  const [showAdhkar, setShowAdhkar] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);

  // Prayer tracker
  const { today: trackerToday, todayKey, setStatus, streak } = useSalahTracker();
  const accountable = isAccountable(settings.age);

  // Tomorrow Fasting Banner State
  const [dismissedTomorrowFast, setDismissedTomorrowFast] = useState<string | null>(() =>
    localStorage.getItem('app_dismissed_tomorrow_fast')
  );

  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Hijri date details
  const hijriDay = prayerData ? parseInt(prayerData.date.hijri.day) : 0;
  const hijriMonthNum = prayerData?.date.hijri.month.number ?? 0;
  const hijriYear = prayerData?.date.hijri.year ?? '';
  const hijriMonthAr = ARABIC_MONTHS[hijriMonthNum] || prayerData?.date.hijri.month.ar || '';
  const hijriMonthEn = prayerData?.date.hijri.month.en || '';

  // Tomorrow Fasting Calculations
  const checkTomorrowFasting = () => {
    if (!prayerData) return null;
    
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowDayOfWeek = tomorrowDate.getDay();

    // Derive tomorrow's Hijri from the API's Hijri (single source of truth),
    // rolling over the month/year. Avoids drift vs the displayed date & banner.
    let d = hijriDay + 1;
    let m = hijriMonthNum;
    let y = typeof hijriYear === 'string' ? parseInt(hijriYear) : (hijriYear as number);
    if (d > 30) { d = 1; m += 1; if (m > 12) { m = 1; y += 1; } }
    const tomorrowHijri = { day: d, month: m, year: y };
    const dow = tomorrowDayOfWeek;
    
    if (m === 9) return null; // Ramadan (obligatory, not voluntary)
    
    // Day of Arafah (9th of Dhul-Hijjah)
    if (m === 12 && d === 9) {
      return {
        type: 'arafah',
        name: lang === 'es' ? 'Día de Arafah' : 'Day of Arafah',
        desc: lang === 'es' ? 'Mañana es el bendito Día de Arafah. El ayuno en este día expía los pecados del año anterior y del próximo.' : 'Tomorrow is the blessed Day of Arafah. Fasting on this day expiates the sins of the past and coming year.',
        dateKey: `${d}-${m}-${tomorrowHijri.year}`
      };
    }
    // Ashura & Tasua (9th & 10th of Muharram)
    if (m === 1 && d === 9) {
      return {
        type: 'tasua',
        name: lang === 'es' ? 'Día de Tasu\'a' : 'Day of Tasu\'a',
        desc: lang === 'es' ? 'Mañana es el Día de Tasu\'a. Se recomienda ayunar este día junto con el de Ashura.' : 'Tomorrow is the Day of Tasu\'a. It is recommended to fast this day along with Ashura.',
        dateKey: `${d}-${m}-${tomorrowHijri.year}`
      };
    }
    if (m === 1 && d === 10) {
      return {
        type: 'ashura',
        name: lang === 'es' ? 'Día de Ashura' : 'Day of Ashura',
        desc: lang === 'es' ? 'Mañana es el Día de Ashura. El ayuno en este día expía los pecados del año pasado.' : 'Tomorrow is the Day of Ashura. Fasting on this day expiates the sins of the past year.',
        dateKey: `${d}-${m}-${tomorrowHijri.year}`
      };
    }
    // Ayyam al-Bidh (White Days - 13, 14, 15 except 13th of Dhul-Hijjah)
    if ((d === 13 || d === 14 || d === 15) && !(m === 12 && d === 13)) {
      return {
        type: 'white_day',
        name: lang === 'es' ? `Día Blanco (${d})` : `White Day (${d})`,
        desc: lang === 'es' ? `Mañana es un Día Blanco (${d} del mes lunar ${m}). Es muy recomendado ayunar en estos días.` : `Tomorrow is a White Day (${d} of lunar month ${m}). It is highly recommended to fast on these days.`,
        dateKey: `${d}-${m}-${tomorrowHijri.year}`
      };
    }
    // Mondays and Thursdays
    if (dow === 1) { // Monday
      return {
        type: 'monday',
        name: lang === 'es' ? 'Lunes (Ayuno de Sunnah)' : 'Monday (Sunnah Fast)',
        desc: lang === 'es' ? 'Mañana es lunes. El Profeta ﷺ solía ayunar los lunes ya que las acciones se exponen ante Allah.' : 'Tomorrow is Monday. The Prophet ﷺ used to fast on Mondays as deeds are presented to Allah.',
        dateKey: `${d}-${m}-${tomorrowHijri.year}`
      };
    }
    if (dow === 4) { // Thursday
      return {
        type: 'thursday',
        name: lang === 'es' ? 'Jueves (Ayuno de Sunnah)' : 'Thursday (Sunnah Fast)',
        desc: lang === 'es' ? 'Mañana es jueves. El Profeta ﷺ solía ayunar los jueves ya que las acciones se exponen ante Allah.' : 'Tomorrow is Thursday. The Prophet ﷺ used to fast on Thursdays as deeds are presented to Allah.',
        dateKey: `${d}-${m}-${tomorrowHijri.year}`
      };
    }
    return null;
  };

  const tomorrowFast = checkTomorrowFasting();
  const showTomorrowFastBanner = settings.fastingReminders && tomorrowFast && dismissedTomorrowFast !== tomorrowFast.dateKey;

  const prayers = [];
  if (prayerData) {
    if (hijriMonthNum === 9) {
      prayers.push({ name: 'Imsak', time: cleanTime(prayerData.timings.Imsak) });
    }
    prayers.push({ name: 'Fajr', time: cleanTime(prayerData.timings.Fajr) });
    if (settings.showSunrise) {
      prayers.push({ name: 'Sunrise', time: cleanTime(prayerData.timings.Sunrise) });
    }
    prayers.push({ name: 'Dhuhr', time: cleanTime(prayerData.timings.Dhuhr) });
    prayers.push({ name: 'Asr', time: cleanTime(prayerData.timings.Asr) });
    if (hijriMonthNum === 9) {
      prayers.push({ name: 'Sunset', time: cleanTime(prayerData.timings.Sunset) });
    }
    prayers.push({ name: 'Maghrib', time: cleanTime(prayerData.timings.Maghrib) });
    prayers.push({ name: 'Isha', time: cleanTime(prayerData.timings.Isha) });
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const nextPrayer = prayers.length > 0
    ? (prayers
        .filter(p => p.name !== 'Sunrise' && p.name !== 'Sunset' && p.name !== 'Imsak')
        .find(p => parseMinutes(p.time) > nowMinutes) ?? prayers.find(p => p.name === 'Fajr'))
    : null;

  const prevPrayer = (() => {
    if (!nextPrayer) return null;
    const main = prayers.filter(p => p.name !== 'Sunrise' && p.name !== 'Sunset' && p.name !== 'Imsak');
    const idx = main.findIndex(p => p.name === nextPrayer?.name);
    if (idx > 0) return main[idx - 1];
    // nextPrayer is the first of the day (Fajr fallback after Isha) → previous is Isha
    return main.length ? main[main.length - 1] : null;
  })();

  const countdownSeconds = nextPrayer
    ? (() => {
        const diff = (parseMinutes(nextPrayer.time) - nowMinutes) * 60 - now.getSeconds();
        return diff < 0 ? diff + 24 * 3600 : diff;
      })()
    : 0;

  const progressPercent = (() => {
    if (!nextPrayer || !prevPrayer) return 0;
    let from = parseMinutes(prevPrayer.time);
    let to = parseMinutes(nextPrayer.time);
    let curr = nowMinutes;
    if (to <= from) {
      // Wrap across midnight (Isha → next Fajr)
      to += 24 * 60;
      if (curr < from) curr += 24 * 60;
    }
    if (to <= from) return 0;
    return Math.min(Math.max(((curr - from) / (to - from)) * 100, 0), 100);
  })();

  const islamicDayInfo = prayerData ? getIslamicDayInfo(hijriDay, hijriMonthNum) : { today: null, upcoming: null };

  // Live countdown to the next prayer in the tab/PWA title — a lightweight
  // "always-visible" widget without needing native OS widgets.
  useEffect(() => {
    if (!nextPrayer) return;
    const name = PRAYER_NAMES[lang]?.[nextPrayer.name] || nextPrayer.name;
    document.title = `${formatCountdown(Math.max(0, countdownSeconds))} · ${name} — Al Nour`;
    return () => { document.title = 'Al Nour'; };
  }, [nextPrayer?.name, countdownSeconds, lang]);

  // ── Ramadan iftar / suhoor countdown (only during Ramadan, month 9) ──
  const ramadanCountdown = (() => {
    if (!prayerData || hijriMonthNum !== 9) return null;
    const fajrM = parseMinutes(cleanTime(prayerData.timings.Fajr));
    const maghribM = parseMinutes(cleanTime(prayerData.timings.Maghrib));
    const secsTo = (targetMin: number) => {
      let diff = (targetMin - nowMinutes) * 60 - now.getSeconds();
      if (diff < 0) diff += 24 * 3600;
      return diff;
    };
    if (nowMinutes >= fajrM && nowMinutes < maghribM) {
      // Fasting → countdown to iftar (Maghrib)
      return { mode: 'iftar' as const, seconds: secsTo(maghribM) };
    }
    // Not fasting hours → countdown to suhoor end (Fajr)
    return { mode: 'suhoor' as const, seconds: secsTo(fajrM) };
  })();

  // Dua of the Day — rotates by calendar day, recomputes once per day
  const todayDateStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const dailyDua = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return dailyDuas[dayOfYear % dailyDuas.length];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDateStr]);

  // Islamic dates countdown based on current hijri
  const islamicCountdowns = useMemo(() => {
    if (!prayerData) return [];
    const events: { label: string; labelAr: string; labelEs: string; emoji: string; month: number; day: number }[] = [
      { label: 'Ramadan', labelAr: 'رمضان', labelEs: 'Ramadán', emoji: '🌙', month: 9, day: 1 },
      { label: 'Eid al-Fitr', labelAr: 'عيد الفطر', labelEs: 'Eid al-Fitr', emoji: '🎉', month: 10, day: 1 },
      { label: 'Eid al-Adha', labelAr: 'عيد الأضحى', labelEs: 'Eid al-Adha', emoji: '🐑', month: 12, day: 10 },
      { label: 'Laylatul Qadr', labelAr: 'ليلة القدر', labelEs: 'Laylatul Qadr', emoji: '⭐', month: 9, day: 27 },
    ];
    const curM = hijriMonthNum;
    const curD = parseInt(prayerData.date.hijri.day);
    return events.map(e => {
      let diff = (e.month - curM) * 30 + (e.day - curD);
      if (diff < 0) diff += 355; // rough hijri year length
      return { ...e, daysUntil: Math.round(diff) };
    }).filter(e => e.daysUntil > 0 && e.daysUntil <= 60).sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 2);
  }, [prayerData, hijriMonthNum]);
  const activeDayEvent = islamicDayInfo.today || islamicDayInfo.upcoming;
  const showBanner = settings.fastingReminders && activeDayEvent && dismissedDay !== `${hijriDay}-${hijriMonthNum}`;

  // Custom visual layouts
  const isArafatTheme = settings.wallpaper === 'arafat';
  const logoSrc = settings.appLogo === 'golden-crescent' ? '/al_nour_logo.png' : '/icon-512.png';

  return (
    <div className={`flex flex-col min-h-full font-sans text-[#F3F4F6] pb-24 transition-all duration-500`}>
      {/* Dynamic Header */}
      <header className={`flex ${isArafatTheme ? 'flex-col items-center text-center' : 'justify-between items-start'} pt-12 px-6 mb-6`}>
        {isArafatTheme ? (
          <div className="flex flex-col items-center gap-3">
            <img 
              src={logoSrc} 
              alt="Al Nour Logo" 
              className="w-12 h-12 object-contain rounded-full bg-white/5 p-1 border border-white/10 shadow-lg" 
            />
            <div>
              <p className="text-[10px] text-[#A7F3D0] opacity-80 uppercase tracking-widest mb-1 font-bold">
                {t.bismillah}
              </p>
              <h1 className="text-xl font-bold text-[#FCD34D]">{t.greeting}{currentUser && `, ${currentUser.name}`}</h1>
              <div className="flex items-center gap-1.5 text-[#A7F3D0] text-xs mt-1 opacity-90 justify-center">
                <MapPin size={11} className="text-[#FCD34D]" />
                <span>{resolvedCityName || (loading ? t.locating : t.defaultLocation)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5">
            <img 
              src={logoSrc} 
              alt="Al Nour Logo" 
              className="w-12 h-12 object-contain rounded-full bg-white/5 p-1.5 border border-white/10 shadow-md" 
            />
            <div>
              <p className="text-[10px] text-[#A7F3D0] opacity-80 uppercase tracking-widest mb-0.5 font-bold">
                {t.bismillah}
              </p>
              <h1 className="text-xl font-bold text-[#FCD34D]">{t.greeting}{currentUser && `, ${currentUser.name}`}</h1>
              <div className="flex items-center gap-1.5 text-[#A7F3D0] text-xs mt-0.5 opacity-90">
                <MapPin size={11} className="text-[#FCD34D]" />
                <span>{resolvedCityName || (loading ? t.locating : t.defaultLocation)}</span>
              </div>
            </div>
          </div>
        )}

        <div className={isArafatTheme ? 'mt-4 text-center' : 'text-right'}>
          <div className="text-4xl font-mono font-bold text-white tracking-tight tabular-nums drop-shadow-md">
            {now.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          {prayerData && (
            <div className={`mt-1.5 text-xs text-[#A7F3D0] opacity-90 font-semibold ${isArafatTheme ? 'justify-center' : ''}`}>
              <span>{hijriDay} {lang === 'ar' ? hijriMonthAr : hijriMonthEn} {hijriYear} AH</span>
            </div>
          )}
        </div>
      </header>

      {/* Main dashboard widgets */}
      <div className="px-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] backdrop-blur border border-white/5 rounded-3xl">
            <Loader2 className="animate-spin mb-3 text-[#FCD34D]" size={30} />
            <p className="text-xs uppercase tracking-widest font-bold text-[#A7F3D0] opacity-70">{t.locating}</p>
          </div>
        ) : error && error.includes('Fallback') ? (
          /* Offline fallback message */
          <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-2.5 rounded-2xl text-center text-xs text-[#FCD34D] font-semibold mb-4">
            {error}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 p-4 rounded-3xl border border-red-500/20 text-center mb-4">
            <p className="text-xs text-red-300 font-bold">{error}</p>
          </div>
        ) : null}

        {!loading && !error && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left Column: Hero widgets & special info */}
              <div className="space-y-4">
                {/* Tomorrow Fasting Alert (Software Update style) */}
                <AnimatePresence>
                  {showTomorrowFastBanner && tomorrowFast && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="bg-[#0b1c18]/90 backdrop-blur-xl border-2 border-[#FCD34D]/35 rounded-[2rem] p-5 relative overflow-hidden shadow-2xl"
                    >
                      {/* Glowing golden border accent effect */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FCD34D] via-emerald-500 to-[#FCD34D]" />
                      
                      <button
                        onClick={() => {
                          setDismissedTomorrowFast(tomorrowFast.dateKey);
                          localStorage.setItem('app_dismissed_tomorrow_fast', tomorrowFast.dateKey);
                        }}
                        className="absolute top-4 right-4 text-[#A7F3D0] opacity-45 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent"
                      >
                        <X size={16} />
                      </button>

                      <div className="flex items-start gap-4 pr-6 text-left">
                        {/* Software Update Icon */}
                        <div className="p-3 bg-[#FCD34D]/10 border border-[#FCD34D]/25 text-[#FCD34D] rounded-2xl shrink-0 mt-0.5 animate-pulse">
                          <Bell size={20} />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-[8px] font-black bg-[#FCD34D] text-[#022C22] px-2.5 py-0.5 rounded-md uppercase tracking-widest inline-block">
                              {FASTING_ALERT_TRANSLATIONS[lang]?.updateTitle || FASTING_ALERT_TRANSLATIONS.en.updateTitle}
                            </span>
                            <h3 className="font-bold text-white text-base leading-snug mt-1.5">
                              {tomorrowFast.name}
                            </h3>
                          </div>

                          <p className="text-xs text-[#A7F3D0]/95 leading-relaxed font-light">
                            {tomorrowFast.desc}
                          </p>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {/* Toggle Morning Notification Action */}
                            <button
                              onClick={() => updateSetting('fastingReminders', !settings.fastingReminders)}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                settings.fastingReminders
                                  ? 'bg-emerald-800/35 border border-emerald-500/40 text-emerald-300'
                                  : 'bg-[#FCD34D] text-[#022C22] border border-[#FCD34D] hover:bg-[#fcd960]'
                              }`}
                            >
                              {settings.fastingReminders ? <BellOff size={11} /> : <Bell size={11} />}
                              {settings.fastingReminders 
                                ? (FASTING_ALERT_TRANSLATIONS[lang]?.actionActive || FASTING_ALERT_TRANSLATIONS.en.actionActive) 
                                : (FASTING_ALERT_TRANSLATIONS[lang]?.actionEnable || FASTING_ALERT_TRANSLATIONS.en.actionEnable)}
                            </button>

                            <button
                              onClick={() => {
                                setDismissedTomorrowFast(tomorrowFast.dateKey);
                                localStorage.setItem('app_dismissed_tomorrow_fast', tomorrowFast.dateKey);
                              }}
                              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              {FASTING_ALERT_TRANSLATIONS[lang]?.dismiss || FASTING_ALERT_TRANSLATIONS.en.dismiss}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Special day banner */}
                <AnimatePresence>
                  {showBanner && activeDayEvent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-[#FCD34D]/20 p-5 relative overflow-hidden shadow-xl"
                    >
                      <button
                        onClick={() => setDismissedDay(`${hijriDay}-${hijriMonthNum}`)}
                        className="absolute top-3.5 right-3.5 text-[#A7F3D0] opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <X size={15} />
                      </button>
                      <div className="flex items-start gap-3">
                        <span className="text-3xl filter drop-shadow">{activeDayEvent.emoji}</span>
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-[9px] font-extrabold text-[#022C22] bg-[#FCD34D] uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                              {islamicDayInfo.upcoming && !islamicDayInfo.today
                                ? (lang === 'es' ? `En ${islamicDayInfo.upcoming.daysUntil} días` : `In ${islamicDayInfo.upcoming.daysUntil} days`)
                                : (lang === 'es' ? 'Hoy' : 'Today')}
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-base leading-tight">{activeDayEvent.name}</h3>
                          <p className="text-[#A7F3D0] font-arabic text-sm mt-0.5">{activeDayEvent.nameAr}</p>
                          <p className="text-xs text-[#A7F3D0] opacity-80 mt-2 leading-relaxed">{activeDayEvent.recommendation}</p>
                          
                          {activeDayEvent.duas[0] && (
                            <div className="mt-3.5 bg-black/25 rounded-2xl p-3.5 border border-white/5">
                              <p className="text-base font-arabic text-white leading-loose text-right" dir="rtl">
                                {activeDayEvent.duas[0].arabic}
                              </p>
                              <p className="text-[11px] text-[#A7F3D0]/80 italic mt-2 leading-relaxed">
                                {activeDayEvent.duas[0].transliteration}
                              </p>
                              <p className="text-xs text-white opacity-90 mt-2 leading-relaxed border-t border-white/5 pt-2">
                                {activeDayEvent.duas[0].translations?.[lang] || activeDayEvent.duas[0].translation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ramadan iftar/suhoor countdown — only during Ramadan */}
                {ramadanCountdown && (
                  <div className={`rounded-3xl p-5 shadow-2xl relative overflow-hidden border ${
                    ramadanCountdown.mode === 'iftar'
                      ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border-amber-500/30'
                      : 'bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-transparent border-indigo-400/30'}`}>
                    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl pointer-events-none bg-[#FCD34D]/15" />
                    <div className="flex items-center justify-between relative">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{ramadanCountdown.mode === 'iftar' ? '🌅' : '🌙'}</span>
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#FCD34D]">
                            {ramadanCountdown.mode === 'iftar'
                              ? (lang === 'es' ? 'Ramadán · Iftar en' : lang === 'ar' ? 'رمضان · الإفطار بعد' : 'Ramadan · Iftar in')
                              : (lang === 'es' ? 'Ramadán · Suhoor termina en' : lang === 'ar' ? 'رمضان · ينتهي السحور بعد' : 'Ramadan · Suhoor ends in')}
                          </p>
                          <p className="text-[10px] text-[#A7F3D0]/60 mt-0.5">
                            {ramadanCountdown.mode === 'iftar'
                              ? (lang === 'es' ? 'Que tu ayuno sea aceptado' : lang === 'ar' ? 'تقبل الله صيامك' : 'May your fast be accepted')
                              : (lang === 'es' ? 'No olvides la intención' : lang === 'ar' ? 'لا تنسَ النية' : "Don't forget the intention")}
                          </p>
                        </div>
                      </div>
                      <p className="text-2xl font-mono font-black text-white tabular-nums">
                        {formatCountdown(Math.max(0, ramadanCountdown.seconds))}
                      </p>
                    </div>
                  </div>
                )}

                {/* Next prayer Hero Glassmorphic card */}
                <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  {/* Sparkle details */}
                  <div className="absolute top-4 right-4 text-[#FCD34D]/25 pointer-events-none">
                    <Sparkles size={20} />
                  </div>
                  
                  <span className="text-[9px] font-extrabold text-[#059669] uppercase tracking-widest bg-[#059669]/20 border border-[#059669]/30 px-3 py-1 rounded-full">
                    {t.nextPrayer}
                  </span>

                  <div className="flex items-end justify-between mt-5">
                    <div>
                      <h2 className="text-3xl font-bold text-white">{PRAYER_NAMES[lang]?.[nextPrayer?.name] || nextPrayer?.name}</h2>
                      <p className="font-arabic text-[#A7F3D0] text-lg mt-0.5">
                        {ARABIC_PRAYER_NAMES[nextPrayer?.name ?? ''] ?? ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-mono font-bold text-[#FCD34D] tabular-nums tracking-wide">
                        {nextPrayer?.time}
                      </p>
                      <p className="text-xs text-[#A7F3D0]/60 mt-1 tabular-nums">
                        {t.inTime} {formatCountdown(Math.max(0, countdownSeconds))}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5">
                    <div className="h-2 bg-black/20 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#FCD34D] to-[#10B981] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-[#A7F3D0]/60 font-bold uppercase">{PRAYER_NAMES[lang]?.[prevPrayer?.name || ''] || prevPrayer?.name}</span>
                      <span className="text-[10px] text-[#A7F3D0]/60 font-bold uppercase">{PRAYER_NAMES[lang]?.[nextPrayer?.name || ''] || nextPrayer?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Islamic Dates Countdown */}
                {islamicCountdowns.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {islamicCountdowns.map(ev => (
                      <div key={ev.label} className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center">
                        <div className="text-2xl mb-1">{ev.emoji}</div>
                        <div className="text-[10px] font-bold text-[#FCD34D] uppercase tracking-wider">
                          {lang === 'ar' ? ev.labelAr : lang === 'es' ? ev.labelEs : ev.label}
                        </div>
                        <div className="text-xl font-bold text-white mt-1 tabular-nums">{ev.daysUntil}</div>
                        <div className="text-[9px] text-[#A7F3D0]/60 uppercase tracking-wider">
                          {lang === 'ar' ? 'يوم' : lang === 'es' ? 'días' : 'days'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dua of the Day */}
                {dailyDua && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Quote size={14} className="text-[#FCD34D]" />
                      <span className="text-[10px] font-extrabold text-[#FCD34D] uppercase tracking-widest">
                        {lang === 'ar' ? 'دعاء اليوم' : lang === 'es' ? 'Dua del Día' : 'Dua of the Day'}
                      </span>
                    </div>
                    <p className="text-xs text-[#A7F3D0]/80 font-semibold mb-3 truncate">{dailyDua.title}</p>
                    <p className="font-arabic text-base text-white leading-loose text-right" dir="rtl">
                      {dailyDua.arabic}
                    </p>
                    {dailyDua.transliteration && (
                      <p className="text-[11px] text-[#A7F3D0]/60 italic mt-2 leading-relaxed">
                        {dailyDua.transliteration}
                      </p>
                    )}
                    <p className="text-xs text-[#A7F3D0]/90 mt-2 leading-relaxed border-t border-white/5 pt-2">
                      {dailyDua.translation}
                    </p>
                    {dailyDua.reference && (
                      <p className="text-[9px] text-[#A7F3D0]/40 mt-1.5 font-semibold">{dailyDua.reference}</p>
                    )}
                  </div>
                )}

                {/* Prayer Tracker widget — hideable from Settings */}
                {settings.showPrayerTracker && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl">
                  <button
                    onClick={() => setShowTracker(true)}
                    className="w-full flex items-center justify-between mb-4 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FCD34D]/10 border border-[#FCD34D]/25 flex items-center justify-center">
                        {accountable ? <Flame size={16} className="text-[#FCD34D]" /> : <Star size={16} className="text-[#FCD34D] fill-[#FCD34D]/30" />}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white">
                          {TRACKER_T[lang]?.title || TRACKER_T.en.title}
                        </p>
                        <p className="text-[10px] text-[#A7F3D0]/60">
                          {streak} {accountable ? (TRACKER_T[lang]?.streak || TRACKER_T.en.streak) : (TRACKER_T[lang]?.kidStreak || TRACKER_T.en.kidStreak)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#A7F3D0]/40 group-hover:text-[#FCD34D] transition-colors" />
                  </button>
                  <div className="grid grid-cols-5 gap-2">
                    {OBLIGATORY_PRAYERS.map(p => {
                      const st = trackerToday[p];
                      return (
                        <button
                          key={p}
                          onClick={() => {
                            const cur = trackerToday[p];
                            if (!accountable) {
                              setStatus(todayKey, p, cur === 'prayed' ? null : 'prayed');
                            } else {
                              setStatus(todayKey, p, cur === undefined ? 'prayed' : cur === 'prayed' ? 'missed' : null);
                            }
                          }}
                          className="flex flex-col items-center gap-1.5 group"
                        >
                          <div className={`w-full aspect-square rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                            st === 'prayed'
                              ? 'bg-[#059669] border-[#10B981] shadow-md shadow-[#059669]/20'
                              : st === 'missed'
                              ? 'bg-red-500/15 border-red-500/40'
                              : 'bg-white/[0.02] border-white/10 group-hover:border-white/25'
                          }`}>
                            {st === 'prayed'
                              ? <Check size={15} className="text-white" strokeWidth={3} />
                              : st === 'missed'
                              ? <X size={13} className="text-red-300" strokeWidth={3} />
                              : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                          </div>
                          <span className={`text-[8px] font-bold ${st === 'prayed' ? 'text-[#FCD34D]' : 'text-[#A7F3D0]/60'}`}>
                            {PRAYER_NAMES[lang]?.[p] || p}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* Hijri Date Box */}
                {prayerData && (
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl px-5 py-4 flex items-center justify-between shadow-lg">
                    <div>
                      <p className="text-[9px] text-[#A7F3D0]/60 uppercase tracking-widest font-bold mb-0.5">
                        {t.hijriDate}
                      </p>
                      <p className="font-bold text-white text-sm">
                        {hijriDay} {lang === 'ar' ? hijriMonthAr : hijriMonthEn} {hijriYear} AH
                      </p>
                    </div>
                    <p className="font-arabic text-[#FCD34D] text-lg">
                      {hijriDay} {hijriMonthAr}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Daily Schedule */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest opacity-60">
                    {t.todaysSchedule}
                  </h3>
                  <button
                    onClick={() => setShowMonthly(true)}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#FCD34D] bg-[#FCD34D]/10 border border-[#FCD34D]/20 rounded-full px-2.5 py-1 hover:bg-[#FCD34D]/15 transition-colors"
                  >
                    <Calendar size={11} />
                    {lang === 'es' ? 'Mes' : lang === 'ar' ? 'الشهر' : 'Month'}
                  </button>
                </div>
                <div className="space-y-2.5">
                  {prayers.map(prayer => {
                    const isNext = nextPrayer && prayer.name === nextPrayer.name;
                    const passed = parseMinutes(prayer.time) < nowMinutes;
                    const isAstronomical = prayer.name === 'Sunrise' || prayer.name === 'Sunset' || prayer.name === 'Imsak';

                    return (
                      <motion.div
                        key={prayer.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`flex justify-between items-center px-4 py-3.5 rounded-2xl border transition-all ${
                          isNext
                            ? 'bg-[#059669] border-[#10B981] shadow-lg shadow-[#059669]/20'
                            : isAstronomical
                            ? 'bg-white/[0.01] border-white/5 opacity-50'
                            : passed
                            ? 'bg-transparent border-transparent opacity-45'
                            : 'bg-white/[0.03] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isNext && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          )}
                          <span className={`text-sm font-bold ${isNext ? 'text-white' : 'text-[#A7F3D0]'}`}>
                            {PRAYER_NAMES[lang]?.[prayer.name] || prayer.name}
                          </span>
                          <span className="font-arabic text-xs opacity-60 ml-1">
                            {ARABIC_PRAYER_NAMES[prayer.name]}
                          </span>
                          {/* Rakat badge */}
                          {settings.showRakats && RAKAT_MAP[prayer.name] && (
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ml-1 ${
                              isNext ? 'bg-white/20 text-[#FCD34D]' : 'bg-white/5 text-[#FCD34D]'
                            }`}>
                              {RAKAT_MAP[prayer.name]} {t.rakats.substring(0, 5)}
                            </span>
                          )}
                        </div>
                        <span className={`font-mono text-sm ${isNext ? 'font-black text-white' : 'text-[#A7F3D0] opacity-80'}`}>
                          {prayer.time}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Tahajjud / last third of the night */}
                {prayerData?.timings?.Lastthird && (
                  <div className="mt-2.5 flex justify-between items-center px-4 py-3 rounded-2xl border border-white/5 bg-white/[0.01] opacity-70">
                    <div className="flex items-center gap-2">
                      <Moon size={13} className="text-[#FCD34D]" />
                      <span className="text-sm font-bold text-[#A7F3D0]">
                        {lang === 'es' ? 'Tahajjud' : lang === 'ar' ? 'التهجد' : 'Tahajjud'}
                      </span>
                      <span className="text-[9px] text-[#A7F3D0]/50 uppercase tracking-wider">
                        {lang === 'es' ? 'último tercio' : lang === 'ar' ? 'الثلث الأخير' : 'last third'}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-[#A7F3D0] opacity-80">
                      {cleanTime(prayerData.timings.Lastthird)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Explore Al-Nour Bento Grid Hub */}
            <div className="mt-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest opacity-60 text-left">
                {t.exploreTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 99 Names of Allah Bento Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setShowNamesOfAllah(true)}
                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 p-5 rounded-[2rem] cursor-pointer hover:border-emerald-500/40 transition-all flex flex-col justify-between min-h-[140px] shadow-md relative overflow-hidden group"
                >
                  <div className="absolute -right-3 -top-3 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#FCD34D] group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                      <BookOpen size={20} />
                    </div>
                    <span className="text-[9px] font-mono text-[#A7F3D0]/40 uppercase tracking-widest">99 Names</span>
                  </div>
                  <div className="mt-4 text-left">
                    <h4 className="font-bold text-white text-sm leading-snug">
                      {t.namesOfAllahTitle}
                    </h4>
                    <p className="text-[9px] text-[#A7F3D0]/50 mt-1 uppercase tracking-wider font-semibold">
                      Al-Asma-ul-Husna
                    </p>
                  </div>
                </motion.div>

                {/* Hijri Calendar Bento Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setShowHijriCalendar(true)}
                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 p-5 rounded-[2rem] cursor-pointer hover:border-emerald-500/40 transition-all flex flex-col justify-between min-h-[140px] shadow-md relative overflow-hidden group"
                >
                  <div className="absolute -right-3 -top-3 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#FCD34D] group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-all">
                      <Calendar size={20} />
                    </div>
                    <span className="text-[9px] font-mono text-[#A7F3D0]/40 uppercase tracking-widest">Calendar</span>
                  </div>
                  <div className="mt-4 text-left">
                    <h4 className="font-bold text-white text-sm leading-snug">
                      {t.calendarTitle}
                    </h4>
                    <p className="text-[9px] text-[#A7F3D0]/50 mt-1 uppercase tracking-wider font-semibold">
                      Hijri / Gregorian
                    </p>
                  </div>
                </motion.div>

                {/* Hajj & Umrah Guide Bento Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setShowHajjUmrah(true)}
                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 p-5 rounded-[2rem] cursor-pointer hover:border-emerald-500/40 transition-all flex flex-col justify-between min-h-[140px] shadow-md relative overflow-hidden group"
                >
                  <div className="absolute -right-3 -top-3 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#FCD34D] group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-all">
                      <Compass size={20} />
                    </div>
                    <span className="text-[9px] font-mono text-[#A7F3D0]/40 uppercase tracking-widest">Pilgrimage</span>
                  </div>
                  <div className="mt-4 text-left">
                    <h4 className="font-bold text-white text-sm leading-snug">
                      {t.hajjUmrahTitle}
                    </h4>
                    <p className="text-[9px] text-[#A7F3D0]/50 mt-1 uppercase tracking-wider font-semibold">
                      Interactive Guide
                    </p>
                  </div>
                </motion.div>

                {/* Adhkar Bento Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setShowAdhkar(true)}
                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 p-5 rounded-[2rem] cursor-pointer hover:border-emerald-500/40 transition-all flex flex-col justify-between min-h-[140px] shadow-md relative overflow-hidden group"
                >
                  <div className="absolute -right-3 -top-3 w-16 h-16 bg-sky-500/10 rounded-full blur-xl group-hover:bg-sky-500/20 transition-all" />
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#FCD34D] group-hover:bg-sky-500/10 group-hover:border-sky-500/30 transition-all">
                      <Sun size={20} />
                    </div>
                    <Moon size={14} className="text-[#A7F3D0]/40" />
                  </div>
                  <div className="mt-4 text-left">
                    <h4 className="font-bold text-white text-sm leading-snug">
                      {ADHKAR_T[lang]?.title || ADHKAR_T.en.title}
                    </h4>
                    <p className="text-[9px] text-[#A7F3D0]/50 mt-1 uppercase tracking-wider font-semibold">
                      Adhkar as-Sabah wal-Masa
                    </p>
                  </div>
                </motion.div>

                {/* Memorize Duas Bento Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setShowMemorize(true)}
                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 p-5 rounded-[2rem] cursor-pointer hover:border-emerald-500/40 transition-all flex flex-col justify-between min-h-[140px] shadow-md relative overflow-hidden group"
                >
                  <div className="absolute -right-3 -top-3 w-16 h-16 bg-fuchsia-500/10 rounded-full blur-xl group-hover:bg-fuchsia-500/20 transition-all" />
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#FCD34D] group-hover:bg-fuchsia-500/10 group-hover:border-fuchsia-500/30 transition-all">
                      <Brain size={20} />
                    </div>
                    <Sparkles size={14} className="text-[#A7F3D0]/40" />
                  </div>
                  <div className="mt-4 text-left">
                    <h4 className="font-bold text-white text-sm leading-snug">
                      {MEMORIZE_T[lang]?.title || MEMORIZE_T.en.title}
                    </h4>
                    <p className="text-[9px] text-[#A7F3D0]/50 mt-1 uppercase tracking-wider font-semibold">
                      {MEMORIZE_T[lang]?.sub || MEMORIZE_T.en.sub}
                    </p>
                  </div>
                </motion.div>

                {/* Khatmah Plan Bento Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setShowKhatmah(true)}
                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 p-5 rounded-[2rem] cursor-pointer hover:border-emerald-500/40 transition-all flex flex-col justify-between min-h-[140px] shadow-md relative overflow-hidden group"
                >
                  <div className="absolute -right-3 -top-3 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#FCD34D] group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-all">
                      <BookMarked size={20} />
                    </div>
                    {settings.khatmahActive && (
                      <span className="text-[9px] font-bold text-[#FCD34D] tabular-nums bg-[#FCD34D]/10 border border-[#FCD34D]/25 px-2 py-0.5 rounded-full">
                        {Math.round(((settings.khatmahPagesRead || 0) / 604) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-left">
                    <h4 className="font-bold text-white text-sm leading-snug">
                      {lang === 'es' ? 'Plan de Khatmah' : lang === 'ar' ? 'خطة الختمة' : 'Khatmah Plan'}
                    </h4>
                    <p className="text-[9px] text-[#A7F3D0]/50 mt-1 uppercase tracking-wider font-semibold">
                      {lang === 'es' ? 'Termina el Corán' : lang === 'ar' ? 'أكمل القرآن' : 'Finish the Quran'}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Learn to Pray CTA (Salah · Wudu · Ghusl) — hideable once you know how */}
              {settings.showLearnOnHome && (
                <div className="relative">
                  <motion.button
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setShowLearn(true)}
                    className="w-full text-left relative overflow-hidden rounded-[2rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-600/20 via-emerald-700/10 to-[#022C22] p-6 shadow-lg group"
                  >
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-400/15 rounded-full blur-2xl group-hover:bg-emerald-400/25 transition-all" />
                    <div className="absolute -left-4 bottom-0 w-24 h-24 bg-[#FCD34D]/10 rounded-full blur-2xl" />
                    <div className="relative flex items-center gap-4">
                      <div className="p-3.5 bg-[#FCD34D]/15 border border-[#FCD34D]/30 rounded-2xl text-[#FCD34D] shrink-0">
                        <BookOpen size={24} />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <h4 className="font-bold text-white text-base leading-snug flex items-center gap-2">
                          {LEARN_T[lang]?.title || LEARN_T.en.title}
                          <Sparkles size={14} className="text-[#FCD34D]/70" />
                        </h4>
                        <p className="text-[11px] text-[#A7F3D0]/70 mt-1 font-medium">
                          {LEARN_T[lang]?.sub || LEARN_T.en.sub}
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-[#A7F3D0]/50 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                  </motion.button>
                  <button
                    onClick={() => updateSetting('showLearnOnHome', false)}
                    title={LEARN_T[lang]?.hide || LEARN_T.en.hide}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 border border-white/10 text-white/50 hover:text-white hover:bg-black/50 transition-colors z-10"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Community CTA (friends, shared streaks, listen together) */}
              <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowCommunity(true)}
                className="w-full text-left relative overflow-hidden rounded-[2rem] border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-600/15 via-purple-700/10 to-[#022C22] p-6 shadow-lg group"
              >
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-fuchsia-400/15 rounded-full blur-2xl group-hover:bg-fuchsia-400/25 transition-all" />
                <div className="relative flex items-center gap-4">
                  <div className="p-3.5 bg-fuchsia-400/15 border border-fuchsia-400/30 rounded-2xl text-fuchsia-200 shrink-0">
                    <Users size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-base leading-snug flex items-center gap-2">
                      {COMMUNITY_T[lang]?.title || COMMUNITY_T.en.title}
                      <Flame size={14} className="text-orange-400/80" />
                    </h4>
                    <p className="text-[11px] text-[#A7F3D0]/70 mt-1 font-medium">
                      {COMMUNITY_T[lang]?.sub || COMMUNITY_T.en.sub}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-[#A7F3D0]/50 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Overlays / Modal Screens */}
      <AnimatePresence>
        {showNamesOfAllah && (
          <NamesOfAllahScreen onClose={() => setShowNamesOfAllah(false)} />
        )}
        {showHijriCalendar && (
          <HijriCalendarScreen onClose={() => setShowHijriCalendar(false)} />
        )}
        {showHajjUmrah && (
          <HajjUmrahScreen onClose={() => setShowHajjUmrah(false)} />
        )}
        {showTracker && (
          <PrayerTrackerScreen onClose={() => setShowTracker(false)} />
        )}
        {showAdhkar && (
          <AdhkarScreen onClose={() => setShowAdhkar(false)} />
        )}
        {showMemorize && (
          <MemorizeScreen onClose={() => setShowMemorize(false)} />
        )}
        {showKhatmah && (
          <Suspense fallback={null}>
            <KhatmahScreen onClose={() => setShowKhatmah(false)} />
          </Suspense>
        )}
        {showMonthly && (
          <MonthlyTimetableScreen onClose={() => setShowMonthly(false)} />
        )}
        {showLearn && (
          <Suspense fallback={null}>
            <LearnPrayerScreen onClose={() => setShowLearn(false)} />
          </Suspense>
        )}
        {showCommunity && (
          <Suspense fallback={null}>
            <CommunityScreen onClose={() => setShowCommunity(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
