import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, Users, UserPlus, Search, Inbox as InboxIcon, Flame, Brain,
  Check, X, Loader2, Headphones, Hand, BookOpen, Mail, Sparkles,
  Pencil, Camera, Save, Trophy, Plus, Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../context/AuthContext';
import { useInbox } from '../hooks/useInbox';
import { ListenRoom } from '../components/social/ListenRoom';
import {
  searchUsers, loadGraph, sendFriendRequest, acceptRequest, removeFriendship,
  shareItem, loadChallenges, createChallenge, leaveChallenge,
  type SocialGraph, type SearchResult, type ChallengeWithStandings, type ChallengeMetric,
} from '../api/social';

type Lang = 'en' | 'es' | 'ar' | 'fr' | 'de' | 'tr' | 'pt';
const T: Record<string, Record<string, string>> = {
  en: { title: 'Community', subtitle: 'Friends & shared worship', friends: 'Friends', requests: 'Requests', search: 'Search', inbox: 'Inbox', signIn: 'Sign in to connect', google: 'Continue with Google', email: 'Email', password: 'Password', login: 'Sign in', register: 'Create account', toReg: "No account? Register", toLog: 'Have an account? Sign in', name: 'Display name', searchPh: 'Search by username…', add: 'Add', sent: 'Sent', accept: 'Accept', decline: 'Decline', remove: 'Remove', noFriends: 'No friends yet. Search to add some!', noReq: 'No pending requests', noInbox: 'Your inbox is empty', streak: 'streak', memorized: 'memorized', nudge: 'Nudge', listen: 'Listen together', incoming: 'Incoming', outgoing: 'Sent', dayStreak: 'day streak', nudgeSent: 'Nudge sent!', markRead: 'Mark read', from: 'from', editProfile: 'Edit profile', bioLabel: 'Bio', saveProfile: 'Save', cancelEdit: 'Cancel', uploadPhoto: 'Upload photo', searchEmpty: 'No results. Try a different username.' },
  es: { title: 'Comunidad', subtitle: 'Amigos y adoración compartida', friends: 'Amigos', requests: 'Solicitudes', search: 'Buscar', inbox: 'Bandeja', signIn: 'Inicia sesión para conectar', google: 'Continuar con Google', email: 'Correo', password: 'Contraseña', login: 'Entrar', register: 'Crear cuenta', toReg: '¿Sin cuenta? Regístrate', toLog: '¿Ya tienes cuenta? Entra', name: 'Nombre visible', searchPh: 'Buscar por usuario…', add: 'Añadir', sent: 'Enviada', accept: 'Aceptar', decline: 'Rechazar', remove: 'Eliminar', noFriends: 'Aún no tienes amigos. ¡Busca para añadir!', noReq: 'No hay solicitudes pendientes', noInbox: 'Tu bandeja está vacía', streak: 'racha', memorized: 'memorizadas', nudge: 'Animar', listen: 'Escuchar juntos', incoming: 'Recibidas', outgoing: 'Enviadas', dayStreak: 'días de racha', nudgeSent: '¡Ánimo enviado!', markRead: 'Marcar leído', from: 'de', editProfile: 'Editar perfil', bioLabel: 'Descripción', saveProfile: 'Guardar', cancelEdit: 'Cancelar', uploadPhoto: 'Subir foto', searchEmpty: 'Sin resultados. Prueba otro usuario.' },
  ar: { title: 'المجتمع', subtitle: 'الأصدقاء والعبادة المشتركة', friends: 'الأصدقاء', requests: 'الطلبات', search: 'بحث', inbox: 'الوارد', signIn: 'سجّل الدخول للتواصل', google: 'المتابعة مع Google', email: 'البريد', password: 'كلمة المرور', login: 'دخول', register: 'إنشاء حساب', toReg: 'لا حساب؟ سجّل', toLog: 'لديك حساب؟ ادخل', name: 'الاسم الظاهر', searchPh: 'ابحث باسم المستخدم…', add: 'إضافة', sent: 'مُرسلة', accept: 'قبول', decline: 'رفض', remove: 'إزالة', noFriends: 'لا أصدقاء بعد. ابحث لإضافتهم!', noReq: 'لا طلبات معلقة', noInbox: 'الوارد فارغ', streak: 'تتابع', memorized: 'محفوظة', nudge: 'تشجيع', listen: 'الاستماع معًا', incoming: 'واردة', outgoing: 'مرسلة', dayStreak: 'يوم تتابع', nudgeSent: 'تم إرسال التشجيع!', markRead: 'تعليم كمقروء', from: 'من', editProfile: 'تعديل الملف', bioLabel: 'نبذة', saveProfile: 'حفظ', cancelEdit: 'إلغاء', uploadPhoto: 'رفع صورة', searchEmpty: 'لا نتائج. جرّب اسمًا آخر.' },
};

// Challenge strings
const TC: Record<string, Record<string, string>> = {
  en: { tab: 'Challenges', none: 'No challenges yet. Create one and invite friends!', create: 'New challenge', title: 'Challenge name', defaultTitle: 'Streak race', metric: 'Compete on', mStreak: 'Prayer streak', mMem: 'Duas memorized', mPrayers: 'Prayers today', target: 'Goal', duration: 'Duration', days: 'days', invite: 'Invite friends', start: 'Start challenge', created: 'Challenge created!', you: 'You', leave: 'Leave', endsIn: 'ends in', ended: 'ended', noFriendsInvite: 'Add friends first to invite them.', target2: 'reach' },
  es: { tab: 'Retos', none: 'Aún no hay retos. ¡Crea uno e invita amigos!', create: 'Nuevo reto', title: 'Nombre del reto', defaultTitle: 'Carrera de racha', metric: 'Competir en', mStreak: 'Racha de rezos', mMem: 'Duas memorizadas', mPrayers: 'Rezos de hoy', target: 'Meta', duration: 'Duración', days: 'días', invite: 'Invitar amigos', start: 'Empezar reto', created: '¡Reto creado!', you: 'Tú', leave: 'Salir', endsIn: 'termina en', ended: 'terminado', noFriendsInvite: 'Añade amigos primero para invitarlos.', target2: 'llegar a' },
  ar: { tab: 'التحديات', none: 'لا تحديات بعد. أنشئ واحدًا وادعُ أصدقاءك!', create: 'تحدٍ جديد', title: 'اسم التحدي', defaultTitle: 'سباق المداومة', metric: 'التنافس في', mStreak: 'مداومة الصلاة', mMem: 'أدعية محفوظة', mPrayers: 'صلوات اليوم', target: 'الهدف', duration: 'المدة', days: 'يوم', invite: 'دعوة الأصدقاء', start: 'ابدأ التحدي', created: 'تم إنشاء التحدي!', you: 'أنت', leave: 'مغادرة', endsIn: 'ينتهي خلال', ended: 'انتهى', noFriendsInvite: 'أضف أصدقاء أولاً لدعوتهم.', target2: 'الوصول إلى' },
};

function roomFor(a: string, b: string) { return [a, b].sort().join('_'); }

interface Props { onClose: () => void; }

export function CommunityScreen({ onClose }: Props) {
  const { settings } = useSettings();
  const lang = (settings.language as Lang) || 'en';
  const t = T[lang] || T.en;
  const tc = (TC[lang] || TC.en);
  const isRTL = lang === 'ar';

  const { enabled, ready, user, profile, signInWithGoogle, signInEmail, signUpEmail, updateProfile } = useAuth();
  const { items, unread, markItemRead } = useInbox();

  const [tab, setTab] = useState<'friends' | 'requests' | 'search' | 'inbox' | 'challenges'>('friends');
  const [challenges, setChallenges] = useState<ChallengeWithStandings[]>([]);
  const [loadingCh, setLoadingCh] = useState(false);
  const [creatingCh, setCreatingCh] = useState(false);
  const [chTitle, setChTitle] = useState('');
  const [chMetric, setChMetric] = useState<ChallengeMetric>('streak');
  const [chTarget, setChTarget] = useState(7);
  const [chDays, setChDays] = useState(7);
  const [chFriends, setChFriends] = useState<string[]>([]);
  const [chBusy, setChBusy] = useState(false);
  const [graph, setGraph] = useState<SocialGraph>({ friends: [], incoming: [], outgoing: [] });
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [room, setRoom] = useState<{ code: string; name: string } | null>(null);

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth form
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [dispName, setDispName] = useState('');
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Debounced search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  const refreshGraph = useCallback(async () => {
    if (!user) return;
    setLoadingGraph(true);
    setGraph(await loadGraph(user.id));
    setLoadingGraph(false);
  }, [user]);

  useEffect(() => { if (user) refreshGraph(); }, [user, refreshGraph]);

  const refreshChallenges = useCallback(async () => {
    if (!user) return;
    setLoadingCh(true);
    setChallenges(await loadChallenges(user.id));
    setLoadingCh(false);
  }, [user]);

  useEffect(() => { if (user && tab === 'challenges') refreshChallenges(); }, [user, tab, refreshChallenges]);

  const submitChallenge = async () => {
    if (!user || chBusy) return;
    const title = chTitle.trim() || (tc.defaultTitle);
    setChBusy(true);
    const { error } = await createChallenge(user.id, title, chMetric, chTarget, chFriends, chDays);
    setChBusy(false);
    if (error) { flash(error); return; }
    setCreatingCh(false);
    setChTitle(''); setChFriends([]); setChMetric('streak'); setChTarget(7); setChDays(7);
    flash(tc.created);
    refreshChallenges();
  };

  const doSearch = async (term = q) => {
    if (!term.trim()) return;
    setSearching(true);
    setSearched(true);
    setResults(await searchUsers(term));
    setSearching(false);
  };

  // Debounce search while typing (≥2 chars)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.trim().length >= 2) {
      searchTimerRef.current = setTimeout(() => doSearch(q), 400);
    } else {
      setResults([]);
      setSearched(false);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const friendIds = new Set([
    ...graph.friends.map(f => f.profile.id),
    ...graph.outgoing.map(f => f.profile.id),
    ...graph.incoming.map(f => f.profile.id),
  ]);

  const add = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await sendFriendRequest(user.id, id);
    setBusy(null);
    if (error) flash(error); else { flash(t.sent); refreshGraph(); }
  };
  const accept = async (fid: string) => { setBusy(fid); await acceptRequest(fid); setBusy(null); refreshGraph(); };
  const remove = async (fid: string) => { setBusy(fid); await removeFriendship(fid); setBusy(null); refreshGraph(); };
  const nudge = async (id: string) => {
    if (!user) return;
    await shareItem(user.id, id, 'nudge', { emoji: '🤲' }, 'MashaAllah, keep your streak!');
    flash(t.nudgeSent);
  };

  const openEdit = () => {
    setEditName(profile?.display_name || '');
    setEditBio(profile?.bio || '');
    setEditAvatarPreview(null);
    setEditAvatarFile(null);
    setEditingProfile(true);
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setEditAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfileEdits = async () => {
    if (!user) return;
    setSavingProfile(true);
    const patch: Record<string, string> = {};
    if (editName.trim() && editName.trim() !== profile?.display_name) patch.display_name = editName.trim();
    if (editBio !== (profile?.bio || '')) patch.bio = editBio;

    if (editAvatarFile) {
      // Upload avatar server-side using base64
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => {
            const result = e.target?.result as string;
            resolve(result.split(',')[1]); // strip data:...;base64,
          };
          reader.onerror = reject;
          reader.readAsDataURL(editAvatarFile);
        });
        const session = await import('../lib/supabase').then(m => m.supabase?.auth.getSession());
        const jwt = session?.data?.session?.access_token;
        if (jwt) {
          const res = await fetch('/api/auth/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({ userId: user.id, base64, mimeType: editAvatarFile.type }),
          });
          if (res.ok) {
            const { url } = await res.json();
            patch.avatar_url = url;
          }
        }
      } catch { /* upload failed, skip avatar update */ }
    }

    if (Object.keys(patch).length > 0) await updateProfile(patch as any);
    setSavingProfile(false);
    setEditingProfile(false);
  };

  const submitAuth = async () => {
    setAuthErr(null); setAuthBusy(true);
    const res = authMode === 'login'
      ? await signInEmail(email.trim(), pw)
      : await signUpEmail(email.trim(), pw, dispName.trim() || undefined);
    setAuthBusy(false);
    if (res.error) setAuthErr(res.error);
  };

  const Shell = (body: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 bg-[#022C22] text-[#F3F4F6] overflow-y-auto px-5 pt-12 pb-24"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#022C22] to-[#011410] -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] -z-10" />
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10">
          <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#FCD34D] tracking-tight">{t.title}</h1>
          <p className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-semibold opacity-75 mt-0.5">{t.subtitle}</p>
        </div>
      </div>
      <div className="max-w-md w-full mx-auto">{body}</div>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/85 border border-emerald-500/30 px-4 py-2.5 rounded-2xl text-sm text-white shadow-xl z-50">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // --- Not configured / loading / signed-out states ---
  if (!enabled) {
    return Shell(
      <div className="text-center py-20 text-[#A7F3D0]/70 text-sm">
        El módulo social no está configurado en este entorno.
      </div>,
    );
  }
  if (!ready) {
    return Shell(<div className="grid place-items-center py-24"><Loader2 className="animate-spin text-[#FCD34D]" /></div>);
  }
  if (!user) {
    return Shell(
      <div className="space-y-4">
        <div className="text-center mb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-[#FCD34D] mb-3">
            <Users size={28} />
          </div>
          <h2 className="text-lg font-bold text-white">{t.signIn}</h2>
        </div>
        <button onClick={signInWithGoogle} className="w-full py-3.5 rounded-2xl bg-white text-[#1f1f1f] font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/90">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          {t.google}
        </button>
        <div className="flex items-center gap-3 text-[10px] text-white/30 uppercase tracking-widest"><div className="h-px bg-white/10 flex-1" />o<div className="h-px bg-white/10 flex-1" /></div>
        {authMode === 'register' && (
          <input value={dispName} onChange={e => setDispName(e.target.value)} placeholder={t.name}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 outline-none" />
        )}
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder={t.email} autoCapitalize="none"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 outline-none" />
        <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder={t.password}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 outline-none" />
        {authErr && <p className="text-[12px] text-red-400 text-center">{authErr}</p>}
        <button onClick={submitAuth} disabled={authBusy || !email || !pw}
          className="w-full py-3.5 rounded-2xl bg-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 disabled:opacity-40">
          {authBusy ? <Loader2 size={16} className="animate-spin" /> : (authMode === 'login' ? t.login : t.register)}
        </button>
        <button onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthErr(null); }}
          className="w-full text-center text-[12px] text-[#A7F3D0]/70 hover:text-white">
          {authMode === 'login' ? t.toReg : t.toLog}
        </button>
      </div>,
    );
  }

  // --- Signed in ---
  const tabs = [
    { id: 'friends' as const, icon: <Users size={15} />, label: t.friends, badge: 0 },
    { id: 'requests' as const, icon: <UserPlus size={15} />, label: t.requests, badge: graph.incoming.length },
    { id: 'challenges' as const, icon: <Trophy size={15} />, label: tc.tab, badge: 0 },
    { id: 'search' as const, icon: <Search size={15} />, label: t.search, badge: 0 },
    { id: 'inbox' as const, icon: <InboxIcon size={15} />, label: t.inbox, badge: unread },
  ];

  const statChip = (icon: React.ReactNode, value: number | string, label: string) => (
    <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[#FCD34D]">{icon}<span className="font-bold text-white">{value}</span></div>
      <p className="text-[9px] text-[#A7F3D0]/50 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );

  return Shell(
    <div className="space-y-5">
      {/* My profile header */}
      {profile && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-4">
          {editingProfile ? (
            <div className="space-y-3">
              {/* Avatar picker */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {(editAvatarPreview || profile.avatar_url)
                    ? <img src={editAvatarPreview || profile.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                    : <div className="w-16 h-16 rounded-2xl bg-emerald-600 grid place-items-center text-2xl font-bold text-white">{(profile.display_name || profile.username).slice(0, 1).toUpperCase()}</div>}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 bg-[#059669] rounded-full p-1.5 shadow-lg"
                  >
                    <Camera size={12} className="text-white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarPick} />
                </div>
                <div className="flex-1 text-[11px] text-[#A7F3D0]/60">{t.uploadPhoto}</div>
              </div>
              {/* Display name */}
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={t.name}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 outline-none"
              />
              {/* Bio */}
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                placeholder={t.bioLabel}
                rows={2}
                maxLength={160}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 outline-none resize-none"
              />
              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={saveProfileEdits}
                  disabled={savingProfile}
                  className="flex-1 py-2.5 bg-[#059669] rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {t.saveProfile}
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-[#A7F3D0]/70"
                >
                  {t.cancelEdit}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                  : <div className="w-12 h-12 rounded-2xl bg-emerald-600 grid place-items-center text-lg font-bold text-white">{(profile.display_name || profile.username).slice(0, 1).toUpperCase()}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{profile.display_name || profile.username}</p>
                  <p className="text-[11px] text-[#A7F3D0]/60 font-mono">@{profile.username}</p>
                  {profile.bio && <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5 line-clamp-2">{profile.bio}</p>}
                </div>
                <button
                  onClick={openEdit}
                  className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-[#A7F3D0]/70 shrink-0"
                  title={t.editProfile}
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                {statChip(<Flame size={14} />, profile.current_streak, t.streak)}
                {statChip(<Brain size={14} />, profile.total_memorized, t.memorized)}
                {statChip(<Check size={14} />, `${profile.prayers_today}/5`, 'today')}
              </div>
            </>
          )}
        </div>
      )}

      {/* Active listen room */}
      <AnimatePresence>
        {room && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <ListenRoom roomCode={room.code} onLeave={() => setRoom(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex bg-black/20 p-1 rounded-2xl border border-white/5">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`relative flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${tab === tb.id ? 'bg-[#059669] text-white' : 'text-[#A7F3D0]/60 hover:text-white'}`}>
            {tb.icon}<span className="hidden sm:inline">{tb.label}</span>
            {tb.badge > 0 && <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[9px] grid place-items-center text-white">{tb.badge}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loadingGraph && tab !== 'inbox' && tab !== 'search' && tab !== 'challenges'
        ? <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-[#FCD34D]" /></div>
        : (
          <div className="space-y-3">
            {tab === 'friends' && (
              graph.friends.length === 0
                ? <p className="text-center text-[13px] text-[#A7F3D0]/50 py-10">{t.noFriends}</p>
                : graph.friends.map(f => (
                  <div key={f.friendshipId} className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                    {f.profile.avatar_url
                      ? <img src={f.profile.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      : <div className="w-10 h-10 rounded-xl bg-emerald-700 grid place-items-center font-bold text-white">{(f.profile.display_name || f.profile.username).slice(0, 1).toUpperCase()}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{f.profile.display_name || f.profile.username}</p>
                      <p className="text-[11px] text-[#A7F3D0]/60 flex items-center gap-2">
                        <span className="flex items-center gap-0.5"><Flame size={11} className="text-orange-400" />{f.profile.current_streak}</span>
                        <span className="flex items-center gap-0.5"><Brain size={11} className="text-fuchsia-400" />{f.profile.total_memorized}</span>
                      </p>
                    </div>
                    <button onClick={() => nudge(f.profile.id)} title={t.nudge} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-[#FCD34D]"><Hand size={15} /></button>
                    <button onClick={() => user && setRoom({ code: roomFor(user.id, f.profile.id), name: f.profile.display_name || f.profile.username })} title={t.listen} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-emerald-300"><Headphones size={15} /></button>
                    <button onClick={() => remove(f.friendshipId)} disabled={busy === f.friendshipId} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 text-white/40"><X size={15} /></button>
                  </div>
                ))
            )}

            {tab === 'requests' && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-[#A7F3D0]/40 font-bold">{t.incoming}</p>
                {graph.incoming.length === 0 ? <p className="text-center text-[13px] text-[#A7F3D0]/50 py-4">{t.noReq}</p>
                  : graph.incoming.map(f => (
                    <div key={f.friendshipId} className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-700 grid place-items-center font-bold text-white">{(f.profile.display_name || f.profile.username).slice(0, 1).toUpperCase()}</div>
                      <div className="flex-1 min-w-0"><p className="font-semibold text-white text-sm truncate">{f.profile.display_name || f.profile.username}</p><p className="text-[11px] text-[#A7F3D0]/60 font-mono">@{f.profile.username}</p></div>
                      <button onClick={() => accept(f.friendshipId)} disabled={busy === f.friendshipId} className="p-2 bg-emerald-600 rounded-xl hover:bg-emerald-500 text-white"><Check size={15} /></button>
                      <button onClick={() => remove(f.friendshipId)} disabled={busy === f.friendshipId} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 text-white/40"><X size={15} /></button>
                    </div>
                  ))}
                {graph.outgoing.length > 0 && <p className="text-[10px] uppercase tracking-widest text-[#A7F3D0]/40 font-bold pt-2">{t.outgoing}</p>}
                {graph.outgoing.map(f => (
                  <div key={f.friendshipId} className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3 opacity-70">
                    <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center font-bold text-white">{(f.profile.display_name || f.profile.username).slice(0, 1).toUpperCase()}</div>
                    <div className="flex-1 min-w-0"><p className="font-semibold text-white text-sm truncate">{f.profile.display_name || f.profile.username}</p></div>
                    <span className="text-[11px] text-[#A7F3D0]/50">{t.sent}</span>
                  </div>
                ))}
              </>
            )}

            {tab === 'search' && (
              <>
                <div className="flex gap-2">
                  <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doSearch()}
                    placeholder={t.searchPh}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 outline-none"
                    autoComplete="off"
                    autoCapitalize="none"
                  />
                  <button
                    onClick={() => doSearch()}
                    disabled={!q.trim()}
                    className="px-4 bg-[#059669] rounded-2xl text-white hover:bg-emerald-600 disabled:opacity-40"
                  >
                    {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                </div>
                {searched && !searching && results.length === 0 && (
                  <p className="text-center text-[13px] text-[#A7F3D0]/50 py-6">{t.searchEmpty}</p>
                )}
                {results.map(r => {
                  const known = friendIds.has(r.id);
                  return (
                    <div key={r.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-emerald-700 grid place-items-center font-bold text-white">{(r.display_name || r.username).slice(0, 1).toUpperCase()}</div>}
                      <div className="flex-1 min-w-0"><p className="font-semibold text-white text-sm truncate">{r.display_name || r.username}</p><p className="text-[11px] text-[#A7F3D0]/60 font-mono">@{r.username}</p></div>
                      <button onClick={() => add(r.id)} disabled={known || busy === r.id} className="px-3 py-2 bg-[#059669] rounded-xl text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:bg-white/10 flex items-center gap-1">
                        {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}{known ? t.sent : t.add}
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {tab === 'inbox' && (
              items.length === 0
                ? <p className="text-center text-[13px] text-[#A7F3D0]/50 py-10">{t.noInbox}</p>
                : items.map(it => (
                  <div key={it.id} className={`border rounded-2xl p-3.5 ${it.read ? 'bg-white/[0.02] border-white/5' : 'bg-emerald-500/[0.06] border-emerald-500/20'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[#FCD34D]">{it.kind === 'nudge' ? <Hand size={14} /> : it.kind === 'verse' ? <BookOpen size={14} /> : it.kind === 'dua' ? <Sparkles size={14} /> : <Mail size={14} />}</span>
                      <p className="text-[12px] text-white font-semibold flex-1 truncate">{it.senderProfile?.display_name || it.senderProfile?.username || t.from}</p>
                      {!it.read && <button onClick={() => markItemRead(it.id)} className="text-[10px] text-[#A7F3D0]/60 hover:text-white">{t.markRead}</button>}
                    </div>
                    {it.payload?.arabic && <p dir="rtl" className="text-base text-white text-right leading-loose" style={{ fontFamily: 'serif' }}>{it.payload.arabic}</p>}
                    {it.payload?.reference && <p className="text-[10px] text-[#FCD34D]/60 mt-1">{it.payload.reference}</p>}
                    {it.note && <p className="text-[12px] text-[#A7F3D0]/80 mt-1">{it.note}</p>}
                  </div>
                ))
            )}

            {tab === 'challenges' && (
              <>
                <button
                  onClick={() => { setChFriends([]); setCreatingCh(true); }}
                  className="w-full mb-3 py-3 rounded-2xl bg-[#FCD34D]/12 border border-[#FCD34D]/30 text-[#FCD34D] text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Plus size={15} /> {tc.create}
                </button>

                {loadingCh ? (
                  <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-[#FCD34D]" /></div>
                ) : challenges.length === 0 ? (
                  <p className="text-center text-[13px] text-[#A7F3D0]/50 py-10">{tc.none}</p>
                ) : (
                  challenges.map((c) => {
                    const isCreator = c.creator === user!.id;
                    const ended = c.ends_at ? new Date(c.ends_at) < new Date() : false;
                    const daysLeft = c.ends_at ? Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000) : null;
                    const metricLabel = c.metric === 'streak' ? tc.mStreak : c.metric === 'memorized' ? tc.mMem : tc.mPrayers;
                    return (
                      <div key={c.id} className="border border-white/10 rounded-2xl p-4 bg-white/[0.02] mb-3">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Trophy size={14} className="text-[#FCD34D] shrink-0" />
                              <p className="text-sm font-bold text-white truncate">{c.title}</p>
                            </div>
                            <p className="text-[10px] text-[#A7F3D0]/50 mt-0.5">
                              {metricLabel} · {tc.target2} {c.target}
                              {daysLeft != null && ` · ${ended ? tc.ended : `${tc.endsIn} ${Math.max(0, daysLeft)} ${tc.days}`}`}
                            </p>
                          </div>
                          <button onClick={async () => { await leaveChallenge(user!.id, c.id, isCreator); refreshChallenges(); }} className="text-[10px] text-[#A7F3D0]/40 hover:text-red-300 shrink-0 ml-2">{tc.leave}</button>
                        </div>
                        <div className="space-y-1.5">
                          {c.standings.map((s, i) => {
                            const isMe = s.profile.id === user!.id;
                            const reached = s.value >= c.target;
                            return (
                              <div key={s.profile.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl ${isMe ? 'bg-[#059669]/15 border border-[#059669]/25' : 'bg-white/[0.02]'}`}>
                                <span className={`w-5 text-center text-xs font-black ${i === 0 ? 'text-[#FCD34D]' : 'text-[#A7F3D0]/40'}`}>{i === 0 ? <Crown size={13} className="inline" /> : i + 1}</span>
                                <span className="text-xs font-semibold text-white flex-1 truncate">{isMe ? tc.you : (s.profile.display_name || s.profile.username)}</span>
                                {reached && <Check size={13} className="text-emerald-400" />}
                                <span className={`text-sm font-black tabular-nums ${i === 0 ? 'text-[#FCD34D]' : 'text-white'}`}>{s.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        )}

        {/* Create-challenge modal */}
        <AnimatePresence>
          {creatingCh && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
              onClick={() => setCreatingCh(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#022C22] border border-white/10 rounded-3xl p-5 max-h-[85vh] overflow-y-auto app-scroll"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-[#FCD34D] flex items-center gap-2"><Trophy size={17} /> {tc.create}</h3>
                  <button onClick={() => setCreatingCh(false)} className="p-1.5 text-[#A7F3D0]/60 hover:text-white"><X size={18} /></button>
                </div>

                <input
                  value={chTitle} onChange={(e) => setChTitle(e.target.value)} placeholder={tc.title}
                  className="w-full mb-3 px-3.5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#FCD34D]"
                />

                <label className="text-[10px] font-bold text-[#A7F3D0]/50 uppercase tracking-widest">{tc.metric}</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5 mb-3">
                  {([['streak', tc.mStreak, <Flame size={14} />], ['memorized', tc.mMem, <Brain size={14} />], ['prayers_today', tc.mPrayers, <Check size={14} />]] as const).map(([m, label, icon]) => (
                    <button key={m} onClick={() => setChMetric(m as ChallengeMetric)}
                      className={`py-2.5 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${chMetric === m ? 'bg-[#059669] border-[#10B981] text-white' : 'bg-black/20 border-white/10 text-[#A7F3D0]/60'}`}>
                      {icon}<span className="leading-tight text-center">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#A7F3D0]/50 uppercase tracking-widest">{tc.target}</label>
                    <input type="number" min={1} value={chTarget} onChange={(e) => setChTarget(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FCD34D]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#A7F3D0]/50 uppercase tracking-widest">{tc.duration} ({tc.days})</label>
                    <input type="number" min={1} value={chDays} onChange={(e) => setChDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FCD34D]" />
                  </div>
                </div>

                <label className="text-[10px] font-bold text-[#A7F3D0]/50 uppercase tracking-widest">{tc.invite}</label>
                {graph.friends.length === 0 ? (
                  <p className="text-[11px] text-[#A7F3D0]/40 mt-1.5 mb-3">{tc.noFriendsInvite}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1.5 mb-4">
                    {graph.friends.map((f) => {
                      const sel = chFriends.includes(f.profile.id);
                      return (
                        <button key={f.profile.id}
                          onClick={() => setChFriends(prev => sel ? prev.filter(x => x !== f.profile.id) : [...prev, f.profile.id])}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${sel ? 'bg-[#059669] border-[#10B981] text-white' : 'bg-black/20 border-white/10 text-[#A7F3D0]/70'}`}>
                          {f.profile.display_name || f.profile.username}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button onClick={submitChallenge} disabled={chBusy}
                  className="w-full py-3.5 rounded-2xl bg-[#FCD34D] text-[#022C22] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50">
                  {chBusy ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />} {tc.start}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>,
  );
}
