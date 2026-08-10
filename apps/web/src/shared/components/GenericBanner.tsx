import { type ReactNode } from 'react';

import { RecordPageHeader } from './records/RecordPageHeader';

/**
 * Title-only page banner for the routes outside Records (Settings, Summary,
 * Sources, …). It is a thin alias for `RecordPageHeader` so those pages cannot
 * drift away from the record tabs' banner — and so the page `<h1>` has exactly
 * one implementation app-wide.
 */
export function GenericBanner({
  text = '',
  action,
}: {
  text?: string;
  // Optional control rendered on the right side of the banner (e.g. an Add button).
  action?: ReactNode;
}) {
  return <RecordPageHeader title={text} action={action} />;
}
