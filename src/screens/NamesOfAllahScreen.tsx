import React, { useState, useRef, useEffect } from 'react';
import { namesOfAllah, NameOfAllah } from '../data/namesOfAllah';
import { ChevronLeft, Play, Pause, Search, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../hooks/useSettings';
import { useScrollLock } from '../utils/useScrollLock';

interface NamesOfAllahScreenProps {
  onClose: () => void;
}

export function NamesOfAllahScreen({ onClose }: NamesOfAllahScreenProps) {
  useScrollLock();
  const { settings } = useSettings();
  const lang = settings.language || 'es';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedName, setSelectedName] = useState<NameOfAllah | null>(null);
  
  // Audio playback state
  const [playingNameNum, setPlayingNameNum] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play audio for a specific name
  const handlePlayAudio = (name: NameOfAllah, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click when clicking play icon in grid

    if (playingNameNum === name.number) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingNameNum(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Set up and play
    setPlayingNameNum(name.number);
    const audio = new Audio(name.audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setPlayingNameNum(null);
    };

    audio.play().catch((err) => {
      console.warn("Failed to play Name of Allah audio:", err);
      setPlayingNameNum(null);
    });
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Filter names based on search query
  const filteredNames = namesOfAllah.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      item.number.toString() === query ||
      item.transliteration.toLowerCase().includes(query) ||
      item.translated.toLowerCase().includes(query) ||
      item.meaning.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-40 bg-[#011410]/95 backdrop-blur-xl text-[#F3F4F6] overflow-y-auto app-scroll px-5 pt-safe pb-12 flex flex-col justify-start">
      {/* Single fixed glow accent (no scrolling seam) */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onClose}
          className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#FCD34D] tracking-tight">
            {lang === 'es' ? '99 Nombres de Allah' : lang === 'ar' ? 'أسماء الله الحسنى' : '99 Names of Allah'}
          </h1>
          <p className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-semibold opacity-75 mt-0.5">
            Al-Asma-ul-Husna
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder={lang === 'es' ? 'Buscar por transliteración o significado...' : 'Search by name, meaning or number...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/35 focus:outline-none focus:border-[#FCD34D] transition-colors"
        />
        <Search size={16} className="absolute left-4 top-[17px] text-white/40" />
      </div>

      {/* Bento Grid */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pb-12">
        {filteredNames.map((item) => {
          const isPlaying = playingNameNum === item.number;
          return (
            <motion.div
              layout
              key={item.number}
              onClick={() => setSelectedName(item)}
              className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 p-4.5 rounded-3xl cursor-pointer hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between items-stretch min-h-[140px] relative overflow-hidden"
            >
              {/* Number Badge */}
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-mono text-[#A7F3D0]/65">
                  #{String(item.number).padStart(3, '0')}
                </span>
                
                {/* Micro Audio Play Button */}
                <button
                  onClick={(e) => handlePlayAudio(item, e)}
                  className={`p-2 rounded-full border transition-all ${
                    isPlaying 
                      ? 'bg-[#FCD34D] text-[#022C22] border-[#FCD34D]' 
                      : 'bg-black/25 text-[#A7F3D0] border-white/5 hover:text-white'
                  }`}
                >
                  {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                </button>
              </div>

              {/* Calligraphy / Name Display */}
              <div className="text-right mt-1">
                <span className="text-2xl font-arabic text-white font-medium block leading-none">
                  {item.arabic}
                </span>
              </div>

              {/* Transliteration & Translation */}
              <div className="mt-3.5 border-t border-white/5 pt-2">
                <h3 className="font-bold text-white text-xs truncate leading-snug">
                  {item.transliteration}
                </h3>
                <p className="text-[9px] text-[#A7F3D0]/60 truncate leading-none mt-0.5">
                  {item.translated}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Name Details Overlay Modal */}
      <AnimatePresence>
        {selectedName && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
            {/* Backdrop click close */}
            <div className="absolute inset-0" onClick={() => setSelectedName(null)} />

            {/* Content Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-[#022C22] border-t border-white/10 rounded-t-[2.5rem] px-6 pt-5 pb-10 space-y-5 max-h-[85%] overflow-y-auto shadow-2xl relative text-left"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedName(null)}
                className="absolute top-4 right-4 p-2 bg-white/5 border border-white/10 text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>

              {/* Header Title */}
              <div className="text-center pt-2 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#FCD34D] font-bold text-xs mb-3">
                  #{selectedName.number}
                </div>
                <h2 className="text-5xl font-arabic text-[#FCD34D] mb-3 leading-normal">
                  {selectedName.arabic}
                </h2>
                <h3 className="text-xl font-bold text-white tracking-wide">
                  {selectedName.transliteration}
                </h3>
                <p className="text-xs text-[#A7F3D0]/70 uppercase tracking-widest font-semibold mt-1">
                  {selectedName.translated}
                </p>
              </div>

              {/* Audio Playback Controls in Sheet */}
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center gap-4 justify-between max-w-sm mx-auto shadow-inner">
                <span className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-bold">
                  {lang === 'es' ? 'Recitación del Nombre' : 'Recitation Playback'}
                </span>
                <button
                  onClick={(e) => handlePlayAudio(selectedName, e)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    playingNameNum === selectedName.number
                      ? 'bg-[#FCD34D] text-[#022C22]'
                      : 'bg-[#059669] text-white'
                  }`}
                >
                  {playingNameNum === selectedName.number ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                </button>
              </div>

              {/* Literal Meaning Card */}
              <div className="bg-white/5 p-5 rounded-3xl border border-white/5 space-y-1.5 shadow-md">
                <h4 className="text-[10px] font-bold text-[#FCD34D] uppercase tracking-widest">
                  {lang === 'es' ? 'Significado Literal' : 'Literal Meaning'}
                </h4>
                <p className="text-xs text-white leading-relaxed opacity-95">
                  {selectedName.meaning}
                </p>
              </div>

              {/* Spiritual Benefits & details */}
              <div className="bg-emerald-950/40 p-5 rounded-3xl border border-emerald-900/30 space-y-3 shadow-md">
                <h4 className="text-[10px] font-bold text-[#A7F3D0] uppercase tracking-widest flex items-center gap-1.5">
                  <Info size={12} className="text-[#FCD34D]" />
                  {lang === 'es' ? 'Beneficios Espirituales e Historia' : 'Spiritual Benefits & History'}
                </h4>
                <div className="text-xs text-[#A7F3D0]/90 leading-relaxed space-y-3 whitespace-pre-line font-light">
                  {selectedName.details.replace(/\n\n/g, '\n')}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
