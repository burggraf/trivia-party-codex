import { describe, expect, test } from 'vitest';
import { measureRealtimeLatency } from '../../../../packages/shared/analytics/realtimeLatency';

describe('Realtime latency budget', () => {
  test('average latency remains under 1000ms', async () => {
    const sample = await measureRealtimeLatency();
    expect(sample.durationMs).toBeLessThan(1000);
  });
});
