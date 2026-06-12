import React, { useEffect, useState } from 'react';
import { X, Loader2, Users, Send, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { loadGraph, shareItem, type ShareKind, type FriendEdge } from '../../api/social';

interface SharePayload {
  kind: ShareKind;
  payload: Record<string, any>;
  note?: string;
}

interface Props {
  item: SharePayload;
  onClose: () => void;
  lang?: string;
}

const LABELS: Record<string, { title: string; sent: string; noFriends: string; signIn: string }> = {
  es: { title: 'Enviar a amigo', sent: '¡Enviado!', noFriends: 'Aún no tienes amigos añadidos.', signIn: 'Inicia sesión en Comunidad para compartir.' },
  en: { title: 'Send to friend', sent: 'Sent!', noFriends: 'No friends yet.', signIn: 'Sign in to Community to share.' },
  ar: { title: 'أرسل لصديق', sent: 'تم الإرسال!', noFriends: 'لا أصدقاء بعد.', signIn: 'سجّل الدخول للمشاركة.' },
  fr: { title: 'Envoyer à un ami', sent: 'Envoyé!', noFriends: 'Aucun ami pour l\'instant.', signIn: 'Connectez-vous pour partager.' },
};
const l = (lang = 'es') => LABELS[lang] || LABELS.es;

export function FriendPickerModal({ item, onClose, lang }: Props) {
  const { user, enabled } = useAuth();
  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const labels = l(lang);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadGraph(user.id).then(g => { setFriends(g.friends); setLoading(false); });
  }, [user]);

  const send = async (f: FriendEdge) => {
    if (!user || sending) return;
    setSending(f.friendshipId);
    await shareItem(user.id, f.profile.id, item.kind, item.payload, item.note || '');
    setDone(f.friendshipId);
    setSending(null);
    setTimeout(() => { setDone(null); onClose(); }, 900);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="w-full max-w-sm bg-[#022C22] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Send size={16} className="text-[#FCD34D]" />
              {labels.title}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50">
              <X size={16} />
            </button>
          </div>

          <div className="px-3 pb-4 max-h-72 overflow-y-auto space-y-1.5">
            {!enabled || !user ? (
              <p className="text-center text-sm text-[#A7F3D0]/60 py-8">{labels.signIn}</p>
            ) : loading ? (
              <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-[#FCD34D]" /></div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Users size={28} className="mx-auto text-white/20" />
                <p className="text-sm text-[#A7F3D0]/50">{labels.noFriends}</p>
              </div>
            ) : (
              friends.map(f => {
                const isSent = done === f.friendshipId;
                const isSending = sending === f.friendshipId;
                const name = f.profile.display_name || f.profile.username;
                return (
                  <button
                    key={f.friendshipId}
                    onClick={() => send(f)}
                    disabled={!!sending || !!done}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] transition-all disabled:opacity-60 text-left"
                  >
                    {f.profile.avatar_url
                      ? <img src={f.profile.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                      : <div className="w-9 h-9 rounded-xl bg-emerald-700 grid place-items-center font-bold text-white shrink-0 text-sm">{name.slice(0, 1).toUpperCase()}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{name}</p>
                      <p className="text-[11px] text-[#A7F3D0]/50 font-mono">@{f.profile.username}</p>
                    </div>
                    <span className={`shrink-0 w-8 h-8 rounded-xl grid place-items-center transition-all ${isSent ? 'bg-emerald-500 text-white' : 'bg-[#059669]/20 text-emerald-300'}`}>
                      {isSending ? <Loader2 size={14} className="animate-spin" /> : isSent ? <Check size={14} /> : <Send size={13} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
