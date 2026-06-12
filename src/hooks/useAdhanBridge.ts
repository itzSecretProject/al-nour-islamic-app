import { useEffect } from 'react';
import { useSettings } from './useSettings';
import { playAdhanSound } from '../utils/audio';

// When a background push arrives and this client is alive, the service worker
// posts a PLAY_ADHAN message. We play the user's chosen adhan here (the SW
// itself cannot play custom long audio). Covers the open / background-tab case
// — typically desktop, or a phone with the PWA in the foreground.
export function useAdhanBridge() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'PLAY_ADHAN') return;
      const sound = e.data.prayer === 'Fajr' ? settings.soundFajr : settings.soundGeneral;
      if (sound && sound !== 'none') playAdhanSound(sound);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [settings.soundFajr, settings.soundGeneral]);
}
