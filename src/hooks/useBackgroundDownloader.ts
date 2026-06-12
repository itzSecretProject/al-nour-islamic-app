import { useEffect, useRef } from 'react';
import { useSettings } from './useSettings';

export function useBackgroundDownloader() {
  const { settings } = useSettings();
  const reciter = settings.reciter || 'ar.alafasy';
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Stop any existing downloader loop when reciter changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const checkWifiAndDownload = async () => {
      // Auto-download on any active connection. We only back off when the user has
      // explicitly turned on data-saver (saveData) — otherwise the Quran caches
      // itself locally in the background without the user lifting a finger.
      const isConnectionFriendly = () => {
        if (abortController.signal.aborted) return false;
        if (typeof navigator === 'undefined') return false;
        if (!navigator.onLine) return false;

        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn && conn.saveData) return false; // respect Data Saver
        return true;
      };

      if (!isConnectionFriendly()) return;

      try {
        // Fetch surahs list (already cached by the service worker)
        const surahsRes = await fetch('https://api.alquran.cloud/v1/surah', { signal: abortController.signal });
        if (!surahsRes.ok) return;
        const surahsJson = await surahsRes.json();
        const surahs = surahsJson.data;

        // Retrieve where we left off for this specific reciter
        const progressKey = `last_cached_surah_index_${reciter}`;
        const startSurah = parseInt(localStorage.getItem(progressKey) || '1', 10);

        if (startSurah > 114) {
          console.log(`[Background Downloader] All surahs for reciter ${reciter} are cached.`);
          return;
        }

        // Must match the Service Worker's AUDIO_CACHE_NAME, or the SW purges these
        // entries on activation and playback can't find them offline.
        const cache = await caches.open('al-nour-audio-v4');

        // Loop through remaining surahs
        for (let sNum = startSurah; sNum <= 114; sNum++) {
          if (abortController.signal.aborted) return;
          if (!isConnectionFriendly()) {
            console.log('[Background Downloader] Network changed. Pausing loop.');
            return;
          }

          console.log(`[Background Downloader] Pre-caching Surah ${sNum} for ${reciter}...`);

          const isCustomReciter = reciter === 'ar.yasseraddussari' || reciter === 'ar.saadghamidi';
          const apiReciter = isCustomReciter ? 'ar.alafasy' : reciter;

          // Fetch the surah audio metadata to get ayah audio URLs
          const surahAudioRes = await fetch(`https://api.alquran.cloud/v1/surah/${sNum}/${apiReciter}`, { signal: abortController.signal });
          if (!surahAudioRes.ok) {
            // Wait 5 seconds and retry later
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          const surahAudioJson = await surahAudioRes.json();
          let ayahs = surahAudioJson.data.ayahs;

          if (isCustomReciter) {
            const folder = reciter === 'ar.yasseraddussari' ? 'Yasser_Ad-Dussary_128kbps' : 'Ghamadi_40kbps';
            ayahs = ayahs.map((ayah: any) => {
              const surahStr = String(sNum).padStart(3, '0');
              const ayahStr = String(ayah.numberInSurah).padStart(3, '0');
              return {
                ...ayah,
                audio: `https://everyayah.com/data/${folder}/${surahStr}${ayahStr}.mp3`
              };
            });
          }

          // Download and cache each ayah audio file sequentially
          for (let aIdx = 0; aIdx < ayahs.length; aIdx++) {
            if (abortController.signal.aborted) return;
            if (!isConnectionFriendly()) return;

            const ayah = ayahs[aIdx];
            if (ayah.audio) {
              try {
                const match = await cache.match(ayah.audio);
                if (!match) {
                  // Caching file via fetch
                  const audioRes = await fetch(ayah.audio, { signal: abortController.signal });
                  if (audioRes.ok) {
                    await cache.put(ayah.audio, audioRes);
                  }
                }
              } catch (e) {
                console.error(`[Background Downloader] Caching error for surah ${sNum} ayah ${aIdx + 1}:`, e);
              }
            }

            // Wait 1.2 seconds between downloads to avoid high CPU/bandwidth usage
            await new Promise(resolve => setTimeout(resolve, 1200));
          }

          // Mark surah as cached successfully
          localStorage.setItem(progressKey, (sNum + 1).toString());
          console.log(`[Background Downloader] Caching completed for Surah ${sNum}.`);

          // Wait 3 seconds before starting the next surah
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[Background Downloader] Error:', err);
        }
      }
    };

    // Run background downloader loop
    checkWifiAndDownload();

    const handleConnectionChange = () => {
      checkWifiAndDownload();
    };

    window.addEventListener('online', handleConnectionChange);
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', handleConnectionChange);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener('online', handleConnectionChange);
      if (conn) {
        conn.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [reciter]);
}
