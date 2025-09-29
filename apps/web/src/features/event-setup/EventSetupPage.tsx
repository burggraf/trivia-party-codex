import { FormEvent, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { TRIVIA_CATEGORIES, useEventState, type SaveEventInput } from '../shared/EventState';
import { JoinCodeDisplay } from './components/JoinCodeDisplay';
import { createEvent } from './actions/createEvent';

const CATEGORY_OPTIONS = [...TRIVIA_CATEGORIES];

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
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const allCategoriesSelected = selectedCategories.length === CATEGORY_OPTIONS.length;

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        return current.filter((value) => value !== category);
      }

      const next = new Set([...current, category]);
      return CATEGORY_OPTIONS.filter((option) => next.has(option));
    });
  };

  const handleToggleAllCategories = () => {
    setSelectedCategories((current) => (current.length === CATEGORY_OPTIONS.length ? [] : [...CATEGORY_OPTIONS]));
  };

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

  const handleCreateNewEvent = async () => {
    setIsCreating(true);
    setCreateError(null);

    const payload: SaveEventInput = {
      name,
      venue,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      roundCount: Number(roundCount) || 3,
      questionsPerRound: Number(questionsPerRound) || 5,
      categories: selectedCategories.length ? selectedCategories : CATEGORY_OPTIONS.slice(0, 1)
    };

    try {
      const newEvent = await createEvent(payload);
      const url = new URL(window.location.href);
      url.searchParams.set('eventId', newEvent.id);
      window.location.href = url.toString();
    } catch (error) {
      console.error('Failed to create new event', error);
      setCreateError(error instanceof Error ? error.message : 'Unable to create a new event right now.');
    } finally {
      setIsCreating(false);
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
            <fieldset id="category-picker" className="mt-2 rounded border border-gray-200 p-3">
              <legend className="mb-2 text-sm font-medium">Available trivia categories</legend>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-300 px-3 py-2 text-xs font-medium"
                  onClick={handleToggleAllCategories}
                >
                  {allCategoriesSelected ? 'Unselect all' : 'Select all'}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORY_OPTIONS.map((category, index) => {
                  const inputId = `category-${index}`;
                  const checked = selectedCategories.includes(category);
                  return (
                    <label key={category} htmlFor={inputId} className="flex items-center gap-2 text-sm">
                      <input
                        id={inputId}
                        type="checkbox"
                        value={category}
                        checked={checked}
                        onChange={() => handleToggleCategory(category)}
                      />
                      <span>{category}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
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
            onClick={handleCreateNewEvent}
            disabled={isSaving || isCreating}
          >
            {isCreating ? 'Creating…' : 'Create new event'}
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

      {createError ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {createError}
        </div>
      ) : null}

      <JoinCodeDisplay />
    </section>
  );
}
