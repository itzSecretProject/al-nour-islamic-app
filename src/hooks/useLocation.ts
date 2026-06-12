import { useState, useEffect, useRef } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

const CACHE_KEY = 'al_nour_last_position';

function loadCached(): { latitude: number; longitude: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.latitude === 'number' && typeof p.longitude === 'number') return p;
  } catch {}
  return null;
}

function saveCache(lat: number, lng: number) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ latitude: lat, longitude: lng })); } catch {}
}

// Auto-updating geolocation. It refreshes silently whenever the app returns to
// the foreground, and only ever shows the browser permission prompt once — if
// the permission is already granted it never prompts again (handled by the
// Permissions API guard), so the user is never nagged with repeated pop-ups.
// Cached coordinates are restored immediately on load so the app shows real
// times right away — no Mecca fallback flicker on subsequent opens.
export const useLocation = () => {
  const cached = loadCached();
  const [location, setLocation] = useState<LocationState>({
    // Use cached position from last session if available, otherwise Mecca
    latitude: cached?.latitude ?? 21.422487,
    longitude: cached?.longitude ?? 39.826206,
    error: null,
    loading: !cached, // already have a position → not loading
  });
  const lastFetch = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported by your browser', loading: false }));
      return;
    }

    let cancelled = false;

    const fetchPosition = (silent: boolean) => {
      // Throttle background refreshes to once a minute to avoid churn.
      if (silent && Date.now() - lastFetch.current < 60_000) return;
      lastFetch.current = Date.now();
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          saveCache(lat, lng);
          setLocation({ latitude: lat, longitude: lng, error: null, loading: false });
        },
        (error) => {
          if (cancelled) return;
          // On a silent refresh, keep the last good position rather than reset.
          setLocation(prev => ({
            ...prev,
            error: error.code === error.PERMISSION_DENIED
              ? 'Location permission denied. Using default location (Mecca).'
              : prev.error,
            loading: false,
          }));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: silent ? 0 : 300000 }
      );
    };

    // Initial read (may prompt once if the user hasn't decided yet).
    fetchPosition(false);

    // Refresh on foreground only when permission is already granted (never prompts).
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
        if (!status || status.state === 'granted') fetchPosition(true);
      } catch {
        // Permissions API unsupported: getCurrentPosition won't re-prompt once decided.
        fetchPosition(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    // Live-update if the OS permission flips to granted later.
    let permStatus: PermissionStatus | null = null;
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((s) => {
      permStatus = s;
      s.onchange = () => { if (s.state === 'granted') fetchPosition(true); };
    }).catch(() => {});

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  return location;
};
