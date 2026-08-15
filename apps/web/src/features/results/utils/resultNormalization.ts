import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import {
  getObservationInterpretationFlag,
  getValueQuantity,
  getValueString,
  getValueUnit,
} from '../../timeline/utils/fhirpathParsers';
import {
  buildLabReferenceEvaluation,
  buildLabReferenceOverlays,
} from '../../labs/enrichment/labEnrichment';
import {
  ReferenceContext,
  ReferenceOverlayMode,
} from '../../labs/enrichment/types';
import { groupLabs } from '../../labs/utils/labGrouping';
import { isLaboratoryObservation } from '../../labs/hooks/useLabsData';
import { buildReportsByObservationId } from '../../labs/utils/reportLinks';
import { LabDocument, ReportDocument, ReportLink } from '../../labs/types';
import {
  isImagingDocument,
  mapImagingDocument,
} from '../../imaging/utils/imagingRecords';
import {
  LinkedResultDocument,
  ResultDetail,
  ResultGroup,
  ResultStatus,
  ResultSummary,
  ResultType,
  ResultsViewModel,
} from '../types';

type BuildResultsInput = {
  clinicalDocuments: ClinicalDocument<any>[];
  connectionDocuments?: ConnectionDocument[];
  referenceMode?: ReferenceOverlayMode;
  referenceContext?: ReferenceContext;
};

const RESULT_RESOURCE_TYPES = new Set([
  'diagnosticreport',
  'documentreference',
  'documentreference_attachment',
  'imagingstudy',
  'media',
  'observation',
  'procedure',
]);

export function buildResultsViewModel({
  clinicalDocuments,
  connectionDocuments = [],
  referenceMode = 'canadian',
  referenceContext,
}: BuildResultsInput): ResultsViewModel {
  const connectionsById = new Map(
    connectionDocuments.map((connection) => [connection.id, connection]),
  );
  const documents = clinicalDocuments.filter((document) =>
    RESULT_RESOURCE_TYPES.has(getResourceType(document)),
  );
  const labs = documents.filter(isLaboratoryObservation) as LabDocument[];
  const labGroups = groupLabs(labs);
  const labGroupByDocumentId = new Map<
    string,
    ReturnType<typeof groupLabs>[number]
  >();

  labGroups.forEach((group) => {
    group.labs.forEach((lab) => labGroupByDocumentId.set(lab.id, group));
  });

  const reportDocuments = documents.filter(
    (document) => getResourceType(document) === 'diagnosticreport',
  ) as ReportDocument[];
  const reportsByObservationId = buildReportsByObservationId(
    reportDocuments,
    connectionsById,
  );
  // Indexed by both keys: DiagnosticReport.result references point at
  // metadata.id (the resource URL), not the composite document id, so a lab
  // panel would otherwise list none of the observations it contains.
  const documentsById = new Map<string, ClinicalDocument<any>>();
  documents.forEach((document) => {
    documentsById.set(document.id, document);
    const metadataId = document.metadata?.id;
    if (metadataId && !documentsById.has(metadataId)) {
      documentsById.set(metadataId, document);
    }
  });
  const resultSummaries: ResultSummary[] = [];
  const detailsById = new Map<string, ResultDetail>();

  documents.forEach((document) => {
    if (isNestedAttachment(document)) return;
    const type = getResultType(document, labs);
    if (type === 'other') return;

    const summary = buildResultSummary(document, type, labGroupByDocumentId);
    const detail = buildResultDetail({
      document,
      type,
      summary,
      group: labGroupByDocumentId.get(document.id),
      reportsByObservationId,
      documentsById,
      referenceMode,
      referenceContext,
    });

    resultSummaries.push(summary);
    detailsById.set(summary.detailId, detail);
  });

  const groups = groupResultSummaries(resultSummaries);
  return { groups, detailsById };
}

function buildResultSummary(
  document: ClinicalDocument<any>,
  type: ResultType,
  labGroupByDocumentId: Map<string, ReturnType<typeof groupLabs>[number]>,
): ResultSummary {
  const resource = getFhirResource<any>(document);
  const legacyMetadata = document.metadata as
    | ({ status?: string; updated_at?: string } & typeof document.metadata)
    | undefined;
  const group = labGroupByDocumentId.get(document.id);
  const title =
    group?.name ||
    document.metadata?.display_name ||
    getCodeText(resource) ||
    humanizeResourceType(getResourceType(document));
  const status = normalizeStatus(
    resource?.status || legacyMetadata?.status || resource?.resultStatus,
  );
  const date = getResultDate(document, resource);
  const abnormal =
    type === 'lab'
      ? getObservationInterpretationFlag(document as LabDocument) !== 'normal'
      : Boolean(resource?.isAbnormal);

  return {
    id: document.id,
    detailId: document.id,
    type,
    title,
    date,
    status,
    abnormal,
    source: getSource(document, resource),
    orderName: getOrderName(document, resource),
    linkedDocumentCount: countLinkedDocuments(resource),
    metadataOnly: type !== 'lab' && isMetadataOnly(resource),
  };
}

function buildResultDetail({
  document,
  type,
  summary,
  group,
  reportsByObservationId,
  documentsById,
  referenceMode,
  referenceContext,
}: {
  document: ClinicalDocument<any>;
  type: ResultType;
  summary: ResultSummary;
  group?: ReturnType<typeof groupLabs>[number];
  reportsByObservationId: Map<string, ReportLink[]>;
  documentsById: Map<string, ClinicalDocument<any>>;
  referenceMode: ReferenceOverlayMode;
  referenceContext?: ReferenceContext;
}): ResultDetail {
  const resource = getFhirResource<any>(document);
  const legacyMetadata = document.metadata as
    | ({ status?: string; updated_at?: string } & typeof document.metadata)
    | undefined;
  const reports =
    type === 'lab'
      ? reportsByObservationId.get(document.metadata?.id || '') || []
      : [];
  const lab = type === 'lab' ? (document as LabDocument) : undefined;
  const imagingItem =
    type === 'imaging' && isImagingDocument(document as any)
      ? mapImagingDocument(document as any)
      : undefined;
  const labEvaluation =
    group && lab
      ? buildLabReferenceEvaluation({
          group,
          lab,
          mode: referenceMode,
          referenceContext,
        })
      : undefined;

  return {
    ...summary,
    document,
    group,
    lab,
    labEvaluation,
    labOverlays:
      group && lab
        ? buildLabReferenceOverlays({ group, lab, referenceContext })
        : undefined,
    reports,
    collectionDate: getDateString(
      resource?.effectiveDateTime || resource?.issued,
    ),
    resultDate: getResultDate(document, resource),
    updatedDate: getDateString(
      resource?.meta?.lastUpdated || legacyMetadata?.updated_at,
    ),
    performer: getPerformer(resource),
    provider: getProvider(resource),
    organization: getSource(document, resource),
    accessionId:
      imagingItem?.accessionId ||
      getIdentifierValue(resource, ['accession', 'accession number']),
    reportId: getIdentifierValue(resource, ['report', 'document']),
    studyId: imagingItem?.studyId || getIdentifierValue(resource, ['study']),
    ...dedupeNarrativeText({
      narrative: getNarrative(resource),
      impression: getImpression(resource),
      resultNote: getResultNote(resource),
      providerComments: getProviderComments(resource),
    }),
    linkedDocuments: getLinkedDocuments(resource, documentsById, reports),
    downloadAvailable: hasDownload(document, resource),
    shareAvailable: true,
    referenceMode,
  };
}

function groupResultSummaries(results: ResultSummary[]): ResultGroup[] {
  const groups = new Map<string, ResultGroup>();
  const sorted = [...results].sort((a, b) => compareDatesDesc(a.date, b.date));

  sorted.forEach((result) => {
    const dateKey = result.date ? result.date.slice(0, 10) : 'unknown';
    const orderKey = result.orderName || result.title;
    const key = `${dateKey}|${orderKey}`;
    const existing = groups.get(key);

    if (existing) {
      existing.results.push(result);
      return;
    }

    groups.set(key, {
      id: key,
      title: orderKey || 'Results',
      date: result.date,
      orderName: result.orderName,
      source: result.source,
      results: [result],
    });
  });

  return [...groups.values()];
}

function getResultType(
  document: ClinicalDocument<any>,
  labs: LabDocument[],
): ResultType {
  const type = getResourceType(document);
  if (labs.some((lab) => lab.id === document.id)) return 'lab';
  if (isImagingDocument(document as any)) return 'imaging';
  if (type === 'diagnosticreport') return 'diagnostic-report';
  if (type === 'documentreference' || type === 'documentreference_attachment') {
    return 'document';
  }
  if (type === 'procedure') return 'procedure';
  return 'other';
}

function getResourceType(document: ClinicalDocument<any>) {
  return String(document.data_record?.resource_type || '').toLowerCase();
}

function isNestedAttachment(document: ClinicalDocument<any>) {
  return getResourceType(document) === 'documentreference_attachment';
}

function getResultDate(document: ClinicalDocument<any>, resource: any) {
  return getDateString(
    document.metadata?.date ||
      resource?.effectiveDateTime ||
      resource?.issued ||
      resource?.date ||
      resource?.authoredOn ||
      resource?.created,
  );
}

function getDateString(value: unknown): string | undefined {
  if (!value) return undefined;
  const text = String(value);
  return Number.isNaN(new Date(text).getTime()) ? text : text;
}

function normalizeStatus(value: unknown): ResultStatus {
  const normalized = String(value || '').toLowerCase();
  if (
    ['final', 'completed', 'complete', 'amended', 'corrected'].includes(
      normalized,
    )
  ) {
    return 'final';
  }
  if (['preliminary', 'partial', 'registered'].includes(normalized)) {
    return 'preliminary';
  }
  return 'unknown';
}

function getCodeText(resource: any): string | undefined {
  return (
    resource?.code?.text ||
    resource?.type?.text ||
    resource?.description ||
    resource?.content?.[0]?.attachment?.title ||
    resource?.code?.coding?.[0]?.display ||
    resource?.type?.coding?.[0]?.display
  );
}

function getOrderName(document: ClinicalDocument<any>, resource: any) {
  return (
    resource?.basedOn?.[0]?.display ||
    resource?.orderName ||
    resource?.code?.text ||
    document.metadata?.display_name
  );
}

function getSource(document: ClinicalDocument<any>, resource: any) {
  return (
    document.metadata?.source_name ||
    resource?.performer?.[0]?.display ||
    resource?.organization?.display ||
    resource?.custodian?.display
  );
}

function getPerformer(resource: any): string | undefined {
  return (
    resource?.performer?.[0]?.display ||
    resource?.resultsInterpreter?.[0]?.display
  );
}

function getProvider(resource: any): string | undefined {
  return (
    resource?.authorizingProviderName ||
    resource?.author?.[0]?.display ||
    resource?.requester?.display ||
    resource?.recorder?.display
  );
}

/**
 * Keeps one copy of a report's prose.
 *
 * The four extractors below read four different FHIR fields, but sources
 * routinely fill several with the same sentence — and two of them are the same
 * field by construction: `getResultNote` takes `note[0].text` and
 * `getProviderComments` maps all of `note[]`. On the demo's aligner report that
 * printed one sentence four times, under **Impression**, **Narrative**,
 * **Result note** and **Provider comments**, which reads as four clinicians
 * having written the same thing.
 *
 * Order is specificity: an impression is a conclusion about the result, a
 * narrative is the body, a note is an aside. Whichever says it first keeps it.
 */
export function dedupeNarrativeText<
  T extends {
    narrative?: string;
    impression?: string;
    resultNote?: string;
    providerComments: string[];
  },
>(text: T): T {
  const seen = new Set<string>();
  const keep = (value?: string) => {
    const key = value?.trim().toLowerCase();
    if (!key) return value;
    if (seen.has(key)) return undefined;
    seen.add(key);
    return value;
  };

  const impression = keep(text.impression);
  const narrative = keep(text.narrative);
  const resultNote = keep(text.resultNote);
  const providerComments = text.providerComments.filter(
    (comment) => keep(comment) !== undefined,
  );

  return {
    ...text,
    impression,
    narrative,
    resultNote,
    providerComments,
  };
}

function getNarrative(resource: any) {
  return stripHtml(
    resource?.text?.div ||
      resource?.studyResult?.narrative?.contentAsString ||
      resource?.studyResult?.narrative?.contentAsHtml,
  );
}

function getImpression(resource: any) {
  return stripHtml(
    resource?.conclusion ||
      resource?.studyResult?.impression?.contentAsString ||
      resource?.studyResult?.impression?.contentAsHtml,
  );
}

function getResultNote(resource: any) {
  return stripHtml(
    resource?.note?.[0]?.text ||
      resource?.resultNote?.contentAsString ||
      resource?.resultLetter?.contentAsString,
  );
}

function getProviderComments(resource: any): string[] {
  const comments = [
    ...(Array.isArray(resource?.providerComments)
      ? resource.providerComments
      : []),
    ...(Array.isArray(resource?.note)
      ? resource.note.map((note: any) => note?.text)
      : []),
  ];
  return comments.map(stripHtml).filter(Boolean) as string[];
}

function getLinkedDocuments(
  resource: any,
  documentsById: Map<string, ClinicalDocument<any>>,
  reports: ReportLink[],
): LinkedResultDocument[] {
  const fromReports = reports.map((report) => ({
    id: report.id,
    title: report.displayName || 'Linked report',
    type: 'diagnosticreport',
    date: report.date,
  }));
  const referencedIds = [
    ...(resource?.presentedForm || []).map((item: any) => item?.id),
    // Both forms: FHIR imports key on the reference as written, manual records
    // on its trailing id.
    ...(resource?.result || []).flatMap((item: any) => {
      const reference = String(item?.reference || '');
      return reference ? [reference, reference.split('/').pop()] : [];
    }),
  ].filter(Boolean);
  const fromReferences = referencedIds
    .map((id) => documentsById.get(id))
    .filter(Boolean)
    .map((document) => ({
      id: document!.id,
      title: document!.metadata?.display_name || 'Linked document',
      type: getResourceType(document!),
      date: document!.metadata?.date,
    }));

  return [...fromReports, ...fromReferences].filter(
    (item, index, list) =>
      list.findIndex((other) => other.id === item.id) === index,
  );
}

function hasDownload(document: ClinicalDocument<any>, resource: any) {
  return Boolean(
    document.data_record?.content_type ||
      resource?.presentedForm?.length ||
      resource?.content?.[0]?.attachment ||
      resource?.reportDetails?.isDownloadablePDFReport,
  );
}

function countLinkedDocuments(resource: any) {
  return (
    (Array.isArray(resource?.presentedForm)
      ? resource.presentedForm.length
      : 0) +
    (Array.isArray(resource?.scans) ? resource.scans.length : 0) +
    (Array.isArray(resource?.imageStudies) ? resource.imageStudies.length : 0)
  );
}

function isMetadataOnly(resource: any) {
  return !(
    resource?.result?.length ||
    resource?.presentedForm?.length ||
    resource?.studyResult?.hasStudyContent ||
    resource?.text?.div ||
    resource?.conclusion ||
    resource?.content?.length
  );
}

function getIdentifierValue(resource: any, labels: string[]) {
  const identifiers = Array.isArray(resource?.identifier)
    ? resource.identifier
    : [];
  const match = identifiers.find((identifier: any) => {
    const label = [
      identifier?.type?.text,
      ...(identifier?.type?.coding || []).map((coding: any) => coding?.display),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return labels.some((candidate) => label.includes(candidate));
  });
  return match?.value || identifiers[0]?.value;
}

function humanizeResourceType(type: string) {
  return type
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function stripHtml(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compareDatesDesc(a?: string, b?: string) {
  const timeA = toSortableTime(a);
  const timeB = toSortableTime(b);
  // Compared rather than subtracted: -Infinity minus -Infinity is NaN, which
  // would make the comparator non-transitive when two results are both undated.
  if (timeA === timeB) return 0;
  return timeB > timeA ? 1 : -1;
}

/**
 * Missing and unparseable dates sort last in a descending list. Falling back to
 * 0 (the epoch) instead pushed undated results above anything dated before 1970.
 */
function toSortableTime(value?: string) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

export function formatResultValue(document: ClinicalDocument<any>) {
  const value = getValueQuantity(document as LabDocument);
  if (value !== undefined) {
    const unit = getValueUnit(document as LabDocument);
    return `${value}${unit ? ` ${unit}` : ''}`;
  }
  return getValueString(document as LabDocument) || 'No value';
}

export function formatResultGroupDate(date?: string) {
  return safeFormatDate(date, 'PP', 'Unknown date');
}
