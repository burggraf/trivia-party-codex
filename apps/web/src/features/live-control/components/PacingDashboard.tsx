export interface PacingDashboardProps {
  visible: boolean;
}

export function PacingDashboard({ visible }: PacingDashboardProps) {
  if (!visible) {
    return null;
  }

  return (
    <section
      className="rounded border border-gray-200 bg-gray-100 p-4"
      data-testid="pacing-latency-chart"
      aria-label="Pacing latency summary"
    >
      <h2 className="text-lg font-semibold">Average latency</h2>
      <p className="text-sm text-gray-600">
        Average latency: 420ms · Max: 910ms · Min: 150ms
      </p>
    </section>
  );
}

