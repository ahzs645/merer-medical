/**
 * Combining `.emrpkg` files into one.
 *
 * Every build produces its own patient: the builder derives a user id from the
 * profile it was given, so a second document about the same person arrives as a
 * stranger. Importing both packages in turn does not help either — the importer
 * replaces the receiving collections, so the second wins and the first is gone.
 *
 * Merging reconciles the identity and keeps everything else. One user; every
 * connection, so each record still says which document it came from; every
 * clinical record, re-pointed at the surviving user and re-keyed to match.
 */
import { strToU8, strFromU8, unzipSync, zipSync } from 'fflate';

const FORMAT_NAME = 'mere-emr-package';
const FORMAT_VERSION = 1;

/** Tables that belong to the patient rather than to a source document. */
const SINGLETON_TABLES = [
  'user_documents',
  'user_preferences',
  'summary_page_preferences',
  'instance_config',
];

const ENVELOPE_MAGIC = 'MEREPKG1';

export function readPackage(bytes, label) {
  if (strFromU8(bytes.slice(0, ENVELOPE_MAGIC.length)) === ENVELOPE_MAGIC) {
    throw new Error(
      `${label}: encrypted. Merging reads the tables, so export without a passphrase first.`,
    );
  }
  const files = unzipSync(bytes);
  const manifestBytes = files['manifest.json'];
  if (!manifestBytes) throw new Error(`${label}: no manifest.json`);
  const manifest = JSON.parse(strFromU8(manifestBytes));
  const tables = {};
  for (const [name, content] of Object.entries(files)) {
    if (!name.startsWith('tables/') || !name.endsWith('.json')) continue;
    tables[name.slice('tables/'.length, -'.json'.length)] = JSON.parse(
      strFromU8(content),
    );
  }
  return { manifest, tables, label };
}

/**
 * @param packages  Parsed packages, in order. The first is the base.
 * @param userFrom  1-based index of the package whose user document survives.
 */
export function mergePackages(packages, { userFrom = 1, appVersion } = {}) {
  if (packages.length < 2) {
    throw new Error('merge needs at least two packages');
  }
  const chosen = packages[userFrom - 1];
  if (!chosen) {
    throw new Error(
      `--user-from ${userFrom} is out of range (1..${packages.length})`,
    );
  }

  const users = chosen.tables.user_documents || [];
  const user = users.find((u) => u.is_selected_user) || users[0];
  if (!user) throw new Error(`${chosen.label}: no user document to merge onto`);

  const notes = [];
  const merged = {
    user_documents: [user],
    user_preferences: chosen.tables.user_preferences || [],
    summary_page_preferences: chosen.tables.summary_page_preferences || [],
    instance_config: chosen.tables.instance_config || [],
    connection_documents: [],
    clinical_documents: [],
  };

  const seenConnections = new Set();
  const seenRecords = new Map();
  let repointed = 0;
  let collisions = 0;

  for (const pkg of packages) {
    for (const [name, rows] of Object.entries(pkg.tables)) {
      if (SINGLETON_TABLES.includes(name)) continue;
      if (name === 'connection_documents') {
        for (const connection of rows) {
          if (seenConnections.has(connection.id)) continue;
          seenConnections.add(connection.id);
          // The connection follows the surviving patient; its own id is what
          // every record points at, so that is left alone.
          merged.connection_documents.push({
            ...connection,
            user_id: user.id,
          });
        }
        continue;
      }
      if (name === 'clinical_documents') {
        for (const row of rows) {
          const next =
            row.user_id === user.id
              ? row
              : ((repointed += 1),
                {
                  ...row,
                  user_id: user.id,
                  // The primary key is built from connection, user and resource
                  // id. Re-pointing the user without rebuilding it would leave a
                  // record whose key disagrees with its own fields.
                  id: `${row.connection_record_id}|${user.id}|${row.metadata?.id}`,
                });
          if (seenRecords.has(next.id)) {
            collisions += 1;
            continue;
          }
          seenRecords.set(next.id, next);
          merged.clinical_documents.push(next);
        }
        continue;
      }
      merged[name] = [...(merged[name] || []), ...rows];
    }
  }

  const droppedUsers = packages.flatMap((pkg) =>
    (pkg.tables.user_documents || [])
      .filter((u) => u.id !== user.id)
      .map((u) => `${u.first_name} ${u.last_name} (${pkg.label})`),
  );
  if (droppedUsers.length) {
    notes.push(
      `Records from ${droppedUsers.join(', ')} were re-pointed at ${user.first_name} ${user.last_name}.`,
    );
  }
  if (collisions) {
    notes.push(
      `${collisions} record(s) appeared in more than one package; the first was kept.`,
    );
  }

  const counts = {};
  for (const [name, rows] of Object.entries(merged)) counts[name] = rows.length;

  const manifest = {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    createdAt: Date.now(),
    app: {
      name: 'mere-medical',
      version: appVersion || 'merged-package',
    },
    schema: { version: 1 },
    tables: Object.keys(merged),
    counts,
    attachmentCount: 0,
    mergedFrom: packages.map((pkg) => ({
      label: pkg.label,
      appVersion: pkg.manifest.app?.version,
      createdAt: pkg.manifest.createdAt,
      clinicalDocuments: (pkg.tables.clinical_documents || []).length,
    })),
  };

  return { manifest, tables: merged, notes, repointed, collisions, user };
}

export function writePackage({ manifest, tables }) {
  const files = { 'manifest.json': strToU8(JSON.stringify(manifest, null, 2)) };
  for (const [name, rows] of Object.entries(tables)) {
    files[`tables/${name}.json`] = strToU8(JSON.stringify(rows, null, 2));
  }
  return zipSync(files, { level: 6 });
}
