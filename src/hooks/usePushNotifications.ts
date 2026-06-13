import { useEffect, useRef } from 'react';
import { usePrayerData } from '../context/PrayerContext';
import { useSettings } from './useSettings';
import { useAuth } from '../context/AuthContext';
import { fetchMonthlyPrayerTimes } from '../api/aladhan';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const PRAYER_TITLES: Record<string, Record<string, string>> = {
  en: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  es: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  ar: { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
  fr: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  de: { Fajr: 'Fadschr', Dhuhr: 'Duhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Ischa' },
  tr: { Fajr: 'İmsak', Dhuhr: 'Öğle', Asr: 'İkindi', Maghrib: 'Akşam', Isha: 'Yatsı' },
  pt: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  ur: { Fajr: 'فجر', Dhuhr: 'ظہر', Asr: 'عصر', Maghrib: 'مغرب', Isha: 'عشاء' },
  id: { Fajr: 'Subuh', Dhuhr: 'Dzuhur', Asr: 'Ashar', Maghrib: 'Maghrib', Isha: 'Isya' },
  ms: { Fajr: 'Subuh', Dhuhr: 'Zohor', Asr: 'Asar', Maghrib: 'Maghrib', Isha: 'Isyak' },
  bn: { Fajr: 'ফজর', Dhuhr: 'যোহর', Asr: 'আসর', Maghrib: 'মাগরিব', Isha: 'ইশা' },
  fa: { Fajr: 'صبح', Dhuhr: 'ظهر', Asr: 'عصر', Maghrib: 'مغرب', Isha: 'عشاء' },
  ru: { Fajr: 'Фаджр', Dhuhr: 'Зухр', Asr: 'Аср', Maghrib: 'Магриб', Isha: 'Иша' },
};

const RAKAT_MAP: Record<string, number> = { Fajr: 2, Dhuhr: 4, Asr: 4, Maghrib: 3, Isha: 4 };

const NOTIF_TITLES: Record<string, string> = {
  en: 'Prayer Reminder', es: 'Recordatorio de Rezo', ar: 'تنبيه الصلاة',
  fr: 'Rappel de Prière', de: 'Gebetserinnerung', tr: 'Namaz Hatırlatıcısı', pt: 'Lembrete de Oração',
  ur: 'نماز کی یاددہانی', id: 'Pengingat Sholat', ms: 'Peringatan Solat',
  bn: 'নামাজের স্মরণিকা', fa: 'یادآور نماز', ru: 'Напоминание о намазе',
};
const NOTIF_BODIES: Record<string, (name: string) => string> = {
  en: (n) => `Time for ${n} prayer.`,
  es: (n) => `Es hora del rezo de ${n}.`,
  ar: (n) => `حان وقت صلاة ${n}.`,
  fr: (n) => `C'est l'heure de la prière de ${n}.`,
  de: (n) => `Es ist Zeit für das ${n}-Gebet.`,
  tr: (n) => `${n} namaz vakti geldi.`,
  pt: (n) => `Chegou a hora da oração de ${n}.`,
  ur: (n) => `${n} کا وقت ہو گیا۔`,
  id: (n) => `Saatnya sholat ${n}.`,
  ms: (n) => `Tiba masanya solat ${n}.`,
  bn: (n) => `${n} নামাজের সময় হয়েছে।`,
  fa: (n) => `وقت نماز ${n} رسید.`,
  ru: (n) => `Пришло время намаза ${n}.`,
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function parsePrayerTime(timeStr: string, baseDate: Date): Date | null {
  const clean = timeStr.replace(/ \(([^)]+)\)/, '').trim();
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

const PRE_ALERT_BODIES: Record<string, (name: string, min: number) => string> = {
  en: (n, m) => `${n} in ${m} minutes.`,
  es: (n, m) => `${n} en ${m} minutos.`,
  ar: (n, m) => `صلاة ${n} بعد ${m} دقائق.`,
  fr: (n, m) => `${n} dans ${m} minutes.`,
  de: (n, m) => `${n} in ${m} Minuten.`,
  tr: (n, m) => `${n} ${m} dakika sonra.`,
  pt: (n, m) => `${n} em ${m} minutos.`,
  ur: (n, m) => `${n} ${m} منٹ میں۔`,
  id: (n, m) => `${n} ${m} menit lagi.`,
  ms: (n, m) => `${n} dalam ${m} minit.`,
  bn: (n, m) => `${n} ${m} মিনিটে।`,
  fa: (n, m) => `${n} در ${m} دقیقه.`,
  ru: (n, m) => `${n} через ${m} минут.`,
};

const JUMUAH_TITLES: Record<string, string> = {
  en: '🕌 Jumu\'ah Reminder',
  es: '🕌 Recordatorio de Jumu\'ah',
  ar: '🕌 تذكير صلاة الجمعة',
  fr: '🕌 Rappel du Jumu\'ah',
  de: '🕌 Jumu\'ah Erinnerung',
  tr: '🕌 Cuma Namazı Hatırlatıcı',
  pt: '🕌 Lembrete do Jumu\'ah',
  ur: '🕌 جمعہ یاددہانی',
  id: '🕌 Pengingat Sholat Jumat',
  ms: '🕌 Peringatan Solat Jumaat',
  bn: '🕌 জুমআর স্মরণিকা',
  fa: '🕌 یادآور نماز جمعه',
  ru: '🕌 Напоминание о Джум\'а',
};

const JUMUAH_BODIES: Record<string, string> = {
  en: 'Jumu\'ah begins in 30 minutes. Prepare with wudu.',
  es: 'El Jumu\'ah comienza en 30 minutos. Prepárate con wudu.',
  ar: 'موعد صلاة الجمعة خلال 30 دقيقة. استعد بالوضوء.',
  fr: 'Le Jumu\'ah commence dans 30 minutes. Préparez-vous avec le wudu.',
  de: 'Jumu\'ah beginnt in 30 Minuten. Bereite dich mit Wudu vor.',
  tr: 'Cuma namazı 30 dakika sonra. Abdestini al.',
  pt: 'Jumu\'ah começa em 30 minutos. Prepare-se com wudu.',
  ur: 'جمعہ 30 منٹ میں شروع ہوگا۔ وضو کرلیں۔',
  id: 'Sholat Jumat 30 menit lagi. Siapkan wudu.',
  ms: 'Solat Jumaat 30 minit lagi. Sediakan wudu.',
  bn: '৩০ মিনিটে জুমআ নামাজ। ওজু প্রস্তুত করুন।',
  fa: 'نماز جمعه تا ۳۰ دقیقه دیگر. وضو بگیرید.',
  ru: 'Джум\'а через 30 минут. Приготовьтесь к намазу.',
};

const ADHKAR_TITLES: Record<string, string> = {
  en: 'Adhkar Reminder', es: 'Recordatorio de Adhkar', ar: 'تذكير الأذكار',
  fr: 'Rappel des Adhkar', de: 'Adhkar-Erinnerung', tr: 'Zikir Hatırlatıcısı', pt: 'Lembrete de Adhkar',
};
const ADHKAR_MORNING_BODIES: Record<string, string> = {
  en: 'Time for your morning adhkar.', es: 'Es hora de tus adhkar de la mañana.', ar: 'حان وقت أذكار الصباح.',
  fr: 'C\'est l\'heure de vos adhkar du matin.', de: 'Zeit für deine Morgen-Adhkar.', tr: 'Sabah zikirlerinin vakti.', pt: 'Hora dos seus adhkar da manhã.',
};
const ADHKAR_EVENING_BODIES: Record<string, string> = {
  en: 'Time for your evening adhkar.', es: 'Es hora de tus adhkar de la tarde.', ar: 'حان وقت أذكار المساء.',
  fr: 'C\'est l\'heure de vos adhkar du soir.', de: 'Zeit für deine Abend-Adhkar.', tr: 'Akşam zikirlerinin vakti.', pt: 'Hora dos seus adhkar da tarde.',
};
const KHATMAH_TITLES: Record<string, string> = {
  en: 'Quran Reading', es: 'Lectura del Corán', ar: 'ورد القرآن',
  fr: 'Lecture du Coran', de: 'Koran-Lesung', tr: 'Kur\'an Okuma', pt: 'Leitura do Alcorão',
};
const KHATMAH_BODIES: Record<string, string> = {
  en: 'Keep up your khatmah — read today\'s pages.', es: 'Continúa tu khatmah — lee las páginas de hoy.', ar: 'واصل ختمتك — اقرأ ورد اليوم.',
  fr: 'Continuez votre khatmah — lisez les pages du jour.', de: 'Setze deine Khatmah fort — lies die heutigen Seiten.', tr: 'Hatmine devam et — bugünün sayfalarını oku.', pt: 'Continue sua khatmah — leia as páginas de hoje.',
};

function isInSilentHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

// Build next ~60 days of prayer schedule as { prayer, ts, title, body }[]
function buildSchedule(
  monthlyData: any[],
  settings: any,
  lang: string
): { prayer: string; ts: number; title: string; body: string }[] {
  const schedule: { prayer: string; ts: number; title: string; body: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = Date.now();

  const preMin: number = settings.preAlertMinutes ?? 0;
  const silentEnabled: boolean = settings.silentHoursEnabled ?? false;
  const silentStart: number = settings.silentHoursStart ?? 23;
  const silentEnd: number = settings.silentHoursEnd ?? 5;

  for (const dayData of monthlyData) {
    const gregDay = parseInt(dayData?.date?.gregorian?.day);
    const gregMonth = parseInt(dayData?.date?.gregorian?.month?.number ?? dayData?.date?.gregorian?.month);
    const gregYear = parseInt(dayData?.date?.gregorian?.year);
    if (isNaN(gregDay) || isNaN(gregMonth) || isNaN(gregYear)) continue;

    const baseDate = new Date(gregYear, gregMonth - 1, gregDay);
    if (baseDate < today) continue;

    const isGregorianFriday = baseDate.getDay() === 5;

    for (const prayer of PRAYER_NAMES) {
      const isEnabled = settings[prayer as keyof typeof settings];
      if (!isEnabled) continue;

      const timeStr = dayData.timings?.[prayer];
      if (!timeStr) continue;

      const prayerDate = parsePrayerTime(timeStr, baseDate);
      if (!prayerDate) continue;

      const offset = settings.offsets?.[prayer] ?? 0;
      const mainDate = new Date(prayerDate.getTime());
      mainDate.setMinutes(mainDate.getMinutes() + offset);
      if (mainDate.getTime() <= now) continue;

      const prayerHour = mainDate.getHours();
      const isSilent = silentEnabled && prayer !== 'Fajr' && isInSilentHours(prayerHour, silentStart, silentEnd);

      if (!isSilent) {
        const localName = PRAYER_TITLES[lang]?.[prayer] ?? prayer;
        let body = (NOTIF_BODIES[lang] ?? NOTIF_BODIES.en)(localName);
        if (settings.showRakats && RAKAT_MAP[prayer]) {
          body += lang === 'ar' ? ` (${RAKAT_MAP[prayer]} ركعات)` : ` (${RAKAT_MAP[prayer]} Rakats)`;
        }
        schedule.push({ prayer, ts: mainDate.getTime(), title: NOTIF_TITLES[lang] ?? NOTIF_TITLES.en, body });

        // Pre-alert entry (separate from offset — always relative to raw prayer time)
        if (preMin > 0) {
          const preDate = new Date(prayerDate.getTime());
          preDate.setMinutes(preDate.getMinutes() - preMin);
          if (preDate.getTime() > now) {
            const preLocalName = PRAYER_TITLES[lang]?.[prayer] ?? prayer;
            const preBody = (PRE_ALERT_BODIES[lang] ?? PRE_ALERT_BODIES.en)(preLocalName, preMin);
            schedule.push({
              prayer: `${prayer}_pre`,
              ts: preDate.getTime(),
              title: NOTIF_TITLES[lang] ?? NOTIF_TITLES.en,
              body: preBody,
            });
          }
        }
      }

      // Jumu'ah — add on Fridays before Dhuhr
      if (isGregorianFriday && prayer === 'Dhuhr' && (settings.jumuahReminder ?? true)) {
        const jumuahDate = new Date(prayerDate.getTime());
        jumuahDate.setMinutes(jumuahDate.getMinutes() - 30);
        if (jumuahDate.getTime() > now) {
          const jHour = jumuahDate.getHours();
          const jSilent = silentEnabled && isInSilentHours(jHour, silentStart, silentEnd);
          if (!jSilent) {
            schedule.push({
              prayer: 'jumuah',
              ts: jumuahDate.getTime(),
              title: JUMUAH_TITLES[lang] ?? JUMUAH_TITLES.en,
              body: JUMUAH_BODIES[lang] ?? JUMUAH_BODIES.en,
            });
          }
        }
      }

      // Adhkar reminders — N minutes after Fajr (morning) / Asr (evening).
      if (prayer === 'Fajr' && settings.adhkarMorningReminder) {
        const ad = new Date(prayerDate.getTime());
        ad.setMinutes(ad.getMinutes() + (settings.adhkarMorningOffset ?? 30));
        if (ad.getTime() > now) {
          schedule.push({
            prayer: 'adhkar_morning',
            ts: ad.getTime(),
            title: ADHKAR_TITLES[lang] ?? ADHKAR_TITLES.en,
            body: ADHKAR_MORNING_BODIES[lang] ?? ADHKAR_MORNING_BODIES.en,
          });
        }
      }
      if (prayer === 'Asr' && settings.adhkarEveningReminder) {
        const ad = new Date(prayerDate.getTime());
        ad.setMinutes(ad.getMinutes() + (settings.adhkarEveningOffset ?? 30));
        if (ad.getTime() > now) {
          schedule.push({
            prayer: 'adhkar_evening',
            ts: ad.getTime(),
            title: ADHKAR_TITLES[lang] ?? ADHKAR_TITLES.en,
            body: ADHKAR_EVENING_BODIES[lang] ?? ADHKAR_EVENING_BODIES.en,
          });
        }
      }
    }

    // Khatmah — daily Quran reading reminder at the chosen hour.
    if (settings.khatmahActive && settings.khatmahReminder) {
      const kd = new Date(baseDate);
      kd.setHours(settings.khatmahReminderHour ?? 9, 0, 0, 0);
      if (kd.getTime() > now) {
        schedule.push({
          prayer: 'khatmah',
          ts: kd.getTime(),
          title: KHATMAH_TITLES[lang] ?? KHATMAH_TITLES.en,
          body: KHATMAH_BODIES[lang] ?? KHATMAH_BODIES.en,
        });
      }
    }
  }

  return schedule;
}

export function usePushNotifications() {
  const { prayerData } = usePrayerData();
  const { settings, notificationPermission } = useSettings();
  const { user } = useAuth();
  const syncedRef = useRef(false);
  const lastSyncKey = useRef('');

  useEffect(() => {
    if (
      !prayerData ||
      notificationPermission !== 'granted' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) return;

    const lang = settings.language || 'es';
    // Build a key to detect when a re-sync is needed
    const syncKey = [
      lang,
      settings.calculationMethod,
      settings.Fajr, settings.Dhuhr, settings.Asr, settings.Maghrib, settings.Isha,
      JSON.stringify(settings.offsets),
      settings.showRakats,
      settings.age,
      settings.preAlertMinutes ?? 0,
      settings.jumuahReminder ?? true,
      settings.silentHoursEnabled ?? false,
      settings.silentHoursStart ?? 23,
      settings.silentHoursEnd ?? 5,
      settings.adhkarMorningReminder, settings.adhkarEveningReminder,
      settings.adhkarMorningOffset, settings.adhkarEveningOffset,
      settings.khatmahActive, settings.khatmahReminder, settings.khatmahReminderHour,
      prayerData.date.gregorian.date,
      prayerData.meta?.latitude?.toFixed(3),
      prayerData.meta?.longitude?.toFixed(3),
    ].join('|');

    if (lastSyncKey.current === syncKey && syncedRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        // Get VAPID public key from server
        const keysRes = await fetch('/api/push/keys');
        if (!keysRes.ok) return;
        const { publicKey } = await keysRes.json();
        if (!publicKey || cancelled) return;

        const reg = await navigator.serviceWorker.ready;

        // Register periodic background sync (Chrome/Android). When the browser
        // grants this, the SW fires every ~5 min even with the app fully closed,
        // independent of cron-job.org. Silently skipped on unsupported browsers.
        if ('periodicSync' in reg) {
          try {
            await (reg as any).periodicSync.register('push-prayers', { minInterval: 5 * 60 * 1000 });
          } catch {}
        }

        // Subscribe (or reuse existing subscription)
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
        if (cancelled || !sub) return;

        // Load monthly prayer data for the schedule.
        // Strategy: current month cache → next month cache → fetch from API.
        // Building two months ensures we always have ≥16 days ahead even at month-end.
        const now2 = new Date();
        const lat = prayerData.meta?.latitude ?? settings.manualLatitude;
        const lng = prayerData.meta?.longitude ?? settings.manualLongitude;
        const method = settings.calculationMethod;

        const getMonthCache = (year: number, month: number): any[] => {
          const prefix = `monthly_prayers_${lat.toFixed(3)}_${lng.toFixed(3)}_${year}_${month}_`;
          const key =
            Object.keys(localStorage).find(k => k.startsWith(prefix)) ||
            // fallback: any key for that year/month (different coords, same month)
            Object.keys(localStorage).find(k => k.includes(`_${year}_${month}_`));
          if (!key) return [];
          try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
        };

        const fetchAndCacheMonth = async (year: number, month: number): Promise<any[]> => {
          try {
            const data = await fetchMonthlyPrayerTimes(lat, lng, year, month, method);
            if (data?.length) {
              const key = `monthly_prayers_${lat.toFixed(3)}_${lng.toFixed(3)}_${year}_${month}_m${method}`;
              localStorage.setItem(key, JSON.stringify(data));
            }
            return data ?? [];
          } catch { return []; }
        };

        const curYear = now2.getFullYear();
        const curMonth = now2.getMonth() + 1;
        const nextDate = new Date(curYear, curMonth, 1); // first day of next month
        const nextYear = nextDate.getFullYear();
        const nextMonth = nextDate.getMonth() + 1;

        // Load current month (from cache or API)
        let curData = getMonthCache(curYear, curMonth);
        if (!curData.length) curData = await fetchAndCacheMonth(curYear, curMonth);
        if (cancelled) return;

        // Load next month (from cache or API) — ensures end-of-month coverage
        let nxtData = getMonthCache(nextYear, nextMonth);
        if (!nxtData.length) nxtData = await fetchAndCacheMonth(nextYear, nextMonth);
        if (cancelled) return;

        const schedule = buildSchedule([...curData, ...nxtData], settings, lang);
        if (cancelled || schedule.length === 0) return;

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            schedule,
            language: lang,
            showRakats: settings.showRakats,
            userId: user?.id,
            // Server needs these to auto-rebuild the schedule when it expires.
            lat,
            lng,
            method,
            offsets: settings.offsets ?? {},
            preAlertMinutes: settings.preAlertMinutes ?? 0,
            silentHoursEnabled: settings.silentHoursEnabled ?? false,
            silentHoursStart: settings.silentHoursStart ?? 23,
            silentHoursEnd: settings.silentHoursEnd ?? 5,
            jumuahReminder: settings.jumuahReminder ?? true,
          }),
        });

        if (!cancelled) {
          syncedRef.current = true;
          lastSyncKey.current = syncKey;
        }
      } catch (e) {
        console.warn('[PushNotifications] Sync failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [prayerData, settings, notificationPermission]);
}
