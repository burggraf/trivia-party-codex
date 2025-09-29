import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createEventService } from '../../../../../packages/shared/supabase/client/event-service';
import type { GameEvent } from '../../../../../packages/shared/supabase/schemas/game-event';
import type { EventRound } from '../../../../../packages/shared/supabase/schemas/event-round';
import { validateIssueJoinCodeResponse } from '../../../../../packages/shared/supabase/contracts/issueJoinCode';
import { validateSelectRoundQuestionsResponse } from '../../../../../packages/shared/supabase/contracts/selectRoundQuestions';

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
  refreshEvent: () => Promise<void>;
  saveEvent: (input: SaveEventInput) => Promise<void>;
  issueJoinCode: () => Promise<{ joinCode: string; expiresAt: string }>;
  requestQuestionReplacement: (roundId: string, questionId: string) => Promise<void>;
  startEvent: () => void;
  nextQuestion: () => void;
  revealQuestion: () => void;
  endEvent: () => void;
  simulateDisconnect: () => void;
  resumeFromDisconnect: () => void;
}

const SCOREBOARD_TEMPLATE: ScoreEntryState[] = [
  { id: 'team-lightning', name: 'Team Lightning', score: 22, delta: 2 },
  { id: 'team-comet', name: 'Team Comet', score: 20, delta: 0 },
  { id: 'team-aurora', name: 'Team Aurora', score: 20, delta: -1 }
];

const TIE_TEAM_IDS = ['team-comet', 'team-aurora'];

interface EventStateInternal {
  details: EventDetailsState;
  rounds: RoundState[];
  scoresUpdated: boolean;
  connectionLost: boolean;
  pacingVisible: boolean;
  analyticsCleared: boolean;
  finalMessage: string | null;
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
    finalMessage: null
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
          rounds: mappedRounds
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

  const saveEvent = useCallback(
    async (input: SaveEventInput) => {
      const scheduledAtIso = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null;

      if (eventService) {
        try {
          const updated = await eventService.updateEvent(state.details.id, {
            name: input.name,
            venue: input.venue || null,
            scheduled_at: scheduledAtIso,
            round_count: input.roundCount,
            questions_per_round: input.questionsPerRound
          });

          setState((prev) => ({
            ...prev,
            details: {
              ...mergeEventDetails(updated, prev.details),
              categories: input.categories
            },
            rounds: buildRounds(input.roundCount, input.questionsPerRound, input.categories),
            scoresUpdated: false,
            analyticsCleared: false,
            pacingVisible: false,
            finalMessage: null
          }));

          void loadEventData();
          return;
        } catch (error) {
          console.error('Failed to persist event configuration to Supabase', error);
        }
      }

      setState((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          name: input.name,
          venue: input.venue,
          scheduledAt: scheduledAtIso,
          roundCount: input.roundCount,
          questionsPerRound: input.questionsPerRound,
          categories: input.categories,
          status: 'scheduled',
          joinCode: prev.details.joinCode ?? generateJoinCode(),
          joinCodeExpiresAt: prev.details.joinCodeExpiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        },
        rounds: buildRounds(input.roundCount, input.questionsPerRound, input.categories),
        scoresUpdated: false,
        analyticsCleared: false,
        pacingVisible: false,
        finalMessage: null
      }));
    },
    [eventService, loadEventData, state.details.id]
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
                    prompt: `Replacement question ${new Date().getSeconds()}`,
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
          p_categories: targetRound.categories,
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
                    newQuestionDetails?.category ?? targetRound.categories[0] ?? 'General',
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

  const startEvent = useCallback(() => {
    setState((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        status: 'live',
        joinCode: prev.details.joinCode ?? generateJoinCode()
      },
      scoresUpdated: false,
      connectionLost: false,
      pacingVisible: false,
      analyticsCleared: false,
      finalMessage: null
    }));
  }, []);

  const nextQuestion = useCallback(() => {
    setState((prev) => ({ ...prev, scoresUpdated: true }));
  }, []);

  const revealQuestion = useCallback(() => {
    setState((prev) => ({ ...prev, pacingVisible: true, analyticsCleared: false }));
  }, []);

  const endEvent = useCallback(() => {
    setState((prev) => ({
      ...prev,
      details: { ...prev.details, status: 'completed' },
      finalMessage: 'Final standings',
      analyticsCleared: true,
      pacingVisible: false,
      connectionLost: false
    }));
  }, []);

  const simulateDisconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      connectionLost: true,
      details: { ...prev.details, status: 'paused' }
    }));
  }, []);

  const resumeFromDisconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      connectionLost: false,
      details: { ...prev.details, status: 'live' }
    }));
  }, []);

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
      refreshEvent,
      saveEvent,
      issueJoinCode,
      requestQuestionReplacement,
      startEvent,
      nextQuestion,
      revealQuestion,
      endEvent,
      simulateDisconnect,
      resumeFromDisconnect
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
      refreshEvent,
      saveEvent,
      issueJoinCode,
      requestQuestionReplacement,
      startEvent,
      nextQuestion,
      revealQuestion,
      endEvent,
      simulateDisconnect,
      resumeFromDisconnect
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
