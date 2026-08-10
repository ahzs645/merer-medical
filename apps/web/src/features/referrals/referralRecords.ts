import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, periodStart } from '../../shared/utils/fhirText';

export interface ReferralItem {
  id: string;
  name: string;
  status?: string;
  requester?: string;
  performer?: string;
  notes: string[];
  date?: string;
  source?: string;
}

/**
 * The only place that decides what a Referrals card shows. It lives outside the
 * component so the manual-entry builder can be tested against the real reader —
 * a hand-entered referral that this returns a blank name or no date for is a
 * card the user cannot recognize, and that is exactly what a builder written
 * against a guess about these fields produces.
 */
export function mapReferralDocs(
  docs: ClinicalDocument[],
  connectionsById: Map<string, ConnectionDocument>,
): ReferralItem[] {
  return docs.map((d) => {
    const r = getFhirResource<Record<string, unknown>>(d);
    const requester = r['requester'] as Record<string, unknown> | undefined;
    const performer = Array.isArray(r['performer'])
      ? (r['performer'][0] as Record<string, unknown> | undefined)
      : undefined;
    const notes = Array.isArray(r['note'])
      ? (r['note'] as Array<Record<string, unknown>>)
          .map((n) => firstText(n['text']))
          .filter((t): t is string => Boolean(t))
      : [];
    return {
      id: d.id,
      name: d.metadata?.display_name || firstText(r['code']) || 'Referral',
      status: firstText(r['status']),
      requester: firstText(requester?.['display']),
      performer: firstText(performer?.['display']),
      notes,
      date:
        (r['authoredOn'] as string) ||
        periodStart(r['occurrencePeriod']) ||
        d.metadata?.date,
      source:
        connectionsById.get(d.connection_record_id)?.name ||
        d.metadata?.source_name,
    };
  });
}
