import { useMemo, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Badge } from '../../shared/components/Badge';
import {
  EmptyStateButton,
  RecordListPage,
} from '../../shared/components/records/RecordListPage';
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
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import { ManualRecordModal } from '../manual-entry/ManualRecordModal';
import { ManualSourceDocumentLink } from '../manual-entry/ManualSourceDocumentLink';
import { FactList } from '../../shared/components/FactList';
import { useListViewParams } from '../../shared/hooks/useListViewParams';

interface AllergyItem {
  id: string;
  /** Kept for `ManualRecordActions`, which decides for itself whether this
   *  record was typed here or arrived from a provider. */
  document: ClinicalDocument;
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
      document: d,
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
  // Search lives in the URL, so the view survives Back, can be linked, and
  // comes back the same length it left — see useListViewParams.
  const { query, setQuery } = useListViewParams();
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
      // The dialog slot, not `children`: `children` only render once the list
      // has something in it, so "Add allergy" was a dead click on an empty
      // list — exactly when a new user reaches for it.
      dialogs={
        <ManualRecordModal
          open={addOpen}
          initialRecordType="allergyintolerance"
          onClose={() => setAddOpen(false)}
        />
      }
      status={status}
      error={error}
      loadingText="Loading allergies…"
      errorText="Unable to load allergies."
      isEmpty={items.length === 0}
      emptyText="No allergies recorded yet."
      emptyIcon={<ExclamationTriangleIcon className="h-6 w-6" />}
      emptyAction={
        <EmptyStateButton
          onClick={() => setAddOpen(true)}
          label="Add allergy"
        />
      }
      isNoMatch={allergens.length === 0 && alsoRecorded.length === 0}
      noMatchText="No allergies match this search."
    >
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

      {/* A negation is not an entry in this list, so it is not given a row in
          it. It used to get a full card with five actions — the same weight as
          a real allergen — for a record that says there is nothing here, and a
          portal that sends "Not on File" three times produced three of them.

          It is not nothing either: an empty list means nobody wrote anything
          down, while "No Known Allergies" means someone asked and recorded the
          answer, which is the difference you want before a procedure. So it
          becomes the sentence the page says when it has no allergens, rather
          than a card competing with them. */}
      {allergens.length === 0 && (
        <div className="rounded-md bg-white p-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
          {alsoRecorded.length > 0 ? (
            <NegationStatement item={alsoRecorded[0]} />
          ) : (
            'No allergens recorded.'
          )}
        </div>
      )}

      {/* With allergens on the list, a record saying there are none is
          contradicted by the page it is on. Stating it once, quietly, says
          which source disagrees without putting "No Known Allergies" beside an
          allergen where it could be read as covering it. */}
      {allergens.length > 0 && alsoRecorded.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          {alsoRecorded.length === 1
            ? `${alsoRecorded[0].source || 'Another source'} recorded “${alsoRecorded[0].name}”${
                alsoRecorded[0].date
                  ? ` on ${safeFormatDate(alsoRecorded[0].date, 'PP', '')}`
                  : ''
              }.`
            : `${alsoRecorded.length} sources recorded no known allergy.`}
        </p>
      )}
    </RecordListPage>
  );
}

/**
 * What the page says instead of "No allergens recorded." when a source actually
 * asserted it. Keeps the date, the source and a way through to the document,
 * without the row of record actions a real allergen carries.
 */
function NegationStatement({ item }: { item: AllergyItem }) {
  return (
    <>
      <p className="font-medium text-gray-900">{item.name}</p>
      <p className="mt-1 text-xs text-gray-500">
        <FactList
          facts={[
            item.source,
            item.date ? safeFormatDate(item.date, 'PP', '') : null,
          ]}
        />
      </p>
      <ManualSourceDocumentLink item={item.document} />
    </>
  );
}

// The card renders allergens only. Negations are a sentence now, so the muted
// variant that made one look like a greyed-out allergen has gone with them.
function AllergyCard({ item }: { item: AllergyItem }) {
  return (
    <article className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-gray-900">
            {item.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {item.clinicalStatus && (
              <Badge className="capitalize">{item.clinicalStatus}</Badge>
            )}
            <FactList
              facts={[
                item.reaction,
                item.severity ? (
                  <span className="capitalize">{item.severity}</span>
                ) : null,
                item.source,
              ]}
            />
          </div>
        </div>
        {item.date && (
          <span className="shrink-0 text-sm text-gray-500">
            {safeFormatDate(item.date, 'PP', '')}
          </span>
        )}
      </div>
      <ManualRecordActions item={item.document} />
    </article>
  );
}
