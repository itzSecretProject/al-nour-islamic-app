import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Users, Radio, X, SkipBack } from 'lucide-react';
import { useListenTogether } from '../../hooks/useListenTogether';

// Synchronised recitation room. A single full-surah audio file is kept in sync
// across everyone in the room via Realtime Broadcast. Any participant can drive
// playback; the others mirror it.

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 36: 'Ya-Sin', 55: 'Ar-Rahman', 56: 'Al-Waqi\'ah',
  67: 'Al-Mulk', 18: 'Al-Kahf', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas', 2: 'Al-Baqarah',
};
const PRESETS = [1, 36, 55, 67, 18, 112, 113, 114];
const RECITER = 'ar.alafasy';
const audioUrl = (surah: number) =>
  `https://cdn.islamic.network/quran/audio-surah/128/${RECITER}/${surah}.mp3`;

interface Props { roomCode: string; onLeave: () => void; }

export function ListenRoom({ roomCode, onLeave }: Props) {
  const { members, remoteState, connected, broadcast } = useListenTogether(roomCode);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const applyingRemote = useRef(false);
  const [surah, setSurah] = useState(1);
  const [playing, setPlaying] = useState(false);

  // Apply incoming remote playback state to the local audio element.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !remoteState) return;
    applyingRemote.current = true;

    if (remoteState.surah !== surah) setSurah(remoteState.surah);

    const drift = Math.abs(a.currentTime - remoteState.positionSec);
    if (drift > 1.5) a.currentTime = remoteState.positionSec;

    if (remoteState.playing && a.paused) a.play().catch(() => {});
    if (!remoteState.playing && !a.paused) a.pause();
    setPlaying(remoteState.playing);

    const id = setTimeout(() => { applyingRemote.current = false; }, 300);
    return () => clearTimeout(id);
  }, [remoteState]); // eslint-disable-line react-hooks/exhaustive-deps

  const push = (next: { playing?: boolean; positionSec?: number; surah?: number }) => {
    const a = audioRef.current;
    broadcast({
      surah: next.surah ?? surah,
      ayah: 0,
      reciter: RECITER,
      playing: next.playing ?? (a ? !a.paused : false),
      positionSec: next.positionSec ?? (a?.currentTime ?? 0),
    });
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play().catch(() => {}); push({ playing: true }); }
    else { a.pause(); push({ playing: false }); }
  };

  const restart = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    push({ positionSec: 0 });
  };

  const changeSurah = (s: number) => {
    setSurah(s);
    setPlaying(false);
    setTimeout(() => push({ surah: s, playing: false, positionSec: 0 }), 50);
  };

  return (
    <div className="bg-black/30 border border-emerald-500/20 rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio size={16} className={connected ? 'text-emerald-400' : 'text-white/30'} />
          <div>
            <p className="text-sm font-bold text-white">Escuchar juntos</p>
            <p className="text-[10px] text-[#A7F3D0]/60 font-mono">Sala {roomCode.slice(0, 6).toUpperCase()}</p>
          </div>
        </div>
        <button onClick={onLeave} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      {/* Presence */}
      <div className="flex items-center gap-2 mb-4">
        <Users size={14} className="text-[#A7F3D0]/60" />
        <div className="flex -space-x-2">
          {members.slice(0, 6).map(m => (
            m.avatar
              ? <img key={m.id} src={m.avatar} alt={m.name} className="w-7 h-7 rounded-full border-2 border-[#022C22] object-cover" />
              : <div key={m.id} className="w-7 h-7 rounded-full border-2 border-[#022C22] bg-emerald-600 grid place-items-center text-[10px] font-bold text-white">{m.name.slice(0, 1).toUpperCase()}</div>
          ))}
        </div>
        <span className="text-[11px] text-[#A7F3D0]/60">{members.length} escuchando</span>
      </div>

      {/* Surah selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {PRESETS.map(s => (
          <button
            key={s}
            onClick={() => changeSurah(s)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
              s === surah ? 'bg-[#059669] text-white' : 'bg-white/5 text-[#A7F3D0]/70 hover:bg-white/10'
            }`}
          >
            {SURAH_NAMES[s] || `Surah ${s}`}
          </button>
        ))}
      </div>

      <audio
        ref={audioRef}
        src={audioUrl(surah)}
        onPlay={() => { if (!applyingRemote.current) push({ playing: true }); setPlaying(true); }}
        onPause={() => { if (!applyingRemote.current) push({ playing: false }); setPlaying(false); }}
        onSeeked={() => { if (!applyingRemote.current) push({}); }}
        onEnded={() => setPlaying(false)}
        preload="auto"
      />

      <div className="flex items-center justify-center gap-3">
        <button onClick={restart} className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-white">
          <SkipBack size={18} />
        </button>
        <button onClick={toggle} className="p-4 bg-[#FCD34D] text-[#022C22] rounded-full hover:bg-amber-300 transition-colors shadow-lg">
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </button>
      </div>
      <p className="text-center text-[10px] text-[#A7F3D0]/50 mt-3">
        {SURAH_NAMES[surah] || `Surah ${surah}`} · {RECITER === 'ar.alafasy' ? 'Mishary Alafasy' : RECITER}
      </p>
    </div>
  );
}
