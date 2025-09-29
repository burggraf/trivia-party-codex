import { describe, expect, test } from 'vitest';
import { realtimeEnvelopeSchema, validateRealtimePayload } from '../../src/contracts/realtimePayloads';

describe('realtime broadcast payload contract', () => {
  test('accepts canonical heartbeat payload', () => {
    const payload = {
      type: 'system',
      eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      roundIndex: 0,
      questionIndex: 0,
      timestamp: new Date().toISOString(),
      payload: {
        status: 'heartbeat'
      }
    };

    expect(realtimeEnvelopeSchema.safeParse(payload).success).toBe(true);
    expect(() => validateRealtimePayload(payload)).not.toThrow();
  });

  test('rejects payload missing heartbeat status when system message indicates pause', () => {
    const payload = {
      type: 'system',
      eventId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      roundIndex: 0,
      questionIndex: 0,
      timestamp: new Date().toISOString(),
      payload: {}
    };

    expect(() => validateRealtimePayload(payload)).toThrowError();
  });
});
