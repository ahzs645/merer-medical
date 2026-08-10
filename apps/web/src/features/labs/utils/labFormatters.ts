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
 * named for what it contains (see filterHints in RecordCoveragePanel).
 */
export const labFilterLabels: Record<LabFilterMode, string> = {
  attention: 'Attention',
  planner: 'Key markers',
  all: 'All',
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
