import {
  ComponentType,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DocumentArrowDownIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

import { useUser } from '../../app/providers/UserProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import {
  listWorkflowRecords,
  upsertWorkflowRecord,
} from '../../repositories/WorkflowRecordRepository';
import { AppPage } from '../../shared/components/AppPage';
import { OtherDownloadDoors } from '../../shared/components/OtherDownloadDoors';
import { RecordPageHeader } from '../../shared/components/records/RecordPageHeader';
import { exportEmrpkgFromRxDb } from '../../services/emrpkg';
import { appendAuditLog } from '../audit/auditLog';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

type EmergencyProfile = {
  preferredName: string;
  dateOfBirth: string;
  bloodType: string;
  emergencyNotes: string;
  primaryClinician: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type CaregiverProxy = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  notes: string;
};

type ShareGrant = {
  id: string;
  recipient: string;
  purpose: string;
  categories: string[];
  expiresOn: string;
  notes: string;
};

type SharingState = {
  emergencyProfile: EmergencyProfile;
  proxies: CaregiverProxy[];
  grants: ShareGrant[];
};

const EMPTY_PROFILE: EmergencyProfile = {
  preferredName: '',
  dateOfBirth: '',
  bloodType: '',
  emergencyNotes: '',
  primaryClinician: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

const CATEGORY_OPTIONS = [
  'Labs',
  'Documents',
  'Imaging',
  'Medications',
  'Immunizations',
  'Allergies',
  'Conditions',
  'Care plans',
  'Goals',
  'Procedures',
  'Histories',
  'Insurance',
  'Trackers',
  'Dental',
  'Optometry',
];

const EMPTY_PROXY: Omit<CaregiverProxy, 'id'> = {
  name: '',
  relationship: '',
  phone: '',
  email: '',
  notes: '',
};

const EMPTY_GRANT: Omit<ShareGrant, 'id'> = {
  recipient: '',
  purpose: '',
  categories: ['Medications', 'Allergies'],
  expiresOn: '',
  notes: '',
};

export function SharingTab() {
  const user = useUser();
  const { t } = useInterfaceLanguage();
  const db = useRxDb();
  const storageKey = useMemo(() => `mere:sharing:${user.id}`, [user.id]);
  const [state, setState] = useState<SharingState>(emptySharingState);
  const [loadedOwner, setLoadedOwner] = useState<{
    db: typeof db;
    userId: string;
  } | null>(null);
  const sharingReady =
    loadedOwner?.db === db && loadedOwner?.userId === user.id;
  const [sharingStatus, setSharingStatus] = useState<
    'loading' | 'saving' | 'saved' | 'error'
  >('loading');
  const saveQueue = useRef(Promise.resolve());
  const [proxyDraft, setProxyDraft] =
    useState<Omit<CaregiverProxy, 'id'>>(EMPTY_PROXY);
  const [grantDraft, setGrantDraft] =
    useState<Omit<ShareGrant, 'id'>>(EMPTY_GRANT);
  const [exportScope, setExportScope] = useState<'full' | 'visit'>('visit');
  const [includeProvenance, setIncludeProvenance] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const downloadRef = useRef<HTMLAnchorElement | null>(null);
  const exportGenerationRef = useRef(0);
  const exportOwnerRef = useRef({ db, userId: user.id });
  // Compare the current owner synchronously, before passive load/reset effects.
  exportOwnerRef.current = { db, userId: user.id };

  useEffect(() => {
    let isMounted = true;
    exportGenerationRef.current += 1;
    setExportBusy(false);
    setExportError(false);
    setLoadedOwner(null);
    setSharingStatus('loading');
    setProxyDraft(EMPTY_PROXY);
    setGrantDraft(EMPTY_GRANT);
    setDownloadUrl('');
    setExportPassphrase('');

    async function fetchSharingState() {
      const records = await listWorkflowRecords<SharingState>(
        db,
        user.id,
        'sharing-state',
      );
      const stored = records.find(
        (record) => record.id === sharingRecordId(user.id),
      );
      if (stored) {
        if (isMounted) {
          setState(normalizeSharingState(stored.payload));
          setLoadedOwner({ db, userId: user.id });
        }
        return;
      }

      const legacyState = loadSharingState(storageKey);
      await saveSharingState(db, user.id, legacyState);
      localStorage.removeItem(storageKey);
      if (isMounted) {
        setState(legacyState);
        setLoadedOwner({ db, userId: user.id });
      }
    }

    fetchSharingState().catch(() => {
      if (isMounted) setSharingStatus('error');
    });

    return () => {
      isMounted = false;
      // An export initiated for this owner must not surface after a switch,
      // including A → B → A, or after this page has been left.
      exportGenerationRef.current += 1;
    };
  }, [db, storageKey, user.id]);

  useEffect(() => {
    if (!sharingReady) return;
    let isCurrent = true;
    setSharingStatus('saving');
    // Keep snapshots in edit order, including rapid changes across fields.
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        await saveSharingState(db, user.id, state);
      });
    saveQueue.current.then(
      () => {
        if (isCurrent) setSharingStatus('saved');
      },
      () => {
        if (isCurrent) setSharingStatus('error');
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [db, sharingReady, state, user.id]);

  useEffect(
    () => () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    },
    [downloadUrl],
  );

  function updateProfile(field: keyof EmergencyProfile, value: string) {
    setState((current) => ({
      ...current,
      emergencyProfile: { ...current.emergencyProfile, [field]: value },
    }));
  }

  function addProxy(event: FormEvent) {
    event.preventDefault();
    if (!proxyDraft.name.trim()) return;
    setState((current) => ({
      ...current,
      proxies: [...current.proxies, { ...proxyDraft, id: crypto.randomUUID() }],
    }));
    setProxyDraft(EMPTY_PROXY);
  }

  function addGrant(event: FormEvent) {
    event.preventDefault();
    if (!grantDraft.recipient.trim()) return;
    setState((current) => ({
      ...current,
      grants: [...current.grants, { ...grantDraft, id: crypto.randomUUID() }],
    }));
    setGrantDraft(EMPTY_GRANT);
  }

  async function exportRecordPackage() {
    if (
      exportBusy ||
      !sharingReady ||
      (passwordProtect && !exportPassphrase.trim())
    )
      return;
    const generation = ++exportGenerationRef.current;
    const isCurrent = () =>
      generation === exportGenerationRef.current &&
      exportOwnerRef.current.db === db &&
      exportOwnerRef.current.userId === user.id;
    setExportBusy(true);
    setExportError(false);
    try {
      await saveQueue.current;
      if (!isCurrent()) return;
      const bytes = await exportEmrpkgFromRxDb(db, {
        passphrase: passwordProtect ? exportPassphrase : undefined,
        exportNotes: {
          scope: exportScope,
          userId: user.id,
          includeProvenance,
          includeAttachments,
          includeAuditTrail,
        },
      });
      if (!isCurrent()) return;
      await appendAuditLog(db, {
        userId: user.id,
        actor: 'local-user',
        action: 'record.export',
        targetType: 'emrpkg',
        source: 'Sharing',
        summary: `Exported ${exportScope === 'full' ? 'full' : 'visit-prep'} record package`,
      });
      if (!isCurrent()) return;
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      setDownloadUrl(url);
      setDownloadName(
        `mere_record_${exportScope}_${ts}${passwordProtect ? '.enc' : ''}.emrpkg`,
      );
      setTimeout(() => {
        if (isCurrent() && downloadRef.current?.href === url) {
          downloadRef.current.click();
        }
      }, 0);
    } catch {
      if (isCurrent()) setExportError(true);
    } finally {
      if (isCurrent()) setExportBusy(false);
    }
  }

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title={t('Sharing')}
          description={t(
            'Prepare emergency information, keep caregiver contacts, download records, or log a share.',
          )}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-5xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-600">
            {t(
              'Choose a task. Information stays on this device unless you download and share a copy yourself.',
            )}
          </p>
          {!sharingReady ? (
            <p
              role="status"
              className="rounded-md bg-white p-4 text-sm text-gray-700"
            >
              {sharingStatus === 'error'
                ? t(
                    'Unable to load sharing information. Reload the page to try again.',
                  )
                : t('Loading sharing information…')}
            </p>
          ) : (
            <>
              <SharingSection
                id="emergency"
                title={t('Emergency information')}
                description={t(
                  'Save contact details and critical notes for this profile. This does not publish an emergency page.',
                )}
                icon={ShieldCheckIcon}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField
                    label="Preferred name"
                    value={state.emergencyProfile.preferredName}
                    onChange={(value) => updateProfile('preferredName', value)}
                  />
                  <TextField
                    label="Date of birth"
                    type="date"
                    value={state.emergencyProfile.dateOfBirth}
                    onChange={(value) => updateProfile('dateOfBirth', value)}
                  />
                  <TextField
                    label="Blood type"
                    value={state.emergencyProfile.bloodType}
                    onChange={(value) => updateProfile('bloodType', value)}
                  />
                  <TextField
                    label="Primary clinician"
                    value={state.emergencyProfile.primaryClinician}
                    onChange={(value) =>
                      updateProfile('primaryClinician', value)
                    }
                  />
                  <TextField
                    label="Emergency contact"
                    value={state.emergencyProfile.emergencyContactName}
                    onChange={(value) =>
                      updateProfile('emergencyContactName', value)
                    }
                  />
                  <TextField
                    label="Emergency phone"
                    value={state.emergencyProfile.emergencyContactPhone}
                    onChange={(value) =>
                      updateProfile('emergencyContactPhone', value)
                    }
                  />
                  <label className="sm:col-span-2">
                    <span className="text-sm font-medium text-gray-700">
                      Critical notes
                    </span>
                    <textarea
                      className="mt-1 min-h-28 w-full rounded-md border-gray-300 text-base sm:text-sm shadow-sm focus:border-primary focus:ring-primary"
                      value={state.emergencyProfile.emergencyNotes}
                      onChange={(event) =>
                        updateProfile('emergencyNotes', event.target.value)
                      }
                    />
                  </label>
                </div>
              </SharingSection>

              <SharingSection
                id="caregivers"
                title={t('Caregivers')}
                description={t(
                  'Keep names, relationships, and contact details. Adding a caregiver does not grant account or remote access.',
                )}
                icon={UserGroupIcon}
              >
                <form className="grid gap-3" onSubmit={addProxy}>
                  <TextField
                    label="Name"
                    value={proxyDraft.name}
                    onChange={(value) =>
                      setProxyDraft((draft) => ({ ...draft, name: value }))
                    }
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextField
                      label="Relationship"
                      value={proxyDraft.relationship}
                      onChange={(value) =>
                        setProxyDraft((draft) => ({
                          ...draft,
                          relationship: value,
                        }))
                      }
                    />
                    <TextField
                      label="Phone"
                      value={proxyDraft.phone}
                      onChange={(value) =>
                        setProxyDraft((draft) => ({ ...draft, phone: value }))
                      }
                    />
                  </div>
                  <TextField
                    label="Email"
                    type="email"
                    value={proxyDraft.email}
                    onChange={(value) =>
                      setProxyDraft((draft) => ({ ...draft, email: value }))
                    }
                  />
                  <TextField
                    label="Notes"
                    value={proxyDraft.notes}
                    onChange={(value) =>
                      setProxyDraft((draft) => ({ ...draft, notes: value }))
                    }
                  />
                  <button className="inline-flex min-h-9 w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                    <PlusIcon className="h-4 w-4" />
                    {t('Add caregiver')}
                  </button>
                </form>
                <ItemList
                  items={state.proxies}
                  emptyLabel={t('No caregivers saved yet.')}
                  onRemove={(id) =>
                    setState((current) => ({
                      ...current,
                      proxies: current.proxies.filter(
                        (proxy) => proxy.id !== id,
                      ),
                    }))
                  }
                  render={(proxy) => (
                    <>
                      <p className="font-medium text-gray-900">{proxy.name}</p>
                      <p className="text-sm text-gray-600">
                        {[proxy.relationship, proxy.phone, proxy.email]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                      {proxy.notes && (
                        <p className="mt-1 text-sm text-gray-600">
                          {proxy.notes}
                        </p>
                      )}
                    </>
                  )}
                />
              </SharingSection>

              <SharingSection
                id="download"
                title={t('Download a package')}
                description={t(
                  'Create a file to give to someone yourself. Downloading does not send records or create a share link.',
                )}
                icon={DocumentArrowDownIcon}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <fieldset className="sm:col-span-2">
                      <legend className="text-sm font-medium text-gray-700">
                        Export scope
                      </legend>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <RadioCard
                          checked={exportScope === 'full'}
                          title={t('All profiles on this device')}
                          description={t(
                            'All profiles, connections, records, and stored workflow data in this app.',
                          )}
                          onChange={() => setExportScope('full')}
                        />
                        <RadioCard
                          checked={exportScope === 'visit'}
                          title={t('Selected profile only')}
                          description={t(
                            'This profile’s records and stored workflow notes. This is not limited to a single visit.',
                          )}
                          onChange={() => setExportScope('visit')}
                        />
                      </div>
                    </fieldset>
                    <CheckboxField
                      checked={includeProvenance}
                      label="Include provenance"
                      onChange={setIncludeProvenance}
                    />
                    <CheckboxField
                      checked={includeAttachments}
                      label="Include attachments"
                      onChange={setIncludeAttachments}
                    />
                    <CheckboxField
                      checked={includeAuditTrail}
                      label="Include audit trail"
                      onChange={setIncludeAuditTrail}
                    />
                    <CheckboxField
                      checked={passwordProtect}
                      label="Password-protect package"
                      onChange={setPasswordProtect}
                    />
                    {passwordProtect ? (
                      <TextField
                        label="Export password"
                        type="password"
                        value={exportPassphrase}
                        onChange={setExportPassphrase}
                      />
                    ) : null}
                  </div>
                  <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700 ring-1 ring-gray-200">
                    <h3 className="font-semibold text-gray-900">
                      Package summary
                    </h3>
                    <ul className="mt-2 space-y-1">
                      <li>
                        Scope:{' '}
                        {exportScope === 'full'
                          ? t('All profiles on this device')
                          : t('Selected profile only')}
                      </li>
                      <li>
                        {includeProvenance ? 'Includes' : 'Omits'} provenance
                        metadata
                      </li>
                      <li>
                        {includeAttachments ? 'Includes' : 'Omits'} embedded
                        attachments
                      </li>
                      <li>
                        {includeAuditTrail ? 'Includes' : 'Omits'} audit trail
                        metadata
                      </li>
                      <li>
                        {passwordProtect
                          ? 'Encrypted with password'
                          : 'Not password protected'}
                      </li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-600">
                      {t(
                        'After downloading, choose how to give the file to its recipient. You can record that action in the sharing log.',
                      )}
                    </p>
                    <OtherDownloadDoors from="sharing" />
                    <button
                      type="button"
                      onClick={exportRecordPackage}
                      disabled={
                        exportBusy ||
                        (passwordProtect && !exportPassphrase.trim())
                      }
                      className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4" />
                      {exportBusy ? 'Preparing...' : 'Download package'}
                    </button>
                    {exportError && (
                      <p role="alert" className="mt-3 text-sm text-red-700">
                        {t(
                          'Unable to prepare the package. Try downloading again.',
                        )}
                      </p>
                    )}
                    {downloadUrl ? (
                      <a
                        ref={downloadRef}
                        href={downloadUrl}
                        download={downloadName}
                        className="mt-2 inline-flex min-h-9 items-center rounded-md px-2 text-primary-700 underline"
                      >
                        {t('Download again')}
                      </a>
                    ) : null}
                  </div>
                </div>
              </SharingSection>

              <SharingSection
                id="log"
                title={t('Sharing log')}
                description={t(
                  'Record who received a copy and what you sent. Log entries do not grant access, create links, or revoke downloaded copies.',
                )}
                icon={ClipboardDocumentListIcon}
              >
                <p className="text-sm text-gray-600">
                  {t(
                    'A review date is a reminder for you. It does not expire a file that someone already has.',
                  )}
                </p>
                <form
                  className="mt-4 grid gap-3 lg:grid-cols-3"
                  onSubmit={addGrant}
                >
                  <TextField
                    label="Recipient"
                    value={grantDraft.recipient}
                    onChange={(value) =>
                      setGrantDraft((draft) => ({ ...draft, recipient: value }))
                    }
                  />
                  <TextField
                    label="Purpose"
                    value={grantDraft.purpose}
                    onChange={(value) =>
                      setGrantDraft((draft) => ({ ...draft, purpose: value }))
                    }
                  />
                  <TextField
                    label={t('Review date (optional)')}
                    type="date"
                    value={grantDraft.expiresOn}
                    onChange={(value) =>
                      setGrantDraft((draft) => ({ ...draft, expiresOn: value }))
                    }
                  />
                  <fieldset className="lg:col-span-3">
                    <legend className="text-sm font-medium text-gray-700">
                      Categories
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map((category) => (
                        <label
                          key={category}
                          // min-h keeps the whole row a 36px touch target.
                          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            checked={grantDraft.categories.includes(category)}
                            onChange={(event) =>
                              setGrantDraft((draft) => ({
                                ...draft,
                                categories: event.target.checked
                                  ? [...draft.categories, category]
                                  : draft.categories.filter(
                                      (item) => item !== category,
                                    ),
                              }))
                            }
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <TextField
                    label="Notes"
                    value={grantDraft.notes}
                    onChange={(value) =>
                      setGrantDraft((draft) => ({ ...draft, notes: value }))
                    }
                  />
                  <div className="flex items-end">
                    <button className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                      <PlusIcon className="h-4 w-4" />
                      {t('Record a share')}
                    </button>
                  </div>
                </form>
                <ItemList
                  items={state.grants}
                  emptyLabel={t('No shares recorded yet.')}
                  onRemove={(id) =>
                    setState((current) => ({
                      ...current,
                      grants: current.grants.filter((grant) => grant.id !== id),
                    }))
                  }
                  render={(grant) => (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {grant.recipient}
                        </p>
                        {grant.expiresOn && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {t('Review date')}: {grant.expiresOn}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{grant.purpose}</p>
                      <p className="mt-1 text-sm text-gray-700">
                        {grant.categories.join(', ')}
                      </p>
                      {grant.notes && (
                        <p className="mt-1 text-sm text-gray-600">
                          {grant.notes}
                        </p>
                      )}
                    </>
                  )}
                />
              </SharingSection>
              <p
                role="status"
                aria-live="polite"
                className={`text-xs ${sharingStatus === 'error' ? 'text-red-700' : 'text-gray-500'}`}
              >
                {sharingStatus === 'saving'
                  ? t('Saving on this device…')
                  : sharingStatus === 'error'
                    ? t(
                        'Unable to save sharing information. Your changes remain on this page; edit a field to retry.',
                      )
                    : t('Changes saved on this device.')}
              </p>
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function SharingSection({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <details
      id={`sharing-${id}`}
      className="group min-w-0 rounded-md bg-white shadow-sm ring-1 ring-gray-200"
    >
      <summary
        aria-labelledby={`sharing-${id}-title`}
        aria-describedby={`sharing-${id}-description`}
        className="flex min-h-9 cursor-pointer list-none items-start gap-3 rounded-md p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
      >
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" />
        <span className="min-w-0 flex-1">
          <span
            id={`sharing-${id}-title`}
            className="block text-base font-semibold text-gray-900"
          >
            {title}
          </span>
          <span
            id={`sharing-${id}-description`}
            className="mt-1 block text-sm text-gray-600"
          >
            {description}
          </span>
        </span>
        <ChevronDownIcon
          className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-gray-100 p-4">{children}</div>
    </details>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        className="mt-1 min-h-9 w-full rounded-md border-gray-300 text-base sm:text-sm shadow-sm focus:border-primary focus:ring-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-9 items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
      <input
        type="checkbox"
        className="rounded border-gray-300 text-primary focus:ring-primary"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function RadioCard({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label
      // min-h keeps the whole card a 36px touch target.
      className={`block min-h-9 cursor-pointer rounded-md border p-3 ${
        checked
          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
          : 'border-gray-200 bg-white'
      }`}
    >
      <span className="flex items-start gap-2">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          className="mt-1 border-gray-300 text-primary focus:ring-primary"
        />
        <span>
          <span className="block text-sm font-semibold text-gray-900">
            {title}
          </span>
          <span className="mt-1 block text-xs text-gray-600">
            {description}
          </span>
        </span>
      </span>
    </label>
  );
}

function ItemList<T extends { id: string }>({
  items,
  emptyLabel,
  onRemove,
  render,
}: {
  items: T[];
  emptyLabel: string;
  onRemove: (id: string) => void;
  render: (item: T) => JSX.Element;
}) {
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">{emptyLabel}</p>;
  }

  return (
    <div className="mt-4 grid gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-3 rounded-md border border-gray-200 p-3"
        >
          <div className="min-w-0 flex-1">{render(item)}</div>
          <button
            type="button"
            className="flex min-h-9 min-w-9 items-center justify-center self-start rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-red-700"
            onClick={() => onRemove(item.id)}
            aria-label="Remove"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function loadSharingState(storageKey: string): SharingState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '');
    return {
      emergencyProfile: {
        ...EMPTY_PROFILE,
        ...(parsed?.emergencyProfile || {}),
      },
      proxies: Array.isArray(parsed?.proxies) ? parsed.proxies : [],
      grants: Array.isArray(parsed?.grants) ? parsed.grants : [],
    };
  } catch {
    return {
      emergencyProfile: EMPTY_PROFILE,
      proxies: [],
      grants: [],
    };
  }
}

function emptySharingState(): SharingState {
  return {
    emergencyProfile: EMPTY_PROFILE,
    proxies: [],
    grants: [],
  };
}

function normalizeSharingState(value: unknown): SharingState {
  const parsed = value as Partial<SharingState> | undefined;
  return {
    emergencyProfile: {
      ...EMPTY_PROFILE,
      ...(parsed?.emergencyProfile || {}),
    },
    proxies: Array.isArray(parsed?.proxies) ? parsed.proxies : [],
    grants: Array.isArray(parsed?.grants) ? parsed.grants : [],
  };
}

function sharingRecordId(userId: string) {
  return `sharing-state:${userId}`;
}

function saveSharingState(
  db: Parameters<typeof upsertWorkflowRecord>[0],
  userId: string,
  state: SharingState,
) {
  return upsertWorkflowRecord(db, {
    id: sharingRecordId(userId),
    user_id: userId,
    kind: 'sharing-state',
    payload: state,
  });
}
