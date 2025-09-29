import { z } from 'zod';

export const gameEventStatusSchema = z.enum([
  'draft',
  'scheduled',
  'live',
  'paused',
  'completed',
  'cancelled'
]);

export const gameEventSchema = z.object({
  id: z.string().uuid(),
  host_id: z.string().uuid(),
  name: z.string().min(3).max(80),
  venue: z.string().max(120).nullable(),
  scheduled_at: z.string().datetime({ offset: true }).nullable(),
  status: gameEventStatusSchema,
  join_code: z.string().length(6).regex(/^[A-Z0-9]{6}$/).nullable(),
  join_code_expires_at: z.string().datetime({ offset: true }).nullable(),
  round_count: z.number().int().min(1).max(10),
  questions_per_round: z.number().int().min(3).max(10),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true })
});

export type GameEvent = z.infer<typeof gameEventSchema>;
