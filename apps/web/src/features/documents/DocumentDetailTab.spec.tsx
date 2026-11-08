/** @jest-environment jsdom */
import { TextDecoder } from 'util';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { ManualRecordModal } from '../manual-entry/ManualRecordModal';
import { DocumentDetailTab } from './DocumentDetailTab';

jest.mock('../../app/providers/RxDbProvider', () => ({
  useRxDb: () => mockDb,
}));
jest.mock('../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'synthetic-user' }),
}));
jest.mock('../../shared/components/AppPage', () => ({
  AppPage: ({ banner, children }: any) => (
    <div>
      {banner}
      {children}
    </div>
  ),
}));
jest.mock('../../shared/components/records/RecordPageHeader', () => ({
  RecordPageHeader: ({ title, count }: any) => (
    <header>
      <h1>{title}</h1>
      <div>{count}</div>
    </header>
  ),
}));
jest.mock('../manual-entry/ManualRecordActions', () => ({
  ManualRecordActions: () => null,
}));
jest.mock('../manual-entry/ManualRecordModal', () => ({
  ManualRecordModal: jest.fn(() => null),
}));
jest.mock('../provenance/ProvenancePanel', () => ({
  ProvenancePanel: () => null,
}));
jest.mock('../dental/components/StoredFilesSummary', () => ({
  StoredFilesSummary: () => null,
}));
jest.mock('../../shared/storage/fileStore', () => ({
  getRecordFileSet: () => undefined,
}));
jest.mock('../timeline/components/ObservationResultsTable', () => ({
  ObservationResultsTable: () => null,
  countAbnormal: () => 0,
}));
jest.mock(
  '../timeline/components/document-reference/DisplayCCDADocument',
  () => ({ DisplayCCDADocument: () => null }),
);
jest.mock(
  '../timeline/components/document-reference/parseCCDA/parseCCDA',
  () => ({ parseCCDA: () => ({}) }),
);
jest.mock(
  '../timeline/components/document-reference/ShowDocumentReferenceAttachmentExpandable',
  () => ({ checkIfXmlIsCCDA: () => false }),
);

let mockRecords: ClinicalDocument[] = [];
let mockConnections: ConnectionDocument[] = [];
const mockDb = {
  clinical_documents: {
    findOne: jest.fn(({ selector }) => ({
      exec: async () => {
        const record = mockRecords.find(
          (candidate) =>
            candidate.user_id === selector.user_id &&
            (selector.id
              ? candidate.id === selector.id
              : candidate.metadata?.id === selector['metadata.id']),
        );
        return record ? { toMutableJSON: () => record } : null;
      },
    })),
    find: jest.fn(({ selector }) => ({
      exec: async () =>
        mockRecords
          .filter(
            (candidate) =>
              candidate.user_id === selector.user_id &&
              (!selector['data_record.resource_type'] ||
                candidate.data_record.resource_type ===
                  selector['data_record.resource_type']),
          )
          .map((record) => ({ toMutableJSON: () => record })),
    })),
  },
  connection_documents: {
    findOne: ({ selector }: { selector: { id: string } }) => ({
      exec: async () => {
        const connection = mockConnections.find(
          (candidate) => candidate.id === selector.id,
        );
        return connection
          ? {
              toMutableJSON: () => connection,
              get: (key: keyof ConnectionDocument) => connection[key],
            }
          : null;
      },
    }),
  },
};

const transcript =
  '{"text":"العربية and English","number":900719925474099312345}';
const base64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

function documentRecord(
  overrides: Partial<ClinicalDocument> = {},
): ClinicalDocument {
  return {
    id: 'synthetic-document',
    user_id: 'synthetic-user',
    connection_record_id: 'synthetic-source',
    data_record: {
      raw: transcript,
      content_type: 'application/json',
      resource_type: 'documentreference_attachment',
      format: 'FHIR.R4',
      version_history: [],
    },
    metadata: {
      id: 'synthetic-source-document',
      display_name: 'Synthetic transcript.json',
    },
    ...overrides,
  };
}

function renderDocument(id: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        `${AppRoutes.Documents}/detail/${encodeURIComponent(id)}`,
      ]}
    >
      <Routes>
        <Route
          path={AppRoutes.DocumentDetail}
          element={<DocumentDetailTab />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

describe('document detail source and attachment handling', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'TextDecoder', {
      value: TextDecoder,
      configurable: true,
    });
    URL.createObjectURL = jest.fn(() => 'blob:synthetic-attachment');
    URL.revokeObjectURL = jest.fn();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnections = [];
    jest.spyOn(window, 'open').mockImplementation(() => null);
  });
  afterEach(() => jest.restoreAllMocks());

  it('opens a stored raw JSON document and preserves its original bytes in Open and Download', async () => {
    const record = documentRecord();
    mockRecords = [record];
    const { container } = renderDocument(record.metadata!.id!);
    await waitFor(() =>
      expect(container.querySelector('pre')?.textContent).toContain(
        'العربية and English',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(window.open).toHaveBeenCalledWith(
      'blob:synthetic-attachment',
      '_blank',
      'noopener',
    );
    const openBlob = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
    expect(await blobText(openBlob)).toBe(transcript);

    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    const downloadBlob = (URL.createObjectURL as jest.Mock).mock.calls[1][0];
    expect(await blobText(downloadBlob)).toBe(transcript);
  });

  it('decodes FHIR inline base64 for preview and download when no stored attachment exists', async () => {
    const record = documentRecord({
      data_record: {
        raw: {
          resource: {
            resourceType: 'DocumentReference',
            content: [
              {
                attachment: {
                  contentType: 'application/json',
                  data: base64(transcript),
                },
              },
            ],
          },
        },
        content_type: 'application/json',
        resource_type: 'documentreference',
        format: 'FHIR.R4',
        version_history: [],
      },
    });
    mockRecords = [record];
    const { container } = renderDocument(record.metadata!.id!);
    await waitFor(() =>
      expect(container.querySelector('pre')?.textContent).toContain(
        'العربية and English',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      await blobText((URL.createObjectURL as jest.Mock).mock.calls[0][0]),
    ).toBe(transcript);
  });

  it.each<ConnectionDocument['source']>(['cerner', 'healow'])(
    'uses the %s connection for legacy JSON/XML attachments without source metadata',
    async (source) => {
      jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      mockConnections = [
        {
          id: 'synthetic-source',
          user_id: 'synthetic-user',
          source,
          name: 'Synthetic portal',
          location: 'https://example.invalid/fhir',
          access_token: '',
          expires_at: 0,
        },
      ];
      for (const [contentType, original] of [
        [
          'application/fhir+xml',
          '<Observation><text>العربية and English</text></Observation>',
        ],
        ['application/json', '{"text":"العربية", unfinished'],
      ]) {
        const record = documentRecord();
        record.data_record.content_type = contentType;
        record.data_record.raw = base64(original);
        // Match old portal rows: only source id, date, and display name.
        record.metadata = {
          id: 'synthetic-source-document',
          date: '2026-02-01',
          display_name: 'Synthetic portal document',
        };
        mockRecords = [record];
        const { container, unmount } = renderDocument(record.metadata.id!);
        await waitFor(() =>
          expect(container.querySelector('pre')?.textContent).toBe(original),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Download' }));
        const blob = (URL.createObjectURL as jest.Mock).mock.calls.slice(
          -1,
        )[0][0];
        expect(await blobText(blob)).toBe(original);
        unmount();
      }
    },
  );

  it('uses the stored attachment connection when its document comes from a different source', async () => {
    mockConnections = [
      { id: 'epic-source', source: 'epic' },
      { id: 'cerner-source', source: 'cerner' },
    ] as ConnectionDocument[];
    const original = '{"text":"العربية", unfinished';
    const stored = documentRecord({
      id: 'stored-attachment',
      connection_record_id: 'cerner-source',
    });
    stored.data_record.raw = base64(original);
    const reference = documentRecord({
      id: 'document-reference',
      connection_record_id: 'epic-source',
      metadata: {
        id: 'synthetic-document-reference',
        display_name: 'Synthetic linked document',
      },
      data_record: {
        raw: {
          resource: {
            resourceType: 'DocumentReference',
            content: [{ attachment: { url: stored.metadata!.id } }],
          },
        },
        content_type: 'application/json',
        resource_type: 'documentreference',
        format: 'FHIR.R4',
        version_history: [],
      },
    });
    mockRecords = [reference, stored];
    const { container } = renderDocument(reference.metadata!.id!);
    await waitFor(() =>
      expect(container.querySelector('pre')?.textContent).toBe(original),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      await blobText((URL.createObjectURL as jest.Mock).mock.calls[0][0]),
    ).toBe(original);
  });

  it('uses the document id when metadata.id is absent and retains all linked records', async () => {
    const record = documentRecord({
      metadata: { display_name: 'Synthetic transcript.json' },
    });
    const linked = documentRecord({
      id: 'linked-condition',
      metadata: {
        source_document_id: record.id,
        display_name: 'Synthetic linked condition',
      },
      data_record: {
        raw: { resource: { resourceType: 'Condition' } },
        content_type: 'application/json',
        resource_type: 'condition',
        format: 'FHIR.R4',
        version_history: [],
      },
    });
    mockRecords = [record, linked];
    const { container } = renderDocument(record.id);
    await waitFor(() =>
      expect(container.querySelector('pre')?.textContent).toContain(
        'العربية and English',
      ),
    );
    expect(
      screen.getByRole('link', { name: /Synthetic linked condition/ }),
    ).toBeTruthy();
    expect(
      (ManualRecordModal as jest.Mock).mock.calls.slice(-1)[0]?.[0],
    ).toMatchObject({
      linkedDocumentId: record.id,
      linkedAttachmentId: record.id,
    });
  });

  it.each(['synthetic%20literal', 'https://example.invalid/record%2Fname'])(
    'preserves literal percent escapes through real Router navigation: %s',
    async (id) => {
      const record = documentRecord({
        metadata: { id, display_name: 'Synthetic percent identifier' },
      });
      mockRecords = [record];
      const { container } = renderDocument(id);
      await waitFor(() =>
        expect(container.querySelector('pre')?.textContent).toContain(
          'العربية and English',
        ),
      );
      expect(
        screen.getByRole('heading', { name: 'Synthetic percent identifier' }),
      ).toBeTruthy();
    },
  );
});
