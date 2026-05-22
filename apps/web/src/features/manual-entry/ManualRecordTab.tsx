import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { useUser } from '../../app/providers/UserProvider';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import uuid4 from '../../shared/utils/UUIDUtils';
import { Routes as AppRoutes } from '../../Routes';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import {
  ClinicalDocument,
  ClinicalDocumentResourceType,
} from '../../models/clinical-document/ClinicalDocument.type';
import {
  findConnectionByUrl,
  upsertConnection,
} from '../../repositories/ConnectionRepository';
import { insertClinicalDocument } from '../../repositories/ClinicalDocumentRepository';

const MANUAL_CONNECTION_LOCATION = 'manual://local';

type ManualRecordType =
  | 'condition'
  | 'medicationstatement'
  | 'immunization'
  | 'procedure'
  | 'observation';

const recordTypes: Array<{ value: ManualRecordType; label: string }> = [
  { value: 'condition', label: 'Condition' },
  { value: 'medicationstatement', label: 'Medication' },
  { value: 'immunization', label: 'Immunization' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'observation', label: 'Lab / result' },
];

export function ManualRecordTab() {
  const db = useRxDb();
  const user = useUser();
  const navigate = useNavigate();
  const notifyDispatch = useNotificationDispatch();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [recordType, setRecordType] = useState<ManualRecordType>('condition');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !db || isSaving) return;

    setIsSaving(true);
    try {
      const connection = await getManualConnection(db, user.id);
      const recordId = uuid4();
      const recordDate = new Date(`${date}T12:00:00.000Z`).toISOString();

      await insertClinicalDocument(db, {
        connection_record_id: connection.id,
        user_id: user.id,
        data_record: {
          raw: buildManualFhirEntry(
            recordId,
            recordType,
            title,
            notes,
            recordDate,
          ),
          format: 'FHIR.DSTU2',
          content_type: 'application/json',
          resource_type: recordType,
          version_history: [],
        },
        metadata: {
          id: `manual:${recordId}`,
          date: recordDate,
          display_name: title.trim(),
        },
      });

      notifyDispatch({
        type: 'set_notification',
        message: 'Record added',
        variant: 'success',
      });
      navigate(AppRoutes.Timeline);
    } catch (error) {
      console.error(error);
      notifyDispatch({
        type: 'set_notification',
        message: `Unable to add record: ${(error as Error).message}`,
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppPage banner={<GenericBanner text="Add record" />}>
      <div className="h-full overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <form
          onSubmit={onSubmit}
          className="mx-auto flex max-w-2xl flex-col gap-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div>
            <label
              htmlFor="manual-record-type"
              className="block text-sm font-semibold text-gray-900"
            >
              Type
            </label>
            <select
              id="manual-record-type"
              value={recordType}
              onChange={(event) =>
                setRecordType(event.target.value as ManualRecordType)
              }
              className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              {recordTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="manual-record-title"
              className="block text-sm font-semibold text-gray-900"
            >
              Name
            </label>
            <input
              id="manual-record-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div>
            <label
              htmlFor="manual-record-date"
              className="block text-sm font-semibold text-gray-900"
            >
              Date
            </label>
            <input
              id="manual-record-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div>
            <label
              htmlFor="manual-record-notes"
              className="block text-sm font-semibold text-gray-900"
            >
              Notes
            </label>
            <textarea
              id="manual-record-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              className="mt-2 block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(AppRoutes.Timeline)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? 'Saving' : 'Save record'}
            </button>
          </div>
        </form>
      </div>
    </AppPage>
  );
}

async function getManualConnection(
  db: Parameters<typeof findConnectionByUrl>[0],
  userId: string,
): Promise<ConnectionDocument> {
  const existing = await findConnectionByUrl(
    db,
    userId,
    MANUAL_CONNECTION_LOCATION,
  );
  if (existing) return existing;

  const connection: ConnectionDocument = {
    id: uuid4(),
    user_id: userId,
    access_token: '',
    expires_at: 0,
    source: 'manual',
    name: 'Manual entry',
    location: MANUAL_CONNECTION_LOCATION,
    last_refreshed: new Date().toISOString(),
    last_sync_attempt: new Date().toISOString(),
    last_sync_was_error: false,
  };
  await upsertConnection(db, userId, connection);
  return connection;
}

function buildManualFhirEntry(
  id: string,
  recordType: ClinicalDocumentResourceType,
  title: string,
  notes: string,
  date: string,
) {
  const resourceType = toFhirResourceType(recordType);
  return {
    fullUrl: `manual:${id}`,
    resource: {
      resourceType,
      id,
      code: {
        text: title.trim(),
      },
      text: notes.trim()
        ? {
            status: 'generated',
            div: notes.trim(),
          }
        : undefined,
      note: notes.trim() ? [{ text: notes.trim() }] : undefined,
      recordedDate: date,
      date,
    },
  };
}

function toFhirResourceType(recordType: ClinicalDocumentResourceType) {
  switch (recordType) {
    case 'medicationstatement':
      return 'MedicationStatement';
    default:
      return recordType.charAt(0).toUpperCase() + recordType.slice(1);
  }
}
