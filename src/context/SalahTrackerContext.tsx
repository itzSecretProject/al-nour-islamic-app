import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { isAccountable } from './SettingsContext';
import { drainPendingPrayerLogs, PrayerStatus } from '../utils/idb';

export const OBLIGATORY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type ObligatoryPrayer = (typeof OBLIGATORY_PRAYERS)[number];

type DayLog = Partial<Record<ObligatoryPrayer, PrayerStatus>>;
type SalahLog = Record<string, DayLog>; // key = YYYY-MM-DD (local)

const STORAGE_KEY = 'salah_log_v1';

export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function exportSalahLogCSV(log: SalahLog): void {
  const rows = ['Date,Fajr,Dhuhr,Asr,Maghrib,Isha'];
  for (const date of Object.keys(log).sort()) {
    const day = log[date];
    const cols = OBLIGATORY_PRAYERS.map(p => day[p] ?? '');
    rows.push([date, ...cols].join(','));
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `salah-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface SalahTrackerContextType {
  log: SalahLog;
  todayKey: string;
  today: DayLog;
  setStatus: (date: string, prayer: ObligatoryPrayer, status: PrayerStatus | null) => void;
  toggle: (prayer: ObligatoryPrayer) => void; // cycles null -> prayed -> missed -> null for today
  streak: number;
  todayPrayedCount: number;
  monthStats: { prayed: number; total: number; days: number };
}

const SalahTrackerContext = createContext<SalahTrackerContextType | null>(null);

function loadLog(): SalahLog {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export const SalahTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [log, setLog] = useState<SalahLog>(loadLog);
  const logRef = useRef(log);
  logRef.current = log;

  const persist = useCallback((next: SalahLog) => {
    setLog(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const setStatus = useCallback(
    (date: string, prayer: ObligatoryPrayer, status: PrayerStatus | null) => {
      const next: SalahLog = { ...logRef.current };
      const day: DayLog = { ...(next[date] || {}) };
      if (status === null) {
        delete day[prayer];
      } else {
        day[prayer] = status;
      }
      if (Object.keys(day).length === 0) {
        delete next[date];
      } else {
        next[date] = day;
      }
      persist(next);
    },
    [persist]
  );

  const todayKey = localDateKey();

  const toggle = useCallback(
    (prayer: ObligatoryPrayer) => {
      const cur = logRef.current[todayKey]?.[prayer];
      const nextStatus: PrayerStatus | null =
        cur === undefined ? 'prayed' : cur === 'prayed' ? 'missed' : null;
      setStatus(todayKey, prayer, nextStatus);
    },
    [setStatus, todayKey]
  );

  // Drain pending logs written by the Service Worker (notification actions).
  const drain = useCallback(async () => {
    const pending = await drainPendingPrayerLogs();
    if (pending.length === 0) return;
    const next: SalahLog = { ...logRef.current };
    for (const p of pending) {
      const pr = p.prayer as ObligatoryPrayer;
      if (!OBLIGATORY_PRAYERS.includes(pr)) continue;
      const day: DayLog = { ...(next[p.date] || {}) };
      day[pr] = p.status;
      next[p.date] = day;
    }
    persist(next);
  }, [persist]);

  useEffect(() => {
    drain();
    const onVisible = () => {
      if (document.visibilityState === 'visible') drain();
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PRAYER_LOGGED') drain();
    };
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [drain]);

  // ----- Derived stats -----
  const accountable = isAccountable(settings.age);

  // A day "counts" for the streak when, for an accountable user, all 5 obligatory
  // prayers are prayed; for a child, when at least one prayer is prayed (gentle).
  const dayCounts = useCallback(
    (key: string): boolean => {
      const day = log[key];
      if (!day) return false;
      const prayed = OBLIGATORY_PRAYERS.filter((p) => day[p] === 'prayed').length;
      return accountable ? prayed === OBLIGATORY_PRAYERS.length : prayed >= 1;
    },
    [log, accountable]
  );

  const streak = (() => {
    let s = 0;
    const d = new Date();
    if (!dayCounts(localDateKey(d))) d.setDate(d.getDate() - 1); // grace for today
    while (dayCounts(localDateKey(d))) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  })();

  const today = log[todayKey] || {};
  const todayPrayedCount = OBLIGATORY_PRAYERS.filter((p) => today[p] === 'prayed').length;

  const monthStats = (() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
    let prayed = 0;
    let total = 0;
    const daySet = new Set<string>();
    for (const key of Object.keys(log)) {
      if (!key.startsWith(prefix)) continue;
      daySet.add(key);
      for (const p of OBLIGATORY_PRAYERS) {
        const st = log[key][p];
        if (st === 'prayed') {
          prayed++;
          total++;
        } else if (st === 'missed') {
          total++;
        }
      }
    }
    return { prayed, total, days: daySet.size };
  })();

  return (
    <SalahTrackerContext.Provider
      value={{ log, todayKey, today, setStatus, toggle, streak, todayPrayedCount, monthStats }}
    >
      {children}
    </SalahTrackerContext.Provider>
  );
};

export const useSalahTracker = () => {
  const ctx = useContext(SalahTrackerContext);
  if (!ctx) throw new Error('useSalahTracker must be used within SalahTrackerProvider');
  return ctx;
};
