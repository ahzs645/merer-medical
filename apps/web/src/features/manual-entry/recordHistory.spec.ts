import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AuditLogEntry } from '../audit/auditLog';
import { buildRecordHistory, diffResources } from './recordHistory';

function record(raw: Record<string, unknown>, versionHistory: unknown[] = []) {
  return {
    id: 'conn|user|manual:medication-glimepiride',
    connection_record_id: 'conn',
    user_id: 'user',
    data_record: {
      raw,
      format: 'FHIR.DSTU2',
      content_type: 'application/json',
      resource_type: 'medicationstatement',
      version_history: versionHistory,
    },
    metadata: {
      id: 'manual:medication-glimepiride',
      date: '2026-10-26T12:00:00.000Z',
    },
  } as unknown as ClinicalDocument;
}

describe('buildRecordHistory', () => {
  it("lifts the transposer's review and the record's assumptions out of its notes", () => {
    const history = buildRecordHistory(
      record({
        audit: {
          status: 'source-verified',
          verifiedAt: '2026-11-06',
          notes: ['Checked against page 1.'],
        },
        resource: {
          note: [
            {
              text: 'Plan: Mayo list\nASSUMED current dose 1 mg daily.\nSource document: manual:source-document-x',
            },
          ],
        },
      }),
    );
    expect(history.review).toEqual({
      status: 'source-verified',
      verifiedAt: '2026-11-06',
      verifiedBy: undefined,
    });
    expect(history.reviewNotes).toEqual([
      { text: 'Checked against page 1.', assumption: false },
      { text: 'ASSUMED current dose 1 mg daily.', assumption: true },
    ]);
  });

  it("lists this record's audit events, newest first, and not other records'", () => {
    const entries = [
      {
        id: '1',
        userId: 'user',
        action: 'record.create',
        occurredAt: '2026-11-01T10:00:00Z',
        actor: 'local-user',
        targetId: 'conn|user|manual:medication-glimepiride',
        summary: 'Created glimepiride',
      },
      {
        id: '2',
        userId: 'user',
        action: 'record.update',
        occurredAt: '2026-11-05T10:00:00Z',
        actor: 'local-user',
        targetId: 'conn|user|manual:medication-glimepiride',
        summary: 'Updated glimepiride',
      },
      {
        id: '3',
        userId: 'user',
        action: 'record.update',
        occurredAt: '2026-11-06T10:00:00Z',
        actor: 'local-user',
        targetId: 'someone-else',
        summary: 'Updated metformin',
      },
    ] as AuditLogEntry[];
    const history = buildRecordHistory(record({ resource: {} }), entries);
    expect(history.events.map((event) => event.detail ?? event.label)).toEqual([
      'Updated glimepiride',
      'Created glimepiride',
      'Date of the record',
    ]);
  });

  it('shows what changed between every saved version, newest change first', () => {
    const v1 = {
      resource: { id: 'x', dosage: [{ text: '2 mg' }], status: 'active' },
    };
    const v2 = {
      resource: { id: 'x', dosage: [{ text: '1 mg' }], status: 'active' },
    };
    const v3 = {
      resource: { id: 'x', dosage: [{ text: '1 mg' }], status: 'completed' },
    };
    const history = buildRecordHistory(record(v3, [v1, v2]));
    expect(history.versions).toEqual([
      {
        from: 2,
        to: 3,
        changes: [{ path: 'status', before: 'active', after: 'completed' }],
        more: 0,
      },
      {
        from: 1,
        to: 2,
        changes: [{ path: 'dosage[0].text', before: '2 mg', after: '1 mg' }],
        more: 0,
      },
    ]);
  });

  it('ignores ids and bookkeeping when comparing versions', () => {
    expect(
      diffResources(
        { id: 'a', meta: { v: 1 }, code: 'x' },
        { id: 'b', meta: { v: 2 }, code: 'x' },
      ),
    ).toEqual([]);
  });
});
