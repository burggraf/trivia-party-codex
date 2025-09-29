import { useEventState } from '../shared/EventState';

export function ScoreboardDisplay() {
  const { scoreboard, tieTeamIds, finalMessage } = useEventState();

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Round 1 standings</h2>
        {tieTeamIds.length > 1 ? (
          <span
            data-testid="ties-badge"
            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
          >
            Tie detected
          </span>
        ) : null}
      </header>

      <ol className="space-y-2">
        {scoreboard.map((entry, index) => (
          <li
            key={entry.id}
            data-testid={`leaderboard-row-${index}`}
            className="flex items-center justify-between rounded border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <span className="font-medium">{entry.name}</span>
            <span className="text-sm text-gray-500">
              {entry.score} pts · <span data-testid="delta">{entry.delta >= 0 ? `+${entry.delta}` : entry.delta}</span>
            </span>
          </li>
        ))}
      </ol>

      {finalMessage ? <p className="text-sm font-medium">{finalMessage}</p> : null}
    </section>
  );
}

