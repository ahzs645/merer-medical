/**
 * "Share → Mere" on Android.
 *
 * The manifest's `share_target` makes the installed app a destination in the
 * system share sheet. The share arrives as a POST, which a static site cannot
 * answer, so the service worker takes it: it parks the file in a cache of its
 * own and redirects to the app with `?shared-package=1`, and the app picks the
 * file up from there and offers it through the same review a link or a
 * dropped file gets. Nothing is imported until somebody accepts.
 *
 * Shared between the worker and the app, so both name the same cache entry.
 */
export const SHARE_TARGET_ACTION = 'share-target';
export const SHARE_TARGET_FIELD = 'package';
export const SHARE_TARGET_CACHE = 'mere-share-target';
export const SHARE_TARGET_ENTRY = 'shared-package';
export const SHARE_TARGET_PARAM = 'shared-package';
export const SHARE_TARGET_NAME_HEADER = 'x-mere-file-name';

/**
 * Take the shared file out of the worker's cache, once. Resolves to nothing if
 * there is none — a reload of the redirect URL, or a browser without caches.
 */
export async function takeSharedPackage(
  scope: string = document.baseURI,
): Promise<File | undefined> {
  if (typeof caches === 'undefined') return undefined;
  const cache = await caches.open(SHARE_TARGET_CACHE);
  const key = new URL(SHARE_TARGET_ENTRY, scope).href;
  const response = await cache.match(key);
  if (!response) return undefined;
  await cache.delete(key);
  const name = decodeURIComponent(
    response.headers.get(SHARE_TARGET_NAME_HEADER) || 'shared.emrpkg',
  );
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type });
}
