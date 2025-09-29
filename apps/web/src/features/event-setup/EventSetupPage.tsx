import { FormEvent, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useEventState, type SaveEventInput } from '../shared/EventState';
import { JoinCodeDisplay } from './components/JoinCodeDisplay';

const CATEGORY_OPTIONS = ['Science', 'History', 'Sports', 'Pop Culture', 'Geography'];

const eventConfigSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Event name must be at least 3 characters long.')
    .max(80, 'Event name must be 80 characters or fewer.'),
  venue: z
    .string()
    .trim()
    .max(120, 'Venue name must be 120 characters or fewer.')
    .optional(),
  scheduledAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length ? value : undefined)),
  roundCount: z.coerce.number().int().min(1).max(10),
  questionsPerRound: z.coerce.number().int().min(3).max(10),
  categories: z.array(z.string()).min(1, 'Select at least one trivia category.')
});

export interface EventSetupPageProps {
  onManageRounds: () => void;
  onStartGame: () => void;
  onViewScoreboard: () => void;
}

export function EventSetupPage({ onManageRounds, onStartGame, onViewScoreboard }: EventSetupPageProps) {
  const { details, saveEvent } = useEventState();
  const [name, setName] = useState(details.name);
  const [venue, setVenue] = useState(details.venue);
  const [scheduledAt, setScheduledAt] = useState(details.scheduledAt ?? '');
  const [roundCount, setRoundCount] = useState(String(details.roundCount));
  const [questionsPerRound, setQuestionsPerRound] = useState(String(details.questionsPerRound));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(details.categories);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isSaving) {
      return;
    }
    setName(details.name);
    setVenue(details.venue);
    setScheduledAt(details.scheduledAt ?? '');
    setRoundCount(String(details.roundCount));
    setQuestionsPerRound(String(details.questionsPerRound));
    setSelectedCategories(details.categories.length ? details.categories : CATEGORY_OPTIONS.slice(0, 1));
  }, [details, isSaving]);

  const categoriesLabel = useMemo(() => {
    return selectedCategories.length ? selectedCategories.join(', ') : 'No categories selected';
  }, [selectedCategories]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    const result = eventConfigSchema.safeParse({
      name,
      venue,
      scheduledAt,
      roundCount,
      questionsPerRound,
      categories: selectedCategories
    });

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      setFormError(firstIssue?.message ?? 'Check the highlighted fields and try again.');
      setIsSaving(false);
      return;
    }

    const payload: SaveEventInput = {
      name: result.data.name,
      venue: result.data.venue ?? '',
      scheduledAt: result.data.scheduledAt ?? null,
      roundCount: result.data.roundCount,
      questionsPerRound: result.data.questionsPerRound,
      categories: result.data.categories
    };

    try {
      await saveEvent(payload);
      setSuccessMessage('Event configuration saved.');
    } catch (error) {
      console.error('Failed to save event configuration', error);
      setFormError('Unable to save the event right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">
          Create trivia event
        </h1>
        <p className="text-sm text-gray-500">
          Configure rounds, question counts, and categories before inviting teams.
        </p>
      </header>

      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <label className="grid gap-2 text-sm font-medium" htmlFor="event-name">
          Event name
          <input
            id="event-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
            placeholder="Sunday Trivia"
            required
            minLength={3}
            maxLength={80}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium" htmlFor="event-venue">
          Venue
          <input
            id="event-venue"
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
            placeholder="Downtown Taproom"
            maxLength={120}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium" htmlFor="event-scheduled-at">
          Scheduled start (optional)
          <input
            id="event-scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium" htmlFor="round-count">
            Rounds
            <input
              id="round-count"
              inputMode="numeric"
              pattern="\\d*"
              min={1}
              max={10}
              value={roundCount}
              onChange={(event) => setRoundCount(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium" htmlFor="questions-per-round">
            Questions per round
            <input
              id="questions-per-round"
              inputMode="numeric"
              pattern="\\d*"
              min={3}
              max={10}
              value={questionsPerRound}
              onChange={(event) => setQuestionsPerRound(event.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium">Categories</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              onClick={() => setCategoryPickerVisible((value) => !value)}
              aria-expanded={categoryPickerVisible}
              aria-controls="category-picker"
            >
              Select categories
            </button>
            <span className="text-sm text-gray-500" aria-live="polite">
              {categoriesLabel}
            </span>
          </div>

          {categoryPickerVisible ? (
            <select
              id="category-picker"
              multiple
              aria-label="Available trivia categories"
              size={CATEGORY_OPTIONS.length}
              className="mt-2 w-full rounded border border-gray-300 px-3 py-2"
              value={selectedCategories}
              onChange={(event) => {
                const options = Array.from(event.target.selectedOptions).map((option) => option.value);
                setSelectedCategories(options);
              }}
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        ) : null}
        {successMessage ? (
          <p role="status" aria-live="polite" className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save event'}
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onStartGame}
            disabled={isSaving}
          >
            Start game
          </button>
          <a
            className="rounded border border-gray-300 px-4 py-2 text-sm"
            href="#rounds"
            onClick={(event) => {
              event.preventDefault();
              onManageRounds();
            }}
          >
            Manage rounds
          </a>
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm"
            onClick={onViewScoreboard}
          >
            View scoreboard
          </button>
        </div>
      </form>

      <JoinCodeDisplay />
    </section>
  );
}
