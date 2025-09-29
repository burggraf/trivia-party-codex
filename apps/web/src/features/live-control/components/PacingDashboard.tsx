import { useEffect } from 'react';
import type { PacingSummary } from '../../../../../packages/shared/analytics/pacing';

export interface PacingDashboardProps {
  visible: boolean;
  summary: PacingSummary;
  analyticsCleared: boolean;
  onRefresh: () => Promise<void> | void;
}

function formatLatency(latency: number) {
  if (latency >= 1000) {
    return `${(latency / 1000).toFixed(2)}s`;
  }
  return `${Math.round(latency)}ms`;
}

function classifyLatency(averageMs: number) {
  if (averageMs === 0) {
    return {
      label: 'No activity yet',
      tone: 'text-gray-500'
    } as const;
  }

  if (averageMs <= 800) {
    return {
      label: 'Within <1s target',
      tone: 'text-emerald-600'
    } as const;
  }

  return {
    label: 'Above target — investigate network',
    tone: 'text-amber-600'
  } as const;
}

export function PacingDashboard({ visible, summary, analyticsCleared, onRefresh }: PacingDashboardProps) {
  useEffect(() => {
    if (visible) {
      void onRefresh();
    }
  }, [visible, onRefresh]);

  if (!visible) {
    return null;
  }

  const { averageMs, maxMs, minMs, count } = summary;
  const badge = classifyLatency(averageMs);
  const countLabel = `${count} ${count === 1 ? 'sample' : 'samples'}`;

  return (
    <section
      className="rounded border border-slate-200 bg-slate-50 p-4 shadow-sm"
      data-testid="pacing-latency-chart"
      aria-label="Pacing latency summary"
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Latency overview</p>
          <h2 className="text-lg font-semibold text-slate-900">Pacing analytics</h2>
        </div>
        <span className={`rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold ${badge.tone}`}>
          {badge.label}
        </span>
      </header>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Latency measurements">
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Average</dt>
          <dd className="text-xl font-semibold text-slate-900">{formatLatency(averageMs)}</dd>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Max</dt>
          <dd className="text-xl font-semibold text-slate-900">{formatLatency(maxMs)}</dd>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Min</dt>
          <dd className="text-xl font-semibold text-slate-900">{formatLatency(minMs)}</dd>
        </div>
      </dl>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span data-testid="pacing-sample-count">{countLabel}</span>
        {analyticsCleared ? (
          <span className="text-emerald-600" data-testid="pacing-cleared-badge">
            Analytics purged after completion
          </span>
        ) : (
          <span>Data retained until event completion.</span>
        )}
      </footer>
    </section>
  );
}
