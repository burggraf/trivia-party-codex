import { getSupabaseClient } from '../../shared/EventState';
import type { SaveEventInput } from '../../shared/EventState';

export type CreateEventInput = SaveEventInput;

export async function createEvent(input: CreateEventInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error('Host session required to create an event.');
  }

  const { data, error } = await supabase
    .from('game_events')
    .insert({
      host_id: user.id,
      name: input.name,
      venue: input.venue || null,
      scheduled_at: input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null,
      status: 'draft',
      round_count: input.roundCount,
      questions_per_round: input.questionsPerRound
    })
    .select('id, name, status, round_count, questions_per_round')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('No event returned from Supabase.');
  }

  return data;
}
