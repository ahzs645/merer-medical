/** @jest-environment jsdom */
import { TextDecoder } from 'util';
import { render, screen, waitFor } from '@testing-library/react';

import { EmbeddedAttachmentViewer } from './EmbeddedAttachmentViewer';

jest.mock('./DisplayCCDADocument', () => ({
  DisplayCCDADocument: () => <div>CCDA document</div>,
}));
jest.mock('./parseCCDA/parseCCDA', () => ({ parseCCDA: jest.fn(() => ({})) }));
jest.mock('./ShowDocumentReferenceAttachmentExpandable', () => ({
  checkIfXmlIsCCDA: (text: string) => text.includes('<ClinicalDocument'),
}));

const transcript = '{"language":"العربية and English","text":"Synthetic note"}';
const base64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

describe('EmbeddedAttachmentViewer', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'TextDecoder', {
      value: TextDecoder,
      configurable: true,
    });
    URL.createObjectURL = jest.fn(() => 'blob:synthetic-attachment');
    URL.revokeObjectURL = jest.fn();
  });
  beforeEach(() => jest.clearAllMocks());

  it.each([
    { contentType: 'application/json', raw: transcript },
    { contentType: 'application/json', raw: base64(transcript) },
    {
      contentType: 'application/fhir+json; charset=utf-8',
      raw: base64(transcript),
      encoding: 'base64' as const,
    },
  ])(
    'previews raw and encoded JSON as readable Unicode text',
    async (attachment) => {
      const { container } = render(
        <EmbeddedAttachmentViewer attachment={attachment} />,
      );
      await waitFor(() =>
        expect(container.querySelector('pre')?.textContent).toContain(
          '"language": "العربية and English"',
        ),
      );
      expect(container.querySelector('pre')?.textContent).toContain('\n');
      expect(screen.queryByText(/could not be formatted/)).toBeNull();
    },
  );

  it('renders JSON markup as plain text rather than document HTML', async () => {
    const text = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const { container } = render(
      <EmbeddedAttachmentViewer
        attachment={{
          contentType: 'application/json',
          raw: JSON.stringify({ text }),
        }}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('pre')?.textContent).toContain(
        '<script>alert(2)</script>',
      ),
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it.each([undefined, 'base64' as const])(
    'keeps malformed JSON visible with an accurate explanation',
    async (encoding) => {
      const text = '{"text":"العربية", incomplete';
      const { container } = render(
        <EmbeddedAttachmentViewer
          attachment={{
            contentType: 'application/json',
            raw: encoding ? base64(text) : text,
            encoding,
          }}
        />,
      );
      expect(
        await screen.findByText(
          'This JSON could not be formatted. Showing its original text.',
        ),
      ).toBeTruthy();
      expect(container.querySelector('pre')?.textContent).toBe(text);
    },
  );

  it('keeps stored plain text literal and decodes explicitly encoded Unicode text', async () => {
    const text = 'العربية and English';
    const { container, rerender } = render(
      <EmbeddedAttachmentViewer
        attachment={{ contentType: 'text/plain', raw: base64(text) }}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('pre')?.textContent).toBe(base64(text)),
    );
    rerender(
      <EmbeddedAttachmentViewer
        attachment={{
          contentType: 'text/plain',
          raw: base64(text),
          encoding: 'base64',
        }}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('pre')?.textContent).toBe(text),
    );
  });

  it('distinguishes missing files, unsupported formats and invalid encoded contents', async () => {
    const { rerender } = render(
      <EmbeddedAttachmentViewer
        attachment={{ contentType: 'application/json' }}
      />,
    );
    expect(
      await screen.findByText('This record has no embedded file to preview.'),
    ).toBeTruthy();
    rerender(
      <EmbeddedAttachmentViewer
        attachment={{
          contentType: 'application/octet-stream',
          raw: 'stored bytes',
        }}
      />,
    );
    expect(
      await screen.findByText(
        'This file is stored, but a preview is not available for application/octet-stream.',
      ),
    ).toBeTruthy();
    rerender(
      <EmbeddedAttachmentViewer
        attachment={{
          contentType: 'application/json',
          raw: '*invalid*',
          encoding: 'base64',
        }}
      />,
    );
    expect(
      await screen.findByText(
        'This file is stored, but its contents could not be read for preview.',
      ),
    ).toBeTruthy();
  });

  it('keeps XML and CCDA previews available', async () => {
    const { container, rerender } = render(
      <EmbeddedAttachmentViewer
        attachment={{
          contentType: 'application/xml',
          raw: '<note>العربية</note>',
        }}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('pre')?.textContent).toBe(
        '<note>العربية</note>',
      ),
    );
    rerender(
      <EmbeddedAttachmentViewer
        attachment={{
          contentType: 'application/xml',
          raw: base64('<ClinicalDocument />'),
          encoding: 'base64',
        }}
      />,
    );
    expect(await screen.findByText('CCDA document')).toBeTruthy();
  });

  it('offers the full PDF filename and releases the file URL after closing', async () => {
    const title = 'Synthetic-long-document-filename-for-small-phone-widths.pdf';
    const { unmount } = render(
      <EmbeddedAttachmentViewer
        attachment={{
          contentType: 'application/pdf',
          raw: base64('%PDF-synthetic'),
          title,
        }}
      />,
    );
    expect(
      await screen.findByRole('button', {
        name: `${title} PDF · opens in a new tab`,
      }),
    ).toBeTruthy();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:synthetic-attachment',
    );
  });
});
