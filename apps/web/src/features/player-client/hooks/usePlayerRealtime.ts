import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { validateRealtimePayload, type RealtimeEnvelope } from '../../../../../../packages/shared/supabase/contracts/realtimePayloads';

export type PlayerConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface UsePlayerRealtimeOptions {
  supabase: SupabaseClient;
  eventId: string;
  teamId: string;
}

export interface PlayerRealtimeState {
  status: PlayerConnectionStatus;
  currentQuestion: RealtimeEnvelope | null;
  scoreboard: RealtimeEnvelope | null;
  systemMessage: RealtimeEnvelope | null;
  answerLocked: boolean;
}

export function usePlayerRealtime({ supabase, eventId, teamId }: UsePlayerRealtimeOptions) {
  const [state, setState] = useState<PlayerRealtimeState>({
    status: 'idle',
    currentQuestion: null,
    scoreboard: null,
    systemMessage: null,
    answerLocked: false
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  const topic = useMemo(() => `realtime:events:${eventId}`, [eventId]);

  useEffect(() => {
    setState((prev) => ({ ...prev, status: 'connecting' }));
    const channel = supabase.channel(topic, { config: { broadcast: { ack: false } } });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'message' }, (context) => {
      try {
        const envelope = validateRealtimePayload(context.payload);

        setState((prev) => {
          switch (envelope.type) {
            case 'question':
              return {
                ...prev,
                currentQuestion: envelope,
                answerLocked: false
              };
            case 'score':
              return { ...prev, scoreboard: envelope };
            case 'system':
              return { ...prev, systemMessage: envelope };
            default:
              return prev;
          }
        });
      } catch (error) {
        console.error('Failed to parse realtime payload', error);
      }
    });

    channel
      .subscribe()
      .then(({ data }) => {
        if (data?.status === 'SUBSCRIBED') {
          setState((prev) => ({ ...prev, status: 'connected' }));
        } else {
          setState((prev) => ({ ...prev, status: 'error' }));
        }
      })
      .catch((error) => {
        console.error('Failed to join realtime channel', error);
        setState((prev) => ({ ...prev, status: 'error' }));
      });

    return () => {
      channel.unsubscribe().catch(() => undefined);
      channelRef.current = null;
      setState({
        status: 'idle',
        currentQuestion: null,
        scoreboard: null,
        systemMessage: null,
        answerLocked: false
      });
    };
  }, [supabase, topic]);

  const lockAnswer = () => {
    setState((prev) => ({ ...prev, answerLocked: true }));
  };

  return {
    ...state,
    lockAnswer,
    teamId
  };
}
