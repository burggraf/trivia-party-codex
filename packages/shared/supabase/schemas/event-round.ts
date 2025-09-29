import { z } from 'zod';

export const eventRoundRevealStateSchema = z.enum(['pending', 'in_progress', 'completed']);

export const eventRoundSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  round_index: z.number().int().min(0),
  categories: z.array(z.string().min(1)),
  question_ids: z.array(z.string().uuid()).min(1),
  reveal_state: eventRoundRevealStateSchema,
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true })
});

export type EventRound = z.infer<typeof eventRoundSchema>;

export const realtimeQuestionPayloadSchema = z.object({
  questionId: z.string().uuid(),
  category: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).min(4).max(4),
  revealsAt: z.string().datetime({ offset: true })
});

export const realtimeScoreEntrySchema = z.object({
  teamId: z.string().uuid(),
  teamName: z.string(),
  score: z.number().int().min(0),
  delta: z.number().int()
});

export const realtimeScorePayloadSchema = z.object({
  leaderboard: z.array(realtimeScoreEntrySchema),
  highlights: z.object({
    topTeam: z.string().uuid(),
    ties: z.array(z.string().uuid())
  })
});

export const realtimeSystemPayloadSchema = z.object({
  status: z.enum(['paused', 'resumed', 'ended', 'heartbeat']),
  reason: z.string().optional(),
  resumeToken: z.string().optional()
});
