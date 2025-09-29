import { useEffect, useMemo, useState } from 'react';
import { EventStateProvider, getSupabaseClient, useEventState } from './features/shared/EventState';
import { HostAuthGate } from './features/auth/HostAuthGate';
import { EventSetupPage } from './features/event-setup/EventSetupPage';
import { QuestionPreviewPanel } from './features/event-setup/QuestionPreviewPanel';
import { HostControlPanel } from './features/live-control/HostControlPanel';
import { ScoreboardDisplay } from './features/live-control/ScoreboardDisplay';
import { createEvent, type CreateEventInput } from './features/event-setup/actions/createEvent';

type AppView = 'setup' | 'rounds' | 'host' | 'scoreboard';

const DEFAULT_EVENT_PAYLOAD: CreateEventInput = {
  name: 'Venue Trivia Night',
  venue: '',
  scheduledAt: null,
  roundCount: 3,
  questionsPerRound: 5,
  categories: ['General']
};

const FALLBACK_EVENT_ID = '11111111-1111-1111-1111-111111111111';

function EventBootstrap({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [eventId, setEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ensureEvent = async () => {
      const url = new URL(window.location.href);
      const existingId = url.searchParams.get('eventId');
      if (existingId) {
        setEventId(existingId);
        return;
      }

      if (!supabase) {
        setEventId(FALLBACK_EVENT_ID);
        return;
      }

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      const user = session?.user;
      if (!user) {
        setError('Host session required to initialise event.');
        return;
      }

      const { data: existingEvent, error: selectError } = await supabase
        .from('game_events')
        .select('id')
        .eq('host_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) {
        setError(selectError.message);
        return;
      }

      if (existingEvent?.id) {
        url.searchParams.set('eventId', existingEvent.id);
        window.history.replaceState(null, '', url.toString());
        setEventId(existingEvent.id);
        return;
      }

      try {
        const created = await createEvent(DEFAULT_EVENT_PAYLOAD);
        url.searchParams.set('eventId', created.id);
        window.history.replaceState(null, '', url.toString());
        setEventId(created.id);
      } catch (creationError) {
        setError(creationError instanceof Error ? creationError.message : 'Unable to create event.');
      }
    };

    void ensureEvent();
  }, [supabase]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-sm text-rose-300">
        {error}
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm">Setting up your event workspace…</p>
      </div>
    );
  }

  return <EventStateProvider eventId={eventId}>{children}</EventStateProvider>;
}

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
    <HostAuthGate>
      <EventBootstrap>
        <AppContent />
      </EventBootstrap>
    </HostAuthGate>
  );
}

export default App;
