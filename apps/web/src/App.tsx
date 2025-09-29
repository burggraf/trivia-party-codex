import { useState } from 'react';
import { EventStateProvider, useEventState } from './features/shared/EventState';
import { EventSetupPage } from './features/event-setup/EventSetupPage';
import { QuestionPreviewPanel } from './features/event-setup/QuestionPreviewPanel';
import { HostControlPanel } from './features/live-control/HostControlPanel';
import { ScoreboardDisplay } from './features/live-control/ScoreboardDisplay';

type AppView = 'setup' | 'rounds' | 'host' | 'scoreboard';

function AppContent(): JSX.Element {
  const [view, setView] = useState<AppView>('setup');
  const { startEvent } = useEventState();

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {view === 'setup' ? (
        <EventSetupPage
          onManageRounds={() => setView('rounds')}
          onStartGame={() => {
            void startEvent();
            setView('host');
          }}
          onViewScoreboard={() => setView('scoreboard')}
        />
      ) : null}

      {view === 'rounds' ? (
        <section className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Round management</h1>
            <a
              href="#setup"
              className="text-sm font-medium text-blue-600"
              onClick={(event) => {
                event.preventDefault();
                setView('setup');
              }}
            >
              Back to setup
            </a>
          </header>
          <QuestionPreviewPanel />
        </section>
      ) : null}

      {view === 'host' ? (
        <HostControlPanel onExit={() => setView('setup')} onViewScoreboard={() => setView('scoreboard')} />
      ) : null}

      {view === 'scoreboard' ? (
        <section className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Scoreboard</h1>
            <button
              type="button"
              className="text-sm font-medium text-blue-600"
              onClick={() => setView('setup')}
            >
              Back to setup
            </button>
          </header>
          <ScoreboardDisplay />
        </section>
      ) : null}
    </main>
  );
}

function App(): JSX.Element {
  return (
    <EventStateProvider>
      <AppContent />
    </EventStateProvider>
  );
}

export default App;
