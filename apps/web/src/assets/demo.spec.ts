import demoDump from './demo';

interface DemoClinicalDocument {
  id?: string;
  user_id?: string;
  connection_record_id?: string;
  data_record?: unknown;
  metadata?: {
    id?: string;
  };
}

function collectClinicalDocuments(value: unknown): DemoClinicalDocument[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectClinicalDocuments);
  }

  const row = value as DemoClinicalDocument;
  const docs =
    row.user_id &&
    row.connection_record_id &&
    row.metadata?.id &&
    row.data_record
      ? [row]
      : [];

  return docs.concat(
    Object.values(value as Record<string, unknown>).flatMap(
      collectClinicalDocuments,
    ),
  );
}

describe('demo fixture', () => {
  it('uses schema-derived primary keys for clinical documents', () => {
    const docs = collectClinicalDocuments(demoDump);

    expect(docs.length).toBeGreaterThan(0);
    expect(
      docs.map((doc) => ({
        id: doc.id,
        expected: `${doc.connection_record_id}|${doc.user_id}|${doc.metadata?.id}`,
      })),
    ).toEqual(
      docs.map((doc) => ({
        id: `${doc.connection_record_id}|${doc.user_id}|${doc.metadata?.id}`,
        expected: `${doc.connection_record_id}|${doc.user_id}|${doc.metadata?.id}`,
      })),
    );
  });
});
