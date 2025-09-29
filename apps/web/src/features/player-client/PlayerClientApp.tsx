import { useMemo, useState } from 'react';
import { useEventState } from '../shared/EventState';
import { AnswerForm } from './components/AnswerForm';

export function PlayerClientApp() {
  const { details, rounds } = useEventState();
  const [submission, setSubmission] = useState<string | null>(null);

  const currentQuestionPrompt = rounds[0]?.questions[0]?.prompt ?? 'Awaiting next question.';
  const answerOptions = useMemo(
    () => [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
      { id: 'c', label: 'Option C' },
      { id: 'd', label: 'Option D' }
    ],
    []
  );

  return (
    <section className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Join {details.name}</h1>
        <p className="text-sm text-gray-500">Team answer submission portal</p>
      </header>

      <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">Current question</p>
        <p className="text-lg font-medium text-gray-800">{currentQuestionPrompt}</p>
      </div>

      <AnswerForm
        options={answerOptions}
        onSubmit={(optionId) => {
          setSubmission(optionId);
        }}
      />

      {submission ? (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700">
          Answer submitted: {submission.toUpperCase()}
        </div>
      ) : null}
    </section>
  );
}

