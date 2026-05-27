import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { AppPage } from '../../shared/components/AppPage';
import { EmptyRecordsPlaceholder } from '../../shared/components/EmptyRecordsPlaceholder';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

type MedicationItem = {
  id: string;
  name: string;
  status: string;
  date?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  condition?: string;
  note?: string;
  category?: string;
  document: ClinicalDocument;
};

export function MedicationsTab() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<MedicationItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchMedications() {
      setStatus('loading');
      const docs = await db.clinical_documents
        .find({
          selector: {
            user_id: user.id,
            'data_record.resource_type': { $in: ['medicationstatement'] },
          },
          sort: [{ 'metadata.date': 'desc' }],
        })
        .exec();

      if (!isMounted) return;
      setItems(docs.map((doc) => mapMedication(doc.toMutableJSON())));
      setStatus('success');
    }

    fetchMedications();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  const grouped = useMemo(
    () => ({
      active: items.filter((item) => item.status === 'active'),
      planned: items.filter((item) =>
        ['intended', 'on-hold', 'unknown'].includes(item.status),
      ),
      stopped: items.filter((item) =>
        ['stopped', 'completed', 'entered-in-error'].includes(item.status),
      ),
    }),
    [items],
  );

  return (
    <AppPage
      banner={
        <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-xl font-semibold text-gray-900">
              Medications
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Active, assigned, stopped, and supplement records with dose,
              route, frequency, and history.
            </p>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              Loading medications...
            </div>
          ) : items.length === 0 ? (
            <EmptyRecordsPlaceholder />
          ) : (
            <>
              <MedicationSection
                title="Current"
                icon={CheckCircleIcon}
                items={grouped.active}
              />
              <MedicationSection
                title="Assigned or conditional"
                icon={ClockIcon}
                items={grouped.planned}
              />
              <MedicationSection
                title="Stopped or historical"
                icon={NoSymbolIcon}
                items={grouped.stopped}
              />
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function MedicationSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MedicationItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary-700" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {title}
        </h2>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-gray-900">
                  {item.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{item.status}</Badge>
                  {item.category && <Badge>{item.category}</Badge>}
                  {item.condition && <Badge>{item.condition}</Badge>}
                </div>
              </div>
              <span className="shrink-0 text-sm text-gray-500">
                {formatDate(item.date)}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {item.dose && <Detail label="Dose" value={item.dose} />}
              {item.frequency && (
                <Detail label="Frequency" value={item.frequency} />
              )}
              {item.route && <Detail label="Route" value={item.route} />}
            </dl>
            {item.note && (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700">
                {item.note}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

function mapMedication(document: ClinicalDocument): MedicationItem {
  const raw = document.data_record.raw as any;
  const resource = raw?.resource || raw || {};
  const dosage = resource.dosage?.[0] || {};

  return {
    id: document.id,
    document,
    name:
      document.metadata?.display_name ||
      resource.medicationCodeableConcept?.text ||
      resource.medicationCodeableConcept?.coding?.[0]?.display ||
      'Medication',
    status: resource.status || 'unknown',
    date:
      document.metadata?.date ||
      resource.effectiveDateTime ||
      resource.effectivePeriod?.start,
    dose: dosage.text,
    frequency: dosage.timing?.code?.text,
    route: dosage.route?.text,
    condition:
      resource.reasonCode?.[0]?.text ||
      resource.reasonCode?.[0]?.coding?.[0]?.display,
    category: resource.category?.text || raw?.medication_category,
    note: resource.note?.map((note: { text?: string }) => note.text).join('\n'),
  };
}

function formatDate(date?: string) {
  if (!date) return 'Undated';
  try {
    return format(parseISO(date), 'MMM d, yyyy');
  } catch {
    return date;
  }
}
