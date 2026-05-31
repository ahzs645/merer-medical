import { EyeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { OptometryRecord } from '../types';
import {
  PrescriptionTimelineEntry,
  getCurrentPrescriptions,
} from '../utils/prescriptionTimeline';
import { EyeRxTable } from './EyeRxTable';

export function CurrentPrescriptionPanel({
  records,
}: {
  records: OptometryRecord[];
}) {
  const { t } = useInterfaceLanguage();
  const { glasses, contacts } = getCurrentPrescriptions(records);

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Current prescription')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('Your most recent glasses and contact lens prescriptions.')}
          </p>
        </div>
      </div>

      {glasses || contacts ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <CurrentRxCard
            entry={glasses}
            variant="glasses"
            heading={t('Glasses')}
            emptyText={t('No glasses prescription on file yet.')}
          />
          <CurrentRxCard
            entry={contacts}
            variant="contacts"
            heading={t('Contact lenses')}
            emptyText={t('No contact lens prescription on file yet.')}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Add a glasses or contact lens prescription to see your current numbers here.',
          )}
        </p>
      )}
    </section>
  );
}

function CurrentRxCard({
  entry,
  variant,
  heading,
  emptyText,
}: {
  entry?: PrescriptionTimelineEntry;
  variant: 'glasses' | 'contacts';
  heading: string;
  emptyText: string;
}) {
  const { t } = useInterfaceLanguage();
  const Icon = variant === 'glasses' ? EyeIcon : SparklesIcon;

  return (
    <article className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-900">
          <Icon className="h-5 w-5" />
          <h3 className="text-sm font-semibold">{heading}</h3>
        </div>
        {entry && isManualRecord(entry.document) && (
          <Link
            to={AppRoutes.EditRecord.replace(':recordId', entry.document.id)}
            className="text-xs font-semibold text-primary-700 hover:text-primary-900"
          >
            {t('Edit')}
          </Link>
        )}
      </div>

      {entry ? (
        <>
          <p className="mt-1 text-xs text-gray-500">
            {[entry.date?.split('T')[0], entry.product, entry.prescriber]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <EyeRxTable od={entry.od} os={entry.os} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {entry.pd !== undefined && (
              <span>
                <span className="font-semibold text-gray-800">PD</span>{' '}
                {entry.pd} mm
              </span>
            )}
            {entry.od?.prism && (
              <span>
                <span className="font-semibold text-gray-800">
                  {t('OD prism')}
                </span>{' '}
                {entry.od.prism}
              </span>
            )}
            {entry.os?.prism && (
              <span>
                <span className="font-semibold text-gray-800">
                  {t('OS prism')}
                </span>{' '}
                {entry.os.prism}
              </span>
            )}
            {entry.od?.backCurve !== undefined && (
              <span>
                <span className="font-semibold text-gray-800">BC</span>{' '}
                {entry.od.backCurve}
                {entry.od.diameter !== undefined
                  ? ` · DIA ${entry.od.diameter}`
                  : ''}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-gray-600">{emptyText}</p>
      )}
    </article>
  );
}
