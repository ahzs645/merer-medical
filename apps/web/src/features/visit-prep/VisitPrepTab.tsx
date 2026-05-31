import { useEffect, useMemo, useState } from 'react';
import {
  CheckIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { formatDisplayText } from '../../shared/utils/StyleUtils';
import { exportEmrpkgFromRxDb } from '../../services/emrpkg';
import { appendAuditLog } from '../audit/auditLog';
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

type PacketOptions = {
  includeProblems: boolean;
  includeMedications: boolean;
  includeAllergies: boolean;
  includeLabs: boolean;
  includeDocuments: boolean;
  includeImaging: boolean;
  includeProcedures: boolean;
  includeQuestions: boolean;
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
type PreviewFile = {
  name: string;
  type: string;
  size: number;
  url: string;
  previewType: 'pdf' | 'image' | 'text' | 'unsupported';
  text?: string;
};

const RECENT_LIMIT = 8;
const DEFAULT_PACKET_OPTIONS: PacketOptions = {
  includeProblems: true,
  includeMedications: true,
  includeAllergies: true,
  includeLabs: true,
  includeDocuments: true,
  includeImaging: true,
  includeProcedures: true,
  includeQuestions: true,
};
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  allergyintolerance: 'Allergy intolerance',
  diagnosticreport: 'Diagnostic report',
  documentreference: 'Document reference',
  documentreference_attachment: 'Document attachment',
  imagingstudy: 'Imaging study',
  medicationadministration: 'Medication administration',
  medicationdispense: 'Medication dispense',
  medicationorder: 'Medication order',
  medicationrequest: 'Medication request',
  medicationstatement: 'Medication statement',
  questionnaireresponse: 'Questionnaire response',
  servicerequest: 'Service request',
  visionprescription: 'Vision prescription',
};

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
  const [packetOptions, setPacketOptions] = useState(DEFAULT_PACKET_OPTIONS);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [previewMode, setPreviewMode] = useState<'packet' | 'file'>('packet');
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
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

  useEffect(() => {
    return () => {
      if (previewFile) URL.revokeObjectURL(previewFile.url);
    };
  }, [previewFile]);

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

  function downloadMarkdownPacket() {
    const packetText = buildPacketMarkdown({
      packet,
      questions,
      patientName,
      generatedAt: new Date(),
      options: packetOptions,
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

  function downloadHtmlPacket() {
    const html = buildPacketHtml({
      packet,
      questions,
      patientName,
      generatedAt: new Date(),
      options: packetOptions,
    });
    downloadBlob(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `visit-prep-${filenameDate(new Date())}.html`,
    );
  }

  async function downloadRecordPackage() {
    if (passwordProtect && !exportPassphrase.trim()) return;
    setExportBusy(true);
    try {
      const bytes = await exportEmrpkgFromRxDb(db, {
        passphrase: passwordProtect ? exportPassphrase : undefined,
        exportNotes: {
          scope: 'visit',
          userId: user.id,
          includeProvenance: true,
          includeAttachments,
          includeAuditTrail,
        },
      });
      await appendAuditLog(db, {
        userId: user.id,
        actor: 'local-user',
        action: 'record.export',
        targetType: 'emrpkg',
        source: 'Visit prep',
        summary: 'Exported visit-prep record package',
      });
      downloadBlob(
        new Blob([bytes], { type: 'application/octet-stream' }),
        `visit-prep-records-${filenameDate(new Date())}${
          passwordProtect ? '.enc' : ''
        }.emrpkg`,
      );
    } finally {
      setExportBusy(false);
    }
  }

  function updatePacketOption(option: keyof PacketOptions, checked: boolean) {
    setPacketOptions((current) => ({ ...current, [option]: checked }));
  }

  async function handlePreviewFile(file: File | undefined) {
    if (!file) return;
    if (previewFile) URL.revokeObjectURL(previewFile.url);
    const previewType = getPreviewType(file);
    setPreviewFile({
      name: file.name,
      type: file.type || 'Unknown type',
      size: file.size,
      url: URL.createObjectURL(file),
      previewType,
      text: previewType === 'text' ? await file.text() : undefined,
    });
    setPreviewMode('file');
  }

  return (
    <AppPage
      banner={
        <div className="bg-primary-800 px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-8 print:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Visit prep and provider packet
              </h1>
              <p className="mt-1 text-sm text-primary-100">
                Printable PDF-ready summary and visit-scoped record package
                generated from this user's local records.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100 hover:bg-primary-50"
                onClick={downloadMarkdownPacket}
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                Markdown
              </button>
              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100 hover:bg-primary-50"
                onClick={downloadHtmlPacket}
              >
                <DocumentTextIcon className="h-5 w-5" />
                HTML
              </button>
              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100 hover:bg-primary-50"
                onClick={() => window.print()}
              >
                <PrinterIcon className="h-5 w-5" />
                Print / PDF
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)] print:hidden">
            <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                Packet contents
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <CheckboxField
                  checked={packetOptions.includeProblems}
                  label="Problems"
                  onChange={(checked) =>
                    updatePacketOption('includeProblems', checked)
                  }
                />
                <CheckboxField
                  checked={packetOptions.includeMedications}
                  label="Medications"
                  onChange={(checked) =>
                    updatePacketOption('includeMedications', checked)
                  }
                />
                <CheckboxField
                  checked={packetOptions.includeAllergies}
                  label="Allergies"
                  onChange={(checked) =>
                    updatePacketOption('includeAllergies', checked)
                  }
                />
                <CheckboxField
                  checked={packetOptions.includeLabs}
                  label="Abnormal labs"
                  onChange={(checked) =>
                    updatePacketOption('includeLabs', checked)
                  }
                />
                <CheckboxField
                  checked={packetOptions.includeDocuments}
                  label="Documents"
                  onChange={(checked) =>
                    updatePacketOption('includeDocuments', checked)
                  }
                />
                <CheckboxField
                  checked={packetOptions.includeImaging}
                  label="Imaging"
                  onChange={(checked) =>
                    updatePacketOption('includeImaging', checked)
                  }
                />
                <CheckboxField
                  checked={packetOptions.includeProcedures}
                  label="Procedures"
                  onChange={(checked) =>
                    updatePacketOption('includeProcedures', checked)
                  }
                />
                <CheckboxField
                  checked={packetOptions.includeQuestions}
                  label="Visit questions"
                  onChange={(checked) =>
                    updatePacketOption('includeQuestions', checked)
                  }
                />
              </div>
            </div>

            <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-center gap-2">
                <LockClosedIcon className="h-5 w-5 text-primary-700" />
                <h2 className="text-base font-semibold text-gray-900">
                  Visit record package
                </h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Export this user's records as a visit-scoped .emrpkg file for
                handoff or backup.
              </p>
              <div className="mt-3 grid gap-2">
                <CheckboxField
                  checked={includeAttachments}
                  label="Include embedded PDFs and attachments"
                  onChange={setIncludeAttachments}
                />
                <CheckboxField
                  checked={includeAuditTrail}
                  label="Include audit trail"
                  onChange={setIncludeAuditTrail}
                />
                <CheckboxField
                  checked={passwordProtect}
                  label="Password-protect package"
                  onChange={setPasswordProtect}
                />
                {passwordProtect ? (
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">
                      Export password
                    </span>
                    <input
                      type="password"
                      value={exportPassphrase}
                      onChange={(event) =>
                        setExportPassphrase(event.target.value)
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={downloadRecordPackage}
                  disabled={
                    exportBusy || (passwordProtect && !exportPassphrase.trim())
                  }
                  className="mt-1 inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  {exportBusy ? 'Preparing...' : 'Download .emrpkg'}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MagnifyingGlassIcon className="h-5 w-5 text-primary-700" />
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Preview utility
                  </h2>
                  <p className="text-sm text-gray-600">
                    Review the packet output or inspect a local PDF, image, or
                    text file before sharing.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode('packet')}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    previewMode === 'packet'
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Packet preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('file')}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    previewMode === 'file'
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                  }`}
                >
                  File preview
                </button>
              </div>
            </div>

            {previewMode === 'packet' ? (
              <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
                <iframe
                  title="Visit prep packet preview"
                  srcDoc={buildPacketHtml({
                    packet,
                    questions,
                    patientName,
                    generatedAt: new Date(),
                    options: packetOptions,
                  })}
                  className="h-[520px] w-full bg-white"
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-md border border-dashed border-gray-300 p-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Choose a file
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.csv,.json,image/*,application/pdf,text/*,application/json"
                      onChange={(event) =>
                        handlePreviewFile(event.target.files?.[0])
                      }
                      className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700"
                    />
                  </label>
                  {previewFile ? (
                    <dl className="mt-4 space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-900">Name</dt>
                        <dd className="break-words text-gray-600">
                          {previewFile.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900">Type</dt>
                        <dd className="text-gray-600">{previewFile.type}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900">Size</dt>
                        <dd className="text-gray-600">
                          {formatFileSize(previewFile.size)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">
                      Files stay local in the browser preview.
                    </p>
                  )}
                </div>
                <FilePreviewPane file={previewFile} />
              </div>
            )}
          </section>

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
                {packetOptions.includeProblems ? (
                  <PacketSection
                    title="Active problems"
                    items={packet.problems}
                  />
                ) : null}
                {packetOptions.includeMedications ? (
                  <PacketSection
                    title="Current medications"
                    items={packet.medications}
                  />
                ) : null}
                {packetOptions.includeAllergies ? (
                  <PacketSection title="Allergies" items={packet.allergies} />
                ) : null}
                {packetOptions.includeLabs ? (
                  <PacketSection title="Abnormal labs" items={packet.labs} />
                ) : null}
                {packetOptions.includeDocuments ? (
                  <PacketSection
                    title="Recent documents"
                    items={packet.documents}
                  />
                ) : null}
                {packetOptions.includeImaging ? (
                  <PacketSection
                    title="Recent imaging"
                    items={packet.imaging}
                  />
                ) : null}
                {packetOptions.includeProcedures ? (
                  <PacketSection
                    title="Recent procedures"
                    items={packet.procedures}
                  />
                ) : null}

                {packetOptions.includeQuestions ? (
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
                ) : null}
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

function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span>{label}</span>
    </label>
  );
}

function FilePreviewPane({ file }: { file: PreviewFile | null }) {
  if (!file) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        Select a PDF, image, text, Markdown, CSV, or JSON file to preview.
      </div>
    );
  }

  if (file.previewType === 'pdf') {
    return (
      <object
        data={file.url}
        type="application/pdf"
        className="h-[520px] w-full rounded-md border border-gray-200 bg-gray-50"
      >
        <div className="p-4 text-sm text-gray-600">
          PDF preview is not available in this browser. Open the downloaded file
          directly to review it.
        </div>
      </object>
    );
  }

  if (file.previewType === 'image') {
    return (
      <div className="flex h-[520px] items-center justify-center overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3">
        <img
          src={file.url}
          alt={file.name}
          className="max-h-full max-w-full rounded-sm object-contain"
        />
      </div>
    );
  }

  if (file.previewType === 'text') {
    return (
      <pre className="h-[520px] overflow-auto rounded-md border border-gray-200 bg-gray-950 p-4 text-xs leading-5 text-gray-100">
        {file.text}
      </pre>
    );
  }

  return (
    <div className="flex h-[520px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
      This file type cannot be previewed inline.
    </div>
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
                <p className="mt-1 text-sm text-gray-700">
                  {formatDisplayText(item.detail)}
                </p>
              )}
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
      .filter(isMeaningfulAllergy)
      .slice(0, RECENT_LIMIT)
      .map(allergyItem),
    labs: observationDocs
      .filter(isAbnormalLab)
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
    date: formatDisplayDate(document.metadata?.date),
  };
}

function formatDisplayDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

function isMeaningfulAllergy(document: ClinicalDocument) {
  const resource = getFhirResource<LooseResource>(document);
  const title = displayName(
    document,
    resource.substance?.text || resource.code?.text || '',
  ).toLowerCase();

  return !/\b(no known allergies|not on file|unknown)\b/.test(title);
}

function displayConcept(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return formatDisplayText(value);
  if (!isLooseConcept(value)) return undefined;
  return formatDisplayText(
    value.text || value.coding?.[0]?.display || value.coding?.[0]?.code,
  );
}

function isLooseConcept(value: unknown): value is LooseConcept {
  return typeof value === 'object' && value !== null;
}

function labelForType(type: string) {
  if (RESOURCE_TYPE_LABELS[type]) return RESOURCE_TYPE_LABELS[type];

  return type
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split('_')
    .join(' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
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
  options,
}: {
  packet: PacketSections;
  questions: string;
  patientName: string;
  generatedAt: Date;
  options: PacketOptions;
}) {
  const sections = [
    options.includeProblems
      ? formatPacketSection('Active problems', packet.problems)
      : undefined,
    options.includeMedications
      ? formatPacketSection('Current medications', packet.medications)
      : undefined,
    options.includeAllergies
      ? formatPacketSection('Allergies', packet.allergies)
      : undefined,
    options.includeLabs
      ? formatPacketSection('Abnormal labs', packet.labs)
      : undefined,
    options.includeDocuments
      ? formatPacketSection('Recent documents', packet.documents)
      : undefined,
    options.includeImaging
      ? formatPacketSection('Recent imaging', packet.imaging)
      : undefined,
    options.includeProcedures
      ? formatPacketSection('Recent procedures', packet.procedures)
      : undefined,
    options.includeQuestions
      ? [
          '## Questions for visit',
          questions.trim() || 'No questions saved.',
        ].join('\n\n')
      : undefined,
  ].filter(Boolean);

  return [
    '# Visit prep and provider packet',
    `Patient: ${patientName || 'Unknown user'}`,
    `Generated: ${generatedAt.toLocaleString()}`,
    '',
    ...sections,
    '',
  ].join('\n\n');
}

function buildPacketHtml({
  packet,
  questions,
  patientName,
  generatedAt,
  options,
}: {
  packet: PacketSections;
  questions: string;
  patientName: string;
  generatedAt: Date;
  options: PacketOptions;
}) {
  const sectionHtml = [
    options.includeProblems
      ? formatPacketHtmlSection('Active problems', packet.problems)
      : undefined,
    options.includeMedications
      ? formatPacketHtmlSection('Current medications', packet.medications)
      : undefined,
    options.includeAllergies
      ? formatPacketHtmlSection('Allergies', packet.allergies)
      : undefined,
    options.includeLabs
      ? formatPacketHtmlSection('Abnormal labs', packet.labs)
      : undefined,
    options.includeDocuments
      ? formatPacketHtmlSection('Recent documents', packet.documents)
      : undefined,
    options.includeImaging
      ? formatPacketHtmlSection('Recent imaging', packet.imaging)
      : undefined,
    options.includeProcedures
      ? formatPacketHtmlSection('Recent procedures', packet.procedures)
      : undefined,
    options.includeQuestions
      ? `<section><h2>Questions for visit</h2><p>${escapeHtml(
          questions.trim() || 'No questions saved.',
        ).replace(/\n/g, '<br>')}</p></section>`
      : undefined,
  ]
    .filter(Boolean)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Visit prep and provider packet</title>
  <style>
    body { color: #111827; font-family: Arial, sans-serif; line-height: 1.45; margin: 32px; }
    header { border-bottom: 1px solid #d1d5db; margin-bottom: 24px; padding-bottom: 16px; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    p { margin: 0; }
    ul { border: 1px solid #d1d5db; border-radius: 6px; list-style: none; margin: 8px 0 0; padding: 0; }
    li { border-top: 1px solid #e5e7eb; padding: 10px 12px; }
    li:first-child { border-top: 0; }
    .meta { color: #4b5563; font-size: 13px; }
    .detail { color: #374151; font-size: 13px; margin-top: 4px; }
    .empty { border: 1px solid #d1d5db; border-radius: 6px; color: #6b7280; padding: 10px 12px; }
    @media print { body { margin: 20mm; } section { break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <h1>Visit prep and provider packet</h1>
    <p class="meta">Patient: ${escapeHtml(patientName || 'Unknown user')}</p>
    <p class="meta">Generated: ${escapeHtml(generatedAt.toLocaleString())}</p>
  </header>
  ${sectionHtml}
</body>
</html>`;
}

function formatPacketHtmlSection(title: string, items: PacketItem[]) {
  if (items.length === 0) {
    return `<section><h2>${escapeHtml(title)}</h2><p class="empty">No matching records found.</p></section>`;
  }

  return `<section><h2>${escapeHtml(title)}</h2><ul>${items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.title)}</strong>${
          item.date ? ` <span class="meta">${escapeHtml(item.date)}</span>` : ''
        }${
          item.detail ? `<p class="detail">${escapeHtml(item.detail)}</p>` : ''
        }</li>`,
    )
    .join('')}</ul></section>`;
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

function getPreviewType(file: File): PreviewFile['previewType'] {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (file.type.startsWith('image/')) return 'image';
  if (
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    /\.(txt|md|csv|json)$/i.test(file.name)
  ) {
    return 'text';
  }
  return 'unsupported';
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
