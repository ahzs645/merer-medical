import { DentalWorkflowContext } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export function DentalWorkflowContextPanel({
  context,
}: {
  context: DentalWorkflowContext;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('Workflow context')}
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ContextStat label="Open issues" value={context.openDentalIssues} />
        <ContextStat
          label="Planned treatment"
          value={context.plannedTreatmentCount}
        />
        <ContextStat label="Perio records" value={context.perioRecordCount} />
        <ContextStat label="Imaging" value={context.imagingCount} />
      </div>
      <div className="mt-3 rounded-md bg-gray-50 p-3">
        <p className="text-xs font-semibold uppercase text-gray-500">
          {t('Next actions')}
        </p>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {context.nextActions.map((action) => (
            <li key={action}>{t(action)}</li>
          ))}
        </ul>
      </div>
      {context.latestRecord && (
        <p className="mt-3 text-sm text-gray-600">
          {t('Latest')}: {context.latestRecord.title}
        </p>
      )}
    </section>
  );
}

function ContextStat({ label, value }: { label: string; value: number }) {
  const { t } = useInterfaceLanguage();

  return (
    <div className="rounded-md bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase text-gray-500">
        {t(label)}
      </p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
