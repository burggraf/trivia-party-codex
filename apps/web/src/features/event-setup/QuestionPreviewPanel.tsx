import { useEventState } from '../shared/EventState';

export function QuestionPreviewPanel() {
  const { rounds, requestQuestionReplacement } = useEventState();

  if (!rounds.length) {
    return <p className="text-sm text-gray-500">No rounds configured yet.</p>;
  }

  return (
    <section className="space-y-6">
      {rounds.map((round) => {
        const categories = round.categories.join(', ');

        return (
          <article key={round.id} className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">{round.title}</h2>
                <p className="text-xs uppercase tracking-wide text-gray-400">Round {round.index + 1}</p>
              </div>
              <p className="text-sm text-gray-500">Categories: {categories}</p>
            </header>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {round.questions.map((question, index) => (
                <div
                  key={`${round.id}-${question.id}`}
                  data-testid={`question-card-${index}`}
                  className="grid gap-3 rounded border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide" data-testid="category">
                      {question.category}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 disabled:opacity-50"
                      onClick={() => {
                        void requestQuestionReplacement(round.id, question.id);
                      }}
                      disabled={question.replacing}
                    >
                      Remove question
                    </button>
                  </div>

                  <p className="text-sm text-gray-600">{question.prompt}</p>

                  {question.replacing ? (
                    <div className="text-xs text-gray-500" aria-live="polite">
                      Fetching replacement...
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
