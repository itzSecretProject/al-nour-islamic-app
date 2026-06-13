import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Play, Pause, Loader2, Languages } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useScrollLock } from '../utils/useScrollLock';

// Word-by-word reader: highlights each Arabic word in sync with the recitation
// (Mishary Alafasy), using quran.com's per-word audio segment timings.

interface WBWWord {
  position: number;
  char_type_name: string; // 'word' | 'end'
  text_uthmani: string;
  translation?: { text: string };
}
interface WBWVerse {
  verse_key: string;       // "2:255"
  verse_number: number;
  words: WBWWord[];
  audio?: { url: string; segments: number[][] };
}

// quran.com word-translation languages that actually exist (others fall back to en).
const WORD_TR_LANG: Record<string, string> = {
  en: 'en', es: 'es', ur: 'ur', id: 'id', bn: 'bn', tr: 'tr', fr: 'fr', ru: 'ru', fa: 'fa',
};

const T: Record<string, Record<string, string>> = {
  en: { reciter: 'Mishary Alafasy', words: 'Show word meanings', ayah: 'Ayah', loading: 'Loading…', err: 'Could not load. Check your connection.' },
  es: { reciter: 'Mishary Alafasy', words: 'Mostrar significado de palabras', ayah: 'Aleya', loading: 'Cargando…', err: 'No se pudo cargar. Revisa tu conexión.' },
  ar: { reciter: 'مشاري العفاسي', words: 'إظهار معاني الكلمات', ayah: 'آية', loading: 'جارٍ التحميل…', err: 'تعذّر التحميل. تحقق من الاتصال.' },
};

// Normalize a segment to { pos, start, end } (some are 4-el, some 3-el).
function parseSeg(s: number[]): { pos: number; start: number; end: number } {
  if (s.length >= 4) return { pos: s[1], start: s[2], end: s[3] };
  return { pos: s[0], start: s[1], end: s[2] };
}

interface Props {
  surah: number;
  surahName?: string;
  onClose: () => void;
}

export function WordByWordScreen({ surah, surahName, onClose }: Props) {
  useScrollLock();
  const { settings } = useSettings();
  const lang = settings.language || 'es';
  const t = T[lang] || T.en;
  const isRTL = lang === 'ar';

  const [verses, setVerses] = useState<WBWVerse[] | null>(null);
  const [error, setError] = useState(false);
  const [showWordTr, setShowWordTr] = useState(true);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [activeWord, setActiveWord] = useState<string | null>(null); // `${verse_key}:${pos}`

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingIdxRef = useRef<number | null>(null);
  const tokenRef = useRef(0);
  const versesRef = useRef<WBWVerse[] | null>(null);
  versesRef.current = verses;

  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

  useEffect(() => {
    let active = true;
    setVerses(null); setError(false);
    const wl = WORD_TR_LANG[lang] || 'en';
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${surah}?words=true&audio=7&word_fields=text_uthmani&word_translation_language=${wl}&per_page=300`;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (active) setVerses(d.verses || []); })
      .catch(() => { if (active) setError(true); });
    return () => {
      active = false;
      if (audioRef.current) { audioRef.current.onended = null; audioRef.current.ontimeupdate = null; audioRef.current.pause(); }
    };
  }, [surah, lang]);

  const ensureEl = (): HTMLAudioElement => {
    if (!audioRef.current) {
      const el = new Audio(SILENT_WAV);
      el.play().catch(() => {});
      audioRef.current = el;
    }
    return audioRef.current;
  };

  const stop = () => {
    tokenRef.current++;
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.ontimeupdate = null; audioRef.current.pause(); }
    playingIdxRef.current = null;
    setPlayingIdx(null);
    setActiveWord(null);
  };

  const playVerse = async (idx: number) => {
    const list = versesRef.current;
    if (!list || idx < 0 || idx >= list.length) { stop(); return; }
    const v = list[idx];
    if (!v.audio?.url) { stop(); return; }

    const el = ensureEl();
    const token = ++tokenRef.current;
    el.onended = null; el.ontimeupdate = null; el.pause();
    playingIdxRef.current = idx;
    setPlayingIdx(idx);

    const segs = (v.audio.segments || []).map(parseSeg);
    el.src = `https://verses.quran.com/${v.audio.url}`;

    el.ontimeupdate = () => {
      if (tokenRef.current !== token) return;
      const ms = el.currentTime * 1000;
      const cur = segs.find(s => ms >= s.start && ms < s.end);
      setActiveWord(cur ? `${v.verse_key}:${cur.pos}` : null);
    };
    el.onended = () => {
      if (tokenRef.current !== token) return;
      setActiveWord(null);
      playVerse(idx + 1); // auto-advance through the surah
    };

    try {
      await el.play();
      // Auto-scroll the playing ayah into view.
      requestAnimationFrame(() => {
        document.getElementById(`wbw-ayah-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } catch {
      if (tokenRef.current === token) stop();
    }
  };

  const toggleVerse = (idx: number) => {
    if (playingIdxRef.current === idx) stop();
    else { ensureEl(); playVerse(idx); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-[#011410] text-[#F3F4F6] flex flex-col"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#022C22] to-[#011410] -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex-none px-5 pt-12 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors shrink-0">
            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#FCD34D] truncate">{surahName || `Surah ${surah}`}</h1>
            <p className="text-[10px] text-[#A7F3D0]/60 uppercase tracking-widest font-semibold">{t.reciter}</p>
          </div>
          <button
            onClick={() => setShowWordTr(s => !s)}
            className={`p-2.5 rounded-full border transition-colors shrink-0 ${showWordTr ? 'bg-[#059669]/20 border-[#059669]/40 text-[#FCD34D]' : 'bg-white/5 border-white/10 text-[#A7F3D0]/60'}`}
            title={t.words}
          >
            <Languages size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto app-scroll px-4 pb-12">
        {error ? (
          <p className="text-center text-[#A7F3D0]/60 text-sm mt-20">{t.err}</p>
        ) : !verses ? (
          <div className="flex flex-col items-center justify-center mt-24 gap-3">
            <Loader2 size={26} className="text-[#FCD34D] animate-spin" />
            <p className="text-xs text-[#A7F3D0]/50">{t.loading}</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {verses.map((v, idx) => {
              const isThis = playingIdx === idx;
              return (
                <div
                  key={v.verse_key}
                  id={`wbw-ayah-${idx}`}
                  className={`rounded-3xl border p-4 transition-colors ${isThis ? 'bg-[#059669]/[0.07] border-[#059669]/30' : 'bg-white/[0.02] border-white/8'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-[#A7F3D0]/50 uppercase tracking-widest">{t.ayah} {v.verse_number}</span>
                    <button
                      onClick={() => toggleVerse(idx)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${isThis ? 'bg-[#FCD34D] text-[#011410]' : 'bg-white/5 border border-white/10 text-[#FCD34D]'}`}
                    >
                      {isThis ? <Pause size={15} /> : <Play size={15} className={isRTL ? '' : 'translate-x-[1px]'} />}
                    </button>
                  </div>

                  {/* Words */}
                  <div dir="rtl" className="flex flex-wrap gap-x-1 gap-y-3 justify-center">
                    {v.words.map((w) => {
                      const key = `${v.verse_key}:${w.position}`;
                      const isActive = activeWord === key;
                      const isEnd = w.char_type_name === 'end';
                      return (
                        <div key={key} className="flex flex-col items-center px-1.5">
                          <span
                            className={`leading-loose transition-all duration-150 rounded-lg px-1.5 ${isEnd ? 'text-[#FCD34D]/70 text-xl' : 'text-2xl'} ${
                              isActive ? 'bg-[#FCD34D] text-[#011410] scale-110 font-semibold shadow-lg' : 'text-white'}`}
                            style={{ fontFamily: 'Amiri, serif' }}
                          >
                            {w.text_uthmani}
                          </span>
                          {showWordTr && !isEnd && w.translation?.text && (
                            <span dir="ltr" className={`text-[9px] mt-1 leading-tight text-center max-w-[80px] ${isActive ? 'text-[#FCD34D]' : 'text-[#A7F3D0]/45'}`}>
                              {w.translation.text}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
