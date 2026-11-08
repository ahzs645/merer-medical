/** @jest-environment node */
import {
  createAttachmentBlob,
  formatJsonAttachment,
  getStoredAttachmentEncoding,
  hasAttachmentContent,
  isJsonAttachment,
  readAttachmentText,
} from './attachmentContent';

const transcript = '{"language":"العربية and English","text":"Synthetic note"}';
const base64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

describe('embedded attachment content', () => {
  it('keeps raw JSON text and original UTF-8 bytes for download', async () => {
    const attachment = { contentType: 'application/json', raw: transcript };
    expect(await readAttachmentText(attachment)).toBe(transcript);
    expect(await createAttachmentBlob(attachment)?.text()).toBe(transcript);
  });

  it.each(['application/json', 'text/plain', 'application/xml'])(
    'decodes explicitly encoded FHIR inline %s as UTF-8',
    async (contentType) => {
      const attachment = {
        contentType,
        raw: base64(transcript),
        encoding: 'base64' as const,
      };
      expect(await readAttachmentText(attachment)).toBe(transcript);
      expect(await createAttachmentBlob(attachment)?.text()).toBe(transcript);
    },
  );

  it('accepts legacy encoded JSON only when decoded bytes validate as JSON', async () => {
    const attachment = {
      contentType: 'application/fhir+json; charset=utf-8',
      raw: base64(transcript),
    };
    expect(await readAttachmentText(attachment)).toBe(transcript);
    expect(await createAttachmentBlob(attachment)?.text()).toBe(transcript);

    const malformed = '{"text":"العربية", broken';
    expect(
      await readAttachmentText({
        contentType: 'application/json',
        raw: malformed,
      }),
    ).toBe(malformed);
    expect(
      await readAttachmentText({
        contentType: 'application/json',
        raw: base64(malformed),
      }),
    ).toBe(base64(malformed));
  });

  it('never guesses base64 encoding for stored plain text', async () => {
    const raw = base64('Literal source text');
    expect(await readAttachmentText({ contentType: 'text/plain', raw })).toBe(
      raw,
    );
    expect(
      await readAttachmentText({
        contentType: 'application/json',
        raw: '1234',
      }),
    ).toBe('1234');
  });

  it.each([
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
  ])(
    'retains original legacy binary bytes for %s downloads',
    async (contentType) => {
      const bytes = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00]);
      const blob = createAttachmentBlob({
        contentType,
        raw: Buffer.from(bytes).toString('base64'),
      });
      expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(bytes);
      expect(blob?.type).toBe(contentType);
    },
  );

  it.each([
    'text/plain',
    'text/xml',
    'application/xml',
    'application/fhir+xml',
  ])(
    'keeps base64-looking stored %s literal when handling other legacy binaries',
    async (contentType) => {
      const raw = base64('Stored literal text');
      expect(await createAttachmentBlob({ contentType, raw })?.text()).toBe(
        raw,
      );
    },
  );

  it('preserves unencoded unsupported content when legacy base64 decoding does not apply', async () => {
    const raw = 'Synthetic unencoded response.';
    expect(
      await createAttachmentBlob({
        contentType: 'application/octet-stream',
        raw,
      })?.text(),
    ).toBe(raw);
  });

  it('uses known manual-import encoding even when uploaded JSON is malformed', async () => {
    const raw = '{"text":"العربية", broken';
    const attachment = {
      contentType: 'application/json',
      raw: base64(raw),
      encoding: getStoredAttachmentEncoding({
        contentType: 'application/json',
        sourceType: 'manual',
        entryMethod: 'file-import',
      }),
    };
    expect(attachment.encoding).toBe('base64');
    expect(await readAttachmentText(attachment)).toBe(raw);
    expect(await createAttachmentBlob(attachment)?.text()).toBe(raw);
  });

  it.each([
    'text/plain',
    'application/xml',
    'text/html',
    'application/xhtml+xml',
  ])('keeps the manual file reader text contract for %s', (contentType) => {
    expect(
      getStoredAttachmentEncoding({
        contentType,
        sourceType: 'manual',
        entryMethod: 'file-import',
      }),
    ).toBe('text');
  });

  it('does not infer a manual import contract for other source records', () => {
    expect(
      getStoredAttachmentEncoding({ contentType: 'application/json' }),
    ).toBeUndefined();
    expect(
      getStoredAttachmentEncoding({
        contentType: 'application/json',
        sourceType: 'manual',
        entryMethod: 'manual-entry',
      }),
    ).toBeUndefined();
  });

  it.each(['cerner', 'healow'])(
    'uses the %s connection contract for legacy +xml and malformed JSON bytes',
    async (connectionSource) => {
      for (const [contentType, original] of [
        [
          'application/fhir+xml',
          '<Observation><text>العربية and English</text></Observation>',
        ],
        ['application/json', '{"text":"العربية", unfinished'],
        ['application/fhir+json', '{"resourceType":"Observation",'],
        ['application/xml; charset=utf-8', '<note>العربية</note>'],
      ]) {
        const attachment = {
          contentType,
          raw: base64(original),
          encoding: getStoredAttachmentEncoding({
            contentType,
            connectionSource,
          }),
        };
        expect(attachment.encoding).toBe('base64');
        expect(await readAttachmentText(attachment)).toBe(original);
        expect(
          new Uint8Array(await createAttachmentBlob(attachment)!.arrayBuffer()),
        ).toEqual(new Uint8Array(Buffer.from(original, 'utf8')));
      }
    },
  );

  it.each(['cerner', 'healow'])(
    'keeps already-decoded XML/text from %s literal',
    async (connectionSource) => {
      for (const contentType of [
        'application/xml',
        'text/plain',
        'text/xml',
        'text/html',
        'text/json',
      ]) {
        const raw = base64('This is literal stored text');
        const encoding = getStoredAttachmentEncoding({
          contentType,
          connectionSource,
        });
        expect(encoding).toBe('text');
        expect(
          await createAttachmentBlob({ contentType, raw, encoding })?.text(),
        ).toBe(raw);
      }
    },
  );

  it('preserves Epic response text even when it looks like encoded XML or JSON', async () => {
    for (const contentType of ['application/fhir+xml', 'application/json']) {
      const raw = base64('{"text":"This is literal stored text"}');
      const encoding = getStoredAttachmentEncoding({
        contentType,
        connectionSource: 'epic',
      });
      expect(encoding).toBe('text');
      expect(
        await createAttachmentBlob({ contentType, raw, encoding })?.text(),
      ).toBe(raw);
    }
    expect(
      getStoredAttachmentEncoding({
        contentType: 'application/pdf',
        connectionSource: 'epic',
      }),
    ).toBe('base64');
    expect(
      getStoredAttachmentEncoding({
        contentType: 'image/png',
        connectionSource: 'epic',
      }),
    ).toBe('base64');
  });

  it('prioritizes the explicit manual XML contract over a connector association', async () => {
    const raw = 'Literal العربية text';
    const encoding = getStoredAttachmentEncoding({
      contentType: 'application/fhir+xml',
      sourceType: 'manual',
      entryMethod: 'file-import',
      connectionSource: 'cerner',
    });
    expect(encoding).toBe('text');
    expect(
      await createAttachmentBlob({
        contentType: 'application/fhir+xml',
        raw,
        encoding,
      })?.text(),
    ).toBe(raw);
  });

  it('keeps connector JSON download bytes even when they are not valid UTF-8', async () => {
    const bytes = Uint8Array.from([0x7b, 0x22, 0xff, 0x22]);
    const attachment = {
      contentType: 'application/json',
      raw: Buffer.from(bytes).toString('base64'),
      encoding: getStoredAttachmentEncoding({
        contentType: 'application/json',
        connectionSource: 'cerner',
      }),
    };
    expect(
      new Uint8Array(await createAttachmentBlob(attachment)!.arrayBuffer()),
    ).toEqual(bytes);
    await expect(readAttachmentText(attachment)).rejects.toThrow();
  });

  it('rejects invalid declared base64 and invalid UTF-8 rather than corrupting text', async () => {
    await expect(
      readAttachmentText({
        contentType: 'text/plain',
        raw: '*not-base64*',
        encoding: 'base64',
      }),
    ).rejects.toThrow();
    await expect(
      readAttachmentText({
        contentType: 'text/plain',
        raw: '/w==',
        encoding: 'base64',
      }),
    ).rejects.toThrow();
  });

  it('keeps Blob bytes intact and distinguishes absent data', async () => {
    const raw = new Blob([transcript], { type: 'application/json' });
    expect(createAttachmentBlob({ raw })).toBe(raw);
    expect(await readAttachmentText({ raw })).toBe(transcript);
    for (const missing of [undefined, null, '', new Blob([])]) {
      expect(hasAttachmentContent(missing)).toBe(false);
      expect(createAttachmentBlob({ raw: missing })).toBeUndefined();
    }
    expect(hasAttachmentContent(' ')).toBe(true);
  });

  it('recognizes JSON MIME variants with case and charset parameters', () => {
    for (const type of [
      'application/json',
      'Application/JSON; charset=UTF-8',
      'application/fhir+json',
      'application/json+fhir',
      'text/json',
    ]) {
      expect(isJsonAttachment(type)).toBe(true);
    }
    expect(isJsonAttachment('application/pdf')).toBe(false);
  });
});

describe('JSON preview formatting', () => {
  it('formats valid JSON without changing numbers, duplicate keys, escapes or Unicode', () => {
    const raw =
      '{"large":900719925474099312345,"duplicate":1,"duplicate":2,"text":"العربية: [value], \\"quoted\\"","empty":{},"list":[1.2300e+10,[]]}';
    const formatted = formatJsonAttachment(raw);
    expect(formatted.valid).toBe(true);
    expect(formatted.text).toBe(
      `{\n  "large": 900719925474099312345,\n  "duplicate": 1,\n  "duplicate": 2,\n  "text": "العربية: [value], \\\"quoted\\\"",\n  "empty": {},\n  "list": [\n    1.2300e+10,\n    []\n  ]\n}`,
    );
    expect(JSON.parse(formatted.text)).toEqual(JSON.parse(raw));
  });

  it.each(['{"text":"العربية", broken', 'Not JSON', '   '])(
    'preserves malformed source text exactly',
    (text) =>
      expect(formatJsonAttachment(text)).toEqual({ text, valid: false }),
  );

  it.each(['null', 'false', '0', '"العربية"', '{}', '[]'])(
    'keeps valid JSON scalar and empty values readable: %s',
    (text) => expect(formatJsonAttachment(text)).toEqual({ text, valid: true }),
  );
});
