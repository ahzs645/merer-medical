import { getFhirResource } from '../../../shared/utils/fhirResource';
import { getReferenceRangeDisplay } from '../../timeline/utils/fhirpathParsers';
import { LabDocument, LabGroup } from '../types';
import { formatLabValue } from './labFormatters';

export type LabResultStatus =
  | 'high'
  | 'low'
  | 'abnormal'
  | 'normal'
  | 'unknown';

export interface LabResultDetail {
  id: string;
  displayName: string;
  value: string;
  status: LabResultStatus;
  statusLabel: string;
  date?: string;
  referenceRange?: string;
  interpretation?: string;
  comments: string[];
  performer?: string;
  source?: string;
  accessionId?: string;
}

export interface LabGroupInsight {
  latest: LabResultDetail;
  highCount: number;
  lowCount: number;
  abnormalCount: number;
  commentedCount: number;
  distinctPerformers: string[];
}

export function getLabResultDetail(lab: LabDocument): LabResultDetail {
  const resource = getFhirResource<any>(lab),
    interpretation = getInterpretationText(resource),
    status = getLabResultStatus(resource, lab),
    performer = getPerformerText(resource),
    accessionId = getAccessionId(resource);

  return {
    id: lab.metadata?.id || lab.id,
    displayName:
      lab.metadata?.display_name ||
      resource?.code?.text ||
      firstCodingDisplay(resource?.code?.coding) ||
      'Unknown lab',
    value: formatLabValue(lab) || 'No value',
    status,
    statusLabel: getLabResultStatusLabel(status, interpretation),
    date: lab.metadata?.date,
    referenceRange: getReferenceRangeDisplay(lab),
    interpretation,
    comments: getLabComments(resource, lab),
    performer,
    source: lab.metadata?.source_name,
    accessionId,
  };
}

export function getLabGroupInsight(group: LabGroup): LabGroupInsight {
  const details = group.labs.map(getLabResultDetail),
    distinctPerformers = unique(
      details.map((detail) => detail.performer).filter(isPresent),
    );

  return {
    latest: details[0],
    highCount: details.filter((detail) => detail.status === 'high').length,
    lowCount: details.filter((detail) => detail.status === 'low').length,
    abnormalCount: details.filter((detail) =>
      ['high', 'low', 'abnormal'].includes(detail.status),
    ).length,
    commentedCount: details.filter((detail) => detail.comments.length > 0)
      .length,
    distinctPerformers,
  };
}

export function getLabResultStatusClass(status: LabResultStatus): string {
  if (status === 'high' || status === 'low' || status === 'abnormal') {
    return 'text-red-700';
  }
  if (status === 'normal') return 'text-green-700';
  return 'text-gray-600';
}

function getLabResultStatus(resource: any, lab: LabDocument): LabResultStatus {
  const codes = getInterpretationCodes(resource);

  if (codes.some((code) => ['HH', 'H', 'HU'].includes(code))) return 'high';
  if (codes.some((code) => ['LL', 'L', 'LU'].includes(code))) return 'low';
  if (
    codes.some((code) =>
      ['A', 'AA', 'ABN', 'POS', 'DET', 'IND', 'R', 'WR'].includes(code),
    )
  ) {
    return 'abnormal';
  }
  if (codes.some((code) => ['N', 'NEG', 'ND', 'NORMAL'].includes(code))) {
    return 'normal';
  }

  const value = toNumber(resource?.valueQuantity?.value),
    low = toNumber(resource?.referenceRange?.[0]?.low?.value),
    high = toNumber(resource?.referenceRange?.[0]?.high?.value);

  if (value !== undefined) {
    if (high !== undefined && value > high) return 'high';
    if (low !== undefined && value < low) return 'low';
    if (high !== undefined || low !== undefined) return 'normal';
  }

  const interpretationText = getInterpretationText(resource)?.toLowerCase();
  if (interpretationText?.includes('high')) return 'high';
  if (interpretationText?.includes('low')) return 'low';
  if (interpretationText?.includes('abnormal')) return 'abnormal';
  if (interpretationText?.includes('normal')) return 'normal';

  return lab.metadata?.mapping_confidence === 'unknown' ? 'unknown' : 'unknown';
}

function getLabResultStatusLabel(
  status: LabResultStatus,
  interpretation?: string,
): string {
  if (interpretation) return interpretation;
  if (status === 'high') return 'High';
  if (status === 'low') return 'Low';
  if (status === 'abnormal') return 'Abnormal';
  if (status === 'normal') return 'In range';
  return 'No flag';
}

function getInterpretationCodes(resource: any): string[] {
  const interpretations: any[] = Array.isArray(resource?.interpretation)
    ? resource.interpretation
    : [resource?.interpretation];

  return interpretations
    .flatMap((interpretation: any) => [
      interpretation?.text,
      ...(interpretation?.coding || []).flatMap((coding: any) => [
        coding?.code,
        coding?.display,
      ]),
    ])
    .filter(isPresent)
    .map((value: string) => value.trim().toUpperCase());
}

function getInterpretationText(resource: any): string | undefined {
  const interpretations: any[] = Array.isArray(resource?.interpretation)
    ? resource.interpretation
    : [resource?.interpretation];

  return interpretations
    .flatMap((interpretation: any) => [
      interpretation?.text,
      ...(interpretation?.coding || []).map((coding: any) => coding?.display),
      ...(interpretation?.coding || []).map((coding: any) => coding?.code),
    ])
    .find(isPresent);
}

function getLabComments(resource: any, lab: LabDocument): string[] {
  return unique(
    [
      resource?.comments,
      resource?.comment,
      ...(resource?.note || []).map((note: any) => note?.text),
      lab.metadata?.provenance_notes,
    ].filter(isPresent),
  );
}

function getPerformerText(resource: any): string | undefined {
  const performers: any[] = Array.isArray(resource?.performer)
    ? resource.performer
    : [resource?.performer];

  return performers
    .flatMap((performer: any) => [
      performer?.display,
      performer?.reference,
      performer?.actor?.display,
      performer?.actor?.reference,
    ])
    .find(isPresent);
}

function getAccessionId(resource: any): string | undefined {
  return [
    resource?.accessionIdentifier?.value,
    resource?.identifier?.find?.((identifier: any) =>
      String(identifier?.type?.text || identifier?.system || '')
        .toLowerCase()
        .includes('accession'),
    )?.value,
  ].find(isPresent);
}

function firstCodingDisplay(coding: any): string | undefined {
  const codings = Array.isArray(coding) ? coding : [coding];
  return codings.map((item) => item?.display || item?.code).find(isPresent);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function isPresent(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
