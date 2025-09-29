import { useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { useEventState } from '../../shared/EventState';

export function JoinCodeDisplay() {
  const { details, issueJoinCode, saveEvent } = useEventState();
  const [error, setError] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const qrInstanceRef = useRef<QRCodeStyling | null>(null);

  const expiryLabel = useMemo(() => {
    if (!details.joinCodeExpiresAt) return null;
    try {
      return new Date(details.joinCodeExpiresAt).toLocaleString();
    } catch (formatError) {
      console.error('Failed to format join code expiry', formatError);
      return null;
    }
  }, [details.joinCodeExpiresAt]);

  const joinUrl = useMemo(() => {
    if (!details.joinCode) return null;
    if (typeof window === 'undefined') {
      return `https://example.com/join/${details.joinCode}`;
    }
    return `${window.location.origin}/join/${details.joinCode}`;
  }, [details.joinCode]);

  useEffect(() => {
    if (!details.joinCode || !joinUrl || !qrContainerRef.current) {
      return;
    }

    if (!qrInstanceRef.current) {
      qrInstanceRef.current = new QRCodeStyling({
        width: 180,
        height: 180,
        data: joinUrl,
        margin: 12,
        dotsOptions: { color: '#1f2937', type: 'rounded' },
        backgroundOptions: { color: '#ffffff' }
      });
    } else {
      qrInstanceRef.current.update({ data: joinUrl });
    }

    if (qrContainerRef.current) {
      qrContainerRef.current.innerHTML = '';
      qrInstanceRef.current.append(qrContainerRef.current);
    }
  }, [details.joinCode, joinUrl]);

  const handleIssueJoinCode = async () => {
    setIsIssuing(true);
    setError(null);

    try {
      if (details.status === 'draft') {
        await saveEvent({
          name: details.name,
          venue: details.venue,
          scheduledAt: details.scheduledAt,
          roundCount: details.roundCount,
          questionsPerRound: details.questionsPerRound,
          categories: details.categories
        });
      }

      await issueJoinCode();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to issue join code.';
      setError(message);
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <section className="rounded border border-gray-300 bg-gray-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Join code</h2>
          <p className="text-sm text-gray-500">Share with teams so they can join this event.</p>
        </div>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleIssueJoinCode}
          disabled={isIssuing || !details.name.trim()}
        >
          {details.joinCode ? (isIssuing ? 'Refreshing…' : 'Regenerate code') : 'Generate code'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {details.joinCode ? (
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="rounded bg-white px-4 py-3 text-3xl font-bold tracking-widest">
            {details.joinCode}
          </div>
          <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
            <div
              ref={qrContainerRef}
              aria-hidden
              className="flex h-40 w-40 items-center justify-center rounded border border-dashed border-gray-300 bg-white"
            />
            {joinUrl ? <span className="text-xs text-gray-500">{joinUrl}</span> : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          Join code will be generated after you save the event configuration.
        </p>
      )}

      {expiryLabel ? <p className="mt-2 text-xs text-gray-500">Expires at {expiryLabel}</p> : null}
    </section>
  );
}
