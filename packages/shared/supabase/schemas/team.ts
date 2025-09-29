import { z } from 'zod';

export const teamSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  name: z.string().min(2).max(40),
  join_secret: z.string().length(8),
  total_score: z.number().int().min(0),
  created_at: z.string().datetime({ offset: true })
});

export const playerSessionSchema = z.object({
  id: z.string().uuid(),
  team_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  session_token: z.string().min(10),
  joined_at: z.string().datetime({ offset: true }),
  last_active_at: z.string().datetime({ offset: true })
});

export type Team = z.infer<typeof teamSchema>;
export type PlayerSession = z.infer<typeof playerSessionSchema>;
