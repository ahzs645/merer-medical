import { useEffect, useState } from 'react';
import { RxDocument } from 'rxdb';
import { format, parseISO } from 'date-fns';
import {
  ArrowPathIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { Modal } from '../../../shared/components/Modal';
import { ModalHeader } from '../../../shared/components/ModalHeader';
import { ButtonLoadingSpinner } from '../../connections/components/ButtonLoadingSpinner';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import {
  deleteDocumentsByConnectionId,
  findClinicalDocuments,
} from '../../../repositories/ClinicalDocumentRepository';

const sourceLabels: Record<string, string> = {
  epic: 'MyChart (Epic)',
  cerner: 'Cerner / Oracle Health',
  veradigm: 'Allscripts / Veradigm',
  onpatient: 'OnPatient',
  va: 'Veterans Affairs',
  healow: 'Healow (eClinicalWorks)',
  freestyle_libre: 'FreeStyle Libre',
  manual: 'Manual entry',
};

// Friendly names for the FHIR resource types stored against a connection.
const resourceTypeLabels: Record<string, string> = {
  observation: 'Vitals & observations',
  diagnosticreport: 'Lab reports',
  medicationrequest: 'Medications',
  medicationstatement: 'Medications',
  medicationdispense: 'Medications',
  immunization: 'Immunizations',
  condition: 'Conditions',
  allergyintolerance: 'Allergies',
  procedure: 'Procedures',
  documentreference: 'Documents',
  encounter: 'Encounters',
  coverage: 'Insurance',
  careplan: 'Care plans',
  careteam: 'Care team',
  goal: 'Goals',
  device: 'Devices',
  patient: 'Patient profile',
  servicerequest: 'Orders',
};

function fmt(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), "MMM d, yyyy 'at' p");
  } catch {
    return iso;
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-end text-sm font-medium text-gray-900">
        {value}
      </span>
    </div>
  );
}

export function ConnectionDetailDrawer({
  item,
  open,
  setOpen,
  useProxy,
  syncing,
  deleting,
  isLocalImport,
  onSync,
  onFix,
  onDisconnect,
}: {
  item: RxDocument<ConnectionDocument>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  useProxy: boolean;
  syncing: boolean;
  deleting: boolean;
  isLocalImport: boolean;
  onSync: () => void;
  onFix: () => void;
  onDisconnect: () => void;
}) {
  const db = useRxDb();
  const user = useUser();
  const [categories, setCategories] = useState<
    { label: string; count: number }[] | undefined
  >(undefined);
  const [deletingRecords, setDeletingRecords] = useState(false);

  const source = item.get('source') as string;
  const fhirVersion = item.get('fhir_version');
  const expiresAt = item.get('expires_at') as number | undefined;
  const hasError = item.get('last_sync_was_error');

  const tokenStatus = (() => {
    if (isLocalImport) return 'Not applicable (local source)';
    if (!expiresAt) return 'Unknown';
    const expMs = expiresAt > 1e12 ? expiresAt : expiresAt * 1000;
    return expMs > Date.now()
      ? `Valid until ${fmt(new Date(expMs).toISOString())}`
      : 'Expired — reauthorization required';
  })();

  useEffect(() => {
    if (!open || !db || !user?.id) return;
    let active = true;
    findClinicalDocuments(db, {
      userId: user.id,
      connectionId: item.get('id'),
    })
      .then((docs) => {
        if (!active) return;
        const tally = new Map<string, number>();
        for (const doc of docs) {
          const rt = (
            doc.data_record?.resource_type as string | undefined
          )?.toLowerCase();
          const label = (rt && resourceTypeLabels[rt]) || 'Other';
          tally.set(label, (tally.get(label) ?? 0) + 1);
        }
        setCategories(
          Array.from(tally.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count),
        );
      })
      .catch(() => active && setCategories([]));
    return () => {
      active = false;
    };
  }, [open, db, user?.id, item]);

  const handleDeleteRecords = async () => {
    if (!db || !user?.id) return;
    setDeletingRecords(true);
    try {
      await deleteDocumentsByConnectionId(db, user.id, item.get('id'));
      setCategories([]);
    } finally {
      setDeletingRecords(false);
    }
  };

  return (
    <Modal open={open} setOpen={setOpen} overflowXHidden>
      <ModalHeader
        title={item.get('name') || sourceLabels[source] || 'Source'}
        subtitle={sourceLabels[source] || source}
        setClose={(x: boolean) => setOpen(x)}
      />
      <div className="px-4 pb-4">
        {hasError ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            This source failed to sync on its last attempt. Try “Fix connection”
            to re-authorize.
          </div>
        ) : null}

        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 px-4">
          <DetailRow
            label="Portal type"
            value={sourceLabels[source] || source}
          />
          {fhirVersion ? (
            <DetailRow label="FHIR version" value={fhirVersion} />
          ) : null}
          {!isLocalImport ? (
            <DetailRow
              label="Sync mode"
              value={useProxy ? 'Proxy-assisted' : 'Direct'}
            />
          ) : null}
          <DetailRow
            label="Last successful sync"
            value={fmt(item.get('last_refreshed'))}
          />
          <DetailRow
            label="Last attempted sync"
            value={fmt(item.get('last_sync_attempt'))}
          />
          <DetailRow
            label="Current status"
            value={
              hasError ? (
                <span className="text-red-600">Error</span>
              ) : syncing ? (
                'Syncing…'
              ) : (
                <span className="text-green-600">Connected</span>
              )
            }
          />
          {!isLocalImport ? (
            <DetailRow label="Authorization" value={tokenStatus} />
          ) : null}
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-900">
            Imported categories
          </p>
          {categories === undefined ? (
            <p className="mt-1 text-sm text-gray-500">Counting records…</p>
          ) : categories.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">
              No records imported from this source yet.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li
                  key={c.label}
                  className="bg-primary-50 text-primary-800 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {c.label}
                  <span className="text-primary-500">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {!isLocalImport ? (
            <button
              type="button"
              disabled={syncing}
              onClick={onSync}
              className="bg-primary-600 hover:bg-primary-700 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white shadow-sm disabled:bg-gray-400"
            >
              <ArrowPathIcon className="h-4 w-4" />
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          ) : null}
          {hasError ? (
            <button
              type="button"
              onClick={onFix}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 shadow-sm hover:bg-amber-100"
            >
              <WrenchScrewdriverIcon className="h-4 w-4" />
              Fix connection
            </button>
          ) : null}
          <button
            type="button"
            disabled={deletingRecords}
            onClick={handleDeleteRecords}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:bg-gray-100"
          >
            {deletingRecords ? (
              <ButtonLoadingSpinner />
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
            Delete records from this source
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onDisconnect}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 shadow-sm hover:bg-red-100 disabled:bg-gray-100"
          >
            {deleting ? (
              <ButtonLoadingSpinner />
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
            Disconnect source
          </button>
        </div>
      </div>
    </Modal>
  );
}
