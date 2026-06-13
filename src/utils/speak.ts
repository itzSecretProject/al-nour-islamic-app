// Arabic text-to-speech for duas & adhkar — a universal "listen / pronunciation"
// helper that works for every dua without needing a recorded audio file per one.
// Uses the device's built-in Arabic voice (iOS "Maged", Android/Chrome Google
// arabic), so it works offline once the OS voice is installed.

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    let v = synth.getVoices();
    if (v.length) { cachedVoices = v; resolve(v); return; }
    // Voices may load async on first use.
    const handler = () => {
      v = synth.getVoices();
      if (v.length) { cachedVoices = v; resolve(v); synth.onvoiceschanged = null; }
    };
    synth.onvoiceschanged = handler;
    setTimeout(() => resolve(synth.getVoices()), 300);
  });
}

function pickArabicVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find(v => /ar(-|_)?(SA)?/i.test(v.lang) && /maged|arabic|عرب/i.test(v.name)) ||
    voices.find(v => v.lang?.toLowerCase().startsWith('ar')) ||
    null
  );
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

// Speaks the Arabic text. Returns true if it could start. `onend` fires when done
// or when cancelled, so callers can reset UI state.
export async function speakArabic(text: string, onend?: () => void): Promise<boolean> {
  if (!isSpeechSupported()) { onend?.(); return false; }
  const synth = window.speechSynthesis;
  synth.cancel(); // stop anything already playing (toggle behaviour)

  const voices = cachedVoices.length ? cachedVoices : await loadVoices();
  const voice = pickArabicVoice(voices);

  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || 'ar-SA';
  if (voice) u.voice = voice;
  u.rate = 0.78;  // slower for clarity / learning pronunciation
  u.pitch = 1;
  u.onend = () => onend?.();
  u.onerror = () => onend?.();
  synth.speak(u);
  return true;
}
