import { CheckIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { SaveStatus } from './SaveStatus';

export function VisitQuestionsCard({
  visitPurpose,
  updateVisitPurpose,
  questions,
  updateQuestions,
  questionsSavedAt,
  questionsSaveStatus,
  saveQuestions,
  includeQuestions,
}: {
  visitPurpose: string;
  updateVisitPurpose: (value: string) => void;
  questions: string;
  updateQuestions: (value: string) => void;
  questionsSavedAt: string;
  questionsSaveStatus: 'idle' | 'saved' | 'error';
  saveQuestions: () => void;
  includeQuestions: boolean;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <section
      aria-labelledby="visit-plan-heading"
      className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 print:hidden"
    >
      <h2
        id="visit-plan-heading"
        className="text-base font-semibold text-gray-900"
      >
        {t('Prepare for your visit')}
      </h2>
      <p className="mt-1 hidden text-sm text-gray-600 sm:block">
        {t(
          'Start with what you want to discuss. Save your notes on this device, then choose the records to include.',
        )}
      </p>
      <div className="mt-4 grid gap-4">
        <label className="block text-sm font-medium text-gray-700">
          {t('Visit purpose')}
          <input
            className="mt-1 min-h-9 w-full rounded-md border-gray-300 text-base shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            value={visitPurpose}
            onChange={(event) => updateVisitPurpose(event.target.value)}
            placeholder={t('What is this visit about?')}
          />
        </label>
        <label
          className="block text-sm font-medium text-gray-700"
          htmlFor="visit-questions"
        >
          {t('Questions for visit')}
          <textarea
            id="visit-questions"
            className="mt-1 min-h-32 w-full rounded-md border-gray-300 text-base shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            value={questions}
            onChange={(event) => updateQuestions(event.target.value)}
            placeholder={t('Add symptoms, goals, and questions to discuss.')}
          />
        </label>
        {!includeQuestions && (
          <p
            className="rounded-md bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
          >
            {t(
              'Your visit purpose and questions are excluded from the summary. Select Visit questions below to include them; your notes stay here.',
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveQuestions}
            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <CheckIcon className="h-4 w-4" aria-hidden="true" />
            {t('Save visit notes')}
          </button>
          <div role="status" aria-live="polite">
            <SaveStatus
              savedAt={questionsSavedAt}
              status={questionsSaveStatus}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
