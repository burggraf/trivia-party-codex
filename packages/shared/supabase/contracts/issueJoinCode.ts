import { z } from 'zod';

export const issueJoinCodeResponseSchema = z.object({
  join_code: z.string().length(6).regex(/^[A-Z0-9]{6}$/),
  expires_at: z.string().datetime({ offset: true })
});

export function validateIssueJoinCodeResponse(payload: unknown) {
  return issueJoinCodeResponseSchema.parse(payload);
}
