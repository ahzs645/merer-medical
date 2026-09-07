import { useEffect, useMemo, useState } from 'react';
import { PrinterIcon, IdentificationIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { isAllergyNegation } from '../../shared/utils/allergyNegation';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getAllergyIntoleranceDisplayName } from '../../shared/utils/fhirAccessHelpers';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { conceptCodes, firstText, isRecord } from '../../shared/utils/fhirText';
import { useRecordChangeTick } from '../../shared/utils/recordChangeSignal';

interface WalletItem {
  id: string;
  name: string;
  detail?: string;
  /** Full, untrimmed source text — kept as a tooltip when `detail` is a summary. */
  fullDetail?: string;
  /** Emergency triage weight; lower sorts first. See the rank helpers below. */
  rank: number;
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

/**
 * Rows shown per column before the card stops fitting on a folded card. The
 * rest stay in the DOM behind a "+N more" toggle and always print.
 */
const SCREEN_ROW_CAP = 5;

/**
 * Emergency triage weights. Whoever reads this card is reading it in a hurry,
 * so the entries that change immediate treatment have to be on the first
 * lines rather than wherever the portal's export order happened to put them.
 * Lower rank sorts first; unknown severity beats a documented mild reaction,
 * because "we don't know" is the more dangerous case.
 */
function allergyRank(resource: Record<string, unknown>): number {
  const reactions = Array.isArray(resource['reaction'])
    ? resource['reaction'].filter(isRecord)
    : [];
  const signal = [
    firstText(resource['criticality']),
    ...reactions.flatMap((reaction) => [
      firstText(reaction['severity']),
      firstText(reaction['manifestation']),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/anaphyla|airway|unable-to-assess/.test(signal)) return 0;
  if (/severe|high/.test(signal)) return 1;
  if (/moderate/.test(signal)) return 2;
  if (/mild|low/.test(signal)) return 4;
  return 3;
}

/** Diagnoses that change how a responder treats everything else. */
const CRITICAL_CONDITION =
  /anaphyla|asthma|copd|emphysema|seizure|epilep|diabet|hypoglyc|cardiac|heart (failure|disease|attack|block)|coronary|myocardial|infarct|angina|arrhythm|fibrillation|pacemaker|defibrillator|stroke|ischemi|hypertension|renal failure|kidney disease|dialysis|transplant|cancer|carcinoma|leukemia|lymphoma|malignan|hemophil|sickle cell|bleeding disorder|thromb|embolism|immunodefic|\bhiv\b|adrenal insufficiency|pregnan|dementia|alzheimer|cirrhosis|hepatitis|sepsis/i;

/**
 * Screening scores, dental charting and social history are legitimate records
 * but they are not what an emergency reader needs in the first ten seconds,
 * so they sink below everything else.
 */
const BACKGROUND_CONDITION =
  /^(risk (for|of)|history of|received |part-time|full-time|not in labour|limited social)|caries|gingivit|periodont|tooth|\bdental\b|screening|counsel|education|employment|housing|social contact|\bstress\b|criminal|refugee|misuse|finding of|situation|halitosis|bad breath/i;

function conditionRank(name: string): number {
  // Background is tested first: "Risk for coronary artery disease…" names a
  // critical organ system but describes a score, not a problem to treat.
  if (BACKGROUND_CONDITION.test(name)) return 2;
  if (CRITICAL_CONDITION.test(name)) return 0;
  return 1;
}

/** High-alert drug classes: stopping, dosing or reversing these is urgent. */
const CRITICAL_MEDICATION =
  /insulin|warfarin|coumadin|apixaban|eliquis|rivaroxaban|xarelto|dabigatran|clopidogrel|plavix|heparin|enoxaparin|epinephrine|epipen|albuterol|salbutamol|inhal|prednis|dexamethasone|hydrocortisone|methadone|buprenorphine|oxycodone|hydrocodone|morphine|fentanyl|digoxin|amiodarone|lithium|phenytoin|levetiracetam|keppra|carbamazepine|valproa|lamotrigine|clozapine|methotrexate|tacrolimus|cyclosporin|nitroglycerin|naloxone|levothyroxine/i;

/** Supplements and topicals: worth listing, not worth the top of the column. */
const BACKGROUND_MEDICATION =
  /vitamin|multivitamin|supplement|omega|fish oil|probiotic|emollient|moisturiz|lubricant|sunscreen|saline|contraceptive|nicotine/i;

function medicationRank(name: string): number {
  if (CRITICAL_MEDICATION.test(name)) return 0;
  if (BACKGROUND_MEDICATION.test(name)) return 2;
  return 1;
}

function byRank(a: WalletItem, b: WalletItem): number {
  return a.rank - b.rank;
}

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
  // Refetch when records land — a portal sync or an .emrpkg import
  // writes straight to the collection, and this page reads it once.
  const recordChangeTick = useRecordChangeTick();
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
          return [
            {
              id: doc.id,
              name,
              detail: shortDosageText(r),
              fullDetail: fullDosageText(r),
              rank: medicationRank(name),
            },
          ];
        }),
      ).sort(byRank);

      const allergies = dedupe(
        allergyDocs.flatMap((doc): WalletItem[] => {
          const r = getFhirResource<Record<string, unknown>>(doc);
          // DSTU2 keeps the allergen on `substance`, R4 on `code`; the shared
          // helper covers both. Without it every DSTU2 allergy fell back to
          // the literal "Allergy" and deduped into a single row.
          const name =
            getAllergyIntoleranceDisplayName(doc) ||
            firstText(r['code']) ||
            'Allergy';
          if (isAllergyNegation(r, name)) return [];
          return [
            {
              id: doc.id,
              name,
              detail: reactionText(r),
              rank: allergyRank(r),
            },
          ];
        }),
      ).sort(byRank);

      const conditions = dedupe(
        conditionDocs.flatMap((doc): WalletItem[] => {
          const r = getFhirResource<Record<string, unknown>>(doc);
          if (!isActive(r)) return [];
          const name =
            doc.metadata?.display_name || firstText(r['code']) || 'Condition';
          // The raw SNOMED code used to print under every row. It means
          // nothing to a human reader and doubled the length of the column.
          return [{ id: doc.id, name, rank: conditionRank(name) }];
        }),
      ).sort(byRank);

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
  }, [db, user.id, recordChangeTick]);

  return { data, status };
}

const PERIOD_UNITS: Record<string, string> = {
  s: 'second',
  min: 'minute',
  h: 'hour',
  d: 'day',
  wk: 'week',
  mo: 'month',
  a: 'year',
};

function firstDosage(
  resource: Record<string, unknown>,
): Record<string, unknown> | undefined {
  // R4 calls it `dosageInstruction` on a request, `dosage` on a statement.
  const dosage = resource['dosage'] ?? resource['dosageInstruction'];
  if (Array.isArray(dosage)) return dosage.find(isRecord);
  return isRecord(dosage) ? dosage : undefined;
}

function fullDosageText(resource: Record<string, unknown>): string | undefined {
  const dosage = firstDosage(resource);
  return dosage ? firstText(dosage['text']) || firstText(dosage) : undefined;
}

function doseAmount(dosage: Record<string, unknown>): string | undefined {
  const doseAndRate = dosage['doseAndRate'];
  const quantity =
    dosage['doseQuantity'] ??
    (Array.isArray(doseAndRate) && isRecord(doseAndRate[0])
      ? doseAndRate[0]['doseQuantity']
      : undefined);
  if (!isRecord(quantity)) return undefined;
  const value = quantity['value'];
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const unit = firstText(quantity['unit'] ?? quantity['code']);
  // A bare "1" with no unit reads as noise, so it is dropped rather than shown.
  return unit ? `${value} ${unit}` : undefined;
}

function doseFrequency(dosage: Record<string, unknown>): string | undefined {
  const timing = dosage['timing'];
  if (!isRecord(timing)) return undefined;
  const coded = firstText(timing['code']);
  if (coded) return coded;

  const repeat = timing['repeat'];
  if (!isRecord(repeat)) return undefined;
  const frequency = Number(repeat['frequency']);
  const period = Number(repeat['period']);
  const unit = PERIOD_UNITS[String(repeat['periodUnit'])];
  if (!frequency || !period || !unit) return undefined;
  const every = period === 1 ? unit : `${period} ${unit}s`;
  return frequency === 1 ? `once per ${every}` : `${frequency}x per ${every}`;
}

/**
 * A wallet card has room for the drug, the dose and how often — not for the
 * whole sig ("Take 1 tablet (150 mg total) by mouth every night"). The written
 * sig is the most readable source when there is one, so trim that; otherwise
 * assemble a line from the coded dose and timing.
 */
function shortDosageText(
  resource: Record<string, unknown>,
): string | undefined {
  const dosage = firstDosage(resource);
  if (!dosage) return undefined;
  return (
    condenseSig(fullDosageText(resource)) ||
    [doseAmount(dosage), doseFrequency(dosage)].filter(Boolean).join(' · ') ||
    undefined
  );
}

function condenseSig(text?: string): string | undefined {
  if (!text) return undefined;
  const condensed = text
    .replace(/^\s*(take|use|apply|inject|give|administer|swallow)\s+/i, '')
    // Parentheticals restate the strength that is already in the drug name.
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\b(by mouth|orally|per os|p\.o\.|via [a-z]+ route)\b/gi, '')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!condensed) return undefined;
  return condensed.length > 44
    ? `${condensed.slice(0, 43).trimEnd()}…`
    : condensed;
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
    <AppPage
      banner={<GenericBanner text="Wallet card" className="print:hidden" />}
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-start justify-between gap-3 print:hidden">
            <div>
              <p className="text-sm text-gray-600">
                A printable emergency summary. Carry it in your wallet or show
                it to a provider.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                The most urgent entries are listed first. Printing includes
                every entry, not only the ones shown here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              <PrinterIcon className="h-5 w-5" />
              Print
            </button>
          </div>

          {/* On paper this is now the whole document — the nav, the banner and
              the toast are `print:hidden`. It still prints at page width
              rather than card width: squeezing the three columns into a
              3.375in card makes a 9in strip that needs a fold to carry, which
              is a layout change, not a width change. `break-inside-avoid`
              keeps the card off a page boundary in the meantime. */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 print:break-inside-avoid print:shadow-none print:ring-0">
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
                <div className="ms-auto rounded-md bg-white/15 px-3 py-1 text-center">
                  <div className="text-xs uppercase tracking-wide text-primary-100">
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
  const [expanded, setExpanded] = useState(false);
  const overflowCount = Math.max(items.length - SCREEN_ROW_CAP, 0);
  const capped = overflowCount > 0 && !expanded;

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
        <>
          <ul className="mt-2 space-y-1.5">
            {items.map((item, index) => (
              <li
                key={item.id}
                title={item.fullDetail}
                // Rows past the cap stay in the DOM and only leave the screen
                // card, so the printed copy is still the complete record.
                className={
                  capped && index >= SCREEN_ROW_CAP
                    ? 'hidden text-sm text-gray-900 print:list-item'
                    : 'text-sm text-gray-900'
                }
              >
                <span className="font-medium">{item.name}</span>
                {item.detail && (
                  <span className="block text-xs text-gray-500">
                    {/* The screen gets the wallet-sized summary; paper gets the
                        whole instruction. `condenseSig` cuts at 44 characters
                        and the tooltip carrying the rest does not survive a
                        printer — so a card handed to a clinician read "1
                        capsule 1 time each day in the morning. D…" and never
                        got to "Do not crush or chew." */}
                    <span className="print:hidden">{item.detail}</span>
                    <span className="hidden print:inline">
                      {item.fullDetail || item.detail}
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {overflowCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 inline-flex min-h-[44px] items-center text-xs font-semibold text-primary-700 hover:text-primary-900 print:hidden"
            >
              {expanded ? 'Show fewer' : `+${overflowCount} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
