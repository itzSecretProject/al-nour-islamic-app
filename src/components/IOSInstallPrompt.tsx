import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, PlusSquare } from 'lucide-react';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /ipad|iphone|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isIPad(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /ipad/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && window.innerWidth >= 768);
}

function isInStandaloneMode(): boolean {
  return (
    ('standalone' in navigator && (navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

const STORAGE_KEY = 'alnour_ios_prompt_dismissed';
const DISMISS_FOR_DAYS = 30;

const copy = {
  en: {
    title: 'Add to Home Screen',
    body: 'For the best experience — offline access, push notifications & full-screen mode — add Al Nour to your Home Screen.',
    iphone: 'Tap the Share button below, then "Add to Home Screen".',
    ipad: 'Tap the Share button at the top, then "Add to Home Screen".',
    dismiss: 'Not now',
  },
  es: {
    title: 'Añadir a la pantalla de inicio',
    body: 'Para la mejor experiencia — acceso offline, notificaciones y pantalla completa — añade Al Nour a tu pantalla de inicio.',
    iphone: 'Pulsa el botón Compartir abajo y elige "Añadir a la pantalla de inicio".',
    ipad: 'Pulsa el botón Compartir arriba y elige "Añadir a la pantalla de inicio".',
    dismiss: 'Ahora no',
  },
  ar: {
    title: 'أضف إلى الشاشة الرئيسية',
    body: 'للحصول على أفضل تجربة — وصول بدون إنترنت وإشعارات فورية — أضف النور إلى شاشتك الرئيسية.',
    iphone: 'اضغط زر المشاركة في الأسفل، ثم "إضافة إلى الشاشة الرئيسية".',
    ipad: 'اضغط زر المشاركة في الأعلى، ثم "إضافة إلى الشاشة الرئيسية".',
    dismiss: 'ليس الآن',
  },
  fr: {
    title: 'Ajouter à l\'écran d\'accueil',
    body: 'Pour la meilleure expérience — accès hors ligne, notifications — ajoutez Al Nour à votre écran d\'accueil.',
    iphone: 'Appuyez sur le bouton Partager en bas, puis "Sur l\'écran d\'accueil".',
    ipad: 'Appuyez sur le bouton Partager en haut, puis "Sur l\'écran d\'accueil".',
    dismiss: 'Pas maintenant',
  },
  de: {
    title: 'Zum Startbildschirm',
    body: 'Für das beste Erlebnis — Offline-Zugriff und Push-Nachrichten — fügen Sie Al Nour zum Startbildschirm hinzu.',
    iphone: 'Tippen Sie unten auf "Teilen", dann "Zum Home-Bildschirm".',
    ipad: 'Tippen Sie oben auf "Teilen", dann "Zum Home-Bildschirm".',
    dismiss: 'Nicht jetzt',
  },
  tr: {
    title: 'Ana Ekrana Ekle',
    body: 'En iyi deneyim için — çevrimdışı erişim, bildirimler — Al Nour\'u ana ekranınıza ekleyin.',
    iphone: 'Alttaki Paylaş butonuna basın, sonra "Ana Ekrana Ekle".',
    ipad: 'Üstteki Paylaş butonuna basın, sonra "Ana Ekrana Ekle".',
    dismiss: 'Şimdi değil',
  },
  pt: {
    title: 'Adicionar à tela inicial',
    body: 'Para a melhor experiência — acesso offline, notificações — adicione Al Nour à sua tela inicial.',
    iphone: 'Toque no botão Compartilhar abaixo, depois "Adicionar à tela de início".',
    ipad: 'Toque no botão Compartilhar acima, depois "Adicionar à tela de início".',
    dismiss: 'Agora não',
  },
  ur: {
    title: 'ہوم اسکرین پر شامل کریں',
    body: 'بہترین تجربے کے لیے — آف لائن رسائی اور اطلاعات — النور کو اپنی ہوم اسکرین پر شامل کریں۔',
    iphone: 'نیچے شیئر بٹن دبائیں، پھر "ہوم اسکرین پر شامل کریں"۔',
    ipad: 'اوپر شیئر بٹن دبائیں، پھر "ہوم اسکرین پر شامل کریں"۔',
    dismiss: 'ابھی نہیں',
  },
  id: {
    title: 'Tambah ke Layar Utama',
    body: 'Untuk pengalaman terbaik — akses offline & notifikasi — tambahkan Al Nour ke layar utama Anda.',
    iphone: 'Ketuk tombol Bagikan di bawah, lalu "Tambah ke Layar Utama".',
    ipad: 'Ketuk tombol Bagikan di atas, lalu "Tambah ke Layar Utama".',
    dismiss: 'Nanti saja',
  },
  ms: {
    title: 'Tambah ke Skrin Utama',
    body: 'Untuk pengalaman terbaik — akses luar talian & pemberitahuan — tambah Al Nour ke skrin utama anda.',
    iphone: 'Ketuk butang Kongsi di bawah, kemudian "Tambah ke Skrin Utama".',
    ipad: 'Ketuk butang Kongsi di atas, kemudian "Tambah ke Skrin Utama".',
    dismiss: 'Bukan sekarang',
  },
  bn: {
    title: 'হোম স্ক্রিনে যোগ করুন',
    body: 'সেরা অভিজ্ঞতার জন্য — অফলাইন অ্যাক্সেস ও বিজ্ঞপ্তি — আল নূর আপনার হোম স্ক্রিনে যোগ করুন।',
    iphone: 'নিচে শেয়ার বোতাম ট্যাপ করুন, তারপর "হোম স্ক্রিনে যোগ করুন"।',
    ipad: 'উপরে শেয়ার বোতাম ট্যাপ করুন, তারপর "হোম স্ক্রিনে যোগ করুন"।',
    dismiss: 'এখন না',
  },
  fa: {
    title: 'افزودن به صفحه اصلی',
    body: 'برای بهترین تجربه — دسترسی آفلاین و اعلان‌ها — النور را به صفحه اصلی خود اضافه کنید.',
    iphone: 'دکمه اشتراک‌گذاری پایین را بزنید، سپس "افزودن به صفحه اصلی".',
    ipad: 'دکمه اشتراک‌گذاری بالا را بزنید، سپس "افزودن به صفحه اصلی".',
    dismiss: 'نه الان',
  },
  ru: {
    title: 'Добавить на главный экран',
    body: 'Для лучшего опыта — работа без интернета и уведомления — добавьте Al Nour на главный экран.',
    iphone: 'Нажмите кнопку «Поделиться» внизу, затем «На экран "Домой"».',
    ipad: 'Нажмите кнопку «Поделиться» вверху, затем «На экран "Домой"».',
    dismiss: 'Не сейчас',
  },
};

type LangKey = keyof typeof copy;

interface Props {
  lang?: string;
}

export function IOSInstallPrompt({ lang = 'en' }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOS() || isInStandaloneMode()) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const dismissedAt = parseInt(raw, 10);
      if (Date.now() - dismissedAt < DISMISS_FOR_DAYS * 24 * 60 * 60 * 1000) return;
    }

    // Show after a short delay so the app finishes loading first
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  const t = (copy[lang as LangKey] ?? copy.en);
  const ipad = isIPad();
  const isRTL = lang === 'ar' || lang === 'ur' || lang === 'fa';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed bottom-0 inset-x-0 z-[9999] pointer-events-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="mx-4 mb-4 rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(15, 40, 30, 0.96)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.4)',
            }}>
            {/* green accent bar at top */}
            <div className="h-[3px] bg-gradient-to-r from-[#059669] via-[#FCD34D] to-[#059669]" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <img src="/icon-192.png" alt="Al Nour" className="w-10 h-10 rounded-2xl shadow-md" />
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{t.title}</p>
                    <p className="text-[#A7F3D0]/60 text-[10px] mt-0.5">Al Nour · Islamic App</p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="text-white/40 hover:text-white/80 transition-colors p-1 -mt-0.5 -me-1"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-white/75 text-[12px] leading-relaxed mb-3">{t.body}</p>

              {/* Step instruction */}
              <div className="flex items-center gap-2.5 bg-white/5 rounded-2xl px-3.5 py-3 border border-white/8">
                <Share size={18} className="text-[#FCD34D] shrink-0" />
                <p className="text-white/85 text-[11.5px] leading-snug flex-1">
                  {ipad ? t.ipad : t.iphone}
                </p>
                <PlusSquare size={18} className="text-[#A7F3D0]/50 shrink-0" />
              </div>

              <button
                onClick={dismiss}
                className="mt-3 w-full text-center text-[11px] text-white/35 hover:text-white/60 transition-colors py-1"
              >
                {t.dismiss}
              </button>
            </div>

            {/* Arrow indicator pointing to bottom share button (iPhone) or top-right (iPad) */}
            {!ipad && (
              <div className="flex justify-center pb-4 -mt-1">
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                  className="text-[#FCD34D]/70 text-xs"
                >
                  ↓
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
