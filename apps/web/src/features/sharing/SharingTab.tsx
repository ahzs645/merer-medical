import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  DocumentArrowDownIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import { useUser } from '../../app/providers/UserProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import {
  listWorkflowRecords,
  upsertWorkflowRecord,
} from '../../repositories/WorkflowRecordRepository';
import { AppPage } from '../../shared/components/AppPage';
import { exportEmrpkgFromRxDb } from '../../services/emrpkg';
import { appendAuditLog } from '../audit/auditLog';

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
  'Allergies',
  'Conditions',
  'Procedures',
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
  const db = useRxDb();
  const storageKey = useMemo(() => `mere:sharing:${user.id}`, [user.id]);
  const [state, setState] = useState<SharingState>(emptySharingState);
  const [isSharingStateLoaded, setIsSharingStateLoaded] = useState(false);
  const [proxyDraft, setProxyDraft] =
    useState<Omit<CaregiverProxy, 'id'>>(EMPTY_PROXY);
  const [grantDraft, setGrantDraft] =
    useState<Omit<ShareGrant, 'id'>>(EMPTY_GRANT);
  const [exportScope, setExportScope] = useState<'full' | 'visit'>('full');
  const [includeProvenance, setIncludeProvenance] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const downloadRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsSharingStateLoaded(false);

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
          setIsSharingStateLoaded(true);
        }
        return;
      }

      const legacyState = loadSharingState(storageKey);
      await saveSharingState(db, user.id, legacyState);
      localStorage.removeItem(storageKey);
      if (isMounted) {
        setState(legacyState);
        setIsSharingStateLoaded(true);
      }
    }

    fetchSharingState();

    return () => {
      isMounted = false;
    };
  }, [db, storageKey, user.id]);

  useEffect(() => {
    if (!isSharingStateLoaded) return;
    saveSharingState(db, user.id, state);
  }, [db, isSharingStateLoaded, state, user.id]);

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
    if (passwordProtect && !exportPassphrase.trim()) return;
    setExportBusy(true);
    try {
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
      await appendAuditLog(db, {
        userId: user.id,
        actor: 'local-user',
        action: 'record.export',
        targetType: 'emrpkg',
        source: 'Sharing',
        summary: `Exported ${exportScope === 'full' ? 'full' : 'visit-prep'} record package`,
      });
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      setDownloadUrl(url);
      setDownloadName(
        `mere_record_${exportScope}_${ts}${passwordProtect ? '.enc' : ''}.emrpkg`,
      );
      setTimeout(() => downloadRef.current?.click(), 0);
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <AppPage
      banner={
        <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-xl font-semibold text-gray-900">
              Sharing and emergency access
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Local emergency profile, caregiver proxies, and limited share
              grants for this user.
            </p>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] lg:px-8">
          <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <DocumentArrowDownIcon className="h-5 w-5 text-primary-700" />
              <h2 className="text-base font-semibold text-gray-900">
                Record download wizard
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
              <div className="grid gap-3 sm:grid-cols-2">
                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-medium text-gray-700">
                    Export scope
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <RadioCard
                      checked={exportScope === 'full'}
                      title="Full record"
                      description="Export all users, connections, records, and settings."
                      onChange={() => setExportScope('full')}
                    />
                    <RadioCard
                      checked={exportScope === 'visit'}
                      title="Visit-specific package"
                      description="Exports current user records and workflow data, omitting other user profiles."
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
                <h3 className="font-semibold text-gray-900">Package summary</h3>
                <ul className="mt-2 space-y-1">
                  <li>
                    Scope:{' '}
                    {exportScope === 'full' ? 'full record' : 'visit-specific'}
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
                  Share grants below are local planning notes. They do not
                  create live recipient access; use the downloaded package to
                  share records intentionally.
                </p>
                <button
                  type="button"
                  onClick={exportRecordPackage}
                  disabled={
                    exportBusy || (passwordProtect && !exportPassphrase.trim())
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  {exportBusy ? 'Preparing...' : 'Download package'}
                </button>
                {downloadUrl ? (
                  <a
                    ref={downloadRef}
                    href={downloadUrl}
                    download={downloadName}
                    className="hidden"
                  >
                    Download
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-primary-700" />
              <h2 className="text-base font-semibold text-gray-900">
                Emergency profile
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
                onChange={(value) => updateProfile('primaryClinician', value)}
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
                  className="mt-1 min-h-28 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                  value={state.emergencyProfile.emergencyNotes}
                  onChange={(event) =>
                    updateProfile('emergencyNotes', event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5 text-primary-700" />
              <h2 className="text-base font-semibold text-gray-900">
                Caregivers and proxies
              </h2>
            </div>
            <form className="grid gap-3" onSubmit={addProxy}>
              <TextField
                label="Name"
                value={proxyDraft.name}
                onChange={(value) =>
                  setProxyDraft((draft) => ({ ...draft, name: value }))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
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
              <button className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                <PlusIcon className="h-4 w-4" />
                Add proxy
              </button>
            </form>
            <ItemList
              items={state.proxies}
              emptyLabel="No caregiver proxies yet."
              onRemove={(id) =>
                setState((current) => ({
                  ...current,
                  proxies: current.proxies.filter((proxy) => proxy.id !== id),
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
                    <p className="mt-1 text-sm text-gray-600">{proxy.notes}</p>
                  )}
                </>
              )}
            />
          </section>

          <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
            <h2 className="text-base font-semibold text-gray-900">
              Share grants
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Track intended recipients, scope, and expiration for exports.
              These entries do not create live account permissions or share
              links.
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
                label="Expires on"
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
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
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
                <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                  <PlusIcon className="h-4 w-4" />
                  Add grant
                </button>
              </div>
            </form>
            <ItemList
              items={state.grants}
              emptyLabel="No share grants yet."
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
                        Expires {grant.expiresOn}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{grant.purpose}</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {grant.categories.join(', ')}
                  </p>
                  {grant.notes && (
                    <p className="mt-1 text-sm text-gray-600">{grant.notes}</p>
                  )}
                </>
              )}
            />
          </section>
        </div>
      </div>
    </AppPage>
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
        className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
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
    <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
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
      className={`cursor-pointer rounded-md border p-3 ${
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
            className="h-8 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-700"
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
