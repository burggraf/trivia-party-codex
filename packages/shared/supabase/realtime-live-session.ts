import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { realtimeEnvelopeSchema, validateRealtimePayload, type RealtimeEnvelope } from '../contracts/realtimePayloads';

export interface LiveSessionCallbacks {
  onMessage?: (envelope: RealtimeEnvelope) => void;
  onQuestion?: (envelope: RealtimeEnvelope) => void;
  onScore?: (envelope: RealtimeEnvelope) => void;
  onSystem?: (envelope: RealtimeEnvelope) => void;
  onConnectionStatusChange?: (status: 'subscribed' | 'closed' | 'error') => void;
  onError?: (error: unknown) => void;
}

export interface BroadcastOptions {
  target?: 'players' | 'display';
}

const HEARTBEAT_INTERVAL_MS = 2000;

export class RealtimeLiveSession {
  private readonly eventChannelName: string;
  private readonly displayChannelName: string;
  private heartbeatTimer: number | undefined;
  private hostChannel: RealtimeChannel | null = null;
  private displayChannel: RealtimeChannel | null = null;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly eventId: string,
    private readonly callbacks: LiveSessionCallbacks = {}
  ) {
    this.eventChannelName = `realtime:events:${eventId}`;
    this.displayChannelName = `realtime:events:${eventId}:display`;
  }

  async connect(): Promise<void> {
    try {
      this.hostChannel = this.supabase.channel(this.eventChannelName, {
        config: { broadcast: { ack: true } }
      });
      this.displayChannel = this.supabase.channel(this.displayChannelName, {
        config: { broadcast: { ack: true } }
      });

      this.registerHandlers(this.hostChannel);
      this.registerHandlers(this.displayChannel);

      await Promise.all([this.subscribe(this.hostChannel), this.subscribe(this.displayChannel)]);
      this.startHeartbeat();
    } catch (error) {
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  private async subscribe(channel: RealtimeChannel | null) {
    if (!channel) return;

    const { data } = await channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.callbacks.onConnectionStatusChange?.('subscribed');
      } else if (status === 'CLOSED') {
        this.callbacks.onConnectionStatusChange?.('closed');
      } else if (status === 'CHANNEL_ERROR') {
        this.callbacks.onConnectionStatusChange?.('error');
      }
    });

    if (data?.status !== 'SUBSCRIBED') {
      throw new Error(`Failed to subscribe to channel ${channel.topic}`);
    }
  }

  private registerHandlers(channel: RealtimeChannel | null) {
    channel?.on('broadcast', { event: 'message' }, (context) => {
      try {
        const envelope = validateRealtimePayload(context.payload);
        this.dispatchEnvelope(envelope);
      } catch (error) {
        this.callbacks.onError?.(error);
      }
    });
  }

  private dispatchEnvelope(envelope: RealtimeEnvelope) {
    this.callbacks.onMessage?.(envelope);

    switch (envelope.type) {
      case 'question':
        this.callbacks.onQuestion?.(envelope);
        break;
      case 'score':
        this.callbacks.onScore?.(envelope);
        break;
      case 'system':
        this.callbacks.onSystem?.(envelope);
        break;
      default:
        break;
    }
  }

  async broadcast(envelope: RealtimeEnvelope, options: BroadcastOptions = {}) {
    realtimeEnvelopeSchema.parse(envelope);
    const target = options.target ?? 'players';
    const channel = target === 'display' ? this.displayChannel : this.hostChannel;

    if (!channel) {
      throw new Error('Realtime channel not initialised. Did you call connect()?');
    }

    const { error } = await channel.send({ type: 'broadcast', event: 'message', payload: envelope });
    if (error) {
      throw error;
    }
  }

  async broadcastSystemStatus(status: 'paused' | 'resumed' | 'ended', reason?: string) {
    await this.broadcast(
      {
        type: 'system',
        eventId: this.eventId,
        roundIndex: 0,
        questionIndex: 0,
        timestamp: new Date().toISOString(),
        payload: { status, reason }
      },
      { target: 'players' }
    );
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.broadcast(
        {
          type: 'system',
          eventId: this.eventId,
          roundIndex: 0,
          questionIndex: 0,
          timestamp: new Date().toISOString(),
          payload: { status: 'heartbeat' }
        }
      ).catch((error) => {
        this.callbacks.onError?.(error);
      });
    }, HEARTBEAT_INTERVAL_MS) as unknown as number;
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  async disconnect() {
    this.stopHeartbeat();
    await Promise.all([
      this.hostChannel?.unsubscribe(),
      this.displayChannel?.unsubscribe()
    ]);
    this.hostChannel = null;
    this.displayChannel = null;
  }
}
