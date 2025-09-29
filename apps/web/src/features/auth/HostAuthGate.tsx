import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../shared/EventState';

export interface HostAuthGateProps {
  children: ReactNode;
}

export function HostAuthGate({ children }: HostAuthGateProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setIsReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!supabase) {
    return <>{children}</>;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    await supabase.auth.signOut();
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm">Preparing host console…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <form
          className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl"
          onSubmit={handleSubmit}
        >
          <header className="mb-4 space-y-1 text-center">
            <h1 className="text-lg font-semibold text-white">Host sign-in</h1>
            <p className="text-xs text-slate-400">Use your Supabase host credentials to manage tonight’s event.</p>
          </header>

          <label className="mb-3 block text-sm font-medium text-slate-200">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="mb-4 block text-sm font-medium text-slate-200">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <p className="mb-3 text-xs text-rose-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3 text-xs text-slate-300">
        <span>Signed in as {session.user.email}</span>
        <button
          type="button"
          className="rounded border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </header>
      {children}
    </section>
  );
}
