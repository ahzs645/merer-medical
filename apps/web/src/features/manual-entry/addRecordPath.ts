import { Routes as AppRoutes } from '../../Routes';
import type {
  DentalEntryKind,
  ManualRecordKind,
  OptometryEntryKind,
} from './manualRecordTypes';

/**
 * Builds the link to the manual-entry form.
 *
 * Fourteen record tabs used to hand-roll this query string, which is how one
 * of them ("Add history") ended up with no preset at all and how the Imaging
 * one ended up presetting a title but not the thing that decides where the
 * record lands. One builder, one place to read what a preset can carry.
 */
export function buildAddRecordPath(options: {
  type?: ManualRecordKind;
  specialty?: 'dental' | 'optometry';
  dental?: DentalEntryKind;
  optometry?: OptometryEntryKind;
  title?: string;
  /**
   * The route to land on after a successful save. Pass the page the button
   * lives on: saving used to drop everyone on the Timeline, which reads as
   * "that didn't work" when you were building a list somewhere else.
   */
  returnTo?: string;
}): string {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.specialty) params.set('specialty', options.specialty);
  if (options.dental) params.set('dental', options.dental);
  if (options.optometry) params.set('optometry', options.optometry);
  if (options.title) params.set('title', options.title);
  if (options.returnTo) params.set('returnTo', options.returnTo);

  const query = params.toString();
  return query ? `${AppRoutes.AddRecord}?${query}` : AppRoutes.AddRecord;
}

/**
 * `returnTo` comes off the URL, so it is treated as hostile until it looks
 * like an in-app path: one leading slash, and no scheme or protocol-relative
 * prefix that would send a saved record's author to another origin.
 */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  return value;
}
