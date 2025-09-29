import { z } from 'zod';

export const selectRoundQuestionsResponseSchema = z.object({
  question_ids: z
    .array(z.string().uuid())
    .nonempty()
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Question identifiers must be unique'
    })
});

export function validateSelectRoundQuestionsResponse(payload: unknown) {
  return selectRoundQuestionsResponseSchema.parse(payload);
}
