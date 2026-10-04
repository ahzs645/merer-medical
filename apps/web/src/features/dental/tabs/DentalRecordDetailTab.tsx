import { Link, useNavigate, useParams } from 'react-router-dom';

import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { formatRecordDate } from '../../../shared/utils/dateFormatters';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { ManualRecordActions } from '../../manual-entry/ManualRecordActions';
import { ProvenancePanel } from '../../provenance/ProvenancePanel';
import { KIND_LABELS } from '../components/DentalRecordsPanel';
import { LevelBadge } from '../components/ToothChartPanel';
import { useDentalContext } from '../hooks/useDentalContext';
import { useToothNumbering } from '../hooks/useToothNumbering';
import { DentalRecord } from '../types';
import {
  readPerioSites,
  recordActionLevel,
} from '../utils/dentalClinicalModels';
import { describeTooth } from '../utils/dentalReferenceData';

/**
 * One dental record, in full. Before this, a dental record could be seen only
 * as a card in a list — two lines of summary, nothing to open — so its notes,
 * costs, provider and source were out of reach unless it had been typed in by
 * hand and could be edited.
 */
export function DentalRecordDetailTab() {
  const { recordId = '' } = useParams();
  const { t } = useInterfaceLanguage();
  const navigate = useNavigate();
  const [numbering] = useToothNumbering();
  const { records, recordsByTooth } = useDentalContext();
  const id = decodeURIComponent(recordId);
  const record = records.find((item) => item.id === id);

  if (!record) {
    return (
      <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          {t('Record not found')}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t(
            'This record is not among your dental records. It may have been deleted.',
          )}
        </p>
        <Link
          to={AppRoutes.DentalRecords}
          className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-primary-700"
        >
          {t('All dental records')}
        </Link>
      </section>
    );
  }

  const level = recordActionLevel(record, recordsByTooth);
  const details = record.details || {};
  const perio = record.kind === 'perio' ? readPerioSites(record) : undefined;
  const deepest = perio?.depths.length
    ? Math.max(...perio.depths.map((site) => site.depth))
    : undefined;
  const sourceDocumentId = record.document.metadata?.source_document_id;

  const facts: [string, string | undefined][] = [
    ['Date', formatRecordDate(record.date, '') || undefined],
    ['Status', details.dentalStatus || statusWord(record)],
    [
      'Surfaces',
      record.surfaces.length ? record.surfaces.join(', ') : undefined,
    ],
    ['Provider', details.dentalProvider],
    ['Location', details.dentalLocation],
    ['Procedure code', details.procedureCode],
    ['Severity', details.dentalSeverity],
    ['Fee', details.estimatedCost],
    ['Insurance estimate', details.insuranceEstimate],
    ['Patient portion', details.patientPortion],
    ['Planned items', details.treatmentPlanItems],
    [
      'Next due',
      details.recallDueDate
        ? formatRecordDate(details.recallDueDate, details.recallDueDate)
        : undefined,
    ],
    ['Recall', details.dentalRecall],
    ['Follow-up', details.dentalFollowUp],
    ['Deepest pocket', deepest !== undefined ? `${deepest} mm` : undefined],
    [
      'Bleeding sites',
      perio?.bleedingSites !== undefined ? `${perio.bleedingSites}` : undefined,
    ],
    ['Phase', details.orthoPhase],
    ['Appliance', details.orthoAppliance],
    [
      'Aligner',
      details.alignerCurrent && details.alignerTotal
        ? `${details.alignerCurrent}/${details.alignerTotal}`
        : undefined,
    ],
    ['Next visit', details.nextVisit],
  ];

  return (
    <article className="grid gap-4">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary-700 hover:text-primary-900"
        >
          ← {t('Back')}
        </button>
      </div>
      <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-gray-600">
              {t(KIND_LABELS[record.kind])}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">
              {record.title}
            </h2>
          </div>
          <LevelBadge level={level} />
        </div>

        {record.toothNumbers.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {record.toothNumbers.map((tooth) => {
              const described = describeTooth(tooth, numbering);
              return (
                <li
                  key={tooth}
                  className="rounded-md bg-gray-50 px-2 py-1 text-sm ring-1 ring-gray-200"
                >
                  <span className="font-semibold text-gray-900">
                    {t('Tooth')} {described.primary}
                  </span>{' '}
                  <span className="text-gray-600">
                    {t(described.name)} ({described.secondary})
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium text-gray-600">
                  {t(label)}
                </dt>
                <dd className="text-sm text-gray-900">{value}</dd>
              </div>
            ))}
        </dl>

        {record.summary && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('Notes')}
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-800">
              {record.summary}
            </p>
          </div>
        )}

        {sourceDocumentId && (
          <Link
            to={AppRoutes.DocumentDetail.replace(
              ':documentId',
              encodeURIComponent(sourceDocumentId),
            )}
            className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-primary-700 hover:text-primary-900"
          >
            {t('Open the source document')}
          </Link>
        )}

        <div className="mt-3">
          <ManualRecordActions
            item={record.document}
            explainReadOnly={!isManualRecord(record.document)}
          />
        </div>
      </section>

      <ProvenancePanel document={record.document} />
    </article>
  );
}

function statusWord(record: DentalRecord): string | undefined {
  switch (record.status) {
    case 'open':
      return 'Open';
    case 'planned':
      return 'Planned';
    case 'done':
      return 'Done';
    case 'resolved':
      return 'Resolved';
    case 'cancelled':
      return 'Cancelled';
    default:
      return undefined;
  }
}
