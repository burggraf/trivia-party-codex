import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  RealtimeLiveSession,
  type LiveSessionCallbacks,
  type RealtimeEnvelope
} from '../../../../../../packages/shared/supabase/realtime-live-session';

export type HostConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type HostRealtimeCallbacks = Omit<LiveSessionCallbacks, 'onConnectionStatusChange'>;

export interface UseHostRealtimeOptions {
  supabase: SupabaseClient;
  eventId: string;
  callbacks?: HostRealtimeCallbacks;
}

export function useHostRealtime({ supabase, eventId, callbacks }: UseHostRealtimeOptions) {
  const [status, setStatus] = useState<HostConnectionStatus>('idle');
  const sessionRef = useRef<RealtimeLiveSession | null>(null);

  const mergedCallbacks = useMemo<LiveSessionCallbacks>(() => ({
    ...callbacks,
    onConnectionStatusChange: (value) => {
      if (value === 'subscribed') {
        setStatus('connected');
      } else if (value === 'error') {
        setStatus('error');
      }
    },
    onError: (error) => {
      callbacks?.onError?.(error);
      setStatus('error');
    }
  }), [callbacks]);

  useEffect(() => {
    setStatus('connecting');
    const session = new RealtimeLiveSession(supabase, eventId, mergedCallbacks);
    sessionRef.current = session;

    session
      .connect()
      .catch((error) => {
        mergedCallbacks.onError?.(error);
        setStatus('error');
      });

    return () => {
      session.disconnect().catch(() => undefined);
      sessionRef.current = null;
      setStatus('idle');
    };
  }, [eventId, mergedCallbacks, supabase]);

  const broadcast = useCallback(async (envelope: RealtimeEnvelope) => {
    return sessionRef.current?.broadcast(envelope);
  }, []);

  const broadcastToDisplay = useCallback(async (envelope: RealtimeEnvelope) => {
    return sessionRef.current?.broadcast(envelope, { target: 'display' });
  }, []);

  const broadcastSystemStatus = useCallback(async (state: 'paused' | 'resumed' | 'ended', reason?: string) => {
    return sessionRef.current?.broadcastSystemStatus(state, reason);
  }, []);

  return {
    status,
    broadcast,
    broadcastToDisplay,
    broadcastSystemStatus
  };
}
