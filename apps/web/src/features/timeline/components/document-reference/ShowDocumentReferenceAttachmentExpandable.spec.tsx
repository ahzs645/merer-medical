/** @jest-environment jsdom */
import { TextDecoder } from 'util';
import { render, waitFor } from '@testing-library/react';

import { ClinicalDocument } from '../../../../models/clinical-document/ClinicalDocument.type';
import { ShowDocumentResultsAttachmentExpandable } from './ShowDocumentReferenceAttachmentExpandable';

let mockConnectionSource = 'cerner';
jest.mock('../../../connections/hooks/useConnectionDoc', () => ({
  useConnectionDoc: () => ({
    get: (key: string) =>
      key === 'id' ? 'synthetic-source' : mockConnectionSource,
  }),
}));
jest.mock('../../../../shared/components/Modal', () => ({
  Modal: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('../../../../shared/components/ModalHeader', () => ({
  ModalHeader: ({ title }: any) => <h2>{title}</h2>,
}));
jest.mock('./DisplayCCDADocument', () => ({ DisplayCCDADocument: () => null }));
jest.mock('./parseCCDA/parseCCDA', () => ({ parseCCDA: () => ({}) }));

const base64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

function legacyAttachment(
  contentType: string,
  raw: string,
): ClinicalDocument<string> {
  return {
    id: 'synthetic-attachment',
    user_id: 'synthetic-user',
    connection_record_id: 'synthetic-source',
    data_record: {
      resource_type: 'documentreference_attachment',
      format: 'FHIR.R4',
      content_type: contentType,
      raw,
      version_history: [],
    },
    metadata: {
      id: 'synthetic-binary',
      date: '2026-02-01',
      display_name: 'Synthetic portal attachment',
    },
  };
}

beforeAll(() =>
  Object.defineProperty(global, 'TextDecoder', {
    value: TextDecoder,
    configurable: true,
  }),
);

it.each(['cerner', 'healow'])(
  'reads legacy %s XML and malformed JSON using the linked connection rather than missing source metadata',
  async (source) => {
    mockConnectionSource = source;
    for (const [contentType, original] of [
      [
        'application/fhir+xml',
        '<Observation><text>العربية and English</text></Observation>',
      ],
      ['application/json', '{"text":"العربية", unfinished'],
    ]) {
      const { container, unmount } = render(
        <ShowDocumentResultsAttachmentExpandable
          item={legacyAttachment(contentType, base64(original))}
          expanded
          setExpanded={jest.fn()}
        />,
      );
      await waitFor(() =>
        expect(container.querySelector('pre')?.textContent).toBe(original),
      );
      unmount();
    }
  },
);

it('keeps Epic JSON response text literal even if it looks like valid base64 JSON', async () => {
  mockConnectionSource = 'epic';
  const raw = base64('{"text":"Literal source text"}');
  const { container } = render(
    <ShowDocumentResultsAttachmentExpandable
      item={legacyAttachment('application/json', raw)}
      expanded
      setExpanded={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(container.querySelector('pre')?.textContent).toBe(raw),
  );
});

it('keeps the explicit manual XML import literal', async () => {
  mockConnectionSource = 'manual';
  const original =
    '<Observation><text>العربية and English</text></Observation>';
  const item = legacyAttachment('application/fhir+xml', original);
  item.metadata = {
    ...item.metadata,
    source_type: 'manual',
    entry_method: 'file-import',
  };
  const { container } = render(
    <ShowDocumentResultsAttachmentExpandable
      item={item}
      expanded
      setExpanded={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(container.querySelector('pre')?.textContent).toBe(original),
  );
});
