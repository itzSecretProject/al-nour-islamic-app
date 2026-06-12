import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Home, Compass, CircleDot, BookOpen, BookText, Settings } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { usePrayerData } from '../context/PrayerContext';
import { useUI } from '../context/UIContext';
import { translations } from '../utils/translations';
import { getSeasonalWallpaper } from '../utils/islamicDays';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AppLayout({ children, activeTab, setActiveTab }: AppLayoutProps) {
  const { settings, showAuthModal } = useSettings();
  const { prayerData } = usePrayerData();
  const { modalOpen } = useUI();

  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;

  // Hold-to-slide gesture state for the liquid-glass nav.
  const navRef = useRef<HTMLElement | null>(null);
  const pressing = useRef(false);
  const lastTab = useRef(activeTab);

  const tabs = [
    { id: 'home', label: t.tabHome, icon: <Home size={20} /> },
    { id: 'quran', label: t.tabQuran, icon: <BookText size={20} /> },
    { id: 'qibla', label: t.tabQibla, icon: <Compass size={20} /> },
    { id: 'tasbih', label: t.tabTasbih, icon: <CircleDot size={20} /> },
    { id: 'duas', label: t.tabDuas, icon: <BookOpen size={20} /> },
    { id: 'settings', label: t.tabSettings, icon: <Settings size={20} /> },
  ];

  // Seasonal auto-wallpaper (e.g. Mount Arafat on the Day of Arafah) overrides the
  // user's pick only while a special Islamic day/season is active, if enabled.
  // Uses the same Hijri date the API returns (shown across the app) for consistency.
  const hijriDay = prayerData ? parseInt(prayerData.date.hijri.day) : 0;
  const hijriMonth = prayerData?.date.hijri.month.number ?? 0;
  const seasonalWallpaper = settings.autoWallpaper && hijriDay
    ? getSeasonalWallpaper(hijriDay, hijriMonth)
    : null;
  const effectiveWallpaper = seasonalWallpaper || settings.wallpaper;

  const getBackgroundStyle = () => {
    switch (effectiveWallpaper) {
      case 'arafat':
        return {
          backgroundImage: 'linear-gradient(rgba(2, 44, 34, 0.75), rgba(1, 20, 16, 0.88)), url("/arafat_wallpaper.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      case 'mosque':
        return {
          backgroundImage: 'linear-gradient(rgba(2, 24, 44, 0.75), rgba(1, 10, 20, 0.88)), url("/mosque_night_wp.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      case 'navy_gold':
        return {
          backgroundImage: 'linear-gradient(rgba(10, 25, 47, 0.75), rgba(2, 12, 27, 0.88)), url("/navy_gold_wp.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      case 'charcoal':
        return {
          background: 'linear-gradient(135deg, #121214 0%, #1e1e24 50%, #0a0a0c 100%)',
        };
      case 'emerald':
      default:
        return {
          background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #011410 100%)',
        };
    }
  };

  const tabIdFromX = (clientX: number): string | null => {
    const el = navRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const rel = clientX - r.left;
    const idx = Math.max(0, Math.min(tabs.length - 1, Math.floor((rel / r.width) * tabs.length)));
    return tabs[idx].id;
  };

  const selectFromPointer = (clientX: number) => {
    const id = tabIdFromX(clientX);
    if (id && id !== lastTab.current) {
      lastTab.current = id;
      if (navigator.vibrate) navigator.vibrate(7); // subtle tactile tick while sliding
      setActiveTab(id);
    } else if (id) {
      lastTab.current = id;
      setActiveTab(id);
    }
  };

  // Hide the nav on the immersive Qibla map, behind the account sheet, and
  // whenever any full-screen modal/sheet is open (incl. the new-dhikr form).
  const hideNav = activeTab === 'qibla' || (showAuthModal && activeTab === 'settings') || modalOpen;

  return (
    <div
      style={getBackgroundStyle()}
      className="app-container w-full h-[100dvh] text-[#F3F4F6] overflow-hidden flex relative transition-all duration-700 select-none"
    >
      {/* Desktop sidebar navigation (lg+) — keeps the phone bottom-bar on mobile */}
      {!hideNav && (
        <aside className="hidden lg:flex flex-col w-64 shrink-0 h-full bg-black/20 backdrop-blur-xl border-r border-white/10 px-4 py-6 z-30">
          <div className="flex items-center gap-2.5 px-2 mb-8">
            <img src="/icon-192.png" alt="Al Nour" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-white tracking-tight">Al Nour</span>
          </div>
          <nav className="flex flex-col gap-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#FCD34D]/12 border border-[#FCD34D]/25 text-[#FCD34D]'
                      : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-auto px-2 text-[10px] text-white/25 font-mono">Al Nour · web</div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
      <main className="app-scroll flex-1 overflow-y-auto bg-transparent pb-28 lg:pb-10 w-full">
        <div className="max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Bottom Navigation — liquid-glass, hold & slide to switch (mobile/tablet) */}
      {!hideNav && (
        <div className="lg:hidden absolute flex justify-center bottom-6 mb-safe w-full px-4 pointer-events-none z-30">
          <nav
            ref={navRef}
            onPointerDown={(e) => {
              pressing.current = true;
              lastTab.current = activeTab;
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
              selectFromPointer(e.clientX);
            }}
            onPointerMove={(e) => { if (pressing.current) selectFromPointer(e.clientX); }}
            onPointerUp={() => { pressing.current = false; }}
            onPointerCancel={() => { pressing.current = false; }}
            className="nav-glass relative w-full max-w-md px-4 py-4 flex justify-between items-center rounded-3xl pointer-events-auto touch-none overflow-hidden"
          >
            {/* Top sheen highlight for the waterglass look */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-3xl" />
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 transition-colors duration-300 relative z-10 ${
                    isActive ? 'text-[#FCD34D]' : 'text-white opacity-40 hover:opacity-100'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navActivePill"
                      className="absolute -inset-x-2.5 -inset-y-2 rounded-2xl -z-10 bg-[#FCD34D]/12 border border-[#FCD34D]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm"
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    />
                  )}
                  <motion.div
                    animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  >
                    {tab.icon}
                  </motion.div>
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
      </div>
    </div>
  );
}
