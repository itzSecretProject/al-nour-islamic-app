import React, { useState, useEffect, useRef } from 'react';
import { fetchAllSurahs, fetchSurahEditions, SurahMeta, SurahData, Ayah } from '../api/quran';
import { ChevronLeft, Play, Pause, Loader2, Download, CheckCircle2, Repeat, Repeat1, Share2, Sparkles, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../hooks/useSettings';
import { translations, LANGUAGE_TRANSLATION_EDITIONS } from '../utils/translations';
import { shareAyahCard } from '../utils/shareCard';
import { FriendPickerModal } from '../components/social/FriendPickerModal';

interface VerseOfDay {
  arabic: string;
  translation: string;
  transliteration: string;
  reference: string;
}

export function QuranScreen() {
  const { settings } = useSettings();
  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [surahData, setSurahData] = useState<SurahData[] | null>(null);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [surahError, setSurahError] = useState<string | null>(null);
  
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  // url → object-URL cache so the next ayah is ready before the current ends (gapless).
  const prefetchRef = useRef<Map<string, string>>(new Map());
  
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  // Download states
  const [downloadingSurah, setDownloadingSurah] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Autoplay states & refs
  const [autoplay, setAutoplay] = useState(true);
  const [shareToFriend, setShareToFriend] = useState<{ arabic: string; translation: string; reference: string } | null>(null);
  const autoplayRef = useRef(autoplay);
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    autoplayRef.current = autoplay;
  }, [autoplay]);

  // Track user touch/scroll interactions to pause auto-scrolling
  const handleUserActivity = () => {
    lastInteractionRef.current = Date.now();
  };

  useEffect(() => {
    if (selectedSurah === null) return;
    
    lastInteractionRef.current = Date.now();
    const events = ['touchstart', 'scroll', 'mousedown', 'wheel', 'touchmove'];
    events.forEach(e => window.addEventListener(e, handleUserActivity, { passive: true }));
    
    return () => {
      events.forEach(e => window.removeEventListener(e, handleUserActivity));
    };
  }, [selectedSurah]);

  // Auto-scroll to currently playing Ayah on inactive user state
  useEffect(() => {
    if (playingAyah !== null) {
      const checkAndScroll = () => {
        const timeSinceInteraction = Date.now() - lastInteractionRef.current;
        if (timeSinceInteraction > 6000) {
          const el = document.getElementById(`ayah-card-${playingAyah}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      };

      const timeout = setTimeout(checkAndScroll, 250);
      return () => clearTimeout(timeout);
    }
  }, [playingAyah]);

  useEffect(() => {
    fetchAllSurahs().then(data => {
      setSurahs(data);
      setLoadingList(false);
    });
  }, []);

  // Verse of the day — deterministic per calendar day, cached so it only fetches once.
  useEffect(() => {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const ayahNum = (dayOfYear % 6236) + 1;
    const trans = LANGUAGE_TRANSLATION_EDITIONS[settings.language] || 'en.sahih';
    const cacheKey = `verse_of_day_${now.getFullYear()}_${dayOfYear}_${settings.language}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setVerseOfDay(JSON.parse(cached)); return; } catch {}
    }
    let active = true;
    fetch(`https://api.alquran.cloud/v1/ayah/${ayahNum}/editions/quran-uthmani,${trans},en.transliteration`)
      .then(r => r.json())
      .then(json => {
        if (!active || json.code !== 200) return;
        const eds = json.data as any[];
        const ar = eds.find(e => e.edition.identifier === 'quran-uthmani');
        const tr = eds.find(e => e.edition.identifier === trans) || eds.find(e => e.edition.type === 'translation');
        const tl = eds.find(e => e.edition.identifier === 'en.transliteration');
        if (!ar) return;
        const v: VerseOfDay = {
          arabic: ar.text,
          translation: tr?.text || '',
          transliteration: tl?.text || '',
          reference: `${ar.surah.englishName} ${ar.surah.number}:${ar.numberInSurah}`,
        };
        setVerseOfDay(v);
        try { localStorage.setItem(cacheKey, JSON.stringify(v)); } catch {}
      })
      .catch(() => {});
    return () => { active = false; };
  }, [settings.language]);

  // Reload surah data when selected surah, language, or reciter settings change
  useEffect(() => {
    if (selectedSurah === null) return;
    const selectedSurahNum = selectedSurah; // Use a helper reference
    if (selectedSurahNum === null) return;
    
    let active = true;
    setLoadingSurah(true);
    setSurahError(null);
    setSurahData(null);
    setPlayingAyah(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const transEdition = LANGUAGE_TRANSLATION_EDITIONS[settings.language] || 'en.sahih';
    const reciterEdition = settings.reciter || 'ar.alafasy';
    const isCustomReciter = reciterEdition === 'ar.yasseraddussari' || reciterEdition === 'ar.saadghamidi';
    const apiReciter = isCustomReciter ? 'ar.alafasy' : reciterEdition;
    
    clearBlobUrls();
    fetchSurahEditions(selectedSurahNum, transEdition, apiReciter)
      .then(data => {
        if (active) {
          if (isCustomReciter) {
            const folder = reciterEdition === 'ar.yasseraddussari' ? 'Yasser_Ad-Dussary_128kbps' : 'Ghamadi_40kbps';
            const mappedData = data.map(edData => {
              if (edData.edition.format === 'audio') {
                const mappedAyahs = edData.ayahs.map(ayah => {
                  const surahStr = String(edData.number).padStart(3, '0');
                  const ayahStr = String(ayah.numberInSurah).padStart(3, '0');
                  return {
                    ...ayah,
                    audio: `https://everyayah.com/data/${folder}/${surahStr}${ayahStr}.mp3`
                  };
                });
                return {
                  ...edData,
                  ayahs: mappedAyahs,
                  edition: {
                    ...edData.edition,
                    identifier: reciterEdition,
                    name: reciterEdition === 'ar.yasseraddussari' ? 'Yasser Al-Dossari' : 'Saad Al-Ghamdi',
                    englishName: reciterEdition === 'ar.yasseraddussari' ? 'Yasser Al-Dossari' : 'Saad Al-Ghamdi'
                  }
                };
              }
              return edData;
            });
            setSurahData(mappedData);
          } else {
            setSurahData(data);
          }
          setLoadingSurah(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (active) {
          setSurahError(t.quranSurahError);
          setLoadingSurah(false);
        }
      });
      
    return () => {
      active = false;
    };
  }, [selectedSurah, settings.language, settings.reciter]);

  // Check if surah audio is already fully cached
  const checkDownloadStatus = async (data: SurahData[]) => {
    const audioEdition = data.find(d => d.edition.format === 'audio');
    if (!audioEdition) return;
    try {
      const cache = await caches.open('al-nour-audio-v4');
      let allExist = true;
      for (const ayah of audioEdition.ayahs) {
        if (ayah.audio) {
          const match = await cache.match(ayah.audio);
          if (!match) {
            allExist = false;
            break;
          }
        }
      }
      setIsDownloaded(allExist);
    } catch {
      setIsDownloaded(false);
    }
  };

  useEffect(() => {
    if (surahData) {
      checkDownloadStatus(surahData);
    }
  }, [surahData]);

  const clearBlobUrls = () => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    prefetchRef.current.clear();
  };

  const openSurah = (num: number) => {
    setSelectedSurah(num);
  };

  const closeSurah = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setSelectedSurah(null);
    setPlayingAyah(null);
    setSurahError(null);
    clearBlobUrls();
  };

  const handleDownload = async () => {
    const audioEdition = surahData?.find(d => d.edition.format === 'audio');
    if (!surahData || !audioEdition) return;
    setDownloadingSurah(true);
    setDownloadProgress(0);
    
    const ayahs = audioEdition.ayahs;
    try {
      const cache = await caches.open('al-nour-audio-v4');
      let successCount = 0;
      const total = ayahs.filter(a => a.audio).length;
      
      for (let i = 0; i < ayahs.length; i++) {
        const ayah = ayahs[i];
        if (ayah.audio) {
          try {
            const match = await cache.match(ayah.audio);
            if (!match) {
              const res = await fetch(ayah.audio);
              if (res.ok) {
                await cache.put(ayah.audio, res);
              }
            }
            successCount++;
            setDownloadProgress(Math.round((successCount / total) * 100));
          } catch (e) {
            console.error("Error caching ayah:", e);
          }
        }
      }
      setIsDownloaded(true);
    } catch (e) {
      console.error("Cache open error:", e);
    } finally {
      setDownloadingSurah(false);
    }
  };

  // Return an object-URL for the audio, reusing a prefetched one when available so
  // playback can start instantly (no fetch/decode gap between ayahs).
  const getBlobUrl = async (url: string): Promise<string> => {
    const cached = prefetchRef.current.get(url);
    if (cached) return cached;
    // Fetch via the service worker and play from a Blob URL to dodge Safari range bugs.
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    blobUrlsRef.current.push(blobUrl);
    prefetchRef.current.set(url, blobUrl);
    return blobUrl;
  };

  // Warm the cache for the next ayah while the current one is still playing.
  const prefetchAudio = (url: string | undefined) => {
    if (!url || prefetchRef.current.has(url)) return;
    getBlobUrl(url).catch(() => {});
  };

  const playAudio = async (ayahNum: number, audioUrl: string | undefined) => {
    if (!audioUrl) return;

    if (playingAyah === ayahNum && audioRef.current) {
      audioRef.current.pause();
      setPlayingAyah(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      setPlayingAyah(ayahNum);

      const blobUrl = await getBlobUrl(audioUrl);

      const audio = new Audio(blobUrl);
      audio.preload = 'auto';
      audioRef.current = audio;

      // Prefetch the next ayah NOW so onended can chain to it with no gap.
      const audioEdition = surahData?.find(d => d.edition.format === 'audio');
      const nextAyah = audioEdition?.ayahs.find(a => a.numberInSurah === ayahNum + 1);
      prefetchAudio(nextAyah?.audio);

      audio.onended = () => {
        if (!autoplayRef.current) {
          setPlayingAyah(null);
          return;
        }
        if (nextAyah && nextAyah.audio) {
          playAudio(ayahNum + 1, nextAyah.audio);
        } else {
          setPlayingAyah(null);
        }
      };

      audio.play().catch(err => {
        console.error("Playback start interrupted:", err);
        setPlayingAyah(null);
      });
    } catch (e) {
      console.error("Error setting up audio:", e);
      setPlayingAyah(null);
    }
  };

  const handlePlaySurahToggle = () => {
    const audioEdition = surahData?.find(d => d.edition.format === 'audio');
    if (!audioEdition || audioEdition.ayahs.length === 0) return;
    
    if (playingAyah !== null) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAyah(null);
    } else {
      const firstAyah = audioEdition.ayahs[0];
      if (firstAyah && firstAyah.audio) {
        playAudio(firstAyah.numberInSurah, firstAyah.audio);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      clearBlobUrls();
    };
  }, []);

  if (selectedSurah) {
    const arabic = surahData?.find(d => d.edition.identifier === 'quran-uthmani');
    const translation = surahData?.find(d => 
      d.edition.format === 'text' && 
      d.edition.identifier !== 'quran-uthmani' && 
      d.edition.identifier !== 'en.transliteration'
    );
    const audioEdition = surahData?.find(d => d.edition.format === 'audio');
    const transliteration = surahData?.find(d => d.edition.identifier === 'en.transliteration');

    return (
      <div className="flex flex-col min-h-full font-sans bg-transparent items-stretch px-4 pt-8 pb-8 text-[#F3F4F6]">
        <button onClick={closeSurah} className="flex items-center gap-2 text-[#A7F3D0] mb-4 p-2 w-fit hover:text-[#FCD34D] transition-colors">
          <ChevronLeft size={20} />
          <span className="font-bold text-sm tracking-widest uppercase">{t.quranBack}</span>
        </button>
        
        {surahError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-xl max-w-sm mx-auto my-auto shadow-2xl">
            <p className="text-yellow-300 font-bold text-sm mb-4 leading-relaxed">{surahError}</p>
            <button
              onClick={() => {
                setSurahError(null);
                const num = selectedSurah;
                setSelectedSurah(null);
                setTimeout(() => setSelectedSurah(num), 50);
              }}
              className="bg-[#059669] hover:bg-[#047857] text-white font-bold py-2.5 px-6 rounded-2xl shadow-lg active:scale-95 transition-all text-xs tracking-wider uppercase"
            >
              {t.quranRetry}
            </button>
          </div>
        ) : loadingSurah || !arabic || !translation || !transliteration ? (
          <div className="flex-1 flex flex-col items-center justify-center py-40">
            <Loader2 className="animate-spin text-[#FCD34D] mb-4" size={32} />
            <p className="text-[#A7F3D0] opacity-80 uppercase tracking-widest text-xs font-bold">
              {t.quranLoadingSurah}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6 border-b border-[#065F46] pb-6 flex flex-col items-center">
              <h2 className="text-4xl font-arabic text-[#FCD34D] mb-2">{arabic.name}</h2>
              <p className="text-lg font-bold text-white tracking-wide">{arabic.englishName}</p>
              <p className="text-xs text-[#A7F3D0] uppercase tracking-widest mt-1 opacity-80 mb-5">
                {arabic.englishNameTranslation} • {arabic.revelationType} • {arabic.numberOfAyahs} Ayahs
              </p>
              
              {/* Offline Downloader & Play Controls Widget */}
              {audioEdition && (
                <div className="w-full max-w-sm mb-5 flex flex-col sm:flex-row gap-3 justify-center items-stretch px-4">
                  {/* General Play/Pause Button */}
                  <button
                    onClick={handlePlaySurahToggle}
                    className={`flex-1 font-bold text-xs py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                      playingAyah !== null 
                        ? 'bg-[#FCD34D] text-[#022C22] hover:bg-[#fbbf24]' 
                        : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                  >
                    {playingAyah !== null ? <Pause size={14} /> : <Play size={14} />}
                    <span>{playingAyah !== null ? (t.pauseSurah || 'Pause Surah') : (t.playSurah || 'Play Surah')}</span>
                  </button>

                  {/* Downloader */}
                  <div className="flex-1 min-w-[140px]">
                    {isDownloaded ? (
                      <div className="h-full flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-[#A7F3D0] py-2.5 px-4 rounded-2xl text-xs font-bold">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span>{t.downloaded}</span>
                      </div>
                    ) : downloadingSurah ? (
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl space-y-1.5 h-full flex flex-col justify-center">
                        <div className="flex justify-between items-center text-[10px] font-bold text-[#A7F3D0]">
                          <span>{t.downloading}</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="h-1 bg-black/20 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-[#FCD34D]" style={{ width: `${downloadProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleDownload}
                        className="w-full h-full bg-[#022C22]/60 hover:bg-[#022C22] border border-[#065F46] text-[#A7F3D0] hover:text-[#FCD34D] py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-inner"
                      >
                        <Download size={14} />
                        <span>{t.downloadSurah}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* View options & Autoplay Toggle */}
              <div className="flex flex-wrap justify-center items-center gap-2.5 bg-[#022C22] p-1.5 rounded-2xl border border-[#065F46] w-fit shadow-inner mx-auto">
                <button
                  onClick={() => setAutoplay(!autoplay)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                    autoplay
                      ? 'bg-[#059669] text-white shadow-lg shadow-[#059669]/10'
                      : 'bg-white/5 text-[#A7F3D0]/60 border border-white/5'
                  }`}
                >
                  {autoplay ? <Repeat size={13} /> : <Repeat1 size={13} />}
                  {autoplay ? t.quranAutoplay : t.quranSingleAyah}
                </button>

                <div className="w-px h-5 bg-white/10 hidden sm:block" />

                <button
                  onClick={() => setShowTransliteration(!showTransliteration)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-300 ${
                    showTransliteration
                      ? 'bg-[#FCD34D] text-[#022C22] shadow-lg shadow-[#FCD34D]/10'
                      : 'text-[#A7F3D0]/60 hover:text-[#FCD34D] hover:bg-white/5'
                  }`}
                >
                  Translit
                </button>
                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-300 ${
                    showTranslation
                      ? 'bg-[#059669] text-white shadow-lg shadow-[#059669]/10'
                      : 'text-[#A7F3D0]/60 hover:text-[#059669] hover:bg-white/5'
                  }`}
                >
                  Trans
                </button>
              </div>
            </div>
            
            {arabic.ayahs.map((ayah, i) => {
              const transAyah = translation?.ayahs[i];
              const audioAyah = audioEdition?.ayahs[i];
              const translitAyah = transliteration?.ayahs[i];
              const isPlaying = playingAyah === ayah.numberInSurah;

              return (
                <div 
                  key={ayah.number} 
                  id={`ayah-card-${ayah.numberInSurah}`}
                  className={`bg-white/[0.03] backdrop-blur-md p-5 rounded-3xl border shadow-sm relative hover:border-white/20 transition-all duration-300 ${
                    isPlaying 
                      ? 'border-[#FCD34D]/40 bg-[#059669]/10 shadow-lg shadow-[#059669]/5' 
                      : 'border-white/10'
                  }`}
                >
                   <div className="flex justify-between items-start mb-4">
                     <span className="w-8 h-8 rounded-full bg-[#022C22] border border-[#065F46] flex items-center justify-center text-[#FCD34D] text-xs font-bold">
                       {ayah.numberInSurah}
                     </span>
                     
                     <div className="flex items-center gap-2">
                       <button
                         onClick={() => setShareToFriend({ arabic: ayah.text, translation: transAyah?.text || '', reference: `${arabic.englishName} ${arabic.number}:${ayah.numberInSurah}` })}
                         className="p-2.5 rounded-full bg-[#022C22] text-[#A7F3D0] hover:text-emerald-400 transition-all active:scale-90"
                         title="Send to friend"
                       >
                         <Send size={15} />
                       </button>
                       <button
                         onClick={() => shareAyahCard({
                           arabic: ayah.text,
                           transliteration: translitAyah?.text,
                           translation: transAyah?.text || '',
                           reference: `${arabic.englishName} ${arabic.number}:${ayah.numberInSurah}`,
                         }, lang)}
                         className="p-2.5 rounded-full bg-[#022C22] text-[#A7F3D0] hover:text-[#FCD34D] transition-all active:scale-90"
                         title="Share"
                       >
                         <Share2 size={15} />
                       </button>
                       {audioAyah?.audio && (
                         <button
                           onClick={() => playAudio(ayah.numberInSurah, audioAyah.audio)}
                           className={`p-2.5 rounded-full transition-all active:scale-90 ${isPlaying ? 'bg-[#FCD34D] text-[#022C22] shadow-lg shadow-[#FCD34D]/25' : 'bg-[#022C22] text-[#A7F3D0] hover:text-[#FCD34D]'}`}
                         >
                           {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                         </button>
                       )}
                     </div>
                   </div>
                   
                   <p className="text-2xl font-arabic text-white text-right leading-loose mb-6 font-medium selection:bg-[#FCD34D]/30" dir="rtl">
                     {ayah.text}
                   </p>
                   
                   {(showTransliteration || showTranslation) && (
                     <div className="border-t border-white/5 pt-4 space-y-3">
                       {showTransliteration && translitAyah && (
                         <p className="text-sm text-[#FCD34D]/90 italic font-medium leading-relaxed">
                           {translitAyah.text}
                         </p>
                       )}
                       {showTranslation && transAyah && (
                         <p className="text-sm text-[#A7F3D0] leading-relaxed opacity-95">
                           {transAyah.text}
                         </p>
                       )}
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col min-h-full font-sans bg-transparent items-stretch px-6 pt-12 pb-8 text-[#F3F4F6]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#FCD34D] tracking-tight mb-2">{t.quranTitle}</h1>
        <p className="text-xs text-[#A7F3D0] uppercase tracking-widest opacity-85 font-semibold">{t.quranSurahs}</p>
      </div>

      {/* Verse of the day */}
      {verseOfDay && (
        <div className="mb-6 bg-white/[0.03] backdrop-blur-xl border border-[#FCD34D]/20 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#FCD34D]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold text-[#FCD34D] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} />
              {lang === 'es' ? 'Versículo del día' : lang === 'ar' ? 'آية اليوم' : lang === 'fr' ? 'Verset du jour' : lang === 'pt' ? 'Versículo do dia' : lang === 'tr' ? 'Günün ayeti' : lang === 'de' ? 'Vers des Tages' : 'Verse of the day'}
            </span>
            <button
              onClick={() => shareAyahCard({ arabic: verseOfDay.arabic, transliteration: verseOfDay.transliteration, translation: verseOfDay.translation, reference: verseOfDay.reference }, lang)}
              className="p-2 rounded-full bg-white/5 text-[#A7F3D0] hover:text-[#FCD34D] transition-colors"
              title="Share"
            >
              <Share2 size={14} />
            </button>
          </div>
          <p className="text-xl font-arabic text-white text-right leading-loose mb-3" dir="rtl">{verseOfDay.arabic}</p>
          {verseOfDay.translation && (
            <p className="text-xs text-[#A7F3D0]/90 leading-relaxed">{verseOfDay.translation}</p>
          )}
          <p className="text-[9px] font-bold text-[#FCD34D]/60 uppercase tracking-widest mt-2">{verseOfDay.reference}</p>
        </div>
      )}

      {loadingList ? (
        <div className="flex-1 flex flex-col items-center justify-center py-40">
          <Loader2 className="animate-spin text-[#FCD34D] mb-4" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-8">
          {surahs.map((surah, idx) => (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.2, idx * 0.005) }}
              key={surah.number}
              onClick={() => openSurah(surah.number)}
              className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 p-4 rounded-3xl shadow-sm flex items-center justify-between text-left hover:border-[#059669]/50 transition-all duration-300"
            >
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-[#022C22] border border-[#065F46] flex items-center justify-center">
                   <span className="text-[#FCD34D] font-bold text-xs">{surah.number}</span>
                 </div>
                 <div>
                   <h3 className="font-bold text-white text-sm">{surah.englishName}</h3>
                   <span className="text-[10px] text-[#A7F3D0] uppercase tracking-widest block mt-0.5 opacity-80 font-medium">
                      {surah.englishNameTranslation}
                   </span>
                 </div>
               </div>
               
               <div className="text-right">
                 <h3 className="font-arabic text-[#FCD34D] text-lg">{surah.name}</h3>
                 <span className="text-[10px] text-[#A7F3D0] opacity-80 tracking-widest uppercase font-medium">
                   {surah.numberOfAyahs} Ayahs
                 </span>
               </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
    {shareToFriend && (
      <FriendPickerModal
        item={{ kind: 'verse', payload: { arabic: shareToFriend.arabic, translation: shareToFriend.translation, reference: shareToFriend.reference } }}
        onClose={() => setShareToFriend(null)}
        lang={lang}
      />
    )}
    </>
  );
}
