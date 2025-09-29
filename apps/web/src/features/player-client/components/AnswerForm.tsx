import { FormEvent, useEffect, useState } from 'react';

export interface AnswerOption {
  id: string;
  label: string;
}

export interface AnswerFormProps {
  questionId: string | null;
  options: AnswerOption[];
  onSubmit: (optionId: string) => Promise<void> | void;
  disabled?: boolean;
  locked?: boolean;
  pending?: boolean;
  lockedMessage?: string;
  error?: string | null;
}

export function AnswerForm({
  questionId,
  options,
  onSubmit,
  disabled = false,
  locked = false,
  pending = false,
  lockedMessage,
  error
}: AnswerFormProps) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOption('');
    setLocalError(null);
  }, [questionId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOption) {
      setLocalError('Select an option before locking your answer.');
      return;
    }

    try {
      await onSubmit(selectedOption);
      setLocalError(null);
    } catch (submissionError) {
      console.error('Failed to submit answer', submissionError);
      setLocalError('Unable to submit answer. Please try again.');
    }
  };

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <fieldset className="grid gap-2" disabled={locked || disabled || pending}>
        <legend className="text-sm font-semibold text-gray-700">Select your team answer</legend>
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2 text-sm">
            <input
              type="radio"
              name="answer"
              value={option.id}
              onChange={(event) => setSelectedOption(event.target.value)}
              checked={selectedOption === option.id}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        disabled={locked || disabled || pending}
      >
        {pending ? 'Submitting…' : locked ? 'Answer locked' : 'Lock answer'}
      </button>
      {disabled && !locked ? (
        <p className="text-xs text-gray-500">Waiting for host before answers can be submitted.</p>
      ) : null}
      {localError ? (
        <p className="text-xs text-red-600" role="alert">
          {localError}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {locked ? (
        <p className="text-xs text-gray-500">{lockedMessage ?? 'First answer recorded for this question.'}</p>
      ) : null}
    </form>
  );
}
