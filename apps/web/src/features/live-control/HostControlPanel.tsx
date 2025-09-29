import { ConnectionGuard } from './components/ConnectionGuard';
import { PacingDashboard } from './components/PacingDashboard';
import { useEventState } from '../shared/EventState';

export interface HostControlPanelProps {
  onExit: () => void;
  onViewScoreboard: () => void;
}

export function HostControlPanel({ onExit, onViewScoreboard }: HostControlPanelProps) {
  const {
    details,
    nextQuestion,
    revealQuestion,
    endEvent,
    scoresUpdated,
    pacingVisible,
    analyticsCleared,
    finalMessage,
    simulateDisconnect,
    resumeFromDisconnect,
    connectionLost
  } = useEventState();

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Host control panel</h1>
          <p className="text-sm text-gray-500">
            Event status: <span className="font-medium text-gray-700">{details.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            onClick={onViewScoreboard}
          >
            View scoreboard
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            onClick={onExit}
          >
            Exit setup
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={revealQuestion}
        >
          Reveal question
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm"
          onClick={nextQuestion}
        >
          Next question
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm"
          onClick={simulateDisconnect}
        >
          Simulate disconnect
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm"
          onClick={endEvent}
        >
          End game
        </button>
      </div>

      <ConnectionGuard connectionLost={connectionLost} onResume={resumeFromDisconnect} />
      <PacingDashboard visible={pacingVisible} />

      {scoresUpdated ? (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">Scores updated</div>
      ) : null}

      {analyticsCleared ? (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">Analytics cleared</div>
      ) : null}

      {finalMessage ? <p className="text-lg font-semibold">{finalMessage}</p> : null}
    </section>
  );
}

