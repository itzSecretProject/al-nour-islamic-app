import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { isAccountable } from '../context/SettingsContext';
import { usePrayerData } from '../context/PrayerContext';
import { useAuth } from '../context/AuthContext';
import { translations } from '../utils/translations';
import { playAdhanSound } from '../utils/audio';
import {
  User, Bell, BellOff, Clock, Palette, MapPin,
  Play, Pause, RefreshCw, Navigation,
  Map, Search, Globe, RotateCcw, ShieldCheck, ShieldAlert, X, UserCheck, Loader2,
  BookOpen, ChevronRight, Users
} from 'lucide-react';
import { LearnPrayerScreen } from './LearnPrayerScreen';
import { motion, AnimatePresence } from 'motion/react';

const LOCALIZED_PRAYERS: Record<string, Record<string, string>> = {
  en: { Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  es: { Fajr: 'Fajr', Sunrise: 'Amanecer', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  ar: { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
  fr: { Fajr: 'Fajr', Sunrise: 'Lever du soleil', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
  de: { Fajr: 'Fadschr', Sunrise: 'Sonnenaufgang', Dhuhr: 'Duhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Ischa' },
  tr: { Fajr: 'İmsak', Sunrise: 'Güneş', Dhuhr: 'Öğle', Asr: 'İkindi', Maghrib: 'Akşam', Isha: 'Yatsı' },
  pt: { Fajr: 'Fajr', Sunrise: 'Nascer do sol', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
};

export function SettingsScreen() {
  const {
    settings, updateSetting, notificationPermission,
    requestNotificationPermission, resetSettings,
    currentUser, login, logout,
    showAuthModal, setShowAuthModal, cloudSync
  } = useSettings();
  const { user: supaUser, profile: supaProfile, signOut: supaSignOut, enabled: supaEnabled } = useAuth();
  const { resolvedCityName, refreshPrayerTimes } = usePrayerData();
  
  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;
  
  const [activeSection, setActiveSection] = useState<'profile' | 'sound' | 'time' | 'appearance'>('profile');
  
  // Learn-to-pray overlay (also openable here, not only from Home)
  const [showLearn, setShowLearn] = useState(false);
  // Audio preview state
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  // Authentication states
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // SHA-256 Hashing for passwords
  const hashPassword = async (pwd: string): Promise<string> => {
    try {
      const msgUint8 = new TextEncoder().encode(pwd);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      let hash = 0;
      for (let i = 0; i < pwd.length; i++) {
        hash = (hash << 5) - hash + pwd.charCodeAt(i);
        hash |= 0;
      }
      return 'fallback_' + Math.abs(hash).toString(16);
    }
  };

  // Authentication translation dictionary
  const authT = {
    en: {
      accountTitle: 'User Profile & Sync',
      accountDesc: 'Sync your location, prayer preferences, and custom reciters across devices.',
      signIn: 'Sign In / Register',
      signOut: 'Log Out',
      googleSignIn: 'Continue with Google',
      orEmail: 'Or use your email',
      email: 'Email address',
      password: 'Password',
      fullName: 'Full Name',
      loginBtn: 'Sign In',
      registerBtn: 'Create Account',
      dontHaveAccount: "Don't have an account?",
      alreadyHaveAccount: 'Already have an account?',
      registerLink: 'Register here',
      loginLink: 'Login here',
      errorEmpty: 'Please fill in all fields',
      errorPasswordShort: 'Password must be at least 6 characters',
      errorEmailExists: 'This email is already registered',
      errorInvalid: 'Invalid email or password',
      googlePopupTitle: 'Sign in with Google',
      googlePopupSub: 'to continue to Al-Nour Premium',
      useAnother: 'Use another account',
      googleNamePlaceholder: 'Enter your name',
      googleEmailPlaceholder: 'Enter your Gmail address',
      syncedText: 'Preferences synced to local profile'
    },
    es: {
      accountTitle: 'Perfil y Sincronización',
      accountDesc: 'Guarda tu ubicación, alertas de rezo y recitadores preferidos.',
      signIn: 'Iniciar Sesión / Registro',
      signOut: 'Cerrar Sesión',
      googleSignIn: 'Continuar con Google',
      orEmail: 'O usa tu correo',
      email: 'Correo electrónico',
      password: 'Contraseña',
      fullName: 'Nombre completo',
      loginBtn: 'Ingresar',
      registerBtn: 'Crear Cuenta',
      dontHaveAccount: '¿No tienes una cuenta?',
      alreadyHaveAccount: '¿Ya tienes una cuenta?',
      registerLink: 'Regístrate aquí',
      loginLink: 'Inicia sesión aquí',
      errorEmpty: 'Por favor completa todos los campos',
      errorPasswordShort: 'La contraseña debe tener al menos 6 caracteres',
      errorEmailExists: 'Este correo ya está registrado',
      errorInvalid: 'Correo o contraseña incorrectos',
      googlePopupTitle: 'Iniciar sesión con Google',
      googlePopupSub: 'para continuar en Al-Nour Premium',
      useAnother: 'Usar otra cuenta',
      googleNamePlaceholder: 'Escribe tu nombre',
      googleEmailPlaceholder: 'Escribe tu dirección de Gmail',
      syncedText: 'Preferencias sincronizadas con tu perfil'
    },
    ar: {
      accountTitle: 'الملف الشخصي والمزامنة',
      accountDesc: 'احفظ موقعك، وتنبيهات الصلاة، والقراء المفضلين لديك.',
      signIn: 'تسجيل الدخول / إنشاء حساب',
      signOut: 'تسجيل الخروج',
      googleSignIn: 'المتابعة باستخدام Google',
      orEmail: 'أو استخدم بريدك الإلكتروني',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      fullName: 'الاسم الكامل',
      loginBtn: 'دخول',
      registerBtn: 'إنشاء حساب',
      dontHaveAccount: 'ليس لديك حساب؟',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      registerLink: 'سجّل هنا',
      loginLink: 'سجّل الدخول هنا',
      errorEmpty: 'يرجى ملء جميع الحقول',
      errorPasswordShort: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل',
      errorEmailExists: 'هذا البريد الإلكتروني مسجل بالفعل',
      errorInvalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      googlePopupTitle: 'تسجيل الدخول باستخدام Google',
      googlePopupSub: 'للمتابعة إلى Al-Nour Premium',
      useAnother: 'استخدام حساب آخر',
      googleNamePlaceholder: 'أدخل اسمك',
      googleEmailPlaceholder: 'أدخل بريدك الإلكتروني في Gmail',
      syncedText: 'تم مزامنة التفضيلات مع ملفك الشخصي'
    },
    fr: {
      accountTitle: 'Profil & Synchronisation',
      accountDesc: 'Synchronisez votre lieu, alertes de prière et récitateurs préférés.',
      signIn: 'Se connecter / S\'inscrire',
      signOut: 'Se déconnecter',
      googleSignIn: 'Continuer avec Google',
      orEmail: 'Ou utilisez votre e-mail',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      fullName: 'Nom complet',
      loginBtn: 'Se connecter',
      registerBtn: 'Créer un compte',
      dontHaveAccount: 'Pas encore de compte ?',
      alreadyHaveAccount: 'Vous avez déjà un compte ?',
      registerLink: 'S\'inscrire ici',
      loginLink: 'Se connecter ici',
      errorEmpty: 'Veuillez remplir tous les champs',
      errorPasswordShort: 'Le mot de passe doit comporter au moins 6 caractères',
      errorEmailExists: 'Cet e-mail est déjà enregistré',
      errorInvalid: 'E-mail ou mot de passe incorrect',
      googlePopupTitle: 'Se connecter avec Google',
      googlePopupSub: 'pour continuer vers Al-Nour Premium',
      useAnother: 'Utiliser un autre compte',
      googleNamePlaceholder: 'Entrez votre prénom',
      googleEmailPlaceholder: 'Entrez votre adresse Gmail',
      syncedText: 'Préférences synchronisées avec votre profil'
    },
    de: {
      accountTitle: 'Profil & Synchronisation',
      accountDesc: 'Speichern Sie Standort, Gebetszeiten und Lieblingsrezitatoren.',
      signIn: 'Anmelden / Registrieren',
      signOut: 'Abmelden',
      googleSignIn: 'Mit Google fortfahren',
      orEmail: 'Oder E-Mail verwenden',
      email: 'E-Mail-Adresse',
      password: 'Passwort',
      fullName: 'Vollständiger Name',
      loginBtn: 'Anmelden',
      registerBtn: 'Konto erstellen',
      dontHaveAccount: 'Noch kein Konto?',
      alreadyHaveAccount: 'Haben Sie bereits ein Konto?',
      registerLink: 'Hier registrieren',
      loginLink: 'Hier anmelden',
      errorEmpty: 'Bitte alle Felder ausfüllen',
      errorPasswordShort: 'Passwort muss mindestens 6 Zeichen haben',
      errorEmailExists: 'Diese E-Mail ist bereits registriert',
      errorInvalid: 'Ungültige E-Mail oder falsches Passwort',
      googlePopupTitle: 'Mit Google anmelden',
      googlePopupSub: 'um Al-Nour Premium fortzusetzen',
      useAnother: 'Anderes Konto verwenden',
      googleNamePlaceholder: 'Ihren Namen eingeben',
      googleEmailPlaceholder: 'Gmail-Adresse eingeben',
      syncedText: 'Einstellungen mit Ihrem Profil synchronisiert'
    },
    tr: {
      accountTitle: 'Profil & Senkronizasyon',
      accountDesc: 'Konumunuzu, namaz uyarılarınızı ve okuyucularınızı kaydedin.',
      signIn: 'Giriş Yap / Kayıt Ol',
      signOut: 'Çıkış Yap',
      googleSignIn: 'Google ile devam et',
      orEmail: 'Veya e-posta kullan',
      email: 'E-posta adresi',
      password: 'Şifre',
      fullName: 'Ad Soyad',
      loginBtn: 'Giriş Yap',
      registerBtn: 'Hesap Oluştur',
      dontHaveAccount: 'Hesabınız yok mu?',
      alreadyHaveAccount: 'Zaten hesabınız var mı?',
      registerLink: 'Buradan kayıt olun',
      loginLink: 'Buradan giriş yapın',
      errorEmpty: 'Lütfen tüm alanları doldurun',
      errorPasswordShort: 'Şifre en az 6 karakter olmalıdır',
      errorEmailExists: 'Bu e-posta zaten kayıtlı',
      errorInvalid: 'Geçersiz e-posta veya şifre',
      googlePopupTitle: 'Google ile giriş yap',
      googlePopupSub: 'Al-Nour Premium\'a devam etmek için',
      useAnother: 'Başka hesap kullan',
      googleNamePlaceholder: 'Adınızı girin',
      googleEmailPlaceholder: 'Gmail adresinizi girin',
      syncedText: 'Tercihler profilinize senkronize edildi'
    },
    pt: {
      accountTitle: 'Perfil & Sincronização',
      accountDesc: 'Salve sua localização, alertas de oração e recitadores favoritos.',
      signIn: 'Entrar / Cadastrar',
      signOut: 'Sair',
      googleSignIn: 'Continuar com o Google',
      orEmail: 'Ou use seu e-mail',
      email: 'Endereço de e-mail',
      password: 'Senha',
      fullName: 'Nome completo',
      loginBtn: 'Entrar',
      registerBtn: 'Criar Conta',
      dontHaveAccount: 'Não tem uma conta?',
      alreadyHaveAccount: 'Já tem uma conta?',
      registerLink: 'Cadastre-se aqui',
      loginLink: 'Entre aqui',
      errorEmpty: 'Por favor, preencha todos os campos',
      errorPasswordShort: 'A senha deve ter pelo menos 6 caracteres',
      errorEmailExists: 'Este e-mail já está cadastrado',
      errorInvalid: 'E-mail ou senha incorretos',
      googlePopupTitle: 'Entrar com o Google',
      googlePopupSub: 'para continuar no Al-Nour Premium',
      useAnother: 'Usar outra conta',
      googleNamePlaceholder: 'Digite seu nome',
      googleEmailPlaceholder: 'Digite seu endereço Gmail',
      syncedText: 'Preferências sincronizadas com seu perfil'
    },
  };

  const activeAuthT = (authT as Record<string, typeof authT.en>)[lang] || authT.en;

  // Age & maturity-aware copy
  const ageT: Record<string, { label: string; desc: string; notSet: string; child: string; adult: string }> = {
    en: { label: 'Age', desc: 'Used to adapt prayer reminders to your stage.', notSet: 'Not set', child: 'Learning mode: prayers are encouraged gently — no pressure.', adult: 'Accountable mode: full reminders and streak tracking.' },
    es: { label: 'Edad', desc: 'Se usa para adaptar los recordatorios a tu etapa.', notSet: 'Sin definir', child: 'Modo aprendizaje: los rezos se animan con cariño, sin presión.', adult: 'Modo responsable: recordatorios completos y seguimiento de racha.' },
    ar: { label: 'العمر', desc: 'يُستخدم لتكييف التذكيرات حسب مرحلتك.', notSet: 'غير محدد', child: 'وضع التعلّم: تُشجَّع الصلوات بلطف دون ضغط.', adult: 'وضع المكلَّف: تذكيرات كاملة وتتبع للاستمرارية.' },
    fr: { label: 'Âge', desc: 'Adapte les rappels à votre étape.', notSet: 'Non défini', child: 'Mode apprentissage : prières encouragées en douceur.', adult: 'Mode responsable : rappels complets et suivi de série.' },
    de: { label: 'Alter', desc: 'Passt Erinnerungen an deine Phase an.', notSet: 'Nicht gesetzt', child: 'Lernmodus: Gebete werden sanft gefördert.', adult: 'Verantwortlich: volle Erinnerungen und Serien-Tracking.' },
    tr: { label: 'Yaş', desc: 'Hatırlatıcıları aşamana göre uyarlar.', notSet: 'Belirtilmedi', child: 'Öğrenme modu: namazlar nazikçe teşvik edilir.', adult: 'Sorumlu mod: tam hatırlatıcılar ve seri takibi.' },
    pt: { label: 'Idade', desc: 'Usada para adaptar os lembretes à sua fase.', notSet: 'Não definida', child: 'Modo aprendizagem: orações incentivadas com carinho.', adult: 'Modo responsável: lembretes completos e sequência.' },
  };
  const activeAgeT = ageT[lang] || ageT.en;

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const email = authEmail.trim();
    const password = authPassword.trim();
    const name = authName.trim();

    if (!email || !password || (authTab === 'register' && !name)) {
      setAuthError(activeAuthT.errorEmpty);
      return;
    }

    if (password.length < 6) {
      setAuthError(activeAuthT.errorPasswordShort);
      return;
    }

    setAuthLoading(true);

    try {
      const hashedPassword = await hashPassword(password);
      // Simulate network response time for a modern UI loading feel
      await new Promise(resolve => setTimeout(resolve, 800));

      const usersRaw = localStorage.getItem('app_registered_users');
      const users = usersRaw ? JSON.parse(usersRaw) : {};

      if (authTab === 'login') {
        const user = users[email.toLowerCase()];
        if (user) {
          // Backward compatibility check for plain text passwords, migrating them on login
          if (user.password === hashedPassword || user.password === password) {
            if (user.password === password) {
              users[email.toLowerCase()].password = hashedPassword;
              localStorage.setItem('app_registered_users', JSON.stringify(users));
            }
            login(email.toLowerCase(), user.name, 'email');
            setShowAuthModal(false);
            resetAuthForm();
          } else {
            setAuthError(activeAuthT.errorInvalid);
          }
        } else {
          setAuthError(activeAuthT.errorInvalid);
        }
      } else {
        const emailKey = email.toLowerCase();
        if (users[emailKey]) {
          setAuthError(activeAuthT.errorEmailExists);
        } else {
          users[emailKey] = {
            name,
            password: hashedPassword
          };
          localStorage.setItem('app_registered_users', JSON.stringify(users));
          login(emailKey, name, 'email');
          setShowAuthModal(false);
          resetAuthForm();
        }
      }
    } catch (err) {
      console.error(err);
      setAuthError('Authentication error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Unused mock Google handlers removed to fix compilation errors. Official GIS flow is used.

  const resetAuthForm = () => {
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setAuthError(null);
  };

  // Manual city search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Localization strings (moved to the top of SettingsScreen component)

  // Cleanup audio preview
  useEffect(() => {
    return () => {
      if (stopAudioRef.current) stopAudioRef.current();
    };
  }, []);

  const handleToggleSoundPreview = (soundKey: string, soundType: string) => {
    if (playingPreview === soundKey) {
      if (stopAudioRef.current) stopAudioRef.current();
      setPlayingPreview(null);
    } else {
      if (stopAudioRef.current) stopAudioRef.current();
      setPlayingPreview(soundKey);
      
      const stopFn = playAdhanSound(soundType);
      stopAudioRef.current = () => {
        stopFn();
      };
      
      // Auto reset playing state after 15 seconds (for previews)
      setTimeout(() => {
        setPlayingPreview(prev => prev === soundKey ? null : prev);
      }, 15000);
    }
  };

  const handleCitySearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&accept-language=${lang}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const selectCity = (city: any) => {
    updateSetting('locationMode', 'manual');
    updateSetting('manualLatitude', parseFloat(city.lat));
    updateSetting('manualLongitude', parseFloat(city.lon));
    
    const shortName = city.display_name.split(',').slice(0, 2).join(',').trim();
    updateSetting('manualCityName', shortName);
    
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleOpenOnMap = () => {
    const lat = settings.locationMode === 'auto' ? 36.507 : settings.manualLatitude;
    const lng = settings.locationMode === 'auto' ? -4.767 : settings.manualLongitude;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const handleReset = () => {
    resetSettings();
    if (stopAudioRef.current) stopAudioRef.current();
    setPlayingPreview(null);
  };

  return (
    <div className="flex flex-col min-h-full font-sans bg-transparent items-stretch px-5 pt-12 pb-24 text-[#F3F4F6]">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#FCD34D] tracking-tight">{t.tabSettings}</h1>
      </div>

      {/* Tabs list (iOS SwiftUI grid pill style) */}
      <div className="grid grid-cols-4 bg-white/5 border border-white/10 p-1 rounded-2xl mb-6 shadow-inner">
        {[
          { id: 'profile', icon: <User size={16} />, label: t.profileLocation.split(' ')[0] },
          { id: 'sound', icon: <Bell size={16} />, label: t.notificationsSound.split(' ')[0] },
          { id: 'time', icon: <Clock size={16} />, label: t.timeAdjust.split(' ')[0] },
          { id: 'appearance', icon: <Palette size={16} />, label: t.appearance.split(' ')[0] },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeSection === tab.id
                ? 'bg-[#059669] text-white shadow-md'
                : 'text-[#A7F3D0]/60 hover:text-white'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content cards with glassmorphism */}
      <div className="flex-1 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        
        {/* Section 1: Profile & Location */}
        {activeSection === 'profile' && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <MapPin size={18} className="text-[#FCD34D]" />
              {t.profileLocation}
            </h3>

            {/* Profile Card — Supabase account takes priority over legacy local account */}
            {supaEnabled && supaUser ? (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 shadow-inner space-y-3">
                <div className="flex items-center gap-3">
                  {supaProfile?.avatar_url
                    ? <img src={supaProfile.avatar_url} alt="" className="w-11 h-11 rounded-full border border-[#059669] bg-[#022C22] shrink-0 object-cover" />
                    : <div className="w-11 h-11 rounded-full bg-emerald-700 grid place-items-center font-bold text-white shrink-0 text-lg">
                        {(supaProfile?.display_name || supaUser.email || '?').slice(0, 1).toUpperCase()}
                      </div>}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5 truncate">
                      {supaProfile?.display_name || supaProfile?.username || supaUser.email}
                      <span className="text-[8px] bg-emerald-600/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                        <Users size={8} />
                        {lang === 'ar' ? 'مجتمع' : lang === 'es' ? 'Comunidad' : 'Community'}
                      </span>
                    </h4>
                    <p className="text-[10px] text-[#A7F3D0]/60 truncate mt-0.5">{supaUser.email}</p>
                    {supaProfile && (
                      <p className="text-[9px] text-[#A7F3D0]/50 mt-0.5 flex items-center gap-2">
                        <span>🔥 {supaProfile.current_streak} {lang === 'es' ? 'días' : 'days'}</span>
                        <span>· @{supaProfile.username}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => supaSignOut()}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider py-2 px-3.5 rounded-xl active:scale-95 transition-all shrink-0"
                  >
                    {lang === 'ar' ? 'خروج' : lang === 'es' ? 'Salir' : 'Sign out'}
                  </button>
                </div>
              </div>
            ) : !currentUser ? (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#A7F3D0] shrink-0">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs truncate">{activeAuthT.accountTitle}</h4>
                    <p className="text-[9px] text-[#A7F3D0]/60 leading-normal max-w-[200px] mt-0.5">{activeAuthT.accountDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}
                  className="bg-[#059669] hover:bg-[#047857] text-white text-[10px] font-bold uppercase tracking-wider py-2 px-3.5 rounded-xl shadow active:scale-95 transition-all shrink-0"
                >
                  {activeAuthT.signIn.split('/')[0].trim()}
                </button>
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-11 h-11 rounded-full border border-[#059669] bg-[#022C22] shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5 truncate">
                      {currentUser.name}
                      <span className="text-[8px] bg-[#059669]/20 text-[#A7F3D0] px-1.5 py-0.5 rounded border border-[#059669]/30 font-bold uppercase tracking-wider shrink-0">{currentUser.method}</span>
                    </h4>
                    <p className="text-[10px] text-[#A7F3D0]/60 truncate leading-none mt-0.5">{currentUser.email}</p>
                    <p className="text-[9px] flex items-center gap-1.5 mt-1 font-medium truncate" style={{ color: cloudSync === 'ok' ? '#FCD34D' : '#A7F3D0' }}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cloudSync === 'syncing' ? 'animate-pulse bg-[#FCD34D]' : cloudSync === 'ok' ? 'bg-[#10B981]' : 'bg-[#A7F3D0]/40'}`} />
                      {cloudSync === 'syncing'
                        ? (lang === 'es' ? 'Sincronizando…' : 'Syncing…')
                        : cloudSync === 'ok' ? activeAuthT.syncedText
                        : (lang === 'es' ? 'Guardado en este dispositivo' : 'Saved on this device')}
                    </p>
                  </div>
                </div>
                <button onClick={logout} className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider py-2 px-3.5 rounded-xl active:scale-95 transition-all shrink-0">
                  {activeAuthT.signOut.split(' ')[0]}
                </button>
              </div>
            )}

            {/* Age & maturity */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">{activeAgeT.label}</span>
                  <span className="text-[9px] text-[#A7F3D0]/60 block mt-0.5 leading-normal max-w-[200px]">{activeAgeT.desc}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateSetting('age', Math.max(4, (settings.age ?? 15) - 1))}
                    className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-[#FCD34D] text-lg font-bold flex items-center justify-center active:scale-90 transition-transform"
                  >−</button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={4}
                    max={120}
                    value={settings.age ?? ''}
                    placeholder="—"
                    onChange={e => {
                      const v = e.target.value;
                      updateSetting('age', v === '' ? null : Math.max(4, Math.min(120, parseInt(v) || 0)));
                    }}
                    className="w-14 bg-black/30 border border-white/10 rounded-xl py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-[#FCD34D]"
                  />
                  <button
                    onClick={() => updateSetting('age', Math.min(120, (settings.age ?? 14) + 1))}
                    className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-[#FCD34D] text-lg font-bold flex items-center justify-center active:scale-90 transition-transform"
                  >+</button>
                </div>
              </div>
              {settings.age != null && (
                <p className={`text-[10px] leading-relaxed rounded-xl px-3 py-2 border ${
                  isAccountable(settings.age)
                    ? 'bg-[#059669]/10 border-[#059669]/20 text-[#A7F3D0]'
                    : 'bg-[#FCD34D]/10 border-[#FCD34D]/20 text-[#FCD34D]'
                }`}>
                  {isAccountable(settings.age) ? activeAgeT.adult : activeAgeT.child}
                </p>
              )}
            </div>

            {/* Toggle Location Mode */}
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => updateSetting('locationMode', 'auto')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  settings.locationMode === 'auto'
                    ? 'bg-[#059669] text-white shadow'
                    : 'text-[#A7F3D0]/60 hover:text-white'
                }`}
              >
                {t.autoLocation}
              </button>
              <button
                onClick={() => updateSetting('locationMode', 'manual')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  settings.locationMode === 'manual'
                    ? 'bg-[#059669] text-white shadow'
                    : 'text-[#A7F3D0]/60 hover:text-white'
                }`}
              >
                {t.manualLocation}
              </button>
            </div>

            {/* Current City display */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-[#A7F3D0] uppercase tracking-widest opacity-60">
                    {t.yourLocation}
                  </span>
                  <p className="font-bold text-white text-base mt-0.5">{resolvedCityName}</p>
                </div>
                <button
                  onClick={refreshPrayerTimes}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-[#FCD34D]"
                  title={t.locateMeNow}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={handleOpenOnMap}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/5"
                >
                  <Map size={12} className="text-[#FCD34D]" />
                  {t.openOnMap}
                </button>
                {settings.locationMode === 'auto' && (
                  <button
                    onClick={() => refreshPrayerTimes()}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/5"
                  >
                    <Navigation size={12} className="text-[#059669]" />
                    {t.locateMeNow}
                  </button>
                )}
              </div>
            </div>

            {/* Smart Updates toggle */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="font-bold text-white text-sm block">{t.smartUpdates}</span>
                <span className="text-[10px] text-[#A7F3D0] opacity-60 block mt-0.5">{t.smartUpdatesDesc}</span>
              </div>
              <button
                onClick={() => updateSetting('smartUpdates', !settings.smartUpdates)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                  settings.smartUpdates ? 'bg-[#059669]' : 'bg-black/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                    settings.smartUpdates ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Search City (For Manual Mode) */}
            {settings.locationMode === 'manual' && (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t.searchCityPlaceholder}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
                    className="w-full bg-[#022C22]/60 border border-white/10 rounded-2xl py-3 pl-4 pr-10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FCD34D]"
                  />
                  <button
                    onClick={handleCitySearch}
                    className="absolute right-3 top-3.5 text-[#A7F3D0]/60 hover:text-white"
                  >
                    <Search size={16} />
                  </button>
                </div>

                {searching && (
                  <p className="text-xs text-[#A7F3D0]/60 italic text-center">{t.searching}</p>
                )}

                {searchResults.length > 0 && (
                  <div className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                    {searchResults.map(result => (
                      <button
                        key={result.place_id}
                        onClick={() => selectCity(result)}
                        className="w-full text-left p-3 hover:bg-white/5 text-xs text-white block truncate"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Calculation Method Sunni Info */}
            <div className="bg-[#059669]/10 rounded-2xl p-4 border border-[#059669]/20 space-y-1">
              <span className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-bold">{t.calculationMethod}</span>
              <p className="text-xs text-white">{t.sunniMethod}</p>
              <p className="text-[10px] text-[#A7F3D0] opacity-75">{t.determiningTimes}</p>
            </div>
          </div>
        )}

        {/* Section 2: Notifications & Sound */}
        {activeSection === 'sound' && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <Bell size={18} className="text-[#FCD34D]" />
              {t.notificationsSound}
            </h3>

            {/* Notification Permission Banner */}
            {notificationPermission !== 'granted' ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3 items-start">
                <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-bold text-white">Permission Required</h4>
                  <p className="text-[10px] text-red-200/80 mt-0.5 mb-2 leading-relaxed">
                    Browser notification permission is disabled. Tap to enable alerts.
                  </p>
                  <button
                    onClick={requestNotificationPermission}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                  >
                    Grant
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#059669]/10 border border-[#059669]/30 rounded-2xl p-3 flex gap-2 items-center">
                <ShieldCheck className="text-[#A7F3D0] shrink-0" size={16} />
                <span className="text-[10px] text-[#A7F3D0] font-semibold">{t.notifEnabled}</span>
              </div>
            )}

            {/* Sound Selection - Fajr */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-bold text-white block">{t.fajrSound}</label>
              
              <div className="flex gap-2 items-center">
                <select
                  value={settings.soundFajr}
                  onChange={e => updateSetting('soundFajr', e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 text-xs rounded-xl py-2 px-3 focus:outline-none focus:border-[#FCD34D] text-white"
                >
                  <option value="makkah">{t.soundMakkah}</option>
                  <option value="madinah">{t.soundMadinah}</option>
                  <option value="alafasy">{t.soundAlafasy}</option>
                  <option value="chime">{t.soundChime}</option>
                  <option value="beep">{t.soundBeep}</option>
                  <option value="none">{t.soundNone}</option>
                </select>
                
                <button
                  onClick={() => handleToggleSoundPreview('fajr', settings.soundFajr)}
                  disabled={settings.soundFajr === 'none'}
                  className={`p-2 rounded-xl border border-white/10 ${
                    playingPreview === 'fajr'
                      ? 'bg-[#FCD34D] text-[#022C22]'
                      : 'bg-white/5 text-[#A7F3D0] hover:text-white disabled:opacity-30'
                  }`}
                >
                  {playingPreview === 'fajr' ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>

            {/* Sound Selection - General */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-bold text-white block">{t.generalSound}</label>
              
              <div className="flex gap-2 items-center">
                <select
                  value={settings.soundGeneral}
                  onChange={e => updateSetting('soundGeneral', e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 text-xs rounded-xl py-2 px-3 focus:outline-none focus:border-[#FCD34D] text-white"
                >
                  <option value="chime">{t.soundChime}</option>
                  <option value="beep">{t.soundBeep}</option>
                  <option value="makkah">{t.soundMakkah}</option>
                  <option value="madinah">{t.soundMadinah}</option>
                  <option value="alafasy">{t.soundAlafasy}</option>
                  <option value="none">{t.soundNone}</option>
                </select>
                
                <button
                  onClick={() => handleToggleSoundPreview('general', settings.soundGeneral)}
                  disabled={settings.soundGeneral === 'none'}
                  className={`p-2 rounded-xl border border-white/10 ${
                    playingPreview === 'general'
                      ? 'bg-[#FCD34D] text-[#022C22]'
                      : 'bg-white/5 text-[#A7F3D0] hover:text-white disabled:opacity-30'
                  }`}
                >
                  {playingPreview === 'general' ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>

            {/* Toggle individual reminders */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-bold text-white block">{t.remindersToggle}</label>
              <div className="grid grid-cols-2 gap-2">
                {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => {
                  const on = settings[prayer as keyof typeof settings];
                  return (
                    <button
                      key={prayer}
                      onClick={() => updateSetting(prayer as any, !on)}
                      className={`py-2 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                        on
                          ? 'bg-[#059669]/20 border-[#059669] text-white'
                          : 'bg-transparent border-white/10 text-[#A7F3D0]/40'
                      }`}
                    >
                      {on ? <Bell size={12} /> : <BellOff size={12} />}
                      {(LOCALIZED_PRAYERS[lang] || LOCALIZED_PRAYERS.en)[prayer] || prayer}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pre-Alert: notification N min before prayer */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">
                    {lang === 'es' ? 'Alerta previa' : lang === 'ar' ? 'تنبيه مبكر' : 'Pre-Prayer Alert'}
                  </span>
                  <span className="text-[9px] text-[#A7F3D0]/60 block mt-0.5 leading-normal max-w-[220px]">
                    {lang === 'es' ? 'Aviso anticipado antes del rezo' : lang === 'ar' ? 'إشعار قبل وقت الصلاة' : 'Extra reminder before prayer time'}
                  </span>
                </div>
                <select
                  value={settings.preAlertMinutes ?? 0}
                  onChange={e => updateSetting('preAlertMinutes', parseInt(e.target.value))}
                  className="bg-black/40 border border-white/10 text-xs rounded-lg py-1 px-2 focus:outline-none focus:border-[#FCD34D] text-white"
                >
                  <option value={0}>{lang === 'es' ? 'Desactivado' : lang === 'ar' ? 'مُعطَّل' : 'Off'}</option>
                  <option value={5}>5 {lang === 'es' ? 'min' : lang === 'ar' ? 'د' : 'min'}</option>
                  <option value={10}>10 {lang === 'es' ? 'min' : lang === 'ar' ? 'د' : 'min'}</option>
                  <option value={15}>15 {lang === 'es' ? 'min' : lang === 'ar' ? 'د' : 'min'}</option>
                  <option value={20}>20 {lang === 'es' ? 'min' : lang === 'ar' ? 'د' : 'min'}</option>
                  <option value={30}>30 {lang === 'es' ? 'min' : lang === 'ar' ? 'د' : 'min'}</option>
                </select>
              </div>
            </div>

            {/* Jumu'ah Reminder */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block">
                  {lang === 'es' ? '🕌 Recordatorio Jumu\'ah' : lang === 'ar' ? '🕌 تذكير الجمعة' : '🕌 Jumu\'ah Reminder'}
                </span>
                <span className="text-[9px] text-[#A7F3D0]/60 block mt-0.5 leading-normal max-w-[220px]">
                  {lang === 'es' ? 'Aviso 30 min antes del Dhuhr del viernes' : lang === 'ar' ? '30 دقيقة قبل الظهر كل جمعة' : '30 min before Friday Dhuhr'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('jumuahReminder', !(settings.jumuahReminder ?? true))}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                  (settings.jumuahReminder ?? true) ? 'bg-[#059669]' : 'bg-black/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${(settings.jumuahReminder ?? true) ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Silent Night Mode */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">
                    {lang === 'es' ? '🌙 Modo Silencio Nocturno' : lang === 'ar' ? '🌙 الوضع الصامت الليلي' : '🌙 Silent Night Mode'}
                  </span>
                  <span className="text-[9px] text-[#A7F3D0]/60 block mt-0.5 leading-normal max-w-[220px]">
                    {lang === 'es' ? 'Sin notificaciones de noche (Fajr siempre activo)' : lang === 'ar' ? 'بدون إشعارات ليلاً (الفجر دائماً نشط)' : 'No notifications at night (Fajr always on)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('silentHoursEnabled', !(settings.silentHoursEnabled ?? false))}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                    (settings.silentHoursEnabled ?? false) ? 'bg-[#059669]' : 'bg-black/40'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${(settings.silentHoursEnabled ?? false) ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              {(settings.silentHoursEnabled ?? false) && (
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 space-y-1">
                    <span className="text-[9px] text-[#A7F3D0]/60 font-bold uppercase tracking-wider">
                      {lang === 'es' ? 'Desde' : lang === 'ar' ? 'من' : 'From'}
                    </span>
                    <select
                      value={settings.silentHoursStart ?? 23}
                      onChange={e => updateSetting('silentHoursStart', parseInt(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-[#FCD34D] text-white"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[9px] text-[#A7F3D0]/60 font-bold uppercase tracking-wider">
                      {lang === 'es' ? 'Hasta' : lang === 'ar' ? 'إلى' : 'Until'}
                    </span>
                    <select
                      value={settings.silentHoursEnd ?? 5}
                      onChange={e => updateSetting('silentHoursEnd', parseInt(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-[#FCD34D] text-white"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Islamic Date Alerts */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block">
                  {lang === 'es' ? '📅 Fechas Islámicas' : lang === 'ar' ? '📅 التواريخ الإسلامية' : '📅 Islamic Date Alerts'}
                </span>
                <span className="text-[9px] text-[#A7F3D0]/60 block mt-0.5 leading-normal max-w-[220px]">
                  {lang === 'es' ? 'Ramadán, Eid, Laylatul Qadr, Ashura...' : lang === 'ar' ? 'رمضان، عيد، ليلة القدر، عاشوراء...' : 'Ramadan, Eid, Laylatul Qadr, Ashura...'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('islamicDateAlerts', !(settings.islamicDateAlerts ?? true))}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                  (settings.islamicDateAlerts ?? true) ? 'bg-[#059669]' : 'bg-black/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${(settings.islamicDateAlerts ?? true) ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Fasting Reminders Toggle */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block">{t.fastingRemindersOpt}</span>
                <span className="text-[9px] text-[#A7F3D0]/60 block mt-0.5 leading-normal max-w-[220px]">{t.fastingRemindersDesc}</span>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('fastingReminders', !settings.fastingReminders)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                  settings.fastingReminders ? 'bg-[#059669]' : 'bg-black/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                    settings.fastingReminders ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Tasbih Settings */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
              <label className="text-xs font-bold text-white block">{lang === 'es' ? 'Ajustes de Tasbih' : 'Tasbih Settings'}</label>
              
              {/* Tasbih Sound Click Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">{t.tasbihSoundsOpt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('tasbihSounds', !settings.tasbihSounds)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                    settings.tasbihSounds ? 'bg-[#059669]' : 'bg-black/40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                      settings.tasbihSounds ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Tasbih Haptics Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">{t.tasbihHapticsOpt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('tasbihHaptics', !settings.tasbihHaptics)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                    settings.tasbihHaptics ? 'bg-[#059669]' : 'bg-black/40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                      settings.tasbihHaptics ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Haptic Strength Dropdown */}
              {settings.tasbihHaptics && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#A7F3D0]/60 uppercase tracking-wider block">
                    {t.tasbihHapticStrengthOpt}
                  </span>
                  <select
                    value={settings.tasbihHapticStrength}
                    onChange={e => updateSetting('tasbihHapticStrength', e.target.value as any)}
                    className="w-full bg-black/30 border border-white/10 text-xs rounded-xl py-2 px-3 focus:outline-none focus:border-[#FCD34D] text-white"
                  >
                    <option value="light">{t.strengthLight}</option>
                    <option value="medium">{t.strengthMedium}</option>
                    <option value="heavy">{t.strengthHeavy}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Time Adjust (Offsets) */}
        {activeSection === 'time' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <Clock size={18} className="text-[#FCD34D]" />
              {t.timeAdjust}
            </h3>
            
            <p className="text-[11px] text-[#A7F3D0] opacity-80 leading-normal mb-2 bg-black/10 p-3 rounded-xl border border-white/5">
              {t.adjustDesc}
            </p>

            {/* Offsets adjusters */}
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => {
                const currentOffset = settings.offsets[prayer as keyof typeof settings.offsets] || 0;
                
                const handleOffsetChange = (val: number) => {
                  updateSetting('offsets', {
                    ...settings.offsets,
                    [prayer]: val
                  });
                };

                return (
                  <div key={prayer} className="flex justify-between items-center bg-white/5 p-3.5 rounded-2xl border border-white/5">
                    <span className="font-bold text-white text-sm">{prayer}</span>
                    
                    <div className="flex items-center gap-2">
                      <select
                        value={currentOffset}
                        onChange={e => handleOffsetChange(parseInt(e.target.value))}
                        className="bg-black/40 border border-white/10 text-xs rounded-lg py-1 px-2 focus:outline-none focus:border-[#FCD34D] text-white"
                      >
                        {Array.from({ length: 25 }, (_, i) => (i - 12) * 5).map(val => (
                          <option key={val} value={val}>
                            {val === 0 ? t.exactTime : `${val > 0 ? '+' : ''}${val} ${t.minutes}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4: Appearance & Language */}
        {activeSection === 'appearance' && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <Palette size={18} className="text-[#FCD34D]" />
              {t.appearance}
            </h3>

            {/* Language Selector */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-bold text-white flex items-center gap-1">
                <Globe size={13} className="text-[#FCD34D]" />
                Language / Idioma / اللغة
              </label>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'es', label: 'Español' },
                  { code: 'ar', label: 'العربية' },
                  { code: 'fr', label: 'Français' },
                  { code: 'de', label: 'Deutsch' },
                  { code: 'tr', label: 'Türkçe' },
                  { code: 'pt', label: 'Português' },
                  { code: 'ur', label: 'اردو' },
                  { code: 'id', label: 'Indonesia' },
                  { code: 'ms', label: 'Melayu' },
                  { code: 'bn', label: 'বাংলা' },
                  { code: 'fa', label: 'فارسی' },
                  { code: 'ru', label: 'Русский' },
                ].map(langOpt => (
                  <button
                    key={langOpt.code}
                    onClick={() => updateSetting('language', langOpt.code as any)}
                    className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                      settings.language === langOpt.code
                        ? 'bg-[#059669] border-[#059669] text-white shadow-lg shadow-[#059669]/10'
                        : 'bg-black/20 border-white/5 text-[#A7F3D0]/60 hover:text-white'
                    }`}
                  >
                    {langOpt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallpapers Selector */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-bold text-white block">{t.wallpaper}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'arafat', label: t.wpArafat },
                  { id: 'mosque', label: t.wpMosque },
                  { id: 'navy_gold', label: t.wpNavyGold },
                  { id: 'charcoal', label: t.wpCharcoal },
                  { id: 'emerald', label: t.wpEmerald },
                  { id: 'midnight', label: t.wpMidnight },
                  { id: 'plum', label: t.wpPlum },
                  { id: 'rose', label: t.wpRose },
                  { id: 'ocean', label: t.wpOcean },
                ].map(wp => (
                  <button
                    key={wp.id}
                    onClick={() => updateSetting('wallpaper', wp.id as any)}
                    className={`py-3 px-2 rounded-xl text-[10px] font-bold border text-center transition-all ${
                      settings.wallpaper === wp.id
                        ? 'bg-[#059669] border-[#059669] text-white shadow'
                        : 'bg-black/20 border-white/5 text-[#A7F3D0]/60 hover:text-white'
                    }`}
                  >
                    {wp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto seasonal wallpaper toggle */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="pr-3">
                <span className="font-bold text-white text-sm block">
                  {lang === 'es' ? 'Fondo automático en días sagrados' : lang === 'ar' ? 'خلفية تلقائية في الأيام المباركة' : 'Auto wallpaper on holy days'}
                </span>
                <span className="text-[10px] text-[#A7F3D0] opacity-60 block mt-0.5 leading-normal">
                  {lang === 'es' ? 'Cambia solo (Arafah, Ramadán, Eid…)' : lang === 'ar' ? 'يتغيّر تلقائياً (عرفة، رمضان، العيد…)' : 'Switches itself (Arafah, Ramadan, Eid…)'}
                </span>
              </div>
              <button
                onClick={() => updateSetting('autoWallpaper', !settings.autoWallpaper)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${
                  settings.autoWallpaper ? 'bg-[#059669]' : 'bg-black/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                  settings.autoWallpaper ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Prayer tracker ("did you pray?") — show/hide on Home */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="pr-3">
                <span className="font-bold text-white text-sm block">
                  {lang === 'es' ? 'Registro de rezos en inicio' : lang === 'ar' ? 'سجل الصلوات في الرئيسية' : 'Prayer tracker on Home'}
                </span>
                <span className="text-[10px] text-[#A7F3D0] opacity-60 block mt-0.5 leading-normal">
                  {lang === 'es' ? 'La tarjeta de "¿has rezado?" y los botones de la notificación' : lang === 'ar' ? 'بطاقة "هل صليت؟" وأزرار الإشعار' : 'The "did you pray?" card and notification buttons'}
                </span>
              </div>
              <button
                onClick={() => updateSetting('showPrayerTracker', !settings.showPrayerTracker)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${settings.showPrayerTracker ? 'bg-[#059669]' : 'bg-black/40'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${settings.showPrayerTracker ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Learn to Pray — open anytime + show/hide on Home */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <button
                onClick={() => setShowLearn(true)}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="p-2.5 bg-[#FCD34D]/15 border border-[#FCD34D]/30 rounded-xl text-[#FCD34D] shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-white text-sm block">
                    {lang === 'es' ? 'Aprende a rezar' : lang === 'ar' ? 'تعلّم الصلاة' : 'Learn to pray'}
                  </span>
                  <span className="text-[10px] text-[#A7F3D0] opacity-60 block mt-0.5">
                    {lang === 'es' ? 'Salah · Wudu · Ghusl, paso a paso' : lang === 'ar' ? 'الصلاة · الوضوء · الغسل خطوة بخطوة' : 'Salah · Wudu · Ghusl, step by step'}
                  </span>
                </div>
                <ChevronRight size={18} className="text-[#A7F3D0]/40 shrink-0" />
              </button>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[11px] text-[#A7F3D0]/70">
                  {lang === 'es' ? 'Mostrar en inicio' : lang === 'ar' ? 'إظهار في الرئيسية' : 'Show on Home'}
                </span>
                <button
                  onClick={() => updateSetting('showLearnOnHome', !settings.showLearnOnHome)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${settings.showLearnOnHome ? 'bg-[#059669]' : 'bg-black/40'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${settings.showLearnOnHome ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* App Logo Selector */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-bold text-white block">{t.appLogo}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'default', label: t.logoDefault, src: '/icon-512.png' },
                  { id: 'golden-crescent', label: t.logoCrescent, src: '/al_nour_logo.png' },
                ].map(logo => (
                  <button
                    key={logo.id}
                    onClick={() => updateSetting('appLogo', logo.id as any)}
                    className={`flex flex-col items-center gap-2 py-3 px-3 rounded-2xl text-[11px] font-bold border text-center transition-all ${
                      settings.appLogo === logo.id
                        ? 'bg-[#059669]/20 border-[#059669] text-white shadow-lg shadow-[#059669]/10'
                        : 'bg-black/20 border-white/5 text-[#A7F3D0]/60 hover:text-white'
                    }`}
                  >
                    <img src={logo.src} alt={logo.label} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                    {logo.label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#A7F3D0]/50 leading-normal">
                {lang === 'es'
                  ? 'Cambia el logo dentro de la app al instante. El icono de la pantalla de inicio del iPhone solo se actualiza al volver a añadir la app (limitación de iOS).'
                  : lang === 'ar'
                  ? 'يتغيّر شعار التطبيق فوراً داخل التطبيق. أما أيقونة الشاشة الرئيسية في الآيفون فلا تتحدّث إلا بإعادة إضافة التطبيق (قيد من iOS).'
                  : 'Changes the in-app logo instantly. The iPhone home-screen icon only updates when you re-add the app (an iOS limitation).'}
              </p>
            </div>

            {/* Reciter Selector */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-bold text-white block">{t.reciterTitle}</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'ar.alafasy', label: 'Mishary Alafasy (مشاري راشد العفاسي)' },
                  { id: 'ar.yasseraddussari', label: 'Yasser Al-Dossari (ياسر الدوسري)' },
                  { id: 'ar.saadghamidi', label: 'Saad Al-Ghamdi (سعد الغامدي)' },
                  { id: 'ar.abdurrahmaansudais', label: 'Abdul Rahman Al-Sudais (السديس)' },
                  { id: 'ar.mahermuaiqly', label: 'Maher Al-Muaiqly (ماهر المعيقلي)' },
                  { id: 'ar.husary', label: 'Mahmoud Khalil Al-Husary (الحصري)' },
                  { id: 'ar.ahmedajamy', label: 'Ahmed Al-Ajamy (أحمد بن علي العجمي)' },
                  { id: 'ar.shaatree', label: 'Abu Bakr Al-Shatri (أبو بكر الشاطري)' },
                ].map(reciterOpt => (
                  <button
                    key={reciterOpt.id}
                    onClick={() => updateSetting('reciter', reciterOpt.id)}
                    className={`w-full py-2.5 px-4 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between ${
                      settings.reciter === reciterOpt.id
                        ? 'bg-[#059669] border-[#059669] text-white shadow-lg'
                        : 'bg-black/20 border-white/5 text-[#A7F3D0]/70 hover:text-white'
                    }`}
                  >
                    <span>{reciterOpt.label}</span>
                    {settings.reciter === reciterOpt.id && (
                      <span className="text-[#FCD34D] text-xs">●</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
              


            {/* Show Rakats toggle */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="font-bold text-white text-sm block">{t.showRakatsOpt}</span>
                <span className="text-[10px] text-[#A7F3D0] opacity-60 block mt-0.5">{t.rakatsDesc}</span>
              </div>
              <button
                onClick={() => updateSetting('showRakats', !settings.showRakats)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                  settings.showRakats ? 'bg-[#059669]' : 'bg-black/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                    settings.showRakats ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Show Sunrise toggle */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="font-bold text-white text-sm block">{t.showSunriseOpt}</span>
                <span className="text-[10px] text-[#A7F3D0] opacity-60 block mt-0.5">{t.sunriseDesc}</span>
              </div>
              <button
                onClick={() => updateSetting('showSunrise', !settings.showSunrise)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${
                  settings.showSunrise ? 'bg-[#059669]' : 'bg-black/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                    settings.showSunrise ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Global Reset Button in Bottom Right */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RotateCcw size={14} />
          {t.reset}
        </button>
      </div>

      {/* Auth Modal Sheet */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
            {/* Modal Backdrop Click-to-Close */}
            <div className="absolute inset-0 -z-10" onClick={() => { if (!authLoading) { setShowAuthModal(false); resetAuthForm(); } }} />

            {/* Modal Sheet Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-[#022C22]/95 border-t border-white/10 rounded-t-[2.5rem] px-6 pt-5 pb-8 space-y-4 max-h-[85%] overflow-y-auto shadow-2xl relative text-left"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1 bg-white/25 rounded-full mx-auto mb-2" />

              {/* Close Button */}
              <button
                onClick={() => { setShowAuthModal(false); resetAuthForm(); }}
                disabled={authLoading}
                className="absolute top-4 right-4 p-2 bg-white/5 border border-white/10 text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <X size={16} />
              </button>

              {/* Header Selector */}
              <div className="flex bg-black/30 p-1 rounded-xl border border-white/5 max-w-[240px] mx-auto">
                <button
                  onClick={() => { setAuthTab('login'); setAuthError(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authTab === 'login'
                      ? 'bg-[#059669] text-white shadow'
                      : 'text-[#A7F3D0]/60 hover:text-white'
                  }`}
                >
                  {activeAuthT.loginBtn}
                </button>
                <button
                  onClick={() => { setAuthTab('register'); setAuthError(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authTab === 'register'
                      ? 'bg-[#059669] text-white shadow'
                      : 'text-[#A7F3D0]/60 hover:text-white'
                  }`}
                >
                  {activeAuthT.registerBtn.split(' ')[0]}
                </button>
              </div>

              {/* Title & Description */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {authTab === 'login' ? activeAuthT.signIn : activeAuthT.registerBtn}
                </h3>
              </div>

              {/* Auth Error Banner */}
              {authError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-xs text-center font-bold"
                >
                  {authError}
                </motion.div>
              )}



              {/* Credentials Form */}
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
                {authTab === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#A7F3D0] uppercase tracking-wider pl-1">{activeAuthT.fullName}</label>
                    <input
                      type="text"
                      placeholder="Usuario Ejemplo"
                      value={authName}
                      onChange={e => setAuthName(e.target.value)}
                      disabled={authLoading}
                      className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#FCD34D] transition-colors disabled:opacity-40"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A7F3D0] uppercase tracking-wider pl-1">{activeAuthT.email}</label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    disabled={authLoading}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#FCD34D] transition-colors disabled:opacity-40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A7F3D0] uppercase tracking-wider pl-1">{activeAuthT.password}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    disabled={authLoading}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#FCD34D] transition-colors disabled:opacity-40"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm py-3 px-4 rounded-2xl shadow-lg shadow-[#059669]/15 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] mt-4 disabled:opacity-50"
                >
                  {authLoading && <Loader2 className="animate-spin" size={16} />}
                  <span>{authTab === 'login' ? activeAuthT.loginBtn : activeAuthT.registerBtn}</span>
                </button>
              </form>

              {/* Switch Tab Footer Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => {
                    setAuthTab(authTab === 'login' ? 'register' : 'login');
                    setAuthError(null);
                  }}
                  className="text-xs text-[#A7F3D0]/70 hover:text-white transition-colors"
                >
                  {authTab === 'login' ? (
                    <>
                      {activeAuthT.dontHaveAccount}{' '}
                      <span className="text-[#FCD34D] font-bold underline">{activeAuthT.registerLink.split(' ')[0]}</span>
                    </>
                  ) : (
                    <>
                      {activeAuthT.alreadyHaveAccount}{' '}
                      <span className="text-[#FCD34D] font-bold underline">{activeAuthT.loginLink.split(' ')[0]}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLearn && <LearnPrayerScreen onClose={() => setShowLearn(false)} />}
      </AnimatePresence>
    </div>
  );
}
