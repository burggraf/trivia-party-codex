import type { SupabaseClient } from '@supabase/supabase-js';
import { purgeEventAnalytics } from '../../../../../../packages/shared/analytics/pacing';

export async function completeEvent(client: SupabaseClient, eventId: string): Promise<void> {
  const { error } = await client
    .from('game_events')
    .update({ status: 'completed' })
    .eq('id', eventId);

  if (error) {
    throw new Error(error.message);
  }

  await purgeEventAnalytics(client, eventId);
}

