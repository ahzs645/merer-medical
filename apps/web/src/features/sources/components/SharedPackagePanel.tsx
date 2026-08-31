import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useSearchParams } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  LinkIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import {
  useAllUsers,
  useOptionalUser,
  useUserManagement,
} from '../../../app/providers/UserProvider';
import { isUnstartedPlaceholder } from '../../../repositories/UserRepository';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { importEmrpkgToRxDb, inspectEmrpkg } from '../../../services/emrpkg';
import { ButtonLoadingSpinner } from '../../connections/components/ButtonLoadingSpinner';
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop';

/**
 * The query parameter a shared package arrives on.
 *
 * `?package=https://example.org/records.emrpkg` — one link that opens the app
 * with a package ready to review.
 */
export const SHARED_PACKAGE_PARAM = 'package';

/** Asks for the import to happen without a confirmation. Only a request. */
export const SHARED_PACKAGE_AUTOLOAD_PARAM = 'autoload';

/**
 * Origins whose packages may import themselves.
 *
 * Deliberately not something the link can say about itself: `&autoload=1` is a
 * request, and anyone can append it, so honouring it on its own would make the
 * confirmation worthless — the one screen standing between a link somebody sent
 * you and your medical record. The allowlist is set at build time by whoever
 * deploys the app, who is the only party in a position to vouch for a host.
 *
 * Auto-import is additive and never runs on an encrypted package, which needs a
 * passphrase nobody has yet typed.
 */
export function isTrustedPackageOrigin(origin: string): boolean {
  const configured =
    typeof globalThis.MERE_TRUSTED_PACKAGE_ORIGINS === 'string'
      ? globalThis.MERE_TRUSTED_PACKAGE_ORIGINS
      : '';
  return configured
    .split(',')
    .map((entry) => entry.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .includes(origin);
}

/** Anything larger is not something to pull into a browser tab unannounced. */
const MAX_BYTES = 64 * 1024 * 1024;

type Fetched = {
  bytes: Uint8Array;
  info: Awaited<ReturnType<typeof inspectEmrpkg>>;
  origin: string;
};

/**
 * Only http(s), and never a `javascript:`/`data:` URL dressed up as one.
 * `new URL` accepts every scheme there is, so the protocol is checked rather
 * than assumed.
 */
function parsePackageUrl(raw: string): URL | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function describeFetchFailure(url: URL, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // A cross-origin block and an offline network are the same TypeError to
  // `fetch`, and the difference is the whole fix: one is the sender's server
  // to configure, the other is the reader's connection.
  if (error instanceof TypeError) {
    return `Could not reach ${url.host}. If the link is right, the server has to allow this app to read it (an Access-Control-Allow-Origin header). Google Drive and Dropbox share links do not.`;
  }
  return message;
}

export function SharedPackagePanel() {
  const db = useRxDb();
  const allUsers = useAllUsers();
  const currentUser = useOptionalUser();
  const { removeEmptyPlaceholders } = useUserManagement();
  const isDesktop = useIsDesktop();
  const notifyDispatch = useNotificationDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  /**
   * The link is read once and then held.
   *
   * Keying the offer off the query string tied it to the route it arrived on,
   * so any tap in the nav silently threw it away — which makes "dismiss" a
   * word for something the reader never did. Claiming it into state lets the
   * offer outlive navigation and only close when somebody closes it, and
   * clearing the parameter straight away keeps a link to somebody's medical
   * record from riding along in the address bar.
   */
  const [claimed, setClaimed] = useState<
    { raw: string; autoload: boolean } | undefined
  >();
  const raw = claimed?.raw;
  const autoloadRequested = claimed?.autoload;

  const param = searchParams.get(SHARED_PACKAGE_PARAM);
  const autoloadParam = searchParams.get(SHARED_PACKAGE_AUTOLOAD_PARAM);
  useEffect(() => {
    if (!param) return;
    setClaimed({ raw: param, autoload: Boolean(autoloadParam) });
    const next = new URLSearchParams(searchParams);
    next.delete(SHARED_PACKAGE_PARAM);
    next.delete(SHARED_PACKAGE_AUTOLOAD_PARAM);
    setSearchParams(next, { replace: true });
  }, [param, autoloadParam, searchParams, setSearchParams]);

  const [fetched, setFetched] = useState<Fetched | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoloading, setAutoloading] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    setClaimed(undefined);
    setFetched(undefined);
    setError(undefined);
  }, []);

  useEffect(() => {
    if (!raw) {
      setFetched(undefined);
      setError(undefined);
      return;
    }
    const url = parsePackageUrl(raw);
    if (!url) {
      setError('That link is not an http(s) address.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);
    // Downloading is not importing. The bytes are fetched and described so
    // there is something to decide about; nothing reaches the record store
    // until someone presses the button below.
    (async () => {
      try {
        const response = await fetch(url.toString(), { redirect: 'follow' });
        if (!response.ok) {
          throw new Error(
            `${url.host} answered ${response.status} ${response.statusText}.`,
          );
        }
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_BYTES) {
          throw new Error(
            `That file is ${Math.round(buffer.byteLength / 1024 / 1024)} MB, larger than this app will load from a link.`,
          );
        }
        const bytes = new Uint8Array(buffer);
        const info = await inspectEmrpkg(bytes);
        if (!info.encrypted && info.formatVersion === 0) {
          throw new Error(
            'That link does not point at a Mere package — no manifest was found inside it.',
          );
        }
        if (cancelled) return;
        setFetched({ bytes, info, origin: url.origin });
        setAutoloading(
          Boolean(autoloadRequested) &&
            !info.encrypted &&
            isTrustedPackageOrigin(url.origin),
        );
      } catch (fetchError) {
        if (cancelled) return;
        setError(describeFetchFailure(url, fetchError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [raw, autoloadRequested]);

  const runImport = useCallback(
    async (replace: boolean) => {
      if (!fetched) return;
      setImporting(true);
      try {
        const needsPassphrase =
          fetched.info.encrypted && fetched.info.kdf !== 'webauthn-prf';
        const { counts } = await importEmrpkgToRxDb(fetched.bytes, db, {
          passphrase: needsPassphrase ? passphrase : undefined,
          replace,
        });
        const total = Object.values(counts).reduce<number>(
          (a, b) => a + (b ?? 0),
          0,
        );
        notifyDispatch({
          type: 'set_notification',
          message: `Imported ${total} records from ${fetched.origin}.${
            replace ? ' Reloading…' : ''
          }`,
          variant: 'success',
        });
        // The blank profile the app made on first boot has served its purpose
        // once real records arrive under a patient of their own. Left alone it
        // sits in the switcher as "Unnamed User" for good.
        await removeEmptyPlaceholders().catch(() => 0);
        dismiss();
        if (replace) setTimeout(() => window.location.reload(), 1500);
      } catch (importError) {
        notifyDispatch({
          type: 'set_notification',
          message: `Import failed: ${(importError as Error).message}`,
          variant: 'error',
        });
      } finally {
        setImporting(false);
      }
    },
    [db, dismiss, fetched, notifyDispatch, passphrase, removeEmptyPlaceholders],
  );

  // Kept out of the fetch effect so the import runs against the same callback
  // the button uses — one path in, whoever pressed it.
  useEffect(() => {
    if (!autoloading || !fetched || importing) return;
    setAutoloading(false);
    void runImport(false);
  }, [autoloading, fetched, importing, runImport]);

  if (!raw) return null;
  const open = Boolean(raw);

  const counts = fetched?.info.counts;
  const clinical = counts?.['clinical_documents'];
  const needsPassphrase =
    fetched?.info.encrypted && fetched.info.kdf !== 'webauthn-prf';

  /**
   * A package carries its own patient. Importing additively files the records
   * under *that* patient, so a package about someone else does not mix into the
   * profile in use — it opens a second one and switches to it.
   *
   * The store already worked this way; the button did not say so. "Add to my
   * records" is exactly wrong for a package about somebody else, and it is the
   * reading someone would act on before handing their phone over.
   */
  const patient = fetched?.info.patients?.[0];
  const knownIds = new Set(allUsers.map((u) => u.get('id')));
  const isNewProfile = Boolean(patient && !knownIds.has(patient.id));
  /**
   * A device with nothing on it yet.
   *
   * Not `allUsers.length === 0`: the app creates a blank profile on first boot
   * so something is always selected, so a brand-new device already has one. It
   * is a placeholder, not a person, and treating it as one made a first-ever
   * import announce that it was opening a "separate" profile — separate from
   * nothing.
   */
  const isFirstProfile =
    allUsers.length === 0 ||
    !currentUser ||
    allUsers.every((u) => isUnstartedPlaceholder(u.toMutableJSON() as never));
  const acceptLabel = isFirstProfile
    ? 'Open these records'
    : isNewProfile
      ? 'Add as a separate profile'
      : 'Add to my records';

  const body = (
    <div className="flex items-start gap-3">
      <LinkIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 sm:block" />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-gray-900 sm:text-sm">
          Someone shared records with you
        </h3>

        {loading && (
          <p className="mt-1 text-sm text-gray-700">
            Reading the package from {parsePackageUrl(raw)?.host ?? raw}…
          </p>
        )}

        {error && (
          <>
            <p className="mt-1 text-sm text-gray-800">{error}</p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-300"
            >
              Dismiss
            </button>
          </>
        )}

        {fetched && (
          <>
            {/* The origin is the only thing telling the reader whether to
                  trust what follows, so it is the first thing said and it is
                  said in full — a link that arrived in a message is not a file
                  someone chose off their own disk. */}
            <p className="mt-1 text-sm text-gray-800">
              From <span className="font-medium">{fetched.origin}</span>
              {fetched.info.appVersion ? ` · ${fetched.info.appVersion}` : ''}
            </p>

            {patient?.name && (
              <p className="mt-1 text-sm text-gray-800">
                Records for <span className="font-medium">{patient.name}</span>
              </p>
            )}

            {autoloadRequested && !isTrustedPackageOrigin(fetched.origin) && (
              <p className="mt-2 text-sm text-gray-700">
                This link asked to import on its own. {fetched.origin} is not on
                this app&rsquo;s trusted list, so it is being offered instead.
              </p>
            )}

            {isNewProfile && !isFirstProfile && (
              <p className="mt-2 text-sm text-gray-700">
                These belong to someone who is not on this device yet, so they
                open as a separate profile. Nothing already here is changed, and
                you can switch back from Settings.
              </p>
            )}

            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
              {typeof clinical === 'number' && (
                <div className="flex gap-1.5">
                  <dt>Clinical records</dt>
                  <dd className="font-semibold">{clinical}</dd>
                </div>
              )}
              {counts?.['connection_documents'] ? (
                <div className="flex gap-1.5">
                  <dt>Sources</dt>
                  <dd className="font-semibold">
                    {counts['connection_documents']}
                  </dd>
                </div>
              ) : null}
              {fetched.info.createdAt ? (
                <div className="flex gap-1.5">
                  <dt>Created</dt>
                  <dd className="font-semibold">
                    {new Date(fetched.info.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              ) : null}
            </dl>

            {fetched.info.encrypted && (
              <p className="mt-2 text-sm text-gray-700">
                This package is encrypted, so what is inside it cannot be listed
                until it is unlocked.
              </p>
            )}

            {needsPassphrase && (
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                aria-label="Passphrase for the shared package"
                placeholder="Passphrase"
                className="mt-2 w-full max-w-xs rounded-md border-gray-300 text-sm"
              />
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={importing}
                onClick={() => runImport(false)}
                className="bg-primary-700 hover:bg-primary-800 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {importing && <ButtonLoadingSpinner />}
                {acceptLabel}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-300"
              >
                Not now
              </button>
            </div>

            {/* Replacing is reachable but not offered as a peer of adding:
                  it discards everything already stored, and a link is the one
                  route into this app where the person pressing the button did
                  not choose the file. */}
            {/* Only offered when the package would land on the profile in
                  use. For a package about somebody else, adding it already
                  leaves everything here alone, so "replace" would be an
                  invitation to delete a record set for no reason. */}
            <details className="mt-3" hidden={isNewProfile || isFirstProfile}>
              <summary className="cursor-pointer text-xs text-gray-600">
                Replace my records instead
              </summary>
              <div className="mt-2 flex items-start gap-2 rounded-md bg-white p-3 ring-1 ring-amber-300">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="text-xs text-gray-700">
                    This deletes every record already on this device and puts
                    the shared ones in their place. Export yours first if you
                    want to keep them.
                  </p>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => runImport(true)}
                    className="mt-2 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-300 disabled:opacity-60"
                  >
                    Delete my records and import these
                  </button>
                </div>
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );

  // Desktop gets a card in the corner the app already puts its toasts in —
  // same width, same shape — but one that never times out. There is room on a
  // large screen to leave the page usable while deciding, which a modal would
  // take away for a question nobody is required to answer now.
  //
  // `role="dialog"` with `aria-modal="false"` rather than the toast lane's
  // `aria-live`: a live region is for announcing text, and this is a labelled
  // thing with buttons in it. It sits above that lane so a real toast — the
  // "Imported 624 records" that follows accepting — has its own space.
  if (isDesktop) {
    return (
      // No entrance transition: a Headless UI `Transition` that mounts with
      // `show` already true renders nothing, and this card only appears once a
      // network fetch has resolved — there is a natural beat before it either
      // way, and a card that waits to be dismissed is not asking to be noticed
      // twice.
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex justify-end px-6 pb-24 print:hidden">
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Someone shared records with you"
          className="pointer-events-auto w-full max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-lg"
        >
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={dismiss}
              className="-me-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {body}
        </div>
      </div>
    );
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      {/* Dismissing on backdrop or Escape, same as the button: closing is not
          losing anything. The package stays where it is and the link opens it
          again whenever they are ready. */}
      <Dialog
        as="div"
        className="relative z-dialog"
        onClose={dismiss}
        // Without this the dialog focuses its first focusable child — the close
        // button — which draws a focus ring on the one control nobody should be
        // nudged toward. Focus lands on the panel instead, so a keyboard tabs
        // forward into the choice and a pointer user sees no pre-selection.
        initialFocus={panelRef}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-hidden">
          <div className="pointer-events-none fixed inset-x-0 bottom-0 flex max-h-full">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <Dialog.Panel
                ref={panelRef}
                tabIndex={-1}
                className="pointer-events-auto max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-amber-50 shadow-xl focus:outline-none"
              >
                <div className="flex justify-end px-4 pt-3">
                  <button
                    type="button"
                    onClick={dismiss}
                    // 44px, and in the corner a thumb reaches rather than
                    // beside the accept button where it would be mis-hit.
                    className="-me-2 flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:text-gray-700"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="px-4 pb-8">{body}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
