import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Check, Brain, Eye, RotateCcw, Sparkles, GraduationCap, Trophy } from 'lucide-react';
import { dailyDuas, RECOMMENDED_DUA_IDS, duaDifficulty } from '../data/duas';
import { Dua } from '../types';
import { useMemorization } from '../context/MemorizationContext';
import { useSettings } from '../hooks/useSettings';
import { maturityFromAge } from '../context/SettingsContext';
import { useScrollLock } from '../utils/useScrollLock';

const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Memorize Duas', library: 'Library', quiz: 'Test yourself', memorized: 'memorized',
    all: 'All', recommended: 'Essential', toLearn: 'To learn', done: 'Memorized',
    reveal: 'Reveal', know: 'I know it ✓', practice: 'Practice more',
    finished: 'Session complete!', learnedThis: 'memorized this session', restart: 'New round',
    emptyQuiz: 'Nothing to practice here — switch the filter or you mastered them all!',
    progress: 'of', startQuiz: 'Start test', hint: 'Read the meaning, recall the dua, then reveal.',
  },
  es: {
    title: 'Memorizar Duas', library: 'Biblioteca', quiz: 'Ponte a prueba', memorized: 'memorizadas',
    all: 'Todas', recommended: 'Esenciales', toLearn: 'Por aprender', done: 'Memorizadas',
    reveal: 'Revelar', know: 'Ya me lo sé ✓', practice: 'Seguir practicando',
    finished: '¡Sesión completada!', learnedThis: 'memorizadas en esta sesión', restart: 'Nueva ronda',
    emptyQuiz: 'Nada que practicar aquí — ¡cambia el filtro o ya las dominas todas!',
    progress: 'de', startQuiz: 'Empezar test', hint: 'Lee el significado, recuerda la dua y luego revela.',
  },
  ar: {
    title: 'حفظ الأدعية', library: 'المكتبة', quiz: 'اختبر نفسك', memorized: 'محفوظة',
    all: 'الكل', recommended: 'الأساسية', toLearn: 'للحفظ', done: 'محفوظة',
    reveal: 'إظهار', know: 'أحفظه ✓', practice: 'متابعة التمرين',
    finished: 'انتهت الجلسة!', learnedThis: 'حُفظت في هذه الجلسة', restart: 'جولة جديدة',
    emptyQuiz: 'لا شيء للتمرين هنا — غيّر التصفية أو أتقنتها كلها!',
    progress: 'من', startQuiz: 'ابدأ الاختبار', hint: 'اقرأ المعنى، تذكّر الدعاء، ثم أظهره.',
  },
};

interface Props {
  onClose: () => void;
}

type Filter = 'all' | 'recommended' | 'toLearn' | 'done';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MemorizeScreen({ onClose }: Props) {
  useScrollLock();
  const { settings } = useSettings();
  const { memorized, isMemorized, toggle, setMemorized, count } = useMemorization();
  const lang = settings.language || 'es';
  const t = T[lang] || T.en;
  const tone = maturityFromAge(settings.age);
  const total = dailyDuas.length;

  const [mode, setMode] = useState<'library' | 'quiz'>('library');
  const [filter, setFilter] = useState<Filter>('recommended');

  // Order: recommended first; for kids, shorter duas first; memorized sink to bottom.
  const ordered = useMemo(() => {
    const recIndex = (id: string) => {
      const i = RECOMMENDED_DUA_IDS.indexOf(id);
      return i === -1 ? 999 : i;
    };
    const diffRank = { short: 0, medium: 1, long: 2 } as const;
    return [...dailyDuas].sort((a, b) => {
      if (tone !== 'adult') {
        const d = diffRank[duaDifficulty(a.arabic)] - diffRank[duaDifficulty(b.arabic)];
        if (d !== 0) return d;
      }
      return recIndex(a.id) - recIndex(b.id);
    });
  }, [tone]);

  const visible = ordered.filter((d) => {
    if (filter === 'recommended') return RECOMMENDED_DUA_IDS.includes(d.id);
    if (filter === 'toLearn') return !memorized.has(d.id);
    if (filter === 'done') return memorized.has(d.id);
    return true;
  });

  const pct = Math.round((count / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-[#011410]/95 backdrop-blur-xl overflow-y-auto app-scroll text-[#F3F4F6]"
    >
      <div className="max-w-lg mx-auto px-5 pt-safe pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <div className="flex items-center gap-2.5">
            <Brain size={22} className="text-[#FCD34D]" />
            <h1 className="text-xl font-bold text-[#FCD34D]">{t.title}</h1>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-full text-[#A7F3D0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-4 flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
              <motion.circle cx="50" cy="50" r="44" fill="none" stroke="#FCD34D" strokeWidth="9" strokeLinecap="round"
                initial={{ strokeDasharray: 276, strokeDashoffset: 276 }}
                animate={{ strokeDashoffset: 276 - (276 * pct) / 100 }}
                transition={{ duration: 0.7 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white">{pct}%</div>
          </div>
          <div>
            <p className="text-2xl font-black text-white tabular-nums leading-none">
              {count}<span className="text-sm text-[#A7F3D0]/50 font-bold"> / {total}</span>
            </p>
            <p className="text-[10px] text-[#A7F3D0]/70 uppercase tracking-widest font-bold mt-1">{t.memorized}</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl mb-5">
          {(['library', 'quiz'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === m ? 'bg-[#059669] text-white shadow' : 'text-[#A7F3D0]/60 hover:text-white'
              }`}
            >
              {m === 'library' ? <GraduationCap size={14} /> : <Sparkles size={14} />}
              {m === 'library' ? t.library : t.quiz}
            </button>
          ))}
        </div>

        {mode === 'library' ? (
          <LibraryView
            visible={visible}
            filter={filter}
            setFilter={setFilter}
            isMemorized={isMemorized}
            toggle={toggle}
            t={t}
            lang={lang}
          />
        ) : (
          <QuizView duas={visible} setMemorized={setMemorized} t={t} lang={lang} />
        )}
      </div>
    </motion.div>
  );
}

function FilterPills({ filter, setFilter, t }: { filter: Filter; setFilter: (f: Filter) => void; t: Record<string, string> }) {
  const items: { id: Filter; label: string }[] = [
    { id: 'recommended', label: t.recommended },
    { id: 'toLearn', label: t.toLearn },
    { id: 'done', label: t.done },
    { id: 'all', label: t.all },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => setFilter(it.id)}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === it.id ? 'bg-[#FCD34D] text-[#022C22]' : 'bg-white/5 border border-white/10 text-[#A7F3D0] hover:text-white'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function LibraryView({
  visible, filter, setFilter, isMemorized, toggle, t, lang,
}: {
  visible: Dua[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  isMemorized: (id: string) => boolean;
  toggle: (id: string) => void;
  t: Record<string, string>;
  lang: string;
}) {
  return (
    <div>
      <FilterPills filter={filter} setFilter={setFilter} t={t} />
      <div className="space-y-2.5">
        {visible.map((dua) => {
          const mem = isMemorized(dua.id);
          const rec = RECOMMENDED_DUA_IDS.includes(dua.id);
          return (
            <div
              key={dua.id}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                mem ? 'bg-[#059669]/10 border-[#059669]/30' : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <button
                onClick={() => toggle(dua.id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                  mem ? 'bg-[#059669] text-white' : 'bg-white/5 border border-white/15 text-[#A7F3D0]'
                }`}
              >
                {mem ? <Check size={18} strokeWidth={3} /> : <Star size={16} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-sm truncate">{dua.title}</h4>
                  {rec && (
                    <span className="text-[8px] font-black bg-[#FCD34D]/15 text-[#FCD34D] border border-[#FCD34D]/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {t.recommended}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#A7F3D0]/70 italic truncate mt-0.5">{dua.transliteration}</p>
              </div>
              <span className="font-arabic text-[#FCD34D]/80 text-base shrink-0" dir="rtl">
                {dua.arabic.length > 18 ? dua.arabic.slice(0, 16) + '…' : dua.arabic}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuizView({
  duas, setMemorized, t, lang,
}: {
  duas: Dua[];
  setMemorized: (id: string, v: boolean) => void;
  t: Record<string, string>;
  lang: string;
}) {
  const [deck, setDeck] = useState<Dua[]>(() => shuffle(duas));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [learned, setLearned] = useState(0);
  const [started, setStarted] = useState(false);

  const restart = () => {
    setDeck(shuffle(duas));
    setIdx(0);
    setRevealed(false);
    setLearned(0);
    setStarted(true);
  };

  if (duas.length === 0) {
    return <p className="text-center text-sm text-[#A7F3D0]/60 py-16 px-6 leading-relaxed">{t.emptyQuiz}</p>;
  }

  if (!started) {
    return (
      <div className="text-center py-12">
        <Sparkles size={40} className="text-[#FCD34D] mx-auto mb-4" />
        <p className="text-sm text-[#A7F3D0]/80 leading-relaxed mb-6 px-4">{t.hint}</p>
        <button
          onClick={restart}
          className="bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm py-3 px-8 rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          {t.startQuiz}
        </button>
      </div>
    );
  }

  if (idx >= deck.length) {
    return (
      <div className="text-center py-12">
        <Trophy size={48} className="text-[#FCD34D] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-1">{t.finished}</h3>
        <p className="text-sm text-[#A7F3D0]/80 mb-6">
          <span className="text-[#FCD34D] font-black text-xl">{learned}</span> {t.learnedThis}
        </p>
        <button
          onClick={restart}
          className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm py-3 px-8 rounded-2xl flex items-center gap-2 mx-auto active:scale-95 transition-all"
        >
          <RotateCcw size={16} /> {t.restart}
        </button>
      </div>
    );
  }

  const dua = deck[idx];
  const advance = (knew: boolean) => {
    if (knew) {
      setMemorized(dua.id, true);
      setLearned((l) => l + 1);
    }
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-[#FCD34D]" animate={{ width: `${(idx / deck.length) * 100}%` }} />
        </div>
        <span className="text-[10px] font-mono text-[#A7F3D0]/60 tabular-nums">{idx + 1} {t.progress} {deck.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={dua.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl min-h-[280px] flex flex-col"
        >
          <h3 className="font-bold text-[#FCD34D] text-base mb-3">{dua.title}</h3>
          <div className="bg-black/25 rounded-2xl px-4 py-3.5 border border-white/5 mb-4">
            <p className="text-sm text-[#A7F3D0] leading-relaxed">"{dua.translation}"</p>
          </div>

          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div key="rev" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 space-y-3">
                <p className="text-2xl font-arabic text-white text-right leading-loose" dir="rtl">{dua.arabic}</p>
                <p className="text-sm italic text-[#FCD34D]/90 leading-relaxed">{dua.transliteration}</p>
                <p className="text-[9px] font-bold text-[#A7F3D0]/40 uppercase tracking-widest">{dua.reference}</p>
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <button
                  onClick={() => setRevealed(true)}
                  className="bg-[#FCD34D]/10 border border-[#FCD34D]/30 text-[#FCD34D] font-bold text-sm py-3 px-7 rounded-2xl flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Eye size={16} /> {t.reveal}
                </button>
              </div>
            )}
          </AnimatePresence>

          {revealed && (
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => advance(false)}
                className="flex-1 bg-white/5 border border-white/10 text-[#A7F3D0] hover:text-white font-bold text-xs py-3 rounded-2xl active:scale-95 transition-all"
              >
                {t.practice}
              </button>
              <button
                onClick={() => advance(true)}
                className="flex-1 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs py-3 rounded-2xl active:scale-95 transition-all"
              >
                {t.know}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
