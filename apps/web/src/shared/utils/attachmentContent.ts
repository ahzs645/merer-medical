export type AttachmentEncoding = 'text' | 'base64';

export type AttachmentContent = {
  contentType?: string;
  raw?: unknown;
  encoding?: AttachmentEncoding;
};

export function attachmentMimeType(contentType?: string): string {
  return (contentType || '').split(';')[0].trim().toLowerCase();
}

export function isJsonAttachment(contentType?: string): boolean {
  const type = attachmentMimeType(contentType);
  return (
    type === 'application/json' ||
    type === 'text/json' ||
    type.endsWith('+json') ||
    type === 'application/json+fhir'
  );
}

/** Use the source's storage contract, never the apparent validity of its file. */
export function getStoredAttachmentEncoding({
  contentType,
  sourceType,
  entryMethod,
  connectionSource,
}: {
  contentType?: string;
  sourceType?: string;
  entryMethod?: string;
  connectionSource?: string;
}): AttachmentEncoding | undefined {
  // ManualRecordForm reads these formats as text before storing the file.
  if (sourceType === 'manual' && entryMethod === 'file-import') {
    const type = attachmentMimeType(contentType);
    return type.startsWith('text/') ||
      type.includes('xml') ||
      type.includes('html')
      ? 'text'
      : 'base64';
  }

  // Legacy portal rows have only id/date/display_name metadata. Their linked
  // connection still identifies the producer. Match its exact MIME branch:
  // Cerner/Healow decode application/xml and types containing "text" before
  // storage, but retain Binary.data for +xml, JSON (even malformed), and all
  // other formats. Normalizing MIME parameters here would change that rule.
  if (connectionSource === 'cerner' || connectionSource === 'healow') {
    return contentType === 'application/xml' || contentType?.includes('text')
      ? 'text'
      : 'base64';
  }

  // Epic keeps response text except for the PDF/image blobs it base64-encodes.
  if (connectionSource === 'epic') {
    return contentType?.includes('application/pdf') ||
      contentType?.includes('image/')
      ? 'base64'
      : 'text';
  }

  return undefined;
}

export function hasAttachmentContent(raw: unknown): boolean {
  if (raw == null || raw === '') return false;
  return !(raw instanceof Blob) || raw.size > 0;
}

function decodeBase64(raw: string): Uint8Array<ArrayBuffer> {
  const binary = atob(raw);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeUtf8(bytes: Uint8Array): string {
  // atob returns bytes, not Unicode text. Refuse invalid UTF-8 instead of
  // silently replacing characters in a document.
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function validJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function attachmentPayload(
  attachment: AttachmentContent,
): string | Uint8Array<ArrayBuffer> | Blob | undefined {
  const { raw, encoding } = attachment;
  if (!hasAttachmentContent(raw)) return undefined;
  if (raw instanceof Blob) return raw;
  if (typeof raw !== 'string') {
    throw new Error('Unsupported embedded attachment data');
  }
  if (encoding === 'text') return raw;
  if (encoding === 'base64') return decodeBase64(raw);

  const type = attachmentMimeType(attachment.contentType);
  if (type === 'application/pdf' || type.startsWith('image/')) {
    return decodeBase64(raw);
  }

  // Stored attachments predate an encoding field. Epic saves JSON response
  // text, while Cerner/Healow can save FHIR Binary.data unchanged. Prefer raw
  // JSON and accept legacy base64 only if it decodes to valid UTF-8 JSON.
  // Ordinary text is never guessed to be base64.
  if (isJsonAttachment(type) && !validJson(raw)) {
    try {
      const bytes = decodeBase64(raw);
      if (validJson(decodeUtf8(bytes))) return bytes;
    } catch {
      // Keep the original text, including malformed JSON, readable.
    }
  }

  // Older integrations also keep other FHIR Binary payloads (for example
  // Office files and archives) as base64. Preserve their existing download
  // behavior even when the viewer cannot preview that format. Text/XML and
  // JSON keep their separate, non-lossy handling above.
  if (
    !isJsonAttachment(type) &&
    !type.startsWith('text/') &&
    type !== 'application/xml' &&
    !type.endsWith('+xml')
  ) {
    try {
      return decodeBase64(raw);
    } catch {
      // Some integrations store an unencoded response instead.
    }
  }
  return raw;
}

export async function readAttachmentText(
  attachment: AttachmentContent,
): Promise<string | undefined> {
  const payload = attachmentPayload(attachment);
  if (payload instanceof Blob) {
    return decodeUtf8(new Uint8Array(await payload.arrayBuffer()));
  }
  return payload instanceof Uint8Array ? decodeUtf8(payload) : payload;
}

/** Keep original bytes for Open/Download; formatting is only for the preview. */
export function createAttachmentBlob(
  attachment: AttachmentContent,
): Blob | undefined {
  const payload = attachmentPayload(attachment);
  if (payload === undefined) return undefined;
  if (payload instanceof Blob) return payload;
  return new Blob([payload], {
    type: attachment.contentType || 'application/octet-stream',
  });
}

/** Format whitespace without rounding large JSON numbers or losing duplicate keys. */
export function formatJsonAttachment(text: string): {
  text: string;
  valid: boolean;
} {
  if (!validJson(text)) return { text, valid: false };

  let result = '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  let previous = '';
  const indent = () => '  '.repeat(depth);

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      previous = character;
      continue;
    }
    if (/\s/.test(character)) continue;
    if (character === '"') {
      inString = true;
      result += character;
    } else if (character === '{' || character === '[') {
      result += character;
      depth += 1;
      let nextIndex = index + 1;
      while (/\s/.test(text[nextIndex] || '')) nextIndex += 1;
      const next = text[nextIndex];
      if (next !== '}' && next !== ']') result += `\n${indent()}`;
    } else if (character === '}' || character === ']') {
      depth -= 1;
      if (previous !== '{' && previous !== '[') result += `\n${indent()}`;
      result += character;
    } else if (character === ',') {
      result += `,\n${indent()}`;
    } else if (character === ':') {
      result += ': ';
    } else {
      result += character;
    }
    previous = character;
  }
  return { text: result, valid: true };
}
