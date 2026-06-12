export interface OpenMedClientOptions {
  endpoint: string;
}

export interface OpenMedDeidentifyOptions {
  language?: string;
  method?: 'mask' | 'redact' | 'replace' | 'hash';
}

type OpenMedDeidentifyResponse =
  | string
  | {
      text?: string;
      result?: string;
      deidentified_text?: string;
      deidentifiedText?: string;
      anonymized_text?: string;
      anonymizedText?: string;
      output?: string;
    };

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function pickDeidentifiedText(payload: OpenMedDeidentifyResponse): string {
  if (typeof payload === 'string') {
    return payload;
  }

  const text =
    payload.deidentified_text ||
    payload.deidentifiedText ||
    payload.anonymized_text ||
    payload.anonymizedText ||
    payload.result ||
    payload.output ||
    payload.text;

  if (typeof text !== 'string') {
    throw new Error('OpenMed response did not include de-identified text');
  }

  return text;
}

export class OpenMedClient {
  private endpoint: string;

  constructor(options: OpenMedClientOptions) {
    this.endpoint = trimTrailingSlash(options.endpoint);
  }

  async health(): Promise<boolean> {
    const response = await fetch(`${this.endpoint}/health`);
    return response.ok;
  }

  async deidentifyText(
    text: string,
    options: OpenMedDeidentifyOptions = {},
  ): Promise<string> {
    if (!text.trim()) {
      return text;
    }

    const response = await fetch(`${this.endpoint}/pii/deidentify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language: options.language || 'en',
        method: options.method || 'mask',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenMed de-identification failed (${response.status}): ${errorText}`,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return pickDeidentifiedText(await response.json());
    }

    return pickDeidentifiedText(await response.text());
  }
}

export async function testOpenMedConnection(
  endpoint: string,
): Promise<boolean> {
  try {
    return await new OpenMedClient({ endpoint }).health();
  } catch {
    return false;
  }
}
