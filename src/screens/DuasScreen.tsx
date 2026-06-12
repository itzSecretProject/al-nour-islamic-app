import React, { useState } from 'react';
import { dailyDuas, DUA_CATEGORIES } from '../data/duas';
import { Search, Volume2, VolumeX, ChevronDown, ChevronUp, Share2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../hooks/useSettings';
import { translations } from '../utils/translations';
import { shareAyahCard } from '../utils/shareCard';
import { FriendPickerModal } from '../components/social/FriendPickerModal';

function speakArabic(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA';
  u.rate = 0.75;
  u.pitch = 1.0;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  window.speechSynthesis.speak(u);
}

const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'All': 'All',
    'Morning & Evening': 'Morning & Evening',
    'Daily Life': 'Daily Life',
    'Prayer & Worship': 'Prayer & Worship',
    'Forgiveness': 'Forgiveness',
    'Protection': 'Protection',
    'Family & Gratitude': 'Family & Gratitude',
    'Hardship & Trust': 'Hardship & Trust',
  },
  es: {
    'All': 'Todos',
    'Morning & Evening': 'Mañana y Noche',
    'Daily Life': 'Vida Diaria',
    'Prayer & Worship': 'Oración y Culto',
    'Forgiveness': 'Perdón',
    'Protection': 'Protección',
    'Family & Gratitude': 'Familia y Gratitud',
    'Hardship & Trust': 'Dificultad y Confianza',
  },
  ar: {
    'All': 'الكل',
    'Morning & Evening': 'الصباح والمساء',
    'Daily Life': 'الحياة اليومية',
    'Prayer & Worship': 'الصلاة والعبادة',
    'Forgiveness': 'الاستغفار',
    'Protection': 'الحماية والتحصين',
    'Family & Gratitude': 'العائلة والامتنان',
    'Hardship & Trust': 'الشدة والتوكل',
  },
  fr: {
    'All': 'Tous',
    'Morning & Evening': 'Matin & Soir',
    'Daily Life': 'Vie Quotidienne',
    'Prayer & Worship': 'Prière & Adoration',
    'Forgiveness': 'Pardon',
    'Protection': 'Protection',
    'Family & Gratitude': 'Famille & Gratitude',
    'Hardship & Trust': 'Épreuves & Confiance',
  },
  de: {
    'All': 'Alle',
    'Morning & Evening': 'Morgen & Abend',
    'Daily Life': 'Alltag',
    'Prayer & Worship': 'Gebet & Andacht',
    'Forgiveness': 'Vergebung',
    'Protection': 'Schutz',
    'Family & Gratitude': 'Familie & Dankbarkeit',
    'Hardship & Trust': 'Prüfung & Vertrauen',
  },
  tr: {
    'All': 'Tümü',
    'Morning & Evening': 'Sabah & Akşam',
    'Daily Life': 'Günlük Hayat',
    'Prayer & Worship': 'Namaz & İbadet',
    'Forgiveness': 'Bağışlanma',
    'Protection': 'Korunma',
    'Family & Gratitude': 'Aile & Şükür',
    'Hardship & Trust': 'Sıkıntı & Tevekkül',
  },
  pt: {
    'All': 'Todos',
    'Morning & Evening': 'Manhã & Noite',
    'Daily Life': 'Vida Diária',
    'Prayer & Worship': 'Oração & Devoção',
    'Forgiveness': 'Perdão',
    'Protection': 'Proteção',
    'Family & Gratitude': 'Família & Gratidão',
    'Hardship & Trust': 'Provação & Confiança',
  },
};

const DuaCard: React.FC<{ dua: (typeof dailyDuas)[0]; lang: string }> = ({ dua, lang }) => {
  const [expanded, setExpanded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [shareToFriend, setShareToFriend] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakArabic(dua.arabic, () => setSpeaking(false));
  };

  return (
    <motion.div
      layout
      onClick={() => setExpanded(v => !v)}
      className={`bg-white/[0.03] backdrop-blur-md rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        expanded ? 'border-[#059669] shadow-lg shadow-[#059669]/5 bg-white/[0.05]' : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Card Header - always visible */}
      <div className="w-full flex items-center justify-between p-5 text-left select-none">
        <div className="flex-1 pr-3">
          <h3 className="font-bold text-[#FCD34D] text-base leading-tight">{dua.title}</h3>
          {!expanded && (
            <p className="text-[#A7F3D0] text-xs mt-1.5 opacity-70 line-clamp-1 italic">
              {dua.transliteration}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShareToFriend(true); }}
            className="p-2.5 rounded-full bg-white/5 text-[#A7F3D0] hover:text-emerald-400 transition-colors"
            title="Send to friend"
          >
            <Send size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              shareAyahCard(
                { title: dua.title, arabic: dua.arabic, transliteration: dua.transliteration, translation: dua.translation, reference: dua.reference },
                lang
              );
            }}
            className="p-2.5 rounded-full bg-white/5 text-[#A7F3D0] hover:text-[#FCD34D] transition-colors"
            title="Share"
          >
            <Share2 size={15} />
          </button>
          {shareToFriend && (
            <FriendPickerModal
              item={{ kind: 'dua', payload: { arabic: dua.arabic, transliteration: dua.transliteration, translation: dua.translation, reference: dua.reference }, note: dua.title }}
              onClose={() => setShareToFriend(false)}
              lang={lang}
            />
          )}
          <button
            onClick={handleSpeak}
            className={`p-2.5 rounded-full transition-colors ${
              speaking
                ? 'bg-[#FCD34D] text-[#022C22]'
                : 'bg-white/5 text-[#A7F3D0] hover:text-[#FCD34D]'
            }`}
          >
            {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <div className="text-[#A7F3D0] opacity-50">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
              {/* Arabic */}
              <p
                className="text-2xl font-arabic text-white leading-loose text-right drop-shadow-sm select-all"
                dir="rtl"
              >
                {dua.arabic}
              </p>

              {/* Transliteration */}
              <p className="text-sm italic text-[#FCD34D] leading-relaxed font-medium">
                {dua.transliteration}
              </p>

              {/* Translation */}
              <div className="bg-black/25 rounded-2xl px-4 py-3.5 border border-white/5">
                <p className="text-sm text-[#A7F3D0] leading-relaxed opacity-95">
                  "{dua.translation}"
                </p>
              </div>

              {/* Reference */}
              <p className="text-[9px] font-bold text-[#A7F3D0] opacity-50 uppercase tracking-widest">
                {dua.reference}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function DuasScreen() {
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;

  const filtered = dailyDuas.filter(dua => {
    const matchesSearch =
      !search ||
      dua.title.toLowerCase().includes(search.toLowerCase()) ||
      dua.translation.toLowerCase().includes(search.toLowerCase()) ||
      dua.transliteration.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || dua.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col min-h-full font-sans bg-transparent px-5 pt-12 pb-24 text-[#F3F4F6]">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#FCD34D] tracking-tight mb-1">{t.tabDuas}</h1>
        <p className="text-xs text-[#A7F3D0] opacity-75">
          {dailyDuas.length} {t.duasSubtitle}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={16} className="text-[#A7F3D0] opacity-60" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-2xl bg-white/[0.02] backdrop-blur text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#FCD34D] focus:border-[#FCD34D] text-sm transition-all"
          placeholder={t.duasSearch}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-3.5 mb-4 scrollbar-hide select-none" style={{ scrollbarWidth: 'none' }}>
        {DUA_CATEGORIES.map(cat => {
          const localizedCategory = CATEGORY_TRANSLATIONS[lang]?.[cat] || cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-[#FCD34D] text-[#022C22] shadow shadow-[#FCD34D]/10'
                  : 'bg-white/5 border border-white/5 text-[#A7F3D0] hover:border-white/20'
              }`}
            >
              {localizedCategory}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-10">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center text-[#A7F3D0] opacity-50 py-12 text-xs">
            {t.duasEmpty}
          </div>
        ) : (
          filtered.map(dua => <DuaCard key={dua.id} dua={dua} lang={lang} />)
        )}
      </div>
    </div>
  );
}
