import React, { createContext, useContext, useState, useEffect } from 'react';
import { logoUrl } from '../utils/logos';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  method: 'google' | 'email';
}

export interface ReminderSettings {
  Fajr: boolean;
  Sunrise: boolean;
  Dhuhr: boolean;
  Asr: boolean;
  Maghrib: boolean;
  Isha: boolean;
  offsetMinutes: number;
  
  // Settings
  language: 'en' | 'es' | 'ar' | 'fr' | 'de' | 'tr' | 'pt' | 'ur' | 'id' | 'ms' | 'bn' | 'fa' | 'ru';
  wallpaper: 'arafat' | 'mosque' | 'navy_gold' | 'charcoal' | 'emerald' | 'midnight' | 'plum' | 'rose' | 'ocean';
  appLogo: 'default' | 'golden-crescent' | 'crescent-star' | 'mosque' | 'star8';
  locationMode: 'auto' | 'manual';
  manualLatitude: number;
  manualLongitude: number;
  manualCityName: string;
  smartUpdates: boolean;
  soundFajr: string;
  soundGeneral: string;
  offsets: {
    Fajr: number;
    Sunrise: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Isha: number;
  };
  showRakats: boolean;
  showSunrise: boolean;
  calculationMethod: number; // 3 = MWL (default Sunni)
  reciter: string;
  tasbihHaptics: boolean;
  tasbihHapticStrength: 'light' | 'medium' | 'heavy';
  tasbihSounds: boolean;
  fastingReminders: boolean;
  age: number | null; // null = not set (treated as adult)
  autoWallpaper: boolean; // auto-switch wallpaper on special Islamic days/seasons
  showLearnOnHome: boolean; // show the "Learn to Pray" card on Home (hide once you know how)
  showPrayerTracker: boolean; // show the "did you pray?" tracker card on Home + notification actions
  // Notification extras
  preAlertMinutes: number; // 0 = off, else N min before each prayer (separate early-warning notif)
  jumuahReminder: boolean; // Friday Jumu'ah notification (30 min before Dhuhr)
  silentHoursEnabled: boolean; // suppress non-Fajr notifications during silent window
  silentHoursStart: number; // 0–23 (hour, default 23)
  silentHoursEnd: number; // 0–23 (hour, default 5)
  islamicDateAlerts: boolean; // notify on important hijri dates (Ramadan, Eid, etc.)
  // Adhkar (morning/evening remembrance) reminders — configurable, push-backed.
  adhkarMorningReminder: boolean; // notify for morning adhkar (after Fajr)
  adhkarEveningReminder: boolean; // notify for evening adhkar (after Asr)
  adhkarMorningOffset: number;    // minutes after Fajr (default 30)
  adhkarEveningOffset: number;    // minutes after Asr (default 30)
  // Khatmah — Quran completion plan
  khatmahActive: boolean;         // a completion plan is running
  khatmahTotalDays: number;       // target days to finish (e.g. 30)
  khatmahStartDate: string;       // YYYY-MM-DD the plan started
  khatmahStartPage: number;       // mushaf page at start (usually 1)
  khatmahPagesRead: number;       // pages read so far
  khatmahReminder: boolean;       // daily push reminder for the day's pages
  khatmahReminderHour: number;    // 0–23 hour for the daily reminder
}

// Maturity model based on age. Under 15 (Islamic age of accountability / baligh)
// prayers are encouraged but not framed as obligatory, with a gentler tone.
export type MaturityTone = 'kid' | 'child' | 'adult';
export function maturityFromAge(age: number | null): MaturityTone {
  if (age == null) return 'adult';
  if (age < 7) return 'kid';
  if (age < 15) return 'child';
  return 'adult';
}
export function isAccountable(age: number | null): boolean {
  return age == null || age >= 15;
}

const getDeviceLanguage = (): 'en' | 'es' | 'ar' | 'fr' | 'de' | 'tr' | 'pt' | 'ur' | 'id' | 'ms' | 'bn' | 'fa' | 'ru' => {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || (navigator as any).userLanguage || 'en').toLowerCase();
  if (lang.startsWith('ar')) return 'ar';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('tr')) return 'tr';
  if (lang.startsWith('pt')) return 'pt';
  if (lang.startsWith('ur')) return 'ur';
  if (lang.startsWith('id')) return 'id';
  if (lang.startsWith('ms')) return 'ms';
  if (lang.startsWith('bn')) return 'bn';
  if (lang.startsWith('fa')) return 'fa';
  if (lang.startsWith('ru')) return 'ru';
  return 'en';
};

export const DEFAULT_SETTINGS: ReminderSettings = {
  Fajr: true,
  Sunrise: false, // Sunrise is not a formal prayer reminder by default
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
  offsetMinutes: 0,
  language: getDeviceLanguage(),
  wallpaper: 'arafat',
  appLogo: 'golden-crescent',
  locationMode: 'auto',
  manualLatitude: 36.507,
  manualLongitude: -4.767,
  manualCityName: 'Andalusia, Las Chapas',
  smartUpdates: true,
  soundFajr: 'makkah',
  soundGeneral: 'chime',
  offsets: {
    Fajr: 0,
    Sunrise: 0,
    Dhuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0,
  },
  showRakats: true,
  showSunrise: false,
  calculationMethod: 18, // Tunisia (Sunni)
  reciter: 'ar.alafasy',
  tasbihHaptics: true,
  tasbihHapticStrength: 'medium',
  tasbihSounds: true,
  fastingReminders: true,
  age: null,
  autoWallpaper: true,
  showLearnOnHome: true,
  showPrayerTracker: true,
  preAlertMinutes: 0,
  jumuahReminder: true,
  silentHoursEnabled: false,
  silentHoursStart: 23,
  silentHoursEnd: 5,
  islamicDateAlerts: true,
  adhkarMorningReminder: false,
  adhkarEveningReminder: false,
  adhkarMorningOffset: 30,
  adhkarEveningOffset: 30,
  khatmahActive: false,
  khatmahTotalDays: 30,
  khatmahStartDate: '',
  khatmahStartPage: 1,
  khatmahPagesRead: 0,
  khatmahReminder: true,
  khatmahReminderHour: 9,
};

interface SettingsContextType {
  settings: ReminderSettings;
  updateSetting: <K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) => void;
  notificationPermission: string;
  requestNotificationPermission: () => Promise<string>;
  resetSettings: () => void;
  
  // Authentication states
  currentUser: UserProfile | null;
  login: (email: string, name: string, method?: 'google' | 'email', customAvatarUrl?: string) => void | Promise<void>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (val: boolean) => void;
  cloudSync: 'idle' | 'syncing' | 'ok' | 'error';
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('app_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [settings, setSettings] = useState<ReminderSettings>(() => {
    // If logged in, prioritize loading user-specific settings
    const activeUserSaved = localStorage.getItem('app_current_user');
    let emailKey = '';
    if (activeUserSaved) {
      try {
        emailKey = JSON.parse(activeUserSaved).email;
      } catch {}
    }
    
    const settingsKey = emailKey ? `settings_user_${emailKey}` : 'app_reminder_settings';
    const saved = localStorage.getItem(settingsKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed, offsets: { ...DEFAULT_SETTINGS.offsets, ...parsed.offsets } };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [cloudSync, setCloudSync] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');

  // SHA-256 Hashing for anonymous bucket keys
  const getHash = async (text: string) => {
    try {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Basic fallback hash for legacy browsers
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      return 'fb_' + Math.abs(hash).toString(16);
    }
  };

  const syncSettingsToServer = async (currentSettings: ReminderSettings, email: string) => {
    setCloudSync('syncing');
    try {
      const emailHash = await getHash(email);
      const res = await fetch(`/api/sync?email=${emailHash}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: currentSettings })
      });
      const json = await res.json().catch(() => ({}));
      setCloudSync(res.ok && json.success ? 'ok' : 'error');
    } catch (e) {
      console.warn('Cloud sync failed, settings kept locally', e);
      setCloudSync('error');
    }
  };

  const fetchSettingsFromServer = async (email: string): Promise<ReminderSettings | null> => {
    try {
      const emailHash = await getHash(email);
      const res = await fetch(`/api/sync?email=${emailHash}`);
      if (res.ok) {
        const json = await res.json();
        if (json.settings) return json.settings;
      }
    } catch (e) {
      console.warn("Failed to fetch cloud settings", e);
    }
    return null;
  };

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('app_reminder_settings', JSON.stringify(settings));
    if (currentUser) {
      localStorage.setItem(`settings_user_${currentUser.email}`, JSON.stringify(settings));
      syncSettingsToServer(settings, currentUser.email);
    }
  }, [settings, currentUser]);

  useEffect(() => {
    const logoUrl512 = logoUrl(settings.appLogo);

    // Update apple-touch-icon
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (appleIcon) {
      appleIcon.href = logoUrl512;
    } else {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href = logoUrl512;
      document.head.appendChild(appleIcon);
    }

    // Update favicon / icon
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = logoUrl512;
    } else {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.href = logoUrl512;
      document.head.appendChild(favicon);
    }

    // Update manifest link dynamically with query params so Service Worker can customize it
    const manifestUrl = `/manifest.json?logo=${settings.appLogo || 'default'}&lang=${settings.language || 'en'}`;
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestLink) {
      manifestLink.href = manifestUrl;
    } else {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestUrl;
      document.head.appendChild(manifestLink);
    }
  }, [settings.appLogo, settings.language]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied';
  };

  const updateSetting = <K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const login = async (email: string, name: string, method: 'google' | 'email' = 'email', customAvatarUrl?: string) => {
    const profile: UserProfile = {
      name,
      email,
      avatarUrl: customAvatarUrl || (method === 'google' 
        ? 'https://api.dicebear.com/7.x/identicon/svg?seed=google_' + encodeURIComponent(name)
        : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`),
      method
    };
    setCurrentUser(profile);
    localStorage.setItem('app_current_user', JSON.stringify(profile));
    
    // Load previously saved settings for this user if they exist
    const savedSettings = localStorage.getItem(`settings_user_${email}`);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error loading user settings:", e);
      }
    }

    // Load from cloud sync
    const cloudSettings = await fetchSettingsFromServer(email);
    if (cloudSettings) {
      setSettings(cloudSettings);
      localStorage.setItem(`settings_user_${email}`, JSON.stringify(cloudSettings));
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_current_user');
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        notificationPermission,
        requestNotificationPermission,
        resetSettings,
        currentUser,
        login,
        logout,
        showAuthModal,
        setShowAuthModal,
        cloudSync
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};
