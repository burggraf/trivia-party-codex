import { FormEvent, useState } from 'react';

export interface AnswerFormProps {
  options: Array<{ id: string; label: string }>;
  onSubmit: (optionId: string) => void;
}

export function AnswerForm({ options, onSubmit }: AnswerFormProps) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [locked, setLocked] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOption) return;
    onSubmit(selectedOption);
    setLocked(true);
  };

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <fieldset className="grid gap-2" disabled={locked}>
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
        disabled={locked}
      >
        Lock answer
      </button>
      {locked ? <p className="text-xs text-gray-500">First answer recorded for this question.</p> : null}
    </form>
  );
}

