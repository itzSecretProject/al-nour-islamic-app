import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Synchronised recitation listening over an ephemeral Realtime Broadcast channel
// (no DB table needed). The "host" broadcasts playback state; everyone in the
// room mirrors it. Presence tracks who is currently listening.

export interface PlaybackState {
  surah: number;
  ayah: number;
  reciter: string;
  playing: boolean;
  positionSec: number;
  updatedAt: number;
  by: string; // user id of whoever drove this state
}

export interface RoomMember {
  id: string;
  name: string;
  avatar: string;
}

export function useListenTogether(roomCode: string | null) {
  const { user, profile, enabled } = useAuth();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [remoteState, setRemoteState] = useState<PlaybackState | null>(null);
  const [connected, setConnected] = useState(false);
  const chRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !supabase || !roomCode || !user) return;
    setConnected(false);
    const ch = supabase.channel(`listen:${roomCode}`, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });

    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      setRemoteState(payload as PlaybackState);
    });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const list = Object.values(state).flat().map((m: any) => ({
        id: m.id, name: m.name, avatar: m.avatar,
      })) as RoomMember[];
      // de-dupe by id (a member may have multiple presence refs)
      const seen = new Map(list.map(m => [m.id, m]));
      setMembers([...seen.values()]);
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        await ch.track({
          id: user.id,
          name: profile?.display_name || profile?.username || '—',
          avatar: profile?.avatar_url || '',
        });
      }
    });

    chRef.current = ch;
    return () => {
      setConnected(false);
      supabase?.removeChannel(ch);
      chRef.current = null;
    };
  }, [enabled, roomCode, user, profile]);

  const broadcast = useCallback((state: Omit<PlaybackState, 'updatedAt' | 'by'>) => {
    if (!chRef.current || !user) return;
    chRef.current.send({
      type: 'broadcast',
      event: 'state',
      payload: { ...state, updatedAt: Date.now(), by: user.id } as PlaybackState,
    });
  }, [user]);

  return { members, remoteState, connected, broadcast };
}
