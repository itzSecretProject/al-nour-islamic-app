// Renders a beautiful shareable image (Arabic + translation) on a canvas and
// shares it via the Web Share API (WhatsApp, etc.), falling back to download.

export interface ShareCardData {
  title?: string;
  arabic: string;
  transliteration?: string;
  translation: string;
  reference?: string;
}

const FOOTER: Record<string, string> = {
  en: 'Al Nour · Islamic App',
  es: 'Al Nour · App Islámica',
  ar: 'النور · تطبيق إسلامي',
  fr: 'Al Nour · App Islamique',
  de: 'Al Nour · Islam-App',
  tr: 'Al Nour · İslami Uygulama',
  pt: 'Al Nour · App Islâmico',
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function shareAyahCard(data: ShareCardData, lang: string = 'en'): Promise<void> {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Make sure the Arabic + UI fonts are ready before drawing.
  try {
    await (document as any).fonts?.load?.('700 60px Amiri');
    await (document as any).fonts?.load?.('400 34px Inter');
    await (document as any).fonts?.ready;
  } catch {}

  // Background gradient (emerald → deep green)
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#064E3B');
  g.addColorStop(0.55, '#022C22');
  g.addColorStop(1, '#011410');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft glow
  const glow = ctx.createRadialGradient(W / 2, 300, 50, W / 2, 300, 600);
  glow.addColorStop(0, 'rgba(16,185,129,0.18)');
  glow.addColorStop(1, 'rgba(16,185,129,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Border frame
  ctx.strokeStyle = 'rgba(252,211,77,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  const cx = W / 2;
  let y = 200;

  // Logo
  const logo = await loadImage('/al_nour_logo.png');
  if (logo) {
    const s = 130;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, y, s / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logo, cx - s / 2, y - s / 2, s, s);
    ctx.restore();
    y += 130;
  }

  // Title
  if (data.title) {
    ctx.fillStyle = '#FCD34D';
    ctx.font = '700 38px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.title.toUpperCase(), cx, y);
    y += 70;
  } else {
    y += 20;
  }

  // Arabic (RTL, wrapped)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 64px Amiri, serif';
  ctx.textAlign = 'center';
  (ctx as any).direction = 'rtl';
  const arLines = wrap(ctx, data.arabic, W - 220);
  for (const line of arLines.slice(0, 6)) {
    ctx.fillText(line, cx, y);
    y += 92;
  }
  (ctx as any).direction = 'ltr';
  y += 24;

  // Transliteration
  if (data.transliteration) {
    ctx.fillStyle = 'rgba(252,211,77,0.9)';
    ctx.font = 'italic 600 30px Inter, sans-serif';
    for (const line of wrap(ctx, data.transliteration, W - 220).slice(0, 4)) {
      ctx.fillText(line, cx, y);
      y += 44;
    }
    y += 18;
  }

  // Translation
  ctx.fillStyle = '#A7F3D0';
  ctx.font = '400 34px Inter, sans-serif';
  for (const line of wrap(ctx, `“${data.translation}”`, W - 200).slice(0, 7)) {
    ctx.fillText(line, cx, y);
    y += 50;
  }

  // Reference
  if (data.reference) {
    y += 20;
    ctx.fillStyle = 'rgba(167,243,208,0.6)';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText(data.reference, cx, y);
  }

  // Footer
  ctx.fillStyle = 'rgba(252,211,77,0.85)';
  ctx.font = '700 30px Inter, sans-serif';
  ctx.fillText(FOOTER[lang] || FOOTER.en, cx, H - 90);

  // Export + share
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png', 0.95));
  if (!blob) return;
  const file = new File([blob], 'al-nour.png', { type: 'image/png' });

  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Al Nour' });
      return;
    } catch {
      return; // user cancelled
    }
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'al-nour.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ── Streak card: shareable square image with the user's prayer streak ─────────

const STREAK_T: Record<string, { title: string; days: string; sub: string }> = {
  en: { title: 'Prayer streak', days: 'days in a row', sub: 'All five daily prayers, every day' },
  es: { title: 'Racha de rezos', days: 'días seguidos', sub: 'Los cinco rezos diarios, cada día' },
  ar: { title: 'مواظبة الصلاة', days: 'يوماً متتالياً', sub: 'الصلوات الخمس كل يوم' },
};

export async function shareStreakCard(streak: number, lang: string = 'en'): Promise<void> {
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  try { await (document as any).fonts?.ready; } catch {}

  const tt = STREAK_T[lang] || STREAK_T.en;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#064E3B');
  g.addColorStop(0.55, '#022C22');
  g.addColorStop(1, '#011410');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 620);
  glow.addColorStop(0, 'rgba(252,211,77,0.16)');
  glow.addColorStop(1, 'rgba(252,211,77,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(252,211,77,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  const cx = W / 2;
  const logo = await loadImage('/al_nour_logo.png');
  if (logo) {
    const s = 120;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, 200, s / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, cx - s / 2, 200 - s / 2, s, s);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FCD34D';
  ctx.font = '700 40px Inter, sans-serif';
  ctx.fillText(tt.title.toUpperCase(), cx, 340);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 280px Inter, sans-serif';
  ctx.fillText(String(streak), cx, 640);

  ctx.fillStyle = '#A7F3D0';
  ctx.font = '700 52px Inter, sans-serif';
  ctx.fillText(tt.days, cx, 730);

  ctx.fillStyle = 'rgba(167,243,208,0.6)';
  ctx.font = '400 32px Inter, sans-serif';
  ctx.fillText(tt.sub, cx, 800);

  ctx.fillStyle = 'rgba(252,211,77,0.85)';
  ctx.font = '700 30px Inter, sans-serif';
  ctx.fillText(FOOTER[lang] || FOOTER.en, cx, H - 90);

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png', 0.95));
  if (!blob) return;
  const file = new File([blob], 'al-nour-streak.png', { type: 'image/png' });
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: 'Al Nour' }); return; } catch { return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'al-nour-streak.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
