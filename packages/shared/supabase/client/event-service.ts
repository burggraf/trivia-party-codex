import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { gameEventSchema, type GameEvent } from '../schemas/game-event';
import { eventRoundSchema, type EventRound } from '../schemas/event-round';
import {
  answerSubmissionSchema,
  eventMetricSchema,
  type AnswerSubmission,
  type EventMetric
} from '../schemas/answer-submission';
import { playerSessionSchema, teamSchema, type PlayerSession, type Team } from '../schemas/team';

const broadcastSnapshotSchema = z.object({
  event_id: z.string().uuid(),
  payload: z.record(z.any()),
  updated_at: z.string().datetime({ offset: true })
});

export interface CreateTeamInput {
  eventId: string;
  name: string;
  joinSecret: string;
}

export interface CreatePlayerSessionInput {
  teamId: string;
  sessionToken: string;
  userId?: string;
}

export interface SubmitAnswerInput {
  eventId: string;
  roundId: string;
  questionId: string;
  teamId: string;
  selectedOption: 'a' | 'b' | 'c' | 'd';
  correct: boolean;
}

export type EventServiceErrorContext = {
  context: string;
  error: PostgrestError;
};

export class EventServiceError extends Error {
  public readonly cause: EventServiceErrorContext;

  constructor(message: string, cause: EventServiceErrorContext) {
    super(message);
    this.name = 'EventServiceError';
    this.cause = cause;
  }
}

const ensure = <T>(result: { data: T | null; error: PostgrestError | null }, context: string): T => {
  if (result.error || result.data === null) {
    throw new EventServiceError('Supabase request failed', {
      context,
      error: result.error ?? ({ message: 'Empty result', code: 'PGRST_EMPTY_RESULT' } as PostgrestError)
    });
  }
  return result.data;
};

export function createEventService(supabase: SupabaseClient) {
  const getEvent = async (eventId: string): Promise<GameEvent> => {
    const result = await supabase.from('game_events').select('*').eq('id', eventId).single();
    return gameEventSchema.parse(ensure(result, 'getEvent'));
  };

  const listRounds = async (eventId: string): Promise<EventRound[]> => {
    const result = await supabase.from('event_rounds').select('*').eq('event_id', eventId).order('round_index');
    const rows = ensure(result, 'listRounds');
    return z.array(eventRoundSchema).parse(rows);
  };

  const updateEvent = async (
    eventId: string,
    payload: Partial<
      Pick<GameEvent, 'name' | 'venue' | 'scheduled_at' | 'round_count' | 'questions_per_round' | 'status'>
    >
  ): Promise<GameEvent> => {
    const result = await supabase.from('game_events').update(payload).eq('id', eventId).select('*').single();
    return gameEventSchema.parse(ensure(result, 'updateEvent'));
  };

  const updateEventStatus = async (eventId: string, status: GameEvent['status']): Promise<GameEvent> => {
    const result = await supabase
      .from('game_events')
      .update({ status })
      .eq('id', eventId)
      .select('*')
      .single();

    return gameEventSchema.parse(ensure(result, 'updateEventStatus'));
  };

  const createTeam = async ({ eventId, name, joinSecret }: CreateTeamInput): Promise<Team> => {
    const result = await supabase
      .from('teams')
      .insert({ event_id: eventId, name, join_secret: joinSecret })
      .select('*')
      .single();
    return teamSchema.parse(ensure(result, 'createTeam'));
  };

  const createPlayerSession = async ({ teamId, sessionToken, userId }: CreatePlayerSessionInput): Promise<PlayerSession> => {
    const result = await supabase
      .from('player_sessions')
      .insert({ team_id: teamId, session_token: sessionToken, user_id: userId ?? null })
      .select('*')
      .single();
    return playerSessionSchema.parse(ensure(result, 'createPlayerSession'));
  };

  const recordAnswer = async (input: SubmitAnswerInput): Promise<AnswerSubmission> => {
    const result = await supabase
      .from('answer_submissions')
      .insert({
        event_id: input.eventId,
        round_id: input.roundId,
        question_id: input.questionId,
        team_id: input.teamId,
        selected_option: input.selectedOption,
        correct: input.correct
      })
      .select('*')
      .single();

    return answerSubmissionSchema.parse(ensure(result, 'recordAnswer'));
  };

  const upsertBroadcastSnapshot = async (eventId: string, payload: Record<string, unknown>) => {
    const result = await supabase
      .from('broadcast_snapshots')
      .upsert({ event_id: eventId, payload }, { onConflict: 'event_id' })
      .select('*')
      .single();

    return broadcastSnapshotSchema.parse(ensure(result, 'upsertBroadcastSnapshot'));
  };

  const fetchBroadcastSnapshot = async (eventId: string) => {
    const result = await supabase
      .from('broadcast_snapshots')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (result.error) {
      throw new EventServiceError('Failed to fetch broadcast snapshot', {
        context: 'fetchBroadcastSnapshot',
        error: result.error
      });
    }

    if (!result.data) {
      return null;
    }

    return broadcastSnapshotSchema.parse(result.data);
  };

  const listEventMetrics = async (eventId: string): Promise<EventMetric[]> => {
    const result = await supabase.from('event_metrics').select('*').eq('event_id', eventId);
    const rows = ensure(result, 'listEventMetrics');
    return z.array(eventMetricSchema).parse(rows);
  };

  return {
    getEvent,
    listRounds,
    updateEvent,
    createTeam,
    createPlayerSession,
    recordAnswer,
    upsertBroadcastSnapshot,
    fetchBroadcastSnapshot,
    listEventMetrics,
    updateEventStatus
  };
}
