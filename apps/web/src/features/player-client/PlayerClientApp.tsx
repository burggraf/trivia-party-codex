import { FormEvent, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useEventState } from '../shared/EventState';
import { AnswerForm } from './components/AnswerForm';
import { usePlayerRealtime } from './hooks/usePlayerRealtime';

function formatRevealStatus(status: string) {
  switch (status) {
    case 'live':
      return 'Live question';
    case 'paused':
      return 'Game paused';
    case 'completed':
      return 'Game completed';
    default:
      return 'Awaiting start';
  }
}

export function PlayerClientApp() {
  const { supabase, details, rounds, scoreboard } = useEventState();
  const [teamId, setTeamId] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [hasJoined, setHasJoined] = useState(false);

  const questionOptions = useMemo(() => {
    const firstRound = rounds[0];
    const firstQuestion = firstRound?.questions[0];
    if (!firstQuestion) {
      return [];
    }
    return [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
      { id: 'c', label: 'Option C' },
      { id: 'd', label: 'Option D' }
    ];
  }, [rounds]);

  const realtime = usePlayerRealtime({ supabase, eventId: details.id, teamId });

  const status = realtime?.status ?? 'idle';
  const questionPayload = realtime?.currentQuestion ?? null;
  const systemMessage = realtime?.systemMessage ?? null;
  const answerLocked = realtime?.answerLocked ?? false;

  const prompt = questionPayload?.payload?.prompt ?? rounds[0]?.questions[0]?.prompt ?? 'Waiting for host…';
  const questionMeta = questionPayload?.payload;

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamName.trim()) {
      return;
    }
    const normalisedTeamId = teamName.trim().toLowerCase().replace(/\s+/g, '-');
    setTeamId(normalisedTeamId);
    setHasJoined(true);
  };

  return (
    <section className="mx-auto flex min-h-screen max-w-lg flex-col gap-5 bg-slate-950 p-6 text-slate-100">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">Team console</p>
        <h1 className="text-2xl font-semibold text-white">{details.name}</h1>
        {hasJoined ? (
          <p className="text-sm text-slate-400">Playing as {teamName}</p>
        ) : (
          <p className="text-sm text-slate-400">Enter your team name to join this round.</p>
        )}
      </header>

      <form
        className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-sm"
        onSubmit={handleJoin}
      >
        <label className="text-sm font-medium text-slate-200">
          Team name
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="e.g. Quiz Mavericks"
            disabled={hasJoined}
          />
        </label>
        <label className="text-sm font-medium text-slate-200">
          Join code
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100 tracking-[0.3em]"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            disabled={hasJoined}
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={hasJoined || !teamName.trim()}
        >
          {hasJoined ? 'Joined' : 'Join team space'}
        </button>
        {!supabase ? (
          <p className="text-xs text-slate-500">
            Connected in offline demo mode. Join is simulated locally.
          </p>
        ) : null}
      </form>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-md">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
          <span>{formatRevealStatus(details.status)}</span>
          <span>{status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Offline'}</span>
        </div>
        <h2 className="text-xl font-semibold text-white" data-testid="player-question-prompt">
          {prompt}
        </h2>
        {questionMeta?.category ? (
          <p className="text-xs text-slate-400">Category: {questionMeta.category}</p>
        ) : null}
      </div>

      <AnswerForm
        options={questionOptions}
        disabled={!hasJoined || answerLocked || status !== 'connected'}
        onSubmit={(optionId) => {
          realtime?.lockAnswer();
          console.info('Team submitted answer', optionId);
        }}
        lockedMessage="Answer captured. Cheer until the next prompt!"
      />

      {answerLocked ? (
        <div className="rounded border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-200" data-testid="player-answer-locked">
          First answer recorded. Waiting for host…
        </div>
      ) : null}

      {systemMessage ? (
        <div className={clsx('rounded border p-3 text-xs', {
          'border-amber-400/40 bg-amber-500/10 text-amber-100': systemMessage.payload?.status === 'paused',
          'border-emerald-400/40 bg-emerald-500/10 text-emerald-100': systemMessage.payload?.status === 'resumed'
        })}>
          {systemMessage.payload?.reason ?? 'Host updated game status.'}
        </div>
      ) : null}

      <aside className="mt-auto rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Current leaders</p>
        <ol className="mt-2 space-y-1 text-sm text-slate-200">
          {scoreboard.map((entry, index) => (
            <li key={entry.id} className="flex items-center justify-between">
              <span>
                #{index + 1} {entry.name}
              </span>
              <span className="text-xs text-slate-400">{entry.score} pts</span>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
