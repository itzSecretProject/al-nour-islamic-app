import { useEffect, useRef } from 'react';
import { usePrayerData } from '../context/PrayerContext';
import { useSettings } from './useSettings';
import { playAdhanSound } from '../utils/audio';

const RAKAT_MAP: Record<string, number> = {
  Fajr: 2,
  Dhuhr: 4,
  Asr: 4,
  Maghrib: 3,
  Isha: 4,
};

const PRAYER_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: { Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  es: { Fajr: 'Fajr', Sunrise: 'Amanecer', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  ar: { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
  fr: { Fajr: 'Fajr', Sunrise: 'Lever du Soleil', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  de: { Fajr: 'Fadschr', Sunrise: 'Sonnenaufgang', Dhuhr: 'Duhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Ischa' },
  tr: { Fajr: 'İmsak', Sunrise: 'Güneş', Dhuhr: 'Öğle', Asr: 'İkindi', Maghrib: 'Akşam', Isha: 'Yatsı' },
  pt: { Fajr: 'Fajr', Sunrise: 'Amanhecer', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
};

function isInSilentHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start > end) return hour >= start || hour < end; // wraps midnight (e.g. 23–5)
  return hour >= start && hour < end;
}

function buildNotifTitles(lang: string) {
  const notifTitles: Record<string, string> = {
    en: 'Prayer Reminder', es: 'Recordatorio de Rezo', ar: 'تنبيه الصلاة',
    fr: 'Rappel de Prière', de: 'Gebetserinnerung', tr: 'Namaz Hatırlatıcısı', pt: 'Lembrete de Oração',
  };
  return notifTitles[lang] ?? notifTitles.en;
}

function showSwNotification(title: string, opts: NotificationOptions) {
  const swTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 2000));
  if ('serviceWorker' in navigator) {
    Promise.race([navigator.serviceWorker.ready, swTimeout])
      .then((reg) => (reg as ServiceWorkerRegistration).showNotification(title, opts))
      .catch(() => { try { new Notification(title, { body: opts.body as string, icon: '/icon-192.png' }); } catch {} });
  } else {
    try { new Notification(title, { body: opts.body as string, icon: '/icon-192.png' }); } catch {}
  }
}

export const useReminders = () => {
  const { prayerData } = usePrayerData();
  const { settings, notificationPermission } = useSettings();
  const notifiedSet = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!prayerData || notificationPermission !== 'granted') return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentTotalMinutes = currentHour * 60 + now.getMinutes();
      const dateKey = prayerData.date.gregorian.date;
      const lang = settings.language || 'es';
      const isFriday = now.getDay() === 5;

      const cleanTime = (timeStr: string) => timeStr.replace(/ \(([^)]+)\)/, '').trim();

      const actionLabels: Record<string, { prayed: string; missed: string }> = {
        en: { prayed: 'I prayed', missed: 'Not yet' },
        es: { prayed: 'Recé', missed: 'Aún no' },
        ar: { prayed: 'صليت', missed: 'ليس بعد' },
        fr: { prayed: "J'ai prié", missed: 'Pas encore' },
        de: { prayed: 'Gebetet', missed: 'Noch nicht' },
        tr: { prayed: 'Kıldım', missed: 'Henüz değil' },
        pt: { prayed: 'Orei', missed: 'Ainda não' },
      };
      const labels = actionLabels[lang] ?? actionLabels.en;

      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

      prayers.forEach(prayer => {
        const isEnabled = settings[prayer as keyof typeof settings] as boolean;
        if (!isEnabled) return;

        const timeStr = cleanTime(prayerData.timings[prayer as keyof typeof prayerData.timings]);
        if (!timeStr) return;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const offset = settings.offsets?.[prayer as keyof typeof settings.offsets] ?? 0;
        const reminderTotalMinutes = hours * 60 + minutes + offset;

        const notifTitle = buildNotifTitles(lang);
        const localName = PRAYER_TRANSLATIONS[lang]?.[prayer] ?? prayer;
        const rakatCount = RAKAT_MAP[prayer];
        let bodyStr = lang === 'ar'
          ? `حان وقت صلاة ${localName}.`
          : lang === 'es' ? `Es hora del rezo de ${localName}.`
          : lang === 'fr' ? `C'est l'heure de la prière de ${localName}.`
          : lang === 'de' ? `Es ist Zeit für das ${localName}-Gebet.`
          : lang === 'tr' ? `${localName} namaz vakti geldi.`
          : lang === 'pt' ? `Chegou a hora da oração de ${localName}.`
          : `Time for ${localName} prayer.`;
        if (settings.showRakats && rakatCount) {
          bodyStr += lang === 'ar' ? ` (${rakatCount} ركعات)` : ` (${rakatCount} Rakats)`;
        }

        // ── Pre-alert notification (N minutes BEFORE prayer, separate from offset) ──
        const preMin = settings.preAlertMinutes ?? 0;
        if (preMin > 0) {
          const preKey = `${dateKey}-${prayer}-pre`;
          const preTotalMinutes = hours * 60 + minutes - preMin; // always relative to actual prayer time
          if (
            currentTotalMinutes >= preTotalMinutes &&
            currentTotalMinutes < preTotalMinutes + 5 &&
            !notifiedSet.current.has(preKey)
          ) {
            const isSilent = settings.silentHoursEnabled && prayer !== 'Fajr' &&
              isInSilentHours(currentHour, settings.silentHoursStart, settings.silentHoursEnd);
            if (!isSilent) {
              const preBody = lang === 'ar'
                ? `صلاة ${localName} بعد ${preMin} دقائق.`
                : lang === 'es' ? `${localName} en ${preMin} min.`
                : lang === 'fr' ? `${localName} dans ${preMin} min.`
                : lang === 'de' ? `${localName} in ${preMin} Min.`
                : lang === 'tr' ? `${localName} ${preMin} dakika sonra.`
                : lang === 'pt' ? `${localName} em ${preMin} min.`
                : `${localName} in ${preMin} min.`;
              showSwNotification(notifTitle, {
                body: preBody,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [100, 50, 100],
                tag: `prayer-pre-${prayer}`,
                renotify: true,
                data: { prayer: `${prayer}_pre`, lang },
                actions: [],
              } as NotificationOptions);
            }
            notifiedSet.current.add(preKey);
          }
        }

        // ── Main prayer notification ──
        const notifKey = `${dateKey}-${prayer}`;
        if (
          currentTotalMinutes >= reminderTotalMinutes &&
          currentTotalMinutes < reminderTotalMinutes + 5 &&
          !notifiedSet.current.has(notifKey)
        ) {
          const isSilent = settings.silentHoursEnabled && prayer !== 'Fajr' &&
            isInSilentHours(currentHour, settings.silentHoursStart, settings.silentHoursEnd);
          if (!isSilent) {
            playAdhanSound(prayer === 'Fajr' ? settings.soundFajr : settings.soundGeneral);
            showSwNotification(notifTitle, {
              body: bodyStr,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              vibrate: [200, 100, 200],
              tag: `prayer-${prayer}`,
              renotify: true,
              requireInteraction: true,
              data: { prayer, lang },
              actions: settings.showPrayerTracker
                ? [{ action: 'prayed', title: labels.prayed }, { action: 'missed', title: labels.missed }]
                : [],
            } as NotificationOptions);
          }
          notifiedSet.current.add(notifKey);
        }
      });

      // ── Jumu'ah (Friday) reminder: 30 min before Dhuhr ──
      if (settings.jumuahReminder && isFriday) {
        const dhuhrStr = cleanTime(prayerData.timings['Dhuhr'] as string);
        if (dhuhrStr) {
          const [dh, dm] = dhuhrStr.split(':').map(Number);
          const jumuahMinutes = dh * 60 + dm - 30;
          const jumuahKey = `${dateKey}-jumuah`;
          if (
            currentTotalMinutes >= jumuahMinutes &&
            currentTotalMinutes < jumuahMinutes + 5 &&
            !notifiedSet.current.has(jumuahKey)
          ) {
            const isSilent = settings.silentHoursEnabled &&
              isInSilentHours(currentHour, settings.silentHoursStart, settings.silentHoursEnd);
            if (!isSilent) {
              const jTitle = lang === 'ar' ? '🕌 صلاة الجمعة' : lang === 'es' ? '🕌 Salat al-Jumu\'ah' : '🕌 Jumu\'ah Prayer';
              const jBody = lang === 'ar'
                ? 'موعد صلاة الجمعة خلال 30 دقيقة. استعد بالوضوء والتكبير.'
                : lang === 'es' ? 'El Jumu\'ah comienza en 30 minutos. Prepárate con wudu y niyya.'
                : 'Jumu\'ah begins in 30 minutes. Prepare with wudu and intention.';
              showSwNotification(jTitle, {
                body: jBody,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [200, 100, 200, 100, 200],
                tag: 'prayer-jumuah',
                renotify: true,
                data: { prayer: 'jumuah', lang },
                actions: [],
              } as NotificationOptions);
            }
            notifiedSet.current.add(jumuahKey);
          }
        }
      }

      // ── Fasting reminder (07:30) ──
      if (settings.fastingReminders && currentTotalMinutes >= 7 * 60 + 30 && currentTotalMinutes < 7 * 60 + 35) {
        const todayDateStr = prayerData.date.gregorian.date;
        const fastingKey = `fasting-notif-${todayDateStr}`;
        if (!notifiedSet.current.has(fastingKey)) {
          const hijriDay = parseInt(prayerData.date.hijri.day);
          const hijriMonth = prayerData.date.hijri.month.number;
          const dayOfWeek = now.getDay();
          let isFastingDay = false;
          let fastName = '';

          if (hijriMonth !== 9 && (hijriDay === 13 || hijriDay === 14 || hijriDay === 15)) {
            if (!(hijriMonth === 12 && hijriDay === 13)) {
              isFastingDay = true;
              fastName = lang === 'es' ? `Día Blanco (${hijriDay})` : `White Day (${hijriDay})`;
            }
          } else if (hijriMonth !== 9 && (dayOfWeek === 1 || dayOfWeek === 4)) {
            isFastingDay = true;
            fastName = dayOfWeek === 1
              ? (lang === 'es' ? 'Lunes (Sunnah)' : 'Monday (Sunnah)')
              : (lang === 'es' ? 'Jueves (Sunnah)' : 'Thursday (Sunnah)');
          } else if (hijriMonth === 12 && hijriDay === 9) {
            isFastingDay = true;
            fastName = lang === 'es' ? 'Día de Arafah' : 'Day of Arafah';
          } else if (hijriMonth === 1 && (hijriDay === 9 || hijriDay === 10)) {
            isFastingDay = true;
            fastName = hijriDay === 9
              ? (lang === 'es' ? "Día de Tasu'a" : "Day of Tasu'a")
              : (lang === 'es' ? 'Día de Ashura' : 'Day of Ashura');
          }

          if (isFastingDay) {
            const fTitle = lang === 'es' ? 'Día de Ayuno Recomendado' : 'Recommended Fasting Day';
            const fBody = lang === 'es'
              ? `Hoy es ${fastName}. Recuerda que es muy recomendado ayunar hoy.`
              : `Today is ${fastName}. Remember that it is highly recommended to fast today.`;
            showSwNotification(fTitle, {
              body: fBody, icon: '/icon-192.png', badge: '/icon-192.png', vibrate: [200, 100, 200],
            } as NotificationOptions);
          }
          notifiedSet.current.add(fastingKey);
        }
      }

      // ── Islamic date alerts (fires once at 07:00 on matching hijri dates) ──
      if (settings.islamicDateAlerts && currentTotalMinutes >= 7 * 60 && currentTotalMinutes < 7 * 60 + 5) {
        const hijriDay = parseInt(prayerData.date.hijri.day);
        const hijriMonth = prayerData.date.hijri.month.number;
        const islamicKey = `islamic-date-${dateKey}`;

        if (!notifiedSet.current.has(islamicKey)) {
          type IslamicEvent = { ar: string; es: string; en: string };
          const events: Record<string, IslamicEvent> = {
            '9-1': { ar: '🌙 رمضان مبارك!', es: '🌙 ¡Comienza Ramadán!', en: '🌙 Ramadan begins today!' },
            '9-27': { ar: '🌟 ليلة القدر المحتملة', es: '🌟 Posible Laylatul Qadr', en: '🌟 Possible Laylatul Qadr tonight' },
            '10-1': { ar: '🎉 عيد الفطر مبارك!', es: '🎉 ¡Eid al-Fitr Mubarak!', en: '🎉 Eid al-Fitr Mubarak!' },
            '12-9': { ar: '🕋 يوم عرفة', es: '🕋 Día de Arafah', en: '🕋 Day of Arafah' },
            '12-10': { ar: '🎉 عيد الأضحى مبارك!', es: '🎉 ¡Eid al-Adha Mubarak!', en: '🎉 Eid al-Adha Mubarak!' },
            '1-10': { ar: '🌊 عاشوراء', es: '🌊 Día de Ashura', en: '🌊 Day of Ashura' },
            '3-12': { ar: '🌹 مولد النبي ﷺ', es: '🌹 Mawlid an-Nabawi ﷺ', en: '🌹 Mawlid an-Nabawi ﷺ' },
          };
          const eventKey = `${hijriMonth}-${hijriDay}`;
          const event = events[eventKey];
          if (event) {
            const msg = (lang === 'ar' ? event.ar : lang === 'es' ? event.es : event.en);
            const [eTitle, ...eParts] = msg.split(' ');
            showSwNotification(eTitle + ' Al Nour', {
              body: eParts.join(' '),
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              vibrate: [200, 100, 200, 100, 200],
              tag: 'islamic-event',
              data: { prayer: 'event', lang },
              actions: [],
            } as NotificationOptions);
          }
          notifiedSet.current.add(islamicKey);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [prayerData, settings, notificationPermission]);
};
