import { z } from 'zod';
import {
  realtimeQuestionPayloadSchema,
  realtimeScorePayloadSchema,
  realtimeSystemPayloadSchema
} from '../schemas/event-round';

export const realtimeEnvelopeSchema = z.object({
  type: z.enum(['question', 'score', 'system']),
  eventId: z.string().uuid(),
  roundIndex: z.number().int().min(0),
  questionIndex: z.number().int().min(0),
  timestamp: z.string().datetime({ offset: true }),
  payload: z.record(z.any())
});

export type RealtimeEnvelope = z.infer<typeof realtimeEnvelopeSchema>;

export function validateRealtimePayload(payload: unknown) {
  const envelope = realtimeEnvelopeSchema.parse(payload);

  switch (envelope.type) {
    case 'question':
      realtimeQuestionPayloadSchema.parse(envelope.payload);
      break;
    case 'score':
      realtimeScorePayloadSchema.parse(envelope.payload);
      break;
    case 'system':
      realtimeSystemPayloadSchema.parse(envelope.payload);
      break;
    default:
      throw new Error(`Unsupported realtime payload type: ${envelope.type}`);
  }

  return envelope;
}
