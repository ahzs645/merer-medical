import { format, parseISO } from 'date-fns';
import { Routes } from '../../../Routes';
import {
  getValueQuantity,
  getValueString,
  getValueUnit,
} from '../../timeline/utils/fhirpathParsers';
import { LabDocument } from '../types';

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
