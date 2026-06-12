let globalAudioCtx: AudioContext | null = null;

export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    if (!globalAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        globalAudioCtx = new AudioContextClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (e) {
    console.warn('Web Audio API not supported', e);
    return null;
  }
};

export const playOfflineChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return null;
    const now = ctx.currentTime + (ctx.state === 'suspended' ? 0.1 : 0);
    
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.05); // Attack
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration); // Decay
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };
    
    // Play a beautiful soft C-major chord (C5 -> E5 -> G5)
    playNote(523.25, now, 1.2);       // C5
    playNote(659.25, now + 0.12, 1.2); // E5
    playNote(783.99, now + 0.24, 1.5); // G5
    
    return ctx;
  } catch (e) {
    console.error('Failed to play synthesized chime', e);
    return null;
  }
};

export const playOfflineBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return null;
    const now = ctx.currentTime + (ctx.state === 'suspended' ? 0.1 : 0);
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
    
    return ctx;
  } catch (e) {
    console.error('Failed to play synthesized beep', e);
    return null;
  }
};

export const playBeadClickSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {
    console.warn("Failed to play bead click sound", e);
  }
};

export const getAdhanAudioUrl = (soundType: string): string => {
  switch (soundType) {
    case 'makkah':
      return '/adhan-makkah.mp3';
    case 'madinah':
      return '/adhan-madinah.mp3';
    case 'alafasy':
    case 'aqsa': // backward compat for saved settings
      return '/adhan-alafasy.mp3';
    default:
      return '';
  }
};

// Returns a function to stop the audio
export const playAdhanSound = (soundType: string): (() => void) => {
  if (soundType === 'chime') {
    playOfflineChime();
    return () => {};
  }
  if (soundType === 'beep') {
    playOfflineBeep();
    return () => {};
  }
  if (soundType === 'none') {
    return () => {};
  }
  
  const url = getAdhanAudioUrl(soundType);
  if (!url) return () => {};
  
  let audio: HTMLAudioElement | null = new Audio(url);
  let isStopped = false;
  let blobUrl = '';

  // Play immediately (synchronously) to satisfy browser autoplay requirements for user-triggered gestures
  audio.play().catch(err => {
    console.warn('Direct play failed, trying fallback via blob', err);
    if (isStopped) return;
    
    // Fallback to fetch as blob if direct play fails (e.g. range request error in old Safari or if offline)
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (isStopped) return;
        blobUrl = URL.createObjectURL(blob);
        audio = new Audio(blobUrl);
        audio.play().catch(e => console.error('Blob play fallback failed', e));
      })
      .catch(e => console.error('Adhan audio fallback chain failed', e));
  });
  
  return () => {
    isStopped = true;
    if (audio) {
      audio.pause();
    }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
  };
};
