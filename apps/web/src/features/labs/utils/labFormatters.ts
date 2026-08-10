import { format, parseISO } from 'date-fns';
import { Routes } from '../../../Routes';
import {
  getValueQuantity,
  getValueString,
  getValueUnit,
} from '../../timeline/utils/fhirpathParsers';
import { LabDocument, LabFilterMode } from '../types';

/**
 * Filter names shown to the reader. "Planner" was jargon for a hard-coded set
 * of metabolic markers and no planner feature exists in the app, so the mode is
 * named for what it contains (spelled out in labFilterHints below).
 */
export const labFilterLabels: Record<LabFilterMode, string> = {
  attention: 'Attention',
  planner: 'Key markers',
  all: 'All',
};

/**
 * What each filter is actually doing, in a sentence. Lives beside the labels
 * because it is the same fact twice — a chip reading "Attention" and a sentence
 * saying which results earn that word — and the two drifted apart while the
 * sentence sat in the coverage card and the labels sat here.
 */
export const labFilterHints: Record<LabFilterMode, string> = {
  attention:
    'Listing only lab tests with at least one high, low, or borderline result against the selected reference standard.',
  planner:
    'Listing only the key metabolic markers: glucose, A1c, HDL, LDL, triglycerides, and vitamin D.',
  all: 'Listing every lab test found in your records.',
};

export function formatLabValue(lab: LabDocument): string {
  const numericValue = getValueQuantity(lab),
    value =
      numericValue !== undefined ? `${numericValue}` : getValueString(lab),
    unit = getValueUnit(lab);

  return [value, unit].filter(Boolean).join(' ');
}

export function compareLabsByDateDesc(a: LabDocument, b: LabDocument): number {
  return (b.metadata?.date || '').localeCompare(a.metadata?.date || '');
}

export function getTimelineDateLink(date?: string): string {
  if (!date) return Routes.Timeline;

  return `${Routes.Timeline}#${format(parseISO(date), 'MMM-dd-yyyy')}`;
}

export function getLabDetailLink(labKey: string): string {
  return `${Routes.Labs}/${encodeURIComponent(labKey)}`;
}
