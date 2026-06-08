import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';
import { Modal } from '../../../shared/components/Modal';
import { ModalHeader } from '../../../shared/components/ModalHeader';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { useConnectionDoc } from '../../connections/hooks/useConnectionDoc';
import { buildRecordProvenance } from '../../provenance/provenance';
import { ImmunizationRecord } from '../types';

/** Day-precision key so doses given on the same visit group together. */
function dayKey(date?: string): string | undefined {
  return date ? date.slice(0, 10) : undefined;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export function ImmunizationDoseModal({
  record,
  records,
  open,
  onClose,
  onSelectRecord,
}: {
  record?: ImmunizationRecord;
  records: ImmunizationRecord[];
  open: boolean;
  onClose: () => void;
  onSelectRecord: (record: ImmunizationRecord) => void;
}) {
  const { t } = useInterfaceLanguage();
  const connection = useConnectionDoc(
    record?.document.connection_record_id ?? '',
  );

  const provenance = useMemo(
    () =>
      record ? buildRecordProvenance(record.document, connection) : undefined,
    [record, connection],
  );

  // Other doses recorded the same calendar day (i.e. the same visit).
  const sameDay = useMemo(() => {
    if (!record) return [];
    const key = dayKey(record.date);
    if (!key) return [];
    return records.filter(
      (other) => other.id !== record.id && dayKey(other.date) === key,
    );
  }, [record, records]);

  if (!record) return null;

  const clinic =
    asText(connection?.name) ||
    provenance?.sourceName ||
    asText(connection?.location);
  const location = asText(connection?.location) || provenance?.sourceLocation;
  const isManual = isManualRecord(record.document);

  const details: Array<{ label: string; value?: string }> = [
    { label: t('Type'), value: record.vaccineName },
    {
      label: t('Date given'),
      value: safeFormatDate(record.date, 'MMM d, yyyy', t('Undated')),
    },
    {
      label: t('Dose number'),
      value: record.doseNumber ? String(record.doseNumber) : undefined,
    },
    { label: t('Brand / manufacturer'), value: record.manufacturer },
    { label: t('Lot number'), value: record.lotNumber },
    { label: t('Administered by'), value: record.performer },
    { label: t('Status'), value: record.status },
  ];

  const source: Array<{ label: string; value?: string }> = [
    { label: t('Clinic / source'), value: clinic },
    {
      label: t('Location'),
      value: location !== clinic ? location : undefined,
    },
    { label: t('How it was added'), value: provenance?.entryMethod },
    {
      label: t('Last synced'),
      value: provenance?.retrievedAt
        ? safeFormatDate(provenance.retrievedAt, 'MMM d, yyyy', '')
        : undefined,
    },
  ];

  const shownDetails = details.filter((row) => !!row.value);
  const shownSource = source.filter((row) => !!row.value);

  return (
    <Modal open={open} setOpen={() => onClose()} afterLeave={onClose}>
      <ModalHeader
        title={record.vaccineName}
        subtitle={
          <p className="text-sm text-gray-500">
            {safeFormatDate(record.date, 'EEEE, MMMM d, yyyy', t('Undated'))}
          </p>
        }
        setClose={() => onClose()}
      />

      <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t('Details')}
          </h3>
          <dl className="mt-1 divide-y divide-gray-100 text-sm">
            {shownDetails.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value!} />
            ))}
          </dl>
        </section>

        {shownSource.length > 0 && (
          <section className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t('Where it came from')}
            </h3>
            <dl className="mt-1 divide-y divide-gray-100 text-sm">
              {shownSource.map((row) => (
                <DetailRow
                  key={row.label}
                  label={row.label}
                  value={row.value!}
                />
              ))}
            </dl>
          </section>
        )}

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t('Given the same day')}
          </h3>
          {sameDay.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {sameDay.map((other) => (
                <li key={other.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRecord(other)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-left text-sm ring-1 ring-inset ring-gray-200 transition-colors hover:bg-gray-100"
                  >
                    <span className="min-w-0 truncate font-medium text-gray-800">
                      {other.vaccineName}
                    </span>
                    {other.lotNumber && (
                      <span className="shrink-0 text-xs text-gray-500">
                        {t('Lot')} {other.lotNumber}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              {t('No other immunizations were recorded on this day.')}
            </p>
          )}
        </section>

        {isManual && (
          <div className="mt-5 flex justify-end">
            <Link
              to={AppRoutes.EditRecord.replace(':recordId', record.document.id)}
              className="text-sm font-semibold text-primary-700 hover:text-primary-900"
            >
              {t('Open source record')}
            </Link>
          </div>
        )}
      </div>
    </Modal>
  );
}
