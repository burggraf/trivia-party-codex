import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { eventMetricSchema, type EventMetric } from '../supabase/schemas/answer-submission';

export interface RecordPacingSampleInput {
  eventId: string;
  questionId: string;
  teamId: string;
  revealTimestamp: string;
  submitTimestamp: string | null;
}

const insertMetricSchema = z.object({
  event_id: z.string().uuid(),
  question_id: z.string().uuid(),
  team_id: z.string().uuid(),
  reveal_timestamp: z.string().datetime({ offset: true }),
  submit_timestamp: z.string().datetime({ offset: true }).nullable()
});

export const pacingSummarySchema = z.object({
  count: z.number().int(),
  averageMs: z.number(),
  maxMs: z.number(),
  minMs: z.number()
});

export type PacingSummary = z.infer<typeof pacingSummarySchema>;

export async function recordPacingSample(
  client: SupabaseClient,
  input: RecordPacingSampleInput
): Promise<EventMetric> {
  const payload = insertMetricSchema.parse({
    event_id: input.eventId,
    question_id: input.questionId,
    team_id: input.teamId,
    reveal_timestamp: input.revealTimestamp,
    submit_timestamp: input.submitTimestamp
  });

  const result = await client
    .from('event_metrics')
    .insert(payload)
    .select('*')
    .single();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? 'Failed to record pacing metric');
  }

  return eventMetricSchema.parse(result.data);
}

export async function purgeEventAnalytics(client: SupabaseClient, eventId: string): Promise<void> {
  const { error } = await client.rpc('purge_event_metrics', { p_event_id: eventId });
  if (error) {
    throw new Error(error.message);
  }
}

export function summarisePacingMetrics(metrics: EventMetric[]): PacingSummary {
  if (!metrics.length) {
    return { count: 0, averageMs: 0, maxMs: 0, minMs: 0 };
  }

  const latencies = metrics
    .map((metric) => metric.latency_ms)
    .filter((value): value is number => typeof value === 'number');

  if (!latencies.length) {
    return { count: metrics.length, averageMs: 0, maxMs: 0, minMs: 0 };
  }

  const total = latencies.reduce((sum, value) => sum + value, 0);

  return pacingSummarySchema.parse({
    count: metrics.length,
    averageMs: total / latencies.length,
    maxMs: Math.max(...latencies),
    minMs: Math.min(...latencies)
  });
}
