import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BellAlertIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  FlagIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { WorkflowRecord } from '../../models/workflow-record/WorkflowRecord.type';
import {
  deleteWorkflowRecord,
  listWorkflowRecords,
  upsertWorkflowRecord,
} from '../../repositories/WorkflowRecordRepository';
import { AppPage } from '../../shared/components/AppPage';
import { StylizedSelect } from '../../shared/components/StylizedSelect';

type CareResourceType = 'careplan' | 'goal' | 'servicerequest';

type CareDocument = ClinicalDocument & {
  data_record: ClinicalDocument['data_record'] & {
    resource_type: CareResourceType;
  };
};

type LocalCareItem = {
  id: string;
  title: string;
  kind: 'task' | 'reminder';
  dueDate: string;
  note: string;
  completed: boolean;
  createdAt: string;
};

type CareResource = {
  id?: string;
  title?: string;
  description?: string | { text?: string };
  code?: { text?: string };
  status?: string;
  lifecycleStatus?: string;
  intent?: string;
  authoredOn?: string;
  statusDate?: string;
};

const CARE_RESOURCE_TYPES: CareResourceType[] = [
  'careplan',
  'goal',
  'servicerequest',
];
const NEW_CARE_PLAN_PATH = '/records/new?type=careplan';

function storageKey(userId: string) {
  return `mere-medical:care-items:${userId}`;
}

export function CarePlansTab() {
  const db = useRxDb();
  const user = useUser();
  const [documents, setDocuments] = useState<CareDocument[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');
  const [localItems, setLocalItems] = useState<LocalCareItem[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<LocalCareItem['kind']>('task');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchCareDocuments() {
      setStatus('loading');
      const docs = await db.clinical_documents
        .find({
          selector: {
            user_id: user.id,
            'data_record.resource_type': { $in: CARE_RESOURCE_TYPES },
          },
          sort: [{ 'metadata.date': 'desc' }],
        })
        .exec();

      if (!isMounted) return;
      setDocuments(docs.map((doc) => doc.toMutableJSON() as CareDocument));
      setStatus('success');
    }

    fetchCareDocuments();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  useEffect(() => {
    let isMounted = true;

    async function fetchLocalItems() {
      const records = await listWorkflowRecords<LocalCareItem>(
        db,
        user.id,
        'care-task',
      );
      if (records.length > 0) {
        if (isMounted) setLocalItems(records.map((record) => record.payload));
        return;
      }

      const legacyItems = readLegacyCareItems(user.id);
      if (legacyItems.length > 0) {
        await Promise.all(
          legacyItems.map((item) => saveCareItemRecord(db, user.id, item)),
        );
        localStorage.removeItem(storageKey(user.id));
      }
      if (isMounted) setLocalItems(legacyItems);
    }

    fetchLocalItems();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  const groupedDocuments = useMemo(() => {
    return CARE_RESOURCE_TYPES.map((type) => ({
      type,
      items: documents.filter((doc) => doc.data_record.resource_type === type),
    }));
  }, [documents]);

  function addLocalItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    const item: LocalCareItem = {
      id: crypto.randomUUID(),
      title: normalizedTitle,
      kind,
      dueDate,
      note: note.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    saveCareItemRecord(db, user.id, item);
    setLocalItems((items) => [item, ...items]);
    setTitle('');
    setKind('task');
    setDueDate('');
    setNote('');
  }

  function toggleLocalItem(id: string) {
    setLocalItems((items) => {
      const next = items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      );
      const changed = next.find((item) => item.id === id);
      if (changed) saveCareItemRecord(db, user.id, changed);
      return next;
    });
  }

  function deleteLocalItem(id: string) {
    deleteWorkflowRecord(db, user.id, id);
    setLocalItems((items) => items.filter((item) => item.id !== id));
  }

  return (
    <AppPage
      banner={
        <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Care plans
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Care plans, goals, orders, and your own checklist tasks and
                reminders.
              </p>
            </div>
            <Link
              to={NEW_CARE_PLAN_PATH}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              <PlusIcon className="h-5 w-5" />
              New care plan
            </Link>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="grid gap-4">
            {status === 'loading' ? (
              <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
                Loading care plan records...
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
                <ClipboardDocumentCheckIcon className="mx-auto h-10 w-10 text-gray-400" />
                <h2 className="mt-3 text-sm font-semibold text-gray-900">
                  No synced care plan records
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Connected care plans, goals, and service requests will appear
                  here after sync.
                </p>
                <Link
                  to={NEW_CARE_PLAN_PATH}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  Create care plan
                </Link>
              </div>
            ) : (
              groupedDocuments.map(({ type, items }) => (
                <CareResourceSection key={type} type={type} items={items} />
              ))
            )}
          </section>

          <aside className="grid content-start gap-4">
            <form
              onSubmit={addLocalItem}
              className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
            >
              <h2 className="text-sm font-semibold text-gray-900">
                Add task or reminder
              </h2>
              <div className="mt-4 grid gap-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What do you need to do?"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <StylizedSelect
                    value={kind}
                    onChange={(value) =>
                      setKind(value as LocalCareItem['kind'])
                    }
                    options={[
                      { value: 'task', label: 'Task' },
                      { value: 'reminder', label: 'Reminder' },
                    ]}
                  />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note"
                  rows={3}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add item
                </button>
              </div>
            </form>

            <section className="rounded-md bg-white shadow-sm ring-1 ring-gray-200">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Checklist
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {localItems.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-600">
                    Add tasks and reminders that only live on this device.
                  </p>
                ) : (
                  localItems.map((item) => (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleLocalItem(item.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${
                              item.completed
                                ? 'text-gray-500 line-through'
                                : 'text-gray-900'
                            }`}
                          >
                            {item.title}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="capitalize">{item.kind}</span>
                            {item.dueDate && (
                              <span>Due {formatDate(item.dueDate)}</span>
                            )}
                          </div>
                          {item.note && (
                            <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
                              {item.note}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteLocalItem(item.id)}
                          className="text-xs font-medium text-gray-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppPage>
  );
}

function CareResourceSection({
  type,
  items,
}: {
  type: CareResourceType;
  items: CareDocument[];
}) {
  if (items.length === 0) return null;

  const Icon =
    type === 'goal'
      ? FlagIcon
      : type === 'servicerequest'
        ? BellAlertIcon
        : ClipboardDocumentCheckIcon;

  return (
    <section className="rounded-md bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <Icon className="h-5 w-5 text-primary-700" />
        <h2 className="text-sm font-semibold text-gray-900">
          {sectionLabel(type)}
        </h2>
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <CareResourceRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function CareResourceRow({ item }: { item: CareDocument }) {
  const resource = getCareResource(item);
  const date =
    item.metadata?.date || resource?.authoredOn || resource?.statusDate;
  const status =
    resource?.status || resource?.lifecycleStatus || resource?.intent || '';

  return (
    <article className="px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">
            {displayName(item)}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            {status && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-medium capitalize text-gray-700">
                {String(status).replace('-', ' ')}
              </span>
            )}
            {date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDaysIcon className="h-4 w-4" />
                {formatDate(date)}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium uppercase text-gray-500">
          {sectionLabel(item.data_record.resource_type)}
        </span>
      </div>
      {resource?.description && (
        <p className="mt-2 text-sm text-gray-600">
          {typeof resource.description === 'string'
            ? resource.description
            : resource.description.text}
        </p>
      )}
    </article>
  );
}

function sectionLabel(type: CareResourceType) {
  if (type === 'careplan') return 'Care plans';
  if (type === 'servicerequest') return 'Service requests';
  return 'Goals';
}

function readLegacyCareItems(userId: string): LocalCareItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCareItemRecord(
  db: Parameters<typeof upsertWorkflowRecord>[0],
  userId: string,
  item: LocalCareItem,
): Promise<WorkflowRecord<LocalCareItem>> {
  return upsertWorkflowRecord(db, {
    id: item.id,
    user_id: userId,
    kind: 'care-task',
    payload: item,
    created_at: item.createdAt,
  });
}

function displayName(item: CareDocument) {
  const resource = getCareResource(item);
  return (
    item.metadata?.display_name ||
    resource?.title ||
    (typeof resource?.description === 'string'
      ? resource.description
      : resource?.description?.text) ||
    resource?.code?.text ||
    resource?.id ||
    'Untitled care record'
  );
}

function getCareResource(item: CareDocument) {
  const raw = item.data_record.raw as { resource?: CareResource } | undefined;
  return raw?.resource;
}

function formatDate(value: string) {
  try {
    return format(parseISO(value), 'MMM d, yyyy');
  } catch {
    return value;
  }
}
