import { z } from 'zod';

export const answerSubmissionSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  round_id: z.string().uuid(),
  question_id: z.string().uuid(),
  team_id: z.string().uuid(),
  selected_option: z.enum(['a', 'b', 'c', 'd']),
  correct: z.boolean(),
  submitted_at: z.string().datetime({ offset: true })
});

export const eventMetricSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  question_id: z.string().uuid(),
  team_id: z.string().uuid(),
  reveal_timestamp: z.string().datetime({ offset: true }),
  submit_timestamp: z.string().datetime({ offset: true }).nullable(),
  latency_ms: z.number().int().nullable()
});

export type AnswerSubmission = z.infer<typeof answerSubmissionSchema>;
export type EventMetric = z.infer<typeof eventMetricSchema>;
