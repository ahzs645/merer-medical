import { useEffect, useMemo, useState } from 'react';
import {
  CheckIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { formatLabValue } from '../labs/utils/labFormatters';
import {
  getInterpretationText,
  getReferenceRangeString,
  isOutOfRangeResult,
} from '../timeline/utils/fhirpathParsers';

type PacketItem = {
  id: string;
  title: string;
  detail?: string;
  date?: string;
  citation: string;
};

type PacketSections = {
  problems: PacketItem[];
  medications: PacketItem[];
  allergies: PacketItem[];
  labs: PacketItem[];
  documents: PacketItem[];
  imaging: PacketItem[];
  procedures: PacketItem[];
};

type LooseCoding = {
  code?: string;
  display?: string;
};

type LooseConcept = {
  coding?: LooseCoding[];
  code?: string;
  display?: string;
  text?: string;
};

type LooseResource = {
  abatementDateTime?: string;
  clinicalStatus?: LooseConcept | string;
  code?: LooseConcept;
  criticality?: string;
  dosage?: { text?: string }[];
  dosageInstruction?: { text?: string }[];
  medicationCodeableConcept?: LooseConcept;
  medicationReference?: { display?: string };
  reaction?: { manifestation?: LooseConcept[] }[];
  status?: string;
  substance?: LooseConcept;
  verificationStatus?: LooseConcept | string;
};

type LabDocumentForFormatters = Parameters<typeof formatLabValue>[0];

const RECENT_LIMIT = 8;

export function VisitPrepTab() {
  const db = useRxDb();
  const user = useUser();
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');
  const [questions, setQuestions] = useState('');
  const [questionsSavedAt, setQuestionsSavedAt] = useState('');
  const [questionsSaveStatus, setQuestionsSaveStatus] = useState<
    'idle' | 'saved' | 'error'
  >('idle');
  const questionsStorageKey = useMemo(
    () => `mere:visit-prep:questions:${user.id}`,
    [user.id],
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchDocuments() {
      setStatus('loading');
      const docs = await db.clinical_documents
        .find({
          selector: { user_id: user.id },
          sort: [{ 'metadata.date': 'desc' }],
        })
        .exec();

      if (!isMounted) return;
      setDocuments(docs.map((doc) => doc.toMutableJSON() as ClinicalDocument));
      setStatus('success');
    }

    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  useEffect(() => {
    const stored = loadSavedQuestions(questionsStorageKey);
    setQuestions(stored.questions);
    setQuestionsSavedAt(stored.savedAt);
    setQuestionsSaveStatus(stored.savedAt ? 'saved' : 'idle');
  }, [questionsStorageKey]);

  const packet = useMemo(() => buildPacket(documents), [documents]);
  const patientName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ');

  function saveQuestions() {
    const savedAt = new Date().toISOString();
    try {
      localStorage.setItem(
        questionsStorageKey,
        JSON.stringify({ questions, savedAt }),
      );
      setQuestionsSavedAt(savedAt);
      setQuestionsSaveStatus('saved');
    } catch (error) {
      console.error(error);
      setQuestionsSaveStatus('error');
    }
  }

  function updateQuestions(value: string) {
    setQuestions(value);
    setQuestionsSaveStatus('idle');
  }

  function downloadPacket() {
    const packetText = buildPacketMarkdown({
      packet,
      questions,
      patientName,
      generatedAt: new Date(),
    });
    const blob = new Blob([packetText], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `visit-prep-${filenameDate(new Date())}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AppPage
      banner={
        <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8 print:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Visit prep and provider packet
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Printable summary generated from this user's local records with
                source record citations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                onClick={downloadPacket}
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                Download packet
              </button>
              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                onClick={() => window.print()}
              >
                <PrinterIcon className="h-5 w-5" />
                Print packet
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
          <div className="rounded-md bg-white p-5 shadow-sm ring-1 ring-gray-200 print:shadow-none print:ring-0">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Provider packet
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {user.first_name} {user.last_name} | Generated{' '}
                {new Date().toLocaleDateString()}
              </p>
            </div>

            {status === 'loading' ? (
              <p className="py-8 text-sm text-gray-600">Loading records...</p>
            ) : (
              <div className="mt-5 grid gap-5">
                <PacketSection
                  title="Active problems"
                  items={packet.problems}
                />
                <PacketSection
                  title="Current medications"
                  items={packet.medications}
                />
                <PacketSection title="Allergies" items={packet.allergies} />
                <PacketSection
                  title="Abnormal and recent labs"
                  items={packet.labs}
                />
                <PacketSection
                  title="Recent documents"
                  items={packet.documents}
                />
                <PacketSection title="Recent imaging" items={packet.imaging} />
                <PacketSection
                  title="Recent procedures"
                  items={packet.procedures}
                />

                <section>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Questions for visit
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 print:hidden">
                        Saved locally for this user.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                      <SaveStatus
                        savedAt={questionsSavedAt}
                        status={questionsSaveStatus}
                      />
                      <button
                        type="button"
                        onClick={saveQuestions}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                      >
                        <CheckIcon className="h-4 w-4" />
                        Save questions
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="mt-2 min-h-36 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary print:border-gray-300"
                    value={questions}
                    onChange={(event) => updateQuestions(event.target.value)}
                    placeholder="Add symptoms, goals, and questions to discuss."
                  />
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppPage>
  );
}

function SaveStatus({
  savedAt,
  status,
}: {
  savedAt: string;
  status: 'idle' | 'saved' | 'error';
}) {
  if (status === 'error') {
    return (
      <span className="text-xs font-medium text-red-600">
        Unable to save locally
      </span>
    );
  }

  if (status === 'idle' && savedAt) {
    return <span className="text-xs text-amber-700">Unsaved changes</span>;
  }

  if (!savedAt) {
    return <span className="text-xs text-gray-500">Not saved yet</span>;
  }

  return (
    <span className="text-xs text-gray-500">
      Saved {new Date(savedAt).toLocaleString()}
    </span>
  );
}

function PacketSection({
  title,
  items,
}: {
  title: string;
  items: PacketItem[];
}) {
  return (
    <section className="break-inside-avoid">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 rounded-md border border-gray-200 p-3 text-sm text-gray-500">
          No matching records found.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
          {items.map((item) => (
            <li key={`${title}-${item.id}`} className="p-3">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <p className="font-medium text-gray-900">{item.title}</p>
                {item.date && (
                  <p className="text-sm text-gray-500">{item.date}</p>
                )}
              </div>
              {item.detail && (
                <p className="mt-1 text-sm text-gray-700">{item.detail}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">{item.citation}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function buildPacket(documents: ClinicalDocument[]): PacketSections {
  const byType = (types: string[]) =>
    documents.filter((document) =>
      types.includes(document.data_record.resource_type),
    );

  const observationDocs = byType(['observation']);

  return {
    problems: byType(['condition'])
      .filter(isActive)
      .slice(0, RECENT_LIMIT)
      .map(conditionItem),
    medications: byType([
      'medicationstatement',
      'medicationrequest',
      'medicationorder',
      'medicationdispense',
      'medicationadministration',
    ])
      .filter(isActive)
      .slice(0, RECENT_LIMIT)
      .map(medicationItem),
    allergies: byType(['allergyintolerance'])
      .slice(0, RECENT_LIMIT)
      .map(allergyItem),
    labs: observationDocs
      .filter((document) => isAbnormalLab(document) || isRecent(document, 180))
      .slice(0, RECENT_LIMIT)
      .map(labItem),
    documents: byType(['documentreference', 'documentreference_attachment'])
      .slice(0, RECENT_LIMIT)
      .map(genericItem),
    imaging: byType(['imagingstudy', 'media'])
      .slice(0, RECENT_LIMIT)
      .map(genericItem),
    procedures: byType(['procedure']).slice(0, RECENT_LIMIT).map(genericItem),
  };
}

function conditionItem(document: ClinicalDocument): PacketItem {
  const resource = getFhirResource<LooseResource>(document);
  return {
    ...baseItem(document),
    title: displayName(document, resource.code?.text || 'Condition'),
    detail: [resource.clinicalStatus, resource.verificationStatus]
      .map(displayConcept)
      .filter(Boolean)
      .join(' | '),
  };
}

function medicationItem(document: ClinicalDocument): PacketItem {
  const resource = getFhirResource<LooseResource>(document);
  const dosage =
    resource.dosage?.[0]?.text || resource.dosageInstruction?.[0]?.text;
  return {
    ...baseItem(document),
    title: displayName(
      document,
      resource.medicationCodeableConcept?.text ||
        resource.medicationReference?.display ||
        'Medication',
    ),
    detail: [resource.status, dosage].filter(Boolean).join(' | '),
  };
}

function allergyItem(document: ClinicalDocument): PacketItem {
  const resource = getFhirResource<LooseResource>(document);
  return {
    ...baseItem(document),
    title: displayName(
      document,
      resource.substance?.text || resource.code?.text || 'Allergy',
    ),
    detail: [
      resource.criticality,
      resource.reaction?.[0]?.manifestation?.[0]?.text,
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function labItem(document: ClinicalDocument): PacketItem {
  const labDocument = document as LabDocumentForFormatters;
  const interpretation = getInterpretationText(labDocument);
  const referenceRange = getReferenceRangeString(labDocument);
  return {
    ...baseItem(document),
    title: displayName(document, 'Lab result'),
    detail: [
      formatLabValue(labDocument),
      interpretation,
      referenceRange ? `Reference: ${referenceRange}` : undefined,
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function genericItem(document: ClinicalDocument): PacketItem {
  return {
    ...baseItem(document),
    title: displayName(
      document,
      labelForType(document.data_record.resource_type),
    ),
    detail: labelForType(document.data_record.resource_type),
  };
}

function baseItem(document: ClinicalDocument): PacketItem {
  return {
    id: document.id,
    title: document.metadata?.display_name || document.id,
    date: document.metadata?.date,
    citation: [
      `Record id: ${document.id}`,
      document.metadata?.id ? `Source id: ${document.metadata.id}` : undefined,
      `Type: ${document.data_record.resource_type}`,
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function displayName(document: ClinicalDocument, fallback: string) {
  const resource = getFhirResource<LooseResource>(document);
  return (
    document.metadata?.display_name ||
    resource.code?.text ||
    resource.code?.coding?.[0]?.display ||
    fallback
  );
}

function isActive(document: ClinicalDocument) {
  const resource = getFhirResource<LooseResource>(document);
  const statusText = [
    resource.status,
    displayConcept(resource.clinicalStatus),
    displayConcept(resource.verificationStatus),
  ]
    .join(' ')
    .toLowerCase();

  return !/\b(inactive|resolved|entered-in-error|stopped|completed|cancelled)\b/.test(
    statusText,
  );
}

function isAbnormalLab(document: ClinicalDocument) {
  const labDocument = document as LabDocumentForFormatters;
  const interpretation = String(
    getInterpretationText(labDocument) || '',
  ).toLowerCase();
  return (
    isOutOfRangeResult(labDocument) ||
    /\b(abnormal|high|low|critical|positive|detected)\b/.test(interpretation)
  );
}

function isRecent(document: ClinicalDocument, days: number) {
  const dateValue = document.metadata?.date;
  if (!dateValue) return false;
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function displayConcept(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (!isLooseConcept(value)) return undefined;
  return value.text || value.coding?.[0]?.display || value.coding?.[0]?.code;
}

function isLooseConcept(value: unknown): value is LooseConcept {
  return typeof value === 'object' && value !== null;
}

function labelForType(type: string) {
  return type
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function loadSavedQuestions(storageKey: string) {
  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return { questions: '', savedAt: '' };

    const parsed = JSON.parse(rawValue) as {
      questions?: unknown;
      savedAt?: unknown;
    };
    return {
      questions: typeof parsed.questions === 'string' ? parsed.questions : '',
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return { questions: '', savedAt: '' };
  }
}

function buildPacketMarkdown({
  packet,
  questions,
  patientName,
  generatedAt,
}: {
  packet: PacketSections;
  questions: string;
  patientName: string;
  generatedAt: Date;
}) {
  const sections = [
    formatPacketSection('Active problems', packet.problems),
    formatPacketSection('Current medications', packet.medications),
    formatPacketSection('Allergies', packet.allergies),
    formatPacketSection('Abnormal and recent labs', packet.labs),
    formatPacketSection('Recent documents', packet.documents),
    formatPacketSection('Recent imaging', packet.imaging),
    formatPacketSection('Recent procedures', packet.procedures),
    ['## Questions for visit', questions.trim() || 'No questions saved.'].join(
      '\n\n',
    ),
  ];

  return [
    '# Visit prep and provider packet',
    `Patient: ${patientName || 'Unknown user'}`,
    `Generated: ${generatedAt.toLocaleString()}`,
    '',
    ...sections,
    '',
  ].join('\n\n');
}

function formatPacketSection(title: string, items: PacketItem[]) {
  if (items.length === 0) {
    return [`## ${title}`, 'No matching records found.'].join('\n\n');
  }

  return [
    `## ${title}`,
    items
      .map((item) =>
        [
          `- ${item.title}${item.date ? ` (${item.date})` : ''}`,
          item.detail ? `  - ${item.detail}` : undefined,
          `  - ${item.citation}`,
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n'),
  ].join('\n\n');
}

function filenameDate(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}
