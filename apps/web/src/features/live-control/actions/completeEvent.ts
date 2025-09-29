import type { SupabaseClient } from '@supabase/supabase-js';
import { purgeEventAnalytics, summarisePacingMetrics } from '../../../../../../packages/shared/analytics/pacing';
import type { RealtimeLiveSession } from '../../../../../../packages/shared/supabase/realtime-live-session';

export async function completeEvent(
  client: SupabaseClient,
  session: RealtimeLiveSession | null,
  eventId: string
): Promise<{ purgeCount: number }> {
  const { error } = await client
    .from('game_events')
    .update({ status: 'completed' })
    .eq('id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  let purgeCount = 0;

  try {
    const { data, error: listError } = await client
      .from('event_metrics')
      .select('*')
      .eq('event_id', eventId);

    if (listError) {
      throw new Error(listError.message);
    }

    purgeCount = data?.length ?? 0;
  } catch (metricsError) {
    console.error('Failed to load pacing metrics prior to purge', metricsError);
  }

  await purgeEventAnalytics(client, eventId);

  if (session) {
    await session.broadcast(
      {
        type: 'system',
        eventId,
        roundIndex: 0,
        questionIndex: 0,
        timestamp: new Date().toISOString(),
        payload: {
          status: 'ended',
          reason: 'event_completed'
        }
      },
      { target: 'players' }
    );

    await session.broadcast(
      {
        type: 'system',
        eventId,
        roundIndex: 0,
        questionIndex: 0,
        timestamp: new Date().toISOString(),
        payload: {
          status: 'ended',
          reason: 'event_completed'
        }
      },
      { target: 'display' }
    );
  }

  return { purgeCount };
}
