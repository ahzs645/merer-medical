/**
 * @jest-environment node
 *
 * Node, not jsdom: the reader works on `Response`, `Blob` and `File`, which
 * Node has and jsdom does not.
 */
import {
  SHARE_TARGET_ENTRY,
  SHARE_TARGET_NAME_HEADER,
  takeSharedPackage,
} from './shareTarget';

/** The slice of the Cache API the reader uses, over a plain Map. */
function installCaches(entries: Map<string, Response>) {
  const cache = {
    match: async (key: string) => entries.get(key)?.clone(),
    delete: async (key: string) => entries.delete(key),
  };
  (globalThis as { caches?: unknown }).caches = { open: async () => cache };
}

const scope = 'https://mere.example/app/';

describe('takeSharedPackage', () => {
  afterEach(() => {
    delete (globalThis as { caches?: unknown }).caches;
  });

  it('hands over the parked file with its name, once', async () => {
    const entries = new Map([
      [
        new URL(SHARE_TARGET_ENTRY, scope).href,
        new Response('package bytes', {
          headers: {
            'content-type': 'application/octet-stream',
            [SHARE_TARGET_NAME_HEADER]: encodeURIComponent('from email.emrpkg'),
          },
        }),
      ],
    ]);
    installCaches(entries);

    const file = await takeSharedPackage(scope);
    expect(file?.name).toBe('from email.emrpkg');
    expect(file?.size).toBe('package bytes'.length);
    expect(await takeSharedPackage(scope)).toBeUndefined();
  });

  it('resolves to nothing when there is nothing parked, or no Cache API', async () => {
    installCaches(new Map());
    expect(await takeSharedPackage(scope)).toBeUndefined();
    delete (globalThis as { caches?: unknown }).caches;
    expect(await takeSharedPackage(scope)).toBeUndefined();
  });
});
