import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExclamationTriangleIcon, LinkIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { importEmrpkgToRxDb, inspectEmrpkg } from '../../../services/emrpkg';
import { ButtonLoadingSpinner } from '../../connections/components/ButtonLoadingSpinner';

/**
 * The query parameter a shared package arrives on.
 *
 * `?package=https://example.org/records.emrpkg` — one link that opens the app
 * with a package ready to review.
 */
export const SHARED_PACKAGE_PARAM = 'package';

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
  const notifyDispatch = useNotificationDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(SHARED_PACKAGE_PARAM);

  const [fetched, setFetched] = useState<Fetched | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [passphrase, setPassphrase] = useState('');

  const dismiss = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(SHARED_PACKAGE_PARAM);
    setSearchParams(next, { replace: true });
    setFetched(undefined);
    setError(undefined);
  }, [searchParams, setSearchParams]);

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
  }, [raw]);

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
    [db, dismiss, fetched, notifyDispatch, passphrase],
  );

  if (!raw) return null;

  const counts = fetched?.info.counts;
  const clinical = counts?.['clinical_documents'];
  const needsPassphrase =
    fetched?.info.encrypted && fetched.info.kdf !== 'webauthn-prf';

  return (
    <section className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <LinkIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
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
                  This package is encrypted, so what is inside it cannot be
                  listed until it is unlocked.
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
                  Add to my records
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
              <details className="mt-3">
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
    </section>
  );
}
