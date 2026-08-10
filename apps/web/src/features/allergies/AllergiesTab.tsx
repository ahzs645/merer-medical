import { useMemo, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Badge } from '../../shared/components/Badge';
import { RecordListPage } from '../../shared/components/records/RecordListPage';
import { RecordHeaderButton } from '../../shared/components/records/RecordPageHeader';
import {
  compareByDateDesc,
  useRecordList,
} from '../../shared/hooks/useRecordList';
import { isAllergyNegation } from '../../shared/utils/allergyNegation';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getAllergyIntoleranceDisplayName } from '../../shared/utils/fhirAccessHelpers';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, periodStart } from '../../shared/utils/fhirText';
import { ManualRecordModal } from '../manual-entry/ManualRecordModal';

interface AllergyItem {
  id: string;
  name: string;
  clinicalStatus?: string;
  reaction?: string;
  severity?: string;
  date?: string;
  source?: string;
  /**
   * True for resources that record the *absence* of an allergy ("No Known
   * Allergies") or that no history was taken ("Not on File"). They stay in the
   * list — they are real records — but below the allergens, not among them.
   */
  isNegation: boolean;
}

function mapAllergyDocs(
  docs: ClinicalDocument[],
  connectionsById: Map<string, ConnectionDocument>,
): AllergyItem[] {
  return docs.map((d) => {
    const r = getFhirResource<Record<string, unknown>>(d);
    const reaction = Array.isArray(r['reaction'])
      ? (r['reaction'][0] as Record<string, unknown> | undefined)
      : undefined;
    const name =
      getAllergyIntoleranceDisplayName(d) ||
      d.metadata?.display_name ||
      firstText(r['code']) ||
      'Allergy';
    return {
      id: d.id,
      name,
      clinicalStatus: firstText(r['clinicalStatus']),
      reaction: firstText(reaction?.['manifestation']),
      severity: firstText(reaction?.['severity']),
      date:
        (r['recordedDate'] as string) ||
        (r['onsetDateTime'] as string) ||
        periodStart(r['onsetPeriod']) ||
        d.metadata?.date,
      source:
        connectionsById.get(d.connection_record_id)?.name ||
        d.metadata?.source_name,
      // Same codes/heuristic the wallet card uses, so the two screens agree on
      // what counts as an allergen.
      isNegation: isAllergyNegation(r, name),
    };
  });
}

function useAllergies() {
  return useRecordList<AllergyItem>({
    resourceTypes: ['allergyintolerance'],
    mapDocs: mapAllergyDocs,
    sort: compareByDateDesc,
  });
}

export function AllergiesTab() {
  const { items, status, error } = useAllergies();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const { allergens, alsoRecorded } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (item: AllergyItem) =>
      !q ||
      [item.name, item.reaction, item.source]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));

    return {
      allergens: items.filter((item) => !item.isNegation && matches(item)),
      alsoRecorded: items.filter((item) => item.isNegation && matches(item)),
    };
  }, [items, query]);

  return (
    <RecordListPage
      title="Allergies"
      search={{
        query,
        onChange: setQuery,
        placeholder: 'Search allergies',
        label: 'Search allergies',
      }}
      // Adding an allergy used to be a button on the Medications banner, which
      // is where you would look for it last. It belongs on the page that owns
      // the list.
      action={
        <RecordHeaderButton
          onClick={() => setAddOpen(true)}
          label="Add allergy"
          compact
        />
      }
      status={status}
      error={error}
      loadingText="Loading allergies…"
      errorText="Unable to load allergies."
      isEmpty={items.length === 0}
      emptyText="No allergies recorded yet."
      emptyIcon={<ExclamationTriangleIcon className="h-6 w-6" />}
      isNoMatch={allergens.length === 0 && alsoRecorded.length === 0}
      noMatchText="No allergies match this search."
    >
      {/* Saving notifies the record-change signal, so the list refreshes in
          place without a reload. */}
      <ManualRecordModal
        open={addOpen}
        initialRecordType="allergyintolerance"
        onClose={() => setAddOpen(false)}
      />
      {/* Count the allergens, not the record rows: "No Known Allergies" and
          "Not on File" are statements about the list, not entries in it. */}
      <p className="text-sm text-gray-600">
        {allergens.length === 1
          ? '1 allergen'
          : `${allergens.length} allergens`}
      </p>

      {allergens.map((item) => (
        <AllergyCard key={item.id} item={item} />
      ))}

      {allergens.length === 0 && (
        <p className="rounded-md bg-white p-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
          No allergens recorded.
        </p>
      )}

      {alsoRecorded.length > 0 && (
        <section className="mt-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Also recorded
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            These entries state that no allergy was found or that no allergy
            history was taken. They are not allergens.
          </p>
          <div className="mt-2 grid gap-2">
            {alsoRecorded.map((item) => (
              <AllergyCard key={item.id} item={item} muted />
            ))}
          </div>
        </section>
      )}
    </RecordListPage>
  );
}

function AllergyCard({ item, muted }: { item: AllergyItem; muted?: boolean }) {
  return (
    <article
      className={`flex items-start justify-between gap-3 rounded-md p-4 shadow-sm ring-1 ${
        muted ? 'bg-gray-50 ring-gray-200' : 'bg-white ring-gray-200'
      }`}
    >
      <div className="min-w-0">
        <h3
          className={`break-words text-sm font-semibold ${
            muted ? 'text-gray-700' : 'text-gray-900'
          }`}
        >
          {item.name}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {muted && <Badge tone="neutral">Not an allergen</Badge>}
          {item.clinicalStatus && (
            <Badge className="capitalize">{item.clinicalStatus}</Badge>
          )}
          {item.reaction && <span>· {item.reaction}</span>}
          {item.severity && (
            <span className="capitalize">· {item.severity}</span>
          )}
          {item.source && <span>· {item.source}</span>}
        </div>
      </div>
      {item.date && (
        <span className="shrink-0 text-sm text-gray-500">
          {safeFormatDate(item.date, 'PP', '')}
        </span>
      )}
    </article>
  );
}
