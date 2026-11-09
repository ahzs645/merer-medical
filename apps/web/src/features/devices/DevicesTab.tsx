import { CpuChipIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { RecordListPage } from '../../shared/components/records/RecordListPage';
import { useRecordList } from '../../shared/hooks/useRecordList';
import { useListViewParams } from '../../shared/hooks/useListViewParams';
import { splitClinicalNote } from '../../shared/utils/clinicalNotes';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, isRecord } from '../../shared/utils/fhirText';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';

export interface DeviceItem {
  id: string;
  document: ClinicalDocument;
  name: string;
  type?: string;
  manufacturer?: string;
  status?: string;
  date?: string;
  notes: string[];
}

/**
 * Devices a patient uses — a CGM receiver, a CPAP, an insulin pump. They
 * arrived as Device records (from portals and from transposed letters) and no
 * page read them, so a Dexcom listed on a medication list simply vanished once
 * it was filed as what it is.
 */
export function mapDeviceDocs(docs: ClinicalDocument[]): DeviceItem[] {
  return docs.map((d) => {
    const r = getFhirResource<Record<string, unknown>>(d);
    const deviceNames = Array.isArray(r['deviceName'])
      ? (r['deviceName'] as unknown[])
          .map((n) => (isRecord(n) ? (n['name'] as string) : undefined))
          .filter((n): n is string => Boolean(n))
      : [];
    const notes = Array.isArray(r['note'])
      ? (r['note'] as unknown[]).flatMap((n) =>
          isRecord(n) ? splitClinicalNote(firstText(n['text'])) : [],
        )
      : [];
    return {
      id: d.id,
      document: d,
      name:
        d.metadata?.display_name ||
        deviceNames[0] ||
        firstText(r['type']) ||
        'Device',
      type: firstText(r['type']),
      manufacturer:
        typeof r['manufacturer'] === 'string' ? r['manufacturer'] : undefined,
      status: firstText(r['status']),
      date: d.metadata?.date,
      notes,
    };
  });
}

export function DevicesTab() {
  const { items, status, error } = useRecordList<DeviceItem>({
    resourceTypes: ['device'],
    mapDocs: mapDeviceDocs,
  });
  const { query, setQuery } = useListViewParams();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.type, item.manufacturer]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <RecordListPage
      title="Devices"
      search={{ query, onChange: setQuery, placeholder: 'Search devices' }}
      status={status}
      error={error}
      loadingText="Loading devices…"
      errorText="Unable to load devices."
      isEmpty={items.length === 0}
      isNoMatch={filtered.length === 0}
      noMatchText="No devices match this search."
      emptyText="No devices recorded yet. Glucose monitors, CPAP machines and other devices appear here as your records arrive."
      emptyIcon={<CpuChipIcon className="h-6 w-6" />}
    >
      {filtered.map((item) => (
        <article
          key={item.id}
          className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <div className="relative flex items-start justify-between pe-8 gap-3">
            {/* The card's actions — View source, Edit, History, Delete — sit
                behind one quiet button in its corner, not a row of buttons
                under every record. */}
            <div className="absolute -end-2 -top-1.5">
              <ManualRecordActions item={item.document} inline />
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-base font-semibold text-gray-900">
                {item.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.status && (
                  <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                    {item.status}
                  </span>
                )}
                {item.type && (
                  <span className="inline-flex items-center rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-600/10">
                    {item.type}
                  </span>
                )}
                {item.manufacturer && (
                  <span className="text-xs text-gray-500">
                    {item.manufacturer}
                  </span>
                )}
              </div>
            </div>
            {item.date && (
              <span className="shrink-0 text-sm text-gray-500">
                {safeFormatDate(item.date, 'PP', '')}
              </span>
            )}
          </div>
          {item.notes.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-gray-600">
              {item.notes.map((note, index) => (
                <li key={index} className="break-words">
                  {note}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </RecordListPage>
  );
}
