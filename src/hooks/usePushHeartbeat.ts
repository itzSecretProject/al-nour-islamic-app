import { useEffect } from 'react';

// Fires /api/push/send whenever the app opens or comes back to the foreground.
// The server uses Supabase Storage atomic dedup, so double-triggers never produce
// duplicate notifications — they are silently skipped. This means cron-job.org or
// GitHub Actions becoming unreliable never causes missed prayers: the user simply
// gets their notifications the next time they open Al Nour.
export function usePushHeartbeat() {
  useEffect(() => {
    const fire = () => fetch('/api/push/send').catch(() => {});

    fire(); // catch up on any missed prayers right now

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
}
