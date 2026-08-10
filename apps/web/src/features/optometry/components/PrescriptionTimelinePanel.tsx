import { Link } from 'react-router-dom';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { OptometryRecord } from '../types';
import {
  EyeRxDelta,
  PrescriptionTimelineEntry,
  buildPrescriptionTimeline,
  formatDelta,
} from '../utils/prescriptionTimeline';
import { EyeRxTable } from './EyeRxTable';

const classBadge = {
  glasses: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  contacts: 'bg-teal-50 text-teal-700 ring-teal-200',
};

export function PrescriptionTimelinePanel({
  records,
}: {
  records: OptometryRecord[];
}) {
  const { t } = useInterfaceLanguage();
  const timeline = buildPrescriptionTimeline(records);

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Prescription timeline')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'How your glasses and contact lens prescriptions have changed over time.',
            )}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase text-gray-500">
          {timeline.length} {t('prescriptions')}
        </span>
      </div>

      {timeline.length > 0 ? (
        <ol className="mt-4">
          {timeline.map((entry, index) => (
            <TimelineRow
              key={entry.id}
              entry={entry}
              isLast={index === timeline.length - 1}
            />
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Glasses and contact lens prescriptions will appear here as a dated timeline once added or synced.',
          )}
        </p>
      )}
    </section>
  );
}

function TimelineRow({
  entry,
  isLast,
}: {
  entry: PrescriptionTimelineEntry;
  isLast: boolean;
}) {
  const { t } = useInterfaceLanguage();
  const changeSummary = buildChangeSummary(entry.odDelta, entry.osDelta);

  return (
    <li className="relative flex gap-3 pb-4">
      {/* timeline rail */}
      <div className="flex flex-col items-center">
        <span
          className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white ${
            entry.isCurrent ? 'bg-primary-600' : 'bg-gray-300'
          }`}
        />
        {!isLast && <span className="w-px flex-1 bg-gray-200" />}
      </div>

      <div className="min-w-0 flex-1 rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {entry.title}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${classBadge[entry.rxClass]}`}
            >
              {t(entry.rxClass)}
            </span>
            {entry.isCurrent && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold uppercase text-primary-700 ring-1 ring-primary-200">
                {t('Current')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isManualRecord(entry.document) && (
              <Link
                to={AppRoutes.EditRecord.replace(
                  ':recordId',
                  entry.document.id,
                )}
                className="text-xs font-semibold text-primary-700 hover:text-primary-900"
              >
                {t('Edit')}
              </Link>
            )}
            <span className="text-xs font-medium text-gray-500">
              {entry.date?.split('T')[0] || t('Undated')}
            </span>
          </div>
        </div>

        {(entry.product || entry.prescriber) && (
          <p className="mt-0.5 text-xs text-gray-500">
            {[entry.product, entry.prescriber].filter(Boolean).join(' · ')}
          </p>
        )}

        <EyeRxTable
          od={entry.od}
          os={entry.os}
          odDelta={entry.odDelta}
          osDelta={entry.osDelta}
        />

        <p className="mt-2 text-xs text-gray-600">
          {changeSummary
            ? `${t('Change since previous')}: ${changeSummary}`
            : t('No change from the previous prescription of this type.')}
        </p>
      </div>
    </li>
  );
}

function buildChangeSummary(odDelta?: EyeRxDelta, osDelta?: EyeRxDelta) {
  const parts: string[] = [];
  appendDeltaParts(parts, 'OD', odDelta);
  appendDeltaParts(parts, 'OS', osDelta);
  return parts.join(', ');
}

function appendDeltaParts(target: string[], eye: string, delta?: EyeRxDelta) {
  if (!delta) return;
  const labels: Array<[keyof EyeRxDelta, string, 'power' | 'axis']> = [
    ['sphere', 'sphere', 'power'],
    ['cylinder', 'cyl', 'power'],
    ['axis', 'axis', 'axis'],
    ['add', 'add', 'power'],
  ];
  for (const [key, label, kind] of labels) {
    const formatted = formatDelta(delta[key], kind);
    if (formatted) target.push(`${eye} ${label} ${formatted}`);
  }
}
