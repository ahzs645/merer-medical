import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';
import { DentalWorkflowContext } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalWorkflowContextPanel({
  context,
}: {
  context: DentalWorkflowContext;
}) {
  const { t } = useInterfaceLanguage();
  const openIssues = context.openDentalIssues;
  // Built as one string so it stays a single text node for the runtime
  // translator instead of splitting into untranslatable fragments.
  const openIssuesText = `${openIssues} ${
    openIssues === 1 ? 'open issue' : 'open issues'
  } to follow up`;

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          What to do next
        </h2>
        {/* The chart moved to its own tab, so point people at it from here. */}
        <Link
          to={AppRoutes.DentalChart}
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary-700 hover:text-primary-900"
        >
          Open your tooth chart
        </Link>
      </div>
      {/* The counts that used to sit here (planned treatment, perio, imaging)
          repeated the stat tiles above and the record count in the header. */}
      <p className="mt-1 text-sm text-gray-600">{openIssuesText}</p>
      <ul className="mt-3 space-y-1 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
        {context.nextActions.map((action) => (
          <li key={action}>{t(action)}</li>
        ))}
      </ul>
      {context.latestRecord && (
        <p className="mt-3 text-sm text-gray-600">
          {t('Latest')}: {context.latestRecord.title}
        </p>
      )}
    </section>
  );
}
