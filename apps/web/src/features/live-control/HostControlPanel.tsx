import { ConnectionGuard } from './components/ConnectionGuard';
import { PacingDashboard } from './components/PacingDashboard';
import { useEventState } from '../shared/EventState';
import { useState } from 'react';
import clsx from 'clsx';

export interface HostControlPanelProps {
  onExit: () => void;
  onViewScoreboard: () => void;
}

export function HostControlPanel({ onExit, onViewScoreboard }: HostControlPanelProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    null | 'start' | 'pause' | 'resume' | 'end'
  >(null);
  const {
    supabase,
    details,
    startEvent,
    pauseEvent,
    resumeEvent,
    nextQuestion,
    revealQuestion,
    endEvent,
    scoresUpdated,
    pacingVisible,
    analyticsCleared,
    finalMessage,
    simulateDisconnect,
    connectionLost
  } = useEventState();

  const status = details.status;
  const isLive = status === 'live';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const hasStarted = isLive || isPaused || status === 'completed';

  const disableControls = pendingAction !== null;

  const canReveal = isLive && !connectionLost && !disableControls;
  const canAdvance = isLive && !connectionLost && !disableControls;
  const canPause = isLive && !disableControls;
  const canResume = (isPaused || connectionLost) && !disableControls;
  const canStart = !hasStarted && !disableControls;
  const canEnd = !isCompleted && !disableControls;

  const handleStart = async () => {
    setPendingAction('start');
    setActionError(null);
    try {
      await startEvent();
    } catch (error) {
      console.error('Failed to start event', error);
      setActionError('Unable to start the event. Please try again.');
    } finally {
      setPendingAction(null);
    }
  };

  const handlePause = async () => {
    setPendingAction('pause');
    setActionError(null);
    try {
      await pauseEvent();
    } catch (error) {
      console.error('Failed to pause event', error);
      setActionError('Unable to pause the event right now.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleResume = async () => {
    setPendingAction('resume');
    setActionError(null);
    try {
      await resumeEvent();
    } catch (error) {
      console.error('Failed to resume event', error);
      setActionError('Unable to resume the event right now.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleEnd = async () => {
    setPendingAction('end');
    setActionError(null);
    try {
      await endEvent();
    } catch (error) {
      console.error('Failed to end event', error);
      setActionError('Unable to end the event right now.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleReveal = () => {
    if (!canReveal) return;
    revealQuestion();
  };

  const handleNextQuestion = () => {
    if (!canAdvance) return;
    nextQuestion();
  };

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Host control panel</h1>
          <p className="text-sm text-gray-500">
            Event status:{' '}
            <span
              className={clsx('inline-flex items-center gap-2 font-medium', {
                'text-emerald-700': status === 'live',
                'text-amber-700': status === 'paused',
                'text-slate-700': status === 'scheduled' || status === 'draft',
                'text-purple-700': status === 'completed'
              })}
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-current" aria-hidden />
              {status}
            </span>
          </p>
          <p className="text-xs text-gray-400">
            {supabase ? 'Connected to Supabase' : 'Offline demo mode'}
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
        {canStart ? (
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleStart}
            disabled={!canStart}
          >
            {pendingAction === 'start' ? 'Starting…' : 'Start game'}
          </button>
        ) : null}

        {canPause ? (
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handlePause}
            disabled={!canPause}
          >
            {pendingAction === 'pause' ? 'Pausing…' : 'Pause game'}
          </button>
        ) : null}

        {canResume ? (
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleResume}
            disabled={!canResume}
          >
            {pendingAction === 'resume' ? 'Resuming…' : 'Resume game'}
          </button>
        ) : null}

        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleReveal}
          disabled={!canReveal}
        >
          Reveal question
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleNextQuestion}
          disabled={!canAdvance}
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
          className="rounded border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleEnd}
          disabled={!canEnd}
        >
          {pendingAction === 'end' ? 'Ending…' : 'End game'}
        </button>
      </div>

      <ConnectionGuard
        connectionLost={connectionLost}
        onResume={(event) => {
          event.preventDefault();
          void handleResume();
        }}
      />
      <PacingDashboard visible={pacingVisible} />

      {actionError ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

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
