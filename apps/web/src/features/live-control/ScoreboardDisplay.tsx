import { useMemo } from 'react';
import clsx from 'clsx';
import { useEventState } from '../shared/EventState';

function formatDelta(delta: number) {
  if (delta > 0) {
    return `+${delta}`;
  }
  if (delta < 0) {
    return `${delta}`;
  }
  return '±0';
}

export function ScoreboardDisplay() {
  const { scoreboard, tieTeamIds, finalMessage, details } = useEventState();

  const topScore = useMemo(() => (scoreboard.length ? scoreboard[0].score : null), [scoreboard]);
  const topTeamId = scoreboard.length ? scoreboard[0].id : null;
  const hasTies = tieTeamIds.length > 1;

  const roundLabel = useMemo(() => {
    if (details.status === 'completed') {
      return 'Final standings';
    }
    return 'Current standings';
  }, [details.status]);

  return (
    <section className="space-y-4" aria-live="polite">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">{roundLabel}</p>
          <h2 className="text-2xl font-semibold text-gray-900">Leaderboard</h2>
        </div>
        {hasTies ? (
          <span
            data-testid="ties-badge"
            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
          >
            Multiple teams tied
          </span>
        ) : null}
      </header>

      <ol className="space-y-2" aria-label="Team standings">
        {scoreboard.map((entry, index) => (
          <li
            key={entry.id}
            data-testid={`leaderboard-row-${index}`}
            className={clsx(
              'flex items-center justify-between rounded border px-4 py-4 shadow-sm transition',
              {
                'border-emerald-300 bg-emerald-50/60': entry.id === topTeamId,
                'border-amber-200 bg-amber-50/80': hasTies && tieTeamIds.includes(entry.id),
                'border-gray-200 bg-white': entry.id !== topTeamId && (!hasTies || !tieTeamIds.includes(entry.id))
              }
            )}
            aria-label={`${index + 1} place: ${entry.name} with ${entry.score} points`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-500">#{index + 1}</span>
              <div>
                <p className="text-base font-semibold text-gray-900">{entry.name}</p>
                {entry.id === topTeamId ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Leading</p>
                ) : null}
                {hasTies && tieTeamIds.includes(entry.id) && entry.id !== topTeamId ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Tied</p>
                ) : null}
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">{entry.score} pts</p>
              <p
                className={clsx('text-sm flex items-center justify-end gap-1', {
                  'text-emerald-600': entry.delta > 0,
                  'text-gray-500': entry.delta === 0,
                  'text-rose-600': entry.delta < 0
                })}
              >
                <span data-testid="delta">{formatDelta(entry.delta)}</span>
                {topScore !== null && entry.score === topScore && entry.id !== topTeamId ? (
                  <span className="text-xs text-emerald-500">(matched lead)</span>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {finalMessage ? (
        <p className="text-sm font-medium text-gray-700" data-testid="scoreboard-final-message">
          {finalMessage}
        </p>
      ) : null}
    </section>
  );
}
