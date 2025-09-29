import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../shared/EventState';

export interface HostAuthGateProps {
  children: ReactNode;
}

type AuthMode = 'signIn' | 'signUp' | 'resetPassword';

export function HostAuthGate({ children }: HostAuthGateProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    setMessage(null);

    try {
      if (authMode === 'signUp' && password !== confirmPassword) {
        setError('Passwords must match');
        return;
      }

      if (authMode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
        }
      } else if (authMode === 'signUp') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage(
            data.session
              ? 'Account created successfully.'
              : 'Check your email to confirm your new host account.'
          );
          setAuthMode('signIn');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
        if (resetError) {
          setError(resetError.message);
        } else {
          setMessage('Check your email for a link to reset your password.');
          setAuthMode('signIn');
          setPassword('');
          setConfirmPassword('');
        }
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

  const changeAuthMode = (nextMode: AuthMode) => {
    setAuthMode(nextMode);
    setError(null);
    setMessage(null);
    if (nextMode !== 'signUp') {
      setConfirmPassword('');
    }
    if (nextMode !== 'signIn') {
      setPassword('');
    }
  };

  const renderTitle = () => {
    if (authMode === 'signUp') {
      return 'Create host account';
    }
    if (authMode === 'resetPassword') {
      return 'Recover password';
    }
    return 'Host sign-in';
  };

  const renderDescription = () => {
    if (authMode === 'signUp') {
      return 'Create a host profile to manage trivia events.';
    }
    if (authMode === 'resetPassword') {
      return 'We will email you a secure link to choose a new password.';
    }
    return "Use your Supabase host credentials to manage tonight’s event.";
  };

  const primaryButtonLabel = () => {
    if (authMode === 'signUp') {
      return 'Create account';
    }
    if (authMode === 'resetPassword') {
      return 'Send reset link';
    }
    return 'Sign in';
  };

  const footerAction = () => {
    if (authMode === 'signUp') {
      return (
        <button
          type="button"
          className="text-xs font-semibold text-emerald-400 hover:underline"
          onClick={() => changeAuthMode('signIn')}
        >
          Already have an account? Sign in
        </button>
      );
    }

    if (authMode === 'resetPassword') {
      return (
        <button
          type="button"
          className="text-xs font-semibold text-emerald-400 hover:underline"
          onClick={() => changeAuthMode('signIn')}
        >
          Remembered your password? Return to sign-in
        </button>
      );
    }

    return (
      <div className="flex flex-col gap-1 text-center text-xs text-slate-400">
        <button
          type="button"
          className="font-semibold text-emerald-400 hover:underline"
          onClick={() => changeAuthMode('signUp')}
        >
          Need an account? Register as host
        </button>
        <button
          type="button"
          className="font-semibold text-emerald-400 hover:underline"
          onClick={() => changeAuthMode('resetPassword')}
        >
          Forgot password? Send recovery email
        </button>
      </div>
    );
  };

  if (!session) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <form
          className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl"
          onSubmit={handleSubmit}
        >
          <header className="mb-4 space-y-1 text-center">
            <h1 className="text-lg font-semibold text-white">{renderTitle()}</h1>
            <p className="text-xs text-slate-400">{renderDescription()}</p>
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

          {authMode !== 'resetPassword' ? (
            <label className="mb-4 block text-sm font-medium text-slate-200">
              Password
              <input
                type="password"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'}
              />
            </label>
          ) : null}

          {authMode === 'signUp' ? (
            <label className="mb-4 block text-sm font-medium text-slate-200">
              Confirm password
              <input
                type="password"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
          ) : null}

          {error ? (
            <p className="mb-3 text-xs text-rose-400" role="alert">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mb-3 text-xs text-emerald-400" role="status">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Working…' : primaryButtonLabel()}
          </button>

          <footer className="mt-4 flex justify-center">{footerAction()}</footer>
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
