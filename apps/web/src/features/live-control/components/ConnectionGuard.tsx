import { useCallback, useEffect, useRef, useState } from 'react';

export interface ConnectionGuardProps {
  connectionLost: boolean;
  onRetry: () => Promise<void> | void;
  retryIntervalMs?: number;
  maxAutoRetries?: number;
}

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_MAX_RETRIES = 3;

export function ConnectionGuard({
  connectionLost,
  onRetry,
  retryIntervalMs = DEFAULT_INTERVAL_MS,
  maxAutoRetries = DEFAULT_MAX_RETRIES
}: ConnectionGuardProps) {
  const intervalSeconds = Math.max(1, Math.round(retryIntervalMs / 1000));
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>('');
  const retryingRef = useRef(false);

  const hasRemainingAutoRetries = attempts < maxAutoRetries;

  const handleRetry = useCallback(
    async (source: 'auto' | 'manual') => {
      if (retryingRef.current) {
        return;
      }

      retryingRef.current = true;
      setIsRetrying(true);

      try {
        await onRetry();
      } catch (error) {
        console.error('Failed to resume realtime connection', error);
      } finally {
        retryingRef.current = false;
        setIsRetrying(false);
        setAttempts((value) => value + 1);
        setCountdown(intervalSeconds);
        if (source === 'manual') {
          setCountdown(intervalSeconds);
        }
      }
    },
    [intervalSeconds, onRetry]
  );

  useEffect(() => {
    if (!connectionLost) {
      setAttempts(0);
      setCountdown(intervalSeconds);
      setIsRetrying(false);
      retryingRef.current = false;
      setActionMessage('');
      return;
    }

    if (!hasRemainingAutoRetries) {
      return;
    }

    setCountdown(intervalSeconds);

    const countdownInterval = setInterval(() => {
      setCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    const timeout = setTimeout(() => {
      void handleRetry('auto');
    }, intervalSeconds * 1000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(timeout);
    };
  }, [connectionLost, handleRetry, hasRemainingAutoRetries, intervalSeconds]);

  useEffect(() => {
    if (!connectionLost) {
      setActionMessage('');
      return;
    }

    const message = hasRemainingAutoRetries
      ? isRetrying
        ? 'Reconnecting…'
        : `Retrying automatically in ${countdown}s (attempt ${attempts + 1} of ${maxAutoRetries}).`
      : isRetrying
        ? 'Reconnecting…'
        : 'Auto-retry attempts exhausted. Please retry manually.';
    setActionMessage(message);
  }, [connectionLost, countdown, attempts, hasRemainingAutoRetries, maxAutoRetries, isRetrying]);

  if (!connectionLost) {
    return null;
  }

  return (
    <div className="rounded border border-red-200 bg-red-50 p-4" role="alert" aria-label="Connection lost">
      <h2 className="text-lg font-semibold text-red-700">Connection lost</h2>
      <p className="text-sm text-red-600">
        Realtime broadcast disconnected. Gameplay is paused until the connection recovers.
      </p>
      <p className="mt-2 text-xs text-red-500" aria-live="polite">
        {actionMessage}
      </p>
      <button
        type="button"
        className="mt-3 rounded border border-gray-300 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          void handleRetry('manual');
        }}
        disabled={isRetrying}
      >
        {isRetrying ? 'Attempting…' : 'Retry now'}
      </button>
    </div>
  );
}
