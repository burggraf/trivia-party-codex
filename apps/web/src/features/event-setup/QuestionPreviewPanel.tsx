import { useId } from 'react';
import { useEventState } from '../shared/EventState';

export function QuestionPreviewPanel() {
  const { rounds, requestQuestionReplacement } = useEventState();
  const headingId = useId();

  if (!rounds.length) {
    return <p className="text-sm text-gray-500">No rounds configured yet.</p>;
  }

  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <h2 id={headingId} className="text-lg font-semibold text-gray-800">
        Round question preview
      </h2>

      {rounds.map((round) => {
        const categories = round.categories;
        const questionCount = round.questions.length;

        return (
          <article
            key={round.id}
            aria-label={`${round.title} with ${questionCount} questions`}
            className="rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Round {round.index + 1}</p>
                <h3 className="text-xl font-semibold text-gray-900">{round.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Selected categories">
                {categories.map((category) => (
                  <span
                    key={`${round.id}-${category}`}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </header>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {round.questions.map((question, index) => {
                const questionLabel = `Question ${index + 1}`;
                return (
                  <div
                    key={`${round.id}-${question.id}`}
                    role="group"
                    aria-labelledby={`${round.id}-${question.id}-title`}
                    aria-busy={question.replacing || undefined}
                    data-testid={`question-card-${index}`}
                    className="flex flex-col gap-3 rounded border border-gray-200 bg-white p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span
                          id={`${round.id}-${question.id}-title`}
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {questionLabel}
                        </span>
                        <span className="text-xs font-semibold text-blue-600" data-testid="category">
                          {question.category}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          void requestQuestionReplacement(round.id, question.id);
                        }}
                        disabled={question.replacing}
                      >
                        Replace question
                      </button>
                    </div>

                    <p className="text-sm text-gray-700" aria-live={question.replacing ? 'polite' : undefined}>
                      {question.prompt}
                    </p>

                    {question.replacing ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500" aria-live="assertive">
                        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                        Fetching replacement from {question.category} bank…
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {!round.questions.length ? (
                <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  No questions assigned yet.
                </div>
              ) : null}
            </div>

            <footer className="mt-4 text-xs text-gray-500">
              {questionCount} question{questionCount === 1 ? '' : 's'} scheduled • replacements keep category consistency
            </footer>
          </article>
        );
      })}
    </section>
  );
}
