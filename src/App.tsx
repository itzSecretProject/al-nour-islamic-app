import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AppLayout } from './components/AppLayout';
import { HomeScreen } from './screens/HomeScreen';
import { PrayerProvider, usePrayerData } from './context/PrayerContext';
import { SettingsProvider } from './context/SettingsContext';
import { SalahTrackerProvider } from './context/SalahTrackerContext';
import { MemorizationProvider } from './context/MemorizationContext';
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';
import { useSettings } from './hooks/useSettings';
import { useReminders } from './hooks/useReminders';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useBackgroundDownloader } from './hooks/useBackgroundDownloader';
import { useStatsSync } from './hooks/useStatsSync';
import { useAdhanBridge } from './hooks/useAdhanBridge';
import { usePushHeartbeat } from './hooks/usePushHeartbeat';
import { LoadingScreen } from './components/LoadingScreen';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import { motion, AnimatePresence } from 'motion/react';

// Keep the import factories so we can both lazy-load and warm them up after the
// first paint — that way switching tabs never shows the loading screen again.
const importQibla = () => import('./screens/QiblaScreen').then(m => ({ default: m.QiblaScreen }));
const importTasbih = () => import('./screens/TasbihScreen').then(m => ({ default: m.TasbihScreen }));
const importDuas = () => import('./screens/DuasScreen').then(m => ({ default: m.DuasScreen }));
const importQuran = () => import('./screens/QuranScreen').then(m => ({ default: m.QuranScreen }));
const importSettings = () => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen }));

const QiblaScreen = lazy(importQibla);
const TasbihScreen = lazy(importTasbih);
const DuasScreen = lazy(importDuas);
const QuranScreen = lazy(importQuran);
const SettingsScreen = lazy(importSettings);

function preloadScreens() {
  // Fire all dynamic imports so the chunks are cached before the user navigates.
  importQuran(); importQibla(); importTasbih(); importDuas(); importSettings();
}

const RTL_LANGS = new Set(['ar', 'ur', 'fa']);

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const { loading } = usePrayerData();
  const { settings } = useSettings();

  useEffect(() => {
    const isRTL = RTL_LANGS.has(settings.language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language || 'en';
  }, [settings.language]);

  // Fallback in-app reminders (when app is open)
  useReminders();
  // Background push notifications via server (when app is closed)
  usePushNotifications();
  // Initialize background Quran audio downloader
  useBackgroundDownloader();
  // Mirror local streak / memorized stats to the Supabase profile (no-op if not signed in)
  useStatsSync();
  // Play the chosen adhan when a background push arrives and the app is alive
  useAdhanBridge();
  // Catch up on any missed prayer notifications whenever the user opens the app
  usePushHeartbeat();

  // Warm up all lazy screens right after first paint so tab switches are instant
  // (no loading screen flash). Uses idle time to avoid blocking the first render.
  useEffect(() => {
    const ric = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
    ric(() => preloadScreens());
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'quran':
        return <QuranScreen />;
      case 'qibla':
        return <QiblaScreen onBack={() => setActiveTab('home')} />;
      case 'tasbih':
        return <TasbihScreen />;
      case 'duas':
        return <DuasScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {loading && <LoadingScreen />}
      </AnimatePresence>
      <IOSInstallPrompt lang={settings.language} />
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full bg-transparent"
          >
            <Suspense fallback={
              <div className="flex items-center justify-center py-32">
                <div className="w-6 h-6 rounded-full border-[2.5px] border-white/10 border-t-[#FCD34D] animate-spin" />
              </div>
            }>
              {renderScreen()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </AppLayout>
    </>
  );
}

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <SettingsProvider>
          <PrayerProvider>
            <SalahTrackerProvider>
              <MemorizationProvider>
                <MainApp />
              </MemorizationProvider>
            </SalahTrackerProvider>
          </PrayerProvider>
        </SettingsProvider>
      </AuthProvider>
    </UIProvider>
  );
}
