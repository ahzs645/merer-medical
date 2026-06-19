import { useEffect, useMemo, useState } from 'react';
import { PrinterIcon, IdentificationIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { conceptCodes, firstText, isRecord } from '../../shared/utils/fhirText';

interface WalletItem {
  id: string;
  name: string;
  detail?: string;
}

interface WalletData {
  medications: WalletItem[];
  allergies: WalletItem[];
  conditions: WalletItem[];
  bloodType?: string;
}

const MEDICATION_RESOURCE_TYPES = [
  'medicationstatement',
  'medicationrequest',
  'medicationorder',
];

function isActive(resource: Record<string, unknown>): boolean {
  const status = firstText(resource['clinicalStatus'] || resource['status']);
  const normalized = status?.toLowerCase();
  if (!normalized) return true;
  return ![
    'resolved',
    'inactive',
    'completed',
    'stopped',
    'entered-in-error',
  ].includes(normalized);
}

function useWalletData(): { data: WalletData; status: 'loading' | 'success' } {
  const db = useRxDb();
  const user = useUser();
  const [data, setData] = useState<WalletData>({
    medications: [],
    allergies: [],
    conditions: [],
  });
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      const fetch = async (rt: string | string[]) =>
        (
          await db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': Array.isArray(rt)
                  ? { $in: rt }
                  : rt,
              },
            })
            .exec()
        ).map((d) => d.toMutableJSON() as ClinicalDocument);

      const [medDocs, allergyDocs, conditionDocs, observationDocs] =
        await Promise.all([
          fetch(MEDICATION_RESOURCE_TYPES),
          fetch('allergyintolerance'),
          fetch('condition'),
          fetch('observation'),
        ]);
      if (!mounted) return;

      const medications = dedupe(
        medDocs.flatMap((doc): WalletItem[] => {
          const r = getFhirResource<Record<string, unknown>>(doc);
          if (!isActive(r)) return [];
          const name =
            doc.metadata?.display_name ||
            firstText(r['medicationCodeableConcept'] || r['medication']) ||
            'Medication';
          return [{ id: doc.id, name, detail: dosageText(r) }];
        }),
      );

      const allergies = dedupe(
        allergyDocs.map((doc) => {
          const r = getFhirResource<Record<string, unknown>>(doc);
          return {
            id: doc.id,
            name:
              doc.metadata?.display_name || firstText(r['code']) || 'Allergy',
            detail: reactionText(r),
          };
        }),
      );

      const conditions = dedupe(
        conditionDocs.flatMap((doc): WalletItem[] => {
          const r = getFhirResource<Record<string, unknown>>(doc);
          if (!isActive(r)) return [];
          return [
            {
              id: doc.id,
              name:
                doc.metadata?.display_name ||
                firstText(r['code']) ||
                'Condition',
              detail: conceptCodes(r['code'])[0],
            },
          ];
        }),
      );

      const bloodType = observationDocs
        .map((doc) => getFhirResource<Record<string, unknown>>(doc))
        .filter((r) =>
          conceptCodes(r['code']).some((c) => ['883-9', '882-1'].includes(c)),
        )
        .map((r) => firstText(r['valueCodeableConcept'] || r['valueString']))
        .find(Boolean);

      setData({ medications, allergies, conditions, bloodType });
      setStatus('success');
    }
    load();
    return () => {
      mounted = false;
    };
  }, [db, user.id]);

  return { data, status };
}

function dosageText(resource: Record<string, unknown>): string | undefined {
  const dosage = resource['dosage'];
  if (Array.isArray(dosage) && isRecord(dosage[0])) {
    return firstText(dosage[0]['text']) || firstText(dosage[0]);
  }
  return undefined;
}

function reactionText(resource: Record<string, unknown>): string | undefined {
  const reaction = resource['reaction'];
  if (Array.isArray(reaction) && isRecord(reaction[0])) {
    const manifestation = firstText(reaction[0]['manifestation']);
    const severity = firstText(reaction[0]['severity']);
    return [manifestation, severity].filter(Boolean).join(' · ') || undefined;
  }
  return firstText(resource['criticality']);
}

function dedupe(items: WalletItem[]): WalletItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ageFromBirthday(birthday?: string, now = new Date()): string {
  if (!birthday) return '';
  const dob = new Date(birthday);
  if (Number.isNaN(dob.getTime())) return '';
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return `${age} yrs`;
}

export function WalletCardTab() {
  const user = useUser();
  const { data, status } = useWalletData();
  const generatedAt = useMemo(() => new Date(), []);

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <AppPage banner={<GenericBanner text="Wallet Card" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between print:hidden">
            <p className="text-sm text-gray-600">
              A printable emergency summary. Carry it in your wallet or show it
              to a provider.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              <PrinterIcon className="h-5 w-5" />
              Print
            </button>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 print:shadow-none print:ring-0">
            <div className="flex items-center gap-3 bg-primary-800 px-5 py-4 text-white print:bg-primary-800">
              <IdentificationIcon className="h-8 w-8 shrink-0" />
              <div>
                <h2 className="text-xl font-bold leading-tight">
                  {fullName || 'Patient'}
                </h2>
                <p className="text-sm text-primary-100">
                  {[
                    user.gender,
                    ageFromBirthday(user.birthday, generatedAt),
                    user.birthday
                      ? `DOB ${safeFormatDate(user.birthday, 'PP', '')}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {data.bloodType && (
                <div className="ml-auto rounded-md bg-white/15 px-3 py-1 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-primary-100">
                    Blood
                  </div>
                  <div className="text-lg font-bold">{data.bloodType}</div>
                </div>
              )}
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-3">
              <WalletSection
                title="Allergies"
                items={data.allergies}
                emphasis
                empty="No known allergies"
                loading={status === 'loading'}
              />
              <WalletSection
                title="Conditions"
                items={data.conditions}
                empty="None recorded"
                loading={status === 'loading'}
              />
              <WalletSection
                title="Medications"
                items={data.medications}
                empty="None recorded"
                loading={status === 'loading'}
              />
            </div>

            <div className="border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
              Generated by Mere Medical on{' '}
              {safeFormatDate(generatedAt.toISOString(), 'PP', '')}. Verify with
              your care team — this summary may be incomplete.
            </div>
          </div>
        </div>
      </div>
    </AppPage>
  );
}

function WalletSection({
  title,
  items,
  empty,
  emphasis,
  loading,
}: {
  title: string;
  items: WalletItem[];
  empty: string;
  emphasis?: boolean;
  loading: boolean;
}) {
  return (
    <div>
      <h3
        className={`text-sm font-bold uppercase tracking-wide ${
          emphasis ? 'text-red-700' : 'text-gray-700'
        }`}
      >
        {title}
      </h3>
      {loading ? (
        <p className="mt-2 text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm italic text-gray-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="text-sm text-gray-900">
              <span className="font-medium">{item.name}</span>
              {item.detail && (
                <span className="block text-xs text-gray-500">
                  {item.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
