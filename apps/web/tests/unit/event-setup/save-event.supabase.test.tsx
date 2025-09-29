import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

vi.stubEnv('VITE_SUPABASE_URL', 'https://stub.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'stub-anon-key');

const rpcMock = vi.fn();
const eventRoundsUpsertMock = vi.fn();
const eventRoundsUpdateMock = vi.fn();
const eventRoundsUpdateEqMock = vi.fn();
const eventRoundsDeleteGtMock = vi.fn();
const eventRoundsDeleteEqMock = vi.fn();
const eventRoundsSelectOrderMock = vi.fn();
const eventRoundsSelectEqMock = vi.fn();
const eventRoundsSelectMock = vi.fn();
const questionsSelectInMock = vi.fn();

const mockSupabaseClient = {
  from: vi.fn((table: string) => {
    if (table === 'event_rounds') {
      eventRoundsSelectOrderMock.mockResolvedValue({ data: [], error: null });
      eventRoundsSelectEqMock.mockReturnValue({ order: eventRoundsSelectOrderMock });
      eventRoundsSelectMock.mockReturnValue({ eq: eventRoundsSelectEqMock });

      eventRoundsDeleteGtMock.mockResolvedValue({ data: null, error: null });
      eventRoundsDeleteEqMock.mockReturnValue({ gt: eventRoundsDeleteGtMock });
      eventRoundsUpdateEqMock.mockResolvedValue({ data: null, error: null });
      eventRoundsUpdateMock.mockReturnValue({ eq: eventRoundsUpdateEqMock });

      return {
        select: eventRoundsSelectMock,
        upsert: eventRoundsUpsertMock,
        update: eventRoundsUpdateMock,
        delete: vi.fn(() => ({ eq: eventRoundsDeleteEqMock }))
      };
    }

    if (table === 'questions') {
      return {
        select: vi.fn(() => ({
          in: questionsSelectInMock
        }))
      };
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    };
  }),
  rpc: rpcMock,
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: { join_code: 'ABC123', expires_at: new Date().toISOString() }, error: null })
  },
  channel: vi.fn(() => {
    const channelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback?: (status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED') => void) => {
        callback?.('SUBSCRIBED');
        return Promise.resolve({ data: { status: 'SUBSCRIBED' } });
      }),
      presenceState: vi.fn(() => ({} as Record<string, unknown>)),
      track: vi.fn().mockResolvedValue({}),
      unsubscribe: vi.fn().mockResolvedValue({})
    } satisfies Partial<RealtimeChannel> & Record<string, unknown>;

    return channelMock as unknown as RealtimeChannel;
  })
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

const mockEvent = {
  id: '11111111-1111-1111-1111-111111111111',
  host_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Trivia Night',
  venue: null,
  scheduled_at: null,
  status: 'draft',
  join_code: null,
  join_code_expires_at: null,
  round_count: 3,
  questions_per_round: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const listRoundsMock = vi.fn();
const updateEventMock = vi.fn();
const getEventMock = vi.fn();
const listEventMetricsMock = vi.fn();

vi.mock('../../../../../packages/shared/supabase/client/event-service', () => ({
  createEventService: vi.fn(() => ({
    getEvent: getEventMock,
    listRounds: listRoundsMock,
    listEventMetrics: listEventMetricsMock,
    updateEvent: updateEventMock,
    createTeam: vi.fn(),
    createPlayerSession: vi.fn(),
    recordAnswer: vi.fn(),
    upsertBroadcastSnapshot: vi.fn(),
    fetchBroadcastSnapshot: vi.fn()
  }))
}));

import { EventStateProvider, useEventState } from '../../../src/features/shared/EventState';

function renderUseEventState() {
  const wrapper = ({ children }: { children: ReactNode }) => <EventStateProvider>{children}</EventStateProvider>;
  return renderHook(() => useEventState(), { wrapper });
}

describe('Event setup saving flow', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    eventRoundsUpsertMock.mockReset();
    eventRoundsDeleteGtMock.mockReset();
    eventRoundsDeleteEqMock.mockReset();
    eventRoundsUpdateMock.mockReset();
    eventRoundsUpdateEqMock.mockReset();
    eventRoundsSelectEqMock.mockReset();
    eventRoundsSelectOrderMock.mockReset();
    eventRoundsSelectMock.mockReset();
    questionsSelectInMock.mockReset();
    listRoundsMock.mockReset();
    updateEventMock.mockReset();
    getEventMock.mockReset();
    listEventMetricsMock.mockReset();

    listRoundsMock.mockResolvedValue([]);
    updateEventMock.mockResolvedValue({
      ...mockEvent,
      round_count: 2,
      questions_per_round: 4
    });
    getEventMock.mockResolvedValue(mockEvent);
    listEventMetricsMock.mockResolvedValue([]);
    rpcMock.mockResolvedValue({ data: [{ question_id: 'question-1' }, { question_id: 'question-2' }, { question_id: 'question-3' }, { question_id: 'question-4' }], error: null });
    eventRoundsUpsertMock.mockResolvedValue({ data: null, error: null });
    eventRoundsSelectOrderMock.mockResolvedValue({ data: [], error: null });
    eventRoundsDeleteGtMock.mockResolvedValue({ data: null, error: null });
    questionsSelectInMock.mockResolvedValue({ data: [], error: null });
  });

  it('invokes Supabase RPC and upsert when saving event configuration', async () => {
    const { result } = renderUseEventState();

    await act(async () => {
      await result.current.saveEvent({
        name: 'Trivia Night',
        venue: '',
        scheduledAt: null,
        roundCount: 2,
        questionsPerRound: 4,
        categories: ['Science', 'History']
      });
    });

    expect(updateEventMock).toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith('select_round_questions', expect.objectContaining({
      p_event_id: mockEvent.id,
      p_limit: 4
    }));
    expect(eventRoundsUpsertMock).toHaveBeenCalled();
  });

  it('requests replacements scoped to the original question category', async () => {
    const { result } = renderUseEventState();

    const initialRound = result.current.rounds[0];
    const targetQuestion = initialRound.questions[0];
    const replacementId = '00000000-0000-4000-8000-000000000001';

    rpcMock.mockResolvedValue({ data: [{ question_id: replacementId }], error: null });
    questionsSelectInMock.mockResolvedValue({
      data: [{ id: replacementId, prompt: 'Replacement prompt', category: targetQuestion.category }],
      error: null
    });

    await act(async () => {
      await result.current.requestQuestionReplacement(initialRound.id, targetQuestion.id);
    });

    expect(rpcMock).toHaveBeenCalledWith(
      'select_round_questions',
      expect.objectContaining({
        p_categories: [targetQuestion.category],
        p_event_id: mockEvent.id,
        p_limit: 1
      })
    );
    expect(eventRoundsUpdateMock).toHaveBeenCalled();
  });
});
