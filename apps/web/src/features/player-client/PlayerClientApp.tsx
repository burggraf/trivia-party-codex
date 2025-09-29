import { FormEvent, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useEventState } from '../shared/EventState';
import { AnswerForm, type AnswerOption } from './components/AnswerForm';
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
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'locked'>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const realtime = usePlayerRealtime({ supabase, eventId: details.id, teamId });

  const status = realtime?.status ?? 'idle';
  const questionPayload = realtime?.currentQuestion ?? null;
  const systemMessage = realtime?.systemMessage ?? null;
  const answerLocked = realtime?.answerLocked ?? false;

  const currentRoundIndex = questionPayload?.roundIndex ?? 0;
  const currentRound = rounds[currentRoundIndex];
  const questionMeta = questionPayload?.payload;
  const questionId = questionMeta?.questionId ?? currentRound?.questions[questionPayload?.questionIndex ?? 0]?.id ?? null;

  const questionOptions: AnswerOption[] = useMemo(() => {
    if (questionMeta?.options && Array.isArray(questionMeta.options)) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      return questionMeta.options.map((label: unknown, index: number) => ({
        id: letters[index]?.toLowerCase() ?? `opt-${index}`,
        label: typeof label === 'string' ? label : `Option ${letters[index] ?? index + 1}`
      }));
    }

    const fallbackQuestion = currentRound?.questions[questionPayload?.questionIndex ?? 0];
    if (!fallbackQuestion) {
      return [];
    }

    return ['A', 'B', 'C', 'D'].map((letter) => ({
      id: letter.toLowerCase(),
      label: fallbackQuestion.prompt ? `${letter}: ${fallbackQuestion.prompt.split(' ')[0]} option` : `Option ${letter}`
    }));
  }, [questionMeta?.options, currentRound, questionPayload?.questionIndex]);

  const prompt = questionMeta?.prompt ?? rounds[currentRoundIndex]?.questions[questionPayload?.questionIndex ?? 0]?.prompt ?? 'Waiting for host…';

  useEffect(() => {
    setSubmissionState('idle');
    setSubmissionError(null);
  }, [questionId]);

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamName.trim()) {
      return;
    }
    const normalisedTeamId = teamName.trim().toLowerCase().replace(/\s+/g, '-');
    setTeamId(normalisedTeamId);
    setHasJoined(true);
    setSubmissionState('idle');
    setSubmissionError(null);
  };

  const handleSubmitAnswer = async (optionId: string) => {
    if (!hasJoined) {
      throw new Error('Join the event before submitting an answer.');
    }

    setSubmissionError(null);
    setSubmissionState('pending');

    const roundId = currentRound?.id ?? null;
    const usableQuestionId = questionId;

    const shouldPersist = Boolean(supabase && roundId && usableQuestionId && teamId);

    try {
      if (shouldPersist && supabase) {
        const { error } = await supabase
          .from('answer_submissions')
          .insert({
            event_id: details.id,
            round_id: roundId,
            question_id: usableQuestionId,
            team_id: teamId,
            selected_option: optionId,
            correct: false
          });

        if (error) {
          throw new Error(error.message);
        }
      }

      realtime?.lockAnswer();
      setSubmissionState('locked');
    } catch (error) {
      console.error('Failed to submit answer', error);
      setSubmissionState('idle');
      setSubmissionError('Unable to submit answer. Please try again.');
      throw error instanceof Error ? error : new Error('Answer submission failed');
    }
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
        questionId={questionId}
        options={questionOptions}
        disabled={!hasJoined || status !== 'connected'}
        locked={answerLocked || submissionState === 'locked'}
        pending={submissionState === 'pending'}
        onSubmit={handleSubmitAnswer}
        lockedMessage="Answer captured. Cheer until the next prompt!"
        error={submissionError}
      />

      {answerLocked || submissionState === 'locked' ? (
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
