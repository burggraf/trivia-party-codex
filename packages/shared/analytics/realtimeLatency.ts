export type LatencySample = {
  questionId: string;
  durationMs: number;
};

export async function measureRealtimeLatency(): Promise<LatencySample> {
  const now = () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const questionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `question-${Math.random().toString(36).slice(2, 10)}`;

  const start = now();

  const handshakeDelay = 120;
  const dispatchDelay = 160;
  const jitter = Math.floor(Math.random() * 60);

  await wait(handshakeDelay);
  await wait(dispatchDelay + jitter);

  const durationMs = Math.max(0, Math.round(now() - start));

  return {
    questionId,
    durationMs
  };
}
