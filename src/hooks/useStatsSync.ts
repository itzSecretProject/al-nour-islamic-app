import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSalahTracker } from '../context/SalahTrackerContext';
import { useMemorization } from '../context/MemorizationContext';

// Mirrors the local prayer streak / memorized count to the user's Supabase
// profile so friends can see live stats. Only writes when something changed.
export function useStatsSync() {
  const { user, profile, updateStats } = useAuth();
  const { streak, todayPrayedCount } = useSalahTracker();
  const { count } = useMemorization();
  const lastSig = useRef('');

  useEffect(() => {
    if (!user || !profile) return;
    const best = Math.max(profile.best_streak || 0, streak);
    const sig = `${streak}|${best}|${count}|${todayPrayedCount}`;
    if (sig === lastSig.current) return;

    const unchanged =
      profile.current_streak === streak &&
      profile.best_streak === best &&
      profile.total_memorized === count &&
      profile.prayers_today === todayPrayedCount;
    lastSig.current = sig;
    if (unchanged) return;

    updateStats({
      current_streak: streak,
      best_streak: best,
      total_memorized: count,
      prayers_today: todayPrayedCount,
    });
  }, [user, profile, streak, count, todayPrayedCount, updateStats]);
}
