import type { MouseEventHandler } from 'react';

export interface ConnectionGuardProps {
  connectionLost: boolean;
  onResume: MouseEventHandler<HTMLButtonElement>;
}

export function ConnectionGuard({ connectionLost, onResume }: ConnectionGuardProps) {
  if (!connectionLost) {
    return null;
  }

  return (
    <div className="rounded border border-red-200 bg-red-50 p-4" role="alert" aria-label="Connection lost">
      <h2 className="text-lg font-semibold text-red-700">Connection lost</h2>
      <p className="text-sm text-red-600">
        Realtime broadcast disconnected. Gameplay is paused until the connection recovers.
      </p>
      <button
        type="button"
        className="mt-3 rounded border border-gray-300 bg-white px-4 py-2 text-sm"
        onClick={onResume}
        disabled={connectionLost}
      >
        Resume game
      </button>
    </div>
  );
}

