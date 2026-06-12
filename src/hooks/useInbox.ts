import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { loadInbox, markRead, type SharedItem } from '../api/social';

// Realtime inbox of items friends send you (verses, duas, annotations, nudges).
export function useInbox() {
  const { user, enabled } = useAuth();
  const [items, setItems] = useState<SharedItem[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const list = await loadInbox(user.id);
    setItems(list);
    setUnread(list.filter(i => !i.read).length);
  }, [user]);

  useEffect(() => {
    if (!enabled || !user || !supabase) return;
    refresh();
    const ch = supabase
      .channel(`inbox:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shared_items', filter: `recipient=eq.${user.id}` },
        () => { refresh(); },
      )
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [enabled, user, refresh]);

  const markItemRead = useCallback(async (id: string) => {
    await markRead(id);
    setItems(prev => prev.map(i => (i.id === id ? { ...i, read: true } : i)));
    setUnread(c => Math.max(0, c - 1));
  }, []);

  return { items, unread, refresh, markItemRead };
}
