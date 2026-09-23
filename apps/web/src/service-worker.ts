/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import { pageCache, imageCache, staticResourceCache } from 'workbox-recipes';
import {
  SHARE_TARGET_ACTION,
  SHARE_TARGET_CACHE,
  SHARE_TARGET_ENTRY,
  SHARE_TARGET_FIELD,
  SHARE_TARGET_NAME_HEADER,
  SHARE_TARGET_PARAM,
} from './shared/utils/shareTarget';

// ServiceWorkerGlobalScope is a type from the workbox-precaching module
declare const self: Window & ServiceWorkerGlobalScope;

/**
 * Setting up pre-caching
 */
setCacheNameDetails({
  prefix: 'MereMedical',
  suffix: 'v1',
});

// Download and cache all the files webpack created
// https://developer.chrome.com/docs/workbox/precaching-with-workbox/#precaching-with-injectmanifest
cleanupOutdatedCaches();
/**
 * The `BroadcastUpdatePlugin` can't be used to broadcast information about `workbox-precaching`'s updates. `BroadcastUpdatePlugin` detects when a previously cached URL has been overwritten with new contents. `workbox-precaching` creates cache entries with URLs that uniquely correspond to the contents, so it will never overwrite existing cache entries.
 */
// addPlugins([new BroadcastUpdatePlugin()]);
/**
 * "Share → Mere": the system share sheet POSTs the file here (see
 * `share_target` in manifest.json and shared/utils/shareTarget.ts). Registered
 * before Workbox's routes so it answers first. The file is parked, not
 * imported; the app offers it for review on the page this redirects to.
 */
self.addEventListener('fetch', (rawEvent: Event) => {
  const event = rawEvent as FetchEvent;
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'POST' ||
    !url.pathname.endsWith(`/${SHARE_TARGET_ACTION}`)
  ) {
    return;
  }
  event.respondWith(
    (async () => {
      const scope = self.registration.scope;
      try {
        const form = await event.request.formData();
        const file = form.get(SHARE_TARGET_FIELD);
        if (file instanceof File) {
          const cache = await caches.open(SHARE_TARGET_CACHE);
          await cache.put(
            new URL(SHARE_TARGET_ENTRY, scope).href,
            new Response(file, {
              headers: {
                'content-type': file.type || 'application/octet-stream',
                [SHARE_TARGET_NAME_HEADER]: encodeURIComponent(file.name),
              },
            }),
          );
        }
      } catch (error) {
        console.error('Could not read the shared file', error);
      }
      return Response.redirect(
        new URL(`timeline?${SHARE_TARGET_PARAM}=1`, scope).href,
        303,
      );
    })(),
  );
});

precacheAndRoute(self.__WB_MANIFEST);

// Tells the Service Worker to skip the waiting state and become active.
self.skipWaiting();

// Will make the Service Worker control the all clients right away
// (even if they're controlling other tabs or windows). Without this,
// we could be seeing different versions in different tabs or windows.
clientsClaim();

/**
 * Setting up runtime caching - independent of the previous pre-cache step but uses it if it's available
 */
pageCache();
staticResourceCache();
imageCache();

console.log('Service worker ready');
