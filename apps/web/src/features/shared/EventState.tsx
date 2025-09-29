import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { createEventService } from '../../../../../packages/shared/supabase/client/event-service';
import type { GameEvent } from '../../../../../packages/shared/supabase/schemas/game-event';
import type { EventRound } from '../../../../../packages/shared/supabase/schemas/event-round';
import { validateIssueJoinCodeResponse } from '../../../../../packages/shared/supabase/contracts/issueJoinCode';
import { validateSelectRoundQuestionsResponse } from '../../../../../packages/shared/supabase/contracts/selectRoundQuestions';
import {
  summarisePacingMetrics,
  type PacingSummary
} from '../../../../../packages/shared/analytics/pacing';

const DEFAULT_CATEGORIES = ['Science', 'History', 'Sports', 'Pop Culture'];
const FALLBACK_EVENT_ID = '11111111-1111-1111-1111-111111111111';

let cachedSupabase: SupabaseClient | null | undefined;

function getSupabaseClient(): SupabaseClient | null {
  if (cachedSupabase !== undefined) {
    return cachedSupabase;
  }

  const url = (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ?? null;
  const anonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) ?? null;

  if (!url || !anonKey) {
    cachedSupabase = null;
    return null;
  }

  cachedSupabase = createClient(url, anonKey);
  return cachedSupabase;
}

function resolveEventId(explicitId?: string): string {
  if (explicitId) {
    return explicitId;
  }

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('eventId');
    if (fromQuery) {
      return fromQuery;
    }
  }

  const envProvided = import.meta.env?.VITE_SUPABASE_EVENT_ID as string | undefined;
  return envProvided ?? FALLBACK_EVENT_ID;
}

type EventStatus = 'draft' | 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled';

export interface QuestionState {
  id: string;
  prompt: string;
  category: string;
  replacing: boolean;
}

export interface RoundState {
  id: string;
  index: number;
  title: string;
  categories: string[];
  questions: QuestionState[];
}

export interface ScoreEntryState {
  id: string;
  name: string;
  score: number;
  delta: number;
}

export interface EventDetailsState {
  id: string;
  name: string;
  venue: string;
  scheduledAt: string | null;
  roundCount: number;
  questionsPerRound: number;
  categories: string[];
  joinCode: string | null;
  joinCodeExpiresAt: string | null;
  status: EventStatus;
}

export interface SaveEventInput {
  name: string;
  venue: string;
  scheduledAt: string | null;
  roundCount: number;
  questionsPerRound: number;
  categories: string[];
}

export interface EventStateContextValue {
  supabase: SupabaseClient | null;
  details: EventDetailsState;
  rounds: RoundState[];
  scoreboard: ScoreEntryState[];
  tieTeamIds: string[];
  scoresUpdated: boolean;
  connectionLost: boolean;
  pacingVisible: boolean;
  analyticsCleared: boolean;
  finalMessage: string | null;
  pacingSummary: PacingSummary;
  realtimeError: string | null;
  presenceCount: number;
  refreshEvent: () => Promise<void>;
  saveEvent: (input: SaveEventInput) => Promise<void>;
  issueJoinCode: () => Promise<{ joinCode: string; expiresAt: string }>;
  requestQuestionReplacement: (roundId: string, questionId: string) => Promise<void>;
  startEvent: () => Promise<void>;
  pauseEvent: () => Promise<void>;
  resumeEvent: () => Promise<void>;
  nextQuestion: () => void;
  revealQuestion: () => void;
  endEvent: () => Promise<void>;
  simulateDisconnect: () => void;
  resumeFromDisconnect: () => void;
  refreshPacingMetrics: () => Promise<void>;
  clearRealtimeError: () => void;
}

const SCOREBOARD_TEMPLATE: ScoreEntryState[] = [
  { id: 'team-lightning', name: 'Team Lightning', score: 22, delta: 2 },
  { id: 'team-comet', name: 'Team Comet', score: 20, delta: 0 },
  { id: 'team-aurora', name: 'Team Aurora', score: 20, delta: -1 }
];

const TIE_TEAM_IDS = ['team-comet', 'team-aurora'];

const SAMPLE_PACING_SUMMARY: PacingSummary = {
  count: 12,
  averageMs: 640,
  maxMs: 1180,
  minMs: 320
};

const SAMPLE_PRESENCE_COUNT = 3;

interface EventStateInternal {
  details: EventDetailsState;
  rounds: RoundState[];
  scoresUpdated: boolean;
  connectionLost: boolean;
  pacingVisible: boolean;
  analyticsCleared: boolean;
  finalMessage: string | null;
  pacingSummary: PacingSummary;
  presenceCount: number;
  realtimeError: string | null;
}

const EventStateContext = createContext<EventStateContextValue | undefined>(undefined);

function makeId(prefix: string, index: number) {
  return `${prefix}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateJoinCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function buildRounds(roundCount: number, questionsPerRound: number, categories: string[]): RoundState[] {
  return Array.from({ length: roundCount }, (_value, roundIndex) => {
    const roundCategories = categories.length ? categories : DEFAULT_CATEGORIES.slice(0, 2);
    const questions = Array.from({ length: questionsPerRound }, (_unused, questionIndex) => {
      const category = roundCategories[questionIndex % roundCategories.length];
      const prompt = questionIndex === 0 ? 'Original question text for review' : `Sample question ${questionIndex + 1}`;
      return {
        id: makeId(`question-${roundIndex}`, questionIndex),
        prompt,
        category,
        replacing: false
      } satisfies QuestionState;
    });

    return {
      id: makeId('round', roundIndex),
      index: roundIndex,
      title: `Round ${roundIndex + 1}`,
      categories: roundCategories,
      questions
    } satisfies RoundState;
  });
}

function normaliseCategories(categories: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  categories.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    result.push(trimmed);
  });

  return result.length ? result : DEFAULT_CATEGORIES.slice(0, 1);
}

function shallowEqualStrings(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a || !b) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

async function fetchRoundQuestionIds(
  supabase: SupabaseClient,
  {
    eventId,
    roundIndex,
    categories,
    limit
  }: { eventId: string; roundIndex: number; categories: string[]; limit: number }
): Promise<string[]> {
  const { data, error } = await supabase.rpc('select_round_questions', {
    p_event_id: eventId,
    p_round_index: roundIndex,
    p_categories: categories,
    p_limit: limit
  });

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    const ids = data
      .map((row) => {
        const candidate = (row as { question_id?: string }).question_id;
        return typeof candidate === 'string' ? candidate : null;
      })
      .filter((value): value is string => Boolean(value));
    if (ids.length >= limit) {
      return ids.slice(0, limit);
    }
  }

  try {
    const parsed = validateSelectRoundQuestionsResponse(data);
    if (parsed.question_ids.length >= limit) {
      return parsed.question_ids.slice(0, limit);
    }
  } catch (parseError) {
    console.error('Unexpected select_round_questions response shape', parseError);
  }

  throw new Error('select_round_questions did not return enough question IDs');
}

async function syncEventRounds(
  supabase: SupabaseClient,
  {
    eventId,
    roundCount,
    questionsPerRound,
    categories
  }: { eventId: string; roundCount: number; questionsPerRound: number; categories: string[] }
) {
  const { data: existingRounds, error: fetchError } = await supabase
    .from('event_rounds')
    .select('id, round_index, categories, question_ids, reveal_state')
    .eq('event_id', eventId)
    .order('round_index');

  if (fetchError) {
    throw fetchError;
  }

  const roundsByIndex = new Map<number, (typeof existingRounds)[number]>();
  (existingRounds ?? []).forEach((round) => {
    roundsByIndex.set(round.round_index, round);
  });

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const existing = roundsByIndex.get(roundIndex);
    const needsNewQuestions =
      !existing ||
      (existing.question_ids?.length ?? 0) !== questionsPerRound ||
      !shallowEqualStrings(existing.categories, categories);

    const questionIds = needsNewQuestions
      ? await fetchRoundQuestionIds(supabase, {
          eventId,
          roundIndex,
          categories,
          limit: questionsPerRound
        })
      : existing!.question_ids.slice(0, questionsPerRound);

    const { error: upsertError } = await supabase
      .from('event_rounds')
      .upsert(
        {
          event_id: eventId,
          round_index: roundIndex,
          categories,
          question_ids: questionIds,
          reveal_state: existing?.reveal_state ?? 'pending'
        },
        { onConflict: 'event_id,round_index' }
      );

    if (upsertError) {
      throw upsertError;
    }
  }

  const deleteQuery = supabase.from('event_rounds').delete().eq('event_id', eventId);
  const maxIndex = roundCount - 1;
  const deleteExecutor = maxIndex >= 0 ? deleteQuery.gt('round_index', maxIndex) : deleteQuery;

  const { error: cleanupError } = await deleteExecutor;
  if (cleanupError) {
    throw cleanupError;
  }
}

function createInitialState(eventId: string): EventStateInternal {
  const categories = DEFAULT_CATEGORIES.slice(0, 2);
  return {
    details: {
      id: eventId,
      name: 'Venue Trivia Night',
      venue: '',
      scheduledAt: null,
      roundCount: 3,
      questionsPerRound: 5,
      categories,
      joinCode: null,
      joinCodeExpiresAt: null,
      status: 'draft'
    },
    rounds: buildRounds(3, 5, categories),
    scoresUpdated: false,
    connectionLost: false,
    pacingVisible: false,
    analyticsCleared: false,
    finalMessage: null,
    pacingSummary: SAMPLE_PACING_SUMMARY,
    presenceCount: SAMPLE_PRESENCE_COUNT,
    realtimeError: null
  } satisfies EventStateInternal;
}

interface QuestionRow {
  id: string;
  prompt: string | null;
  category: string | null;
}

async function fetchQuestionsByIds(client: SupabaseClient, ids: string[]): Promise<Map<string, QuestionRow>> {
  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await client
    .from('questions')
    .select('id, prompt, category')
    .in('id', ids);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

function mapRound(round: EventRound, questionMap: Map<string, QuestionRow>): RoundState {
  const questions = round.question_ids.map((questionId, index) => {
    const fallbackCategory = round.categories[index % round.categories.length] ?? 'General';
    const details = questionMap.get(questionId);
    return {
      id: questionId,
      prompt: details?.prompt ?? `Question ${index + 1}`,
      category: details?.category ?? fallbackCategory,
      replacing: false
    } satisfies QuestionState;
  });

  return {
    id: round.id,
    index: round.round_index,
    title: `Round ${round.round_index + 1}`,
    categories: round.categories,
    questions
  } satisfies RoundState;
}

function mergeEventDetails(event: GameEvent, prev: EventDetailsState): EventDetailsState {
  return {
    ...prev,
    id: event.id,
    name: event.name,
    venue: event.venue ?? '',
    scheduledAt: event.scheduled_at,
    roundCount: event.round_count,
    questionsPerRound: event.questions_per_round,
    joinCode: event.join_code,
    joinCodeExpiresAt: event.join_code_expires_at,
    status: event.status
  } satisfies EventDetailsState;
}

function collectCategories(rounds: RoundState[]): string[] {
  const values = new Set<string>();
  rounds.forEach((round) => {
    round.categories.forEach((category) => values.add(category));
  });
  return Array.from(values);
}

export interface EventStateProviderProps {
  eventId?: string;
  children: ReactNode;
}

export function EventStateProvider({ children, eventId }: EventStateProviderProps) {
  const resolvedEventId = useMemo(() => resolveEventId(eventId), [eventId]);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const eventService = useMemo(() => (supabase ? createEventService(supabase) : null), [supabase]);
  const [state, setState] = useState<EventStateInternal>(() => createInitialState(resolvedEventId));
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceKeyRef = useRef<string>(`client-${Math.random().toString(36).slice(2, 10)}`);

  const loadEventData = useCallback(async () => {
    if (!eventService || !supabase) {
      return;
    }

    try {
      const [event, rounds] = await Promise.all([
        eventService.getEvent(resolvedEventId),
        eventService.listRounds(resolvedEventId)
      ]);

      const questionIds = Array.from(new Set(rounds.flatMap((round) => round.question_ids)));
      const questionMap = await fetchQuestionsByIds(supabase, questionIds);
      const mappedRounds = rounds.map((round) => mapRound(round, questionMap));
      const categories = collectCategories(mappedRounds);

      let summary: PacingSummary = SAMPLE_PACING_SUMMARY;
      try {
        const metrics = await eventService.listEventMetrics(resolvedEventId);
        summary = summarisePacingMetrics(metrics);
      } catch (metricsError) {
        console.error('Failed to load pacing metrics from Supabase', metricsError);
      }

      setState((prev) => {
        const nextDetails = mergeEventDetails(event, prev.details);
        return {
          ...prev,
          details: {
            ...nextDetails,
            categories: categories.length
              ? categories
              : prev.details.categories.length
                ? prev.details.categories
                : DEFAULT_CATEGORIES.slice(0, 2)
          },
          rounds: mappedRounds,
          pacingSummary: summary,
          analyticsCleared: summary.count === 0 ? prev.analyticsCleared : false
        } satisfies EventStateInternal;
      });
    } catch (error) {
      console.error('Failed to load event data from Supabase', error);
    }
  }, [eventService, supabase, resolvedEventId]);

  useEffect(() => {
    if (!eventService || !supabase || hasAttemptedInitialLoad) {
      return;
    }
    setHasAttemptedInitialLoad(true);
    void loadEventData();
  }, [eventService, supabase, loadEventData, hasAttemptedInitialLoad]);

  const refreshEvent = useCallback(async () => {
    await loadEventData();
  }, [loadEventData]);

  const refreshPacingMetrics = useCallback(async () => {
    if (!eventService) {
      setState((prev) => ({
        ...prev,
        pacingSummary: SAMPLE_PACING_SUMMARY
      }));
      return;
    }

    try {
      const metrics = await eventService.listEventMetrics(state.details.id);
      const summary = summarisePacingMetrics(metrics);
      setState((prev) => ({
        ...prev,
        pacingSummary: summary,
        analyticsCleared: summary.count === 0 ? prev.analyticsCleared : false
      }));
    } catch (error) {
      console.error('Failed to refresh pacing metrics', error);
    }
  }, [eventService, state.details.id]);

  const clearRealtimeError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      realtimeError: null
    }));
  }, []);

  useEffect(() => {
    if (!supabase) {
      setState((prev) => ({
        ...prev,
        presenceCount: SAMPLE_PRESENCE_COUNT
      }));
      return;
    }

    const channel = supabase.channel(`presence:events:${resolvedEventId}`, {
      config: { presence: { key: presenceKeyRef.current } }
    });

    presenceChannelRef.current = channel;

    const syncPresence = () => {
      try {
        const presenceState = channel.presenceState();
        const total = Object.values(presenceState).reduce((count, entry) => {
          if (Array.isArray(entry)) {
            return count + entry.length;
          }
          if (typeof entry === 'object' && entry !== null) {
            return count + Object.values(entry as Record<string, unknown>[]).length;
          }
          return count;
        }, 0);

        setState((prev) => ({
          ...prev,
          presenceCount: Math.max(total, 1)
        }));
      } catch (error) {
        console.error('Failed to parse presence state', error);
      }
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence);

    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          syncPresence();
        } else if (status === 'CHANNEL_ERROR') {
          setState((prev) => ({
            ...prev,
            realtimeError: 'Realtime presence channel error'
          }));
        }
      })
      .catch((error) => {
        console.error('Failed to subscribe to presence channel', error);
        setState((prev) => ({
          ...prev,
          realtimeError: 'Unable to join realtime presence channel'
        }));
      });

    void channel.track({
      eventId: resolvedEventId,
      ts: new Date().toISOString()
    });

    return () => {
      channel.unsubscribe().catch(() => undefined);
      presenceChannelRef.current = null;
      setState((prev) => ({
        ...prev,
        presenceCount: SAMPLE_PRESENCE_COUNT
      }));
    };
  }, [supabase, resolvedEventId]);

  const saveEvent = useCallback(
    async (input: SaveEventInput) => {
      const scheduledAtIso = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null;
      const categories = normaliseCategories(input.categories);

      if (!eventService) {
        setState((prev) => ({
          ...prev,
          details: {
            ...prev.details,
            name: input.name,
            venue: input.venue,
            scheduledAt: scheduledAtIso,
            roundCount: input.roundCount,
            questionsPerRound: input.questionsPerRound,
            categories,
            status: 'scheduled',
            joinCode: prev.details.joinCode ?? generateJoinCode(),
            joinCodeExpiresAt:
              prev.details.joinCodeExpiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString()
          },
          rounds: buildRounds(input.roundCount, input.questionsPerRound, categories),
          scoresUpdated: false,
          analyticsCleared: false,
          pacingVisible: false,
          finalMessage: null,
          pacingSummary: SAMPLE_PACING_SUMMARY
        }));
        return;
      }

      try {
        const updated = await eventService.updateEvent(state.details.id, {
          name: input.name,
          venue: input.venue || null,
          scheduled_at: scheduledAtIso,
          round_count: input.roundCount,
          questions_per_round: input.questionsPerRound
        });

        if (supabase) {
          await syncEventRounds(supabase, {
            eventId: state.details.id,
            roundCount: input.roundCount,
            questionsPerRound: input.questionsPerRound,
            categories
          });
        }

        setState((prev) => ({
          ...prev,
          details: {
            ...mergeEventDetails(updated, prev.details),
            categories
          },
          rounds: buildRounds(input.roundCount, input.questionsPerRound, categories),
          scoresUpdated: false,
          analyticsCleared: false,
          pacingVisible: false,
          finalMessage: null
        }));

        void loadEventData();
      } catch (error) {
        console.error('Failed to persist event configuration', error);
        throw error instanceof Error ? error : new Error('Failed to save event configuration');
      }
    },
    [eventService, loadEventData, state.details.id, supabase]
  );

  const issueJoinCode = useCallback(async () => {
    if (supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('issue_join_code', {
          body: { event_id: state.details.id }
        });

        if (error) {
          throw error;
        }

        const payload = validateIssueJoinCodeResponse(data);
        setState((prev) => ({
          ...prev,
          details: {
            ...prev.details,
            joinCode: payload.join_code,
            joinCodeExpiresAt: payload.expires_at
          }
        }));

        return { joinCode: payload.join_code, expiresAt: payload.expires_at };
      } catch (error) {
        console.error('Failed to issue join code via edge function', error);
        throw error instanceof Error ? error : new Error('Failed to issue join code');
      }
    }

    const joinCode = generateJoinCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    setState((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        joinCode,
        joinCodeExpiresAt: expiresAt
      }
    }));
    return { joinCode, expiresAt };
  }, [supabase, state.details.id]);

  const requestQuestionReplacement = useCallback(
    async (roundId: string, questionId: string) => {
      const targetRound = state.rounds.find((round) => round.id === roundId);
      if (!targetRound) {
        return;
      }

      const targetQuestion = targetRound.questions.find((question) => question.id === questionId);
      if (!targetQuestion) {
        return;
      }

      setState((prev) => ({
        ...prev,
        rounds: prev.rounds.map((round) => {
          if (round.id !== roundId) return round;
          return {
            ...round,
            questions: round.questions.map((question) =>
              question.id === questionId ? { ...question, replacing: true } : question
            )
          };
        })
      }));

      if (!supabase) {
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            rounds: prev.rounds.map((round) => {
              if (round.id !== roundId) return round;
              return {
                ...round,
                questions: round.questions.map((question) => {
                  if (question.id !== questionId) return question;
                  return {
                    ...question,
                    id: makeId('question', Date.now()),
                    prompt: `Replacement question (${targetQuestion.category}) ${new Date().getSeconds()}`,
                    category: targetQuestion.category,
                    replacing: false
                  } satisfies QuestionState;
                })
              } satisfies RoundState;
            })
          }));
        }, 600);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('select_round_questions', {
          p_event_id: state.details.id,
          p_round_index: targetRound.index,
          p_categories: [targetQuestion.category],
          p_limit: 1
        });

        if (error) {
          throw error;
        }

        let questionIds: string[] = [];

        if (Array.isArray(data)) {
          questionIds = data
            .map((row) => {
              const candidate = (row as { question_id?: string }).question_id;
              return typeof candidate === 'string' ? candidate : null;
            })
            .filter((value): value is string => Boolean(value));
        } else {
          try {
            const parsed = validateSelectRoundQuestionsResponse(data);
            questionIds = parsed.question_ids;
          } catch (parseError) {
            console.error('Unexpected shape from select_round_questions RPC', parseError);
          }
        }

        if (!questionIds.length) {
          throw new Error('No replacement question id returned');
        }

        const newQuestionId = questionIds.find((id) => id !== questionId) ?? questionIds[0];

        const updatedQuestionIds = targetRound.questions.map((question) =>
          question.id === questionId ? newQuestionId : question.id
        );

        const { error: updateError } = await supabase
          .from('event_rounds')
          .update({ question_ids: updatedQuestionIds })
          .eq('id', roundId);

        if (updateError) {
          throw updateError;
        }

        const questionMap = await fetchQuestionsByIds(supabase, [newQuestionId]);
        const newQuestionDetails = questionMap.get(newQuestionId);

        setState((prev) => ({
          ...prev,
          rounds: prev.rounds.map((round) => {
            if (round.id !== roundId) return round;
            return {
              ...round,
              questions: round.questions.map((question) => {
                if (question.id !== questionId) return question;
                return {
                  id: newQuestionId,
                  prompt:
                    newQuestionDetails?.prompt ?? `Replacement question ${round.index + 1}`,
                  category:
                    newQuestionDetails?.category ?? targetQuestion.category,
                  replacing: false
                } satisfies QuestionState;
              })
            } satisfies RoundState;
          })
        }));
      } catch (error) {
        console.error('Failed to replace question via Supabase', error);
        setState((prev) => ({
          ...prev,
          rounds: prev.rounds.map((round) => {
            if (round.id !== roundId) return round;
            return {
              ...round,
              questions: round.questions.map((question) =>
                question.id === questionId ? { ...question, replacing: false } : question
              )
            } satisfies RoundState;
          })
        }));
      }
    },
    [state.rounds, state.details.id, supabase]
  );

  const startEvent = useCallback(async () => {
    const fallbackJoinCode = state.details.joinCode ?? generateJoinCode();
    const fallbackExpiry = state.details.joinCodeExpiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();

    let updatedEvent: GameEvent | null = null;

    if (eventService) {
      try {
        updatedEvent = await eventService.updateEventStatus(state.details.id, 'live');
      } catch (error) {
        console.error('Failed to update event status to live in Supabase', error);
      }
    }

    setState((prev) => {
      const baseDetails = updatedEvent ? mergeEventDetails(updatedEvent, prev.details) : prev.details;
      return {
        ...prev,
        details: {
          ...baseDetails,
          status: updatedEvent?.status ?? 'live',
          joinCode: updatedEvent?.join_code ?? baseDetails.joinCode ?? fallbackJoinCode,
          joinCodeExpiresAt:
            updatedEvent?.join_code_expires_at ?? baseDetails.joinCodeExpiresAt ?? fallbackExpiry
        },
        scoresUpdated: false,
        connectionLost: false,
        pacingVisible: false,
        analyticsCleared: false,
        finalMessage: null
      } satisfies EventStateInternal;
    });
  }, [eventService, state.details.id, state.details.joinCode, state.details.joinCodeExpiresAt]);

  const pauseEvent = useCallback(async () => {
    let updatedEvent: GameEvent | null = null;

    if (eventService) {
      try {
        updatedEvent = await eventService.updateEventStatus(state.details.id, 'paused');
      } catch (error) {
        console.error('Failed to pause event in Supabase', error);
      }
    }

    setState((prev) => {
      const baseDetails = updatedEvent ? mergeEventDetails(updatedEvent, prev.details) : prev.details;
      return {
        ...prev,
        details: {
          ...baseDetails,
          status: updatedEvent?.status ?? 'paused'
        },
        connectionLost: prev.connectionLost,
        pacingVisible: prev.pacingVisible
      } satisfies EventStateInternal;
    });
  }, [eventService, state.details.id]);

  const resumeEvent = useCallback(async () => {
    let updatedEvent: GameEvent | null = null;

    if (eventService) {
      try {
        updatedEvent = await eventService.updateEventStatus(state.details.id, 'live');
      } catch (error) {
        console.error('Failed to resume event in Supabase', error);
      }
    }

    setState((prev) => {
      const baseDetails = updatedEvent ? mergeEventDetails(updatedEvent, prev.details) : prev.details;
      return {
        ...prev,
        details: {
          ...baseDetails,
          status: updatedEvent?.status ?? 'live'
        },
        connectionLost: false
      } satisfies EventStateInternal;
    });
  }, [eventService, state.details.id]);

  const nextQuestion = useCallback(() => {
    setState((prev) => ({ ...prev, scoresUpdated: true }));
  }, []);

  const revealQuestion = useCallback(() => {
    setState((prev) => ({ ...prev, pacingVisible: true, analyticsCleared: false }));
  }, []);

  const endEvent = useCallback(async () => {
    let updatedEvent: GameEvent | null = null;

    if (eventService) {
      try {
        updatedEvent = await eventService.updateEventStatus(state.details.id, 'completed');
      } catch (error) {
        console.error('Failed to complete event in Supabase', error);
      }
    }

    setState((prev) => {
      const baseDetails = updatedEvent ? mergeEventDetails(updatedEvent, prev.details) : prev.details;
      return {
        ...prev,
        details: {
          ...baseDetails,
          status: updatedEvent?.status ?? 'completed'
        },
        finalMessage: 'Final standings',
        analyticsCleared: true,
        pacingVisible: false,
        connectionLost: false
      } satisfies EventStateInternal;
    });
  }, [eventService, state.details.id]);

  const simulateDisconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      connectionLost: true,
      details: { ...prev.details, status: 'paused' }
    }));
  }, []);

  const resumeFromDisconnect = useCallback(() => {
    void resumeEvent();
  }, [resumeEvent]);

  const value = useMemo<EventStateContextValue>(
    () => ({
      supabase,
      details: state.details,
      rounds: state.rounds,
      scoreboard: SCOREBOARD_TEMPLATE,
      tieTeamIds: TIE_TEAM_IDS,
      scoresUpdated: state.scoresUpdated,
      connectionLost: state.connectionLost,
      pacingVisible: state.pacingVisible,
      analyticsCleared: state.analyticsCleared,
      finalMessage: state.finalMessage,
      pacingSummary: state.pacingSummary,
      presenceCount: state.presenceCount,
      realtimeError: state.realtimeError,
      refreshEvent,
      saveEvent,
      issueJoinCode,
      requestQuestionReplacement,
      startEvent,
      pauseEvent,
      resumeEvent,
      nextQuestion,
      revealQuestion,
      endEvent,
      simulateDisconnect,
      resumeFromDisconnect,
      refreshPacingMetrics,
      clearRealtimeError
    }),
    [
      supabase,
      state.details,
      state.rounds,
      state.scoresUpdated,
      state.connectionLost,
      state.pacingVisible,
      state.analyticsCleared,
      state.finalMessage,
      state.pacingSummary,
      state.presenceCount,
      state.realtimeError,
      refreshEvent,
      saveEvent,
      issueJoinCode,
      requestQuestionReplacement,
      startEvent,
      pauseEvent,
      resumeEvent,
      nextQuestion,
      revealQuestion,
      endEvent,
      simulateDisconnect,
      resumeFromDisconnect,
      refreshPacingMetrics,
      clearRealtimeError
    ]
  );

  return <EventStateContext.Provider value={value}>{children}</EventStateContext.Provider>;
}

export function useEventState() {
  const context = useContext(EventStateContext);
  if (!context) {
    throw new Error('useEventState must be used within EventStateProvider');
  }
  return context;
}
