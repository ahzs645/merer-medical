import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
import {
  getClinicalDocumentById,
  insertClinicalDocument,
  upsertClinicalDocuments,
} from '../../repositories/ClinicalDocumentRepository';
import {
  getManualObservationInterpretation,
  getManualObservationRange,
  getManualObservationValue,
  getManualRecordNote,
  isManualRecord,
} from '../../shared/utils/manualRecordUtils';

const MANUAL_CONNECTION_LOCATION = 'manual://local';

type ManualRecordKind =
  | 'condition'
  | 'medicationstatement'
  | 'immunization'
  | 'procedure'
  | 'allergyintolerance'
  | 'encounter'
  | 'careplan'
  | 'document'
  | 'lab'
  | 'vital';

const recordTypes: Array<{ value: ManualRecordKind; label: string }> = [
  { value: 'condition', label: 'Condition' },
  { value: 'medicationstatement', label: 'Medication' },
  { value: 'immunization', label: 'Immunization' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'allergyintolerance', label: 'Allergy' },
  { value: 'encounter', label: 'Encounter' },
  { value: 'careplan', label: 'Care plan' },
  { value: 'document', label: 'Document / file' },
  { value: 'lab', label: 'Lab / result' },
  { value: 'vital', label: 'Vital sign' },
];

export function ManualRecordTab() {
  const db = useRxDb();
  const user = useUser();
  const { recordId } = useParams();
  const navigate = useNavigate();
  const notifyDispatch = useNotificationDispatch();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [recordType, setRecordType] = useState<ManualRecordKind>('condition');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [rangeLow, setRangeLow] = useState('');
  const [rangeHigh, setRangeHigh] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContentType, setFileContentType] = useState('');
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [loadedDocument, setLoadedDocument] = useState<ClinicalDocument | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!recordId;
  const isObservationType = recordType === 'lab' || recordType === 'vital';
  const isDocumentType = recordType === 'document';

  useEffect(() => {
    if (!db || !recordId) return;

    let cancelled = false;
    getClinicalDocumentById(db, user.id, recordId)
      .then((doc) => {
        if (cancelled) return;
        if (!doc || !isManualRecord(doc)) {
          notifyDispatch({
            type: 'set_notification',
            message: 'Manual record not found',
            variant: 'error',
          });
          navigate(AppRoutes.Timeline);
          return;
        }
        setLoadedDocument(doc);
        setRecordType(getManualRecordKind(doc));
        setTitle(doc.metadata?.display_name || '');
        setDate((doc.metadata?.date || today).slice(0, 10));
        setNotes(getManualRecordNote(doc) || '');
        const observationValue = getManualObservationValue(doc);
        if (observationValue) {
          const [first, ...rest] = observationValue.split(' ');
          setValue(first);
          setUnit(rest.join(' '));
        }
        const range = getManualObservationRange(doc);
        if (range?.includes('-')) {
          const [low, highWithUnit] = range.split('-');
          const [high] = highWithUnit.trim().split(' ');
          setRangeLow(low.trim());
          setRangeHigh(high.trim());
        }
        setInterpretation(getManualObservationInterpretation(doc) || '');
        if (doc.data_record.resource_type === 'documentreference_attachment') {
          setFileName(doc.metadata?.display_name || '');
          setFileContentType(doc.data_record.content_type);
          setFileData(
            typeof doc.data_record.raw === 'string'
              ? doc.data_record.raw
              : undefined,
          );
        }
      })
      .catch((error) => {
        console.error(error);
        notifyDispatch({
          type: 'set_notification',
          message: `Unable to load record: ${(error as Error).message}`,
          variant: 'error',
        });
        navigate(AppRoutes.Timeline);
      });

    return () => {
      cancelled = true;
    };
  }, [db, navigate, notifyDispatch, recordId, today, user.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !db || isSaving) return;
    if (recordType === 'document' && !fileData) {
      notifyDispatch({
        type: 'set_notification',
        message: 'Select a file before saving this document',
        variant: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      const connection = await getManualConnection(db, user.id);
      const nextRecordId =
        loadedDocument?.metadata?.id?.replace(/^manual:/, '') || uuid4();
      const recordDate = new Date(`${date}T12:00:00.000Z`).toISOString();
      const resourceType = getClinicalResourceType(recordType);
      const doc: ClinicalDocument = {
        id: loadedDocument?.id || '',
        connection_record_id:
          loadedDocument?.connection_record_id || connection.id,
        user_id: user.id,
        data_record: {
          raw:
            recordType === 'document'
              ? fileData || ''
              : buildManualFhirEntry(
                  nextRecordId,
                  recordType,
                  title,
                  notes,
                  recordDate,
                  { value, unit, rangeLow, rangeHigh, interpretation },
                ),
          format: recordType === 'careplan' ? 'FHIR.R4' : 'FHIR.DSTU2',
          content_type:
            recordType === 'document'
              ? fileContentType || 'application/octet-stream'
              : 'application/json',
          resource_type: resourceType,
          version_history: loadedDocument
            ? [loadedDocument.data_record.raw]
            : [],
        },
        metadata: {
          id: `manual:${nextRecordId}`,
          date: recordDate,
          display_name: title.trim() || fileName,
        },
      };

      if (loadedDocument) {
        await upsertClinicalDocuments(db, [{ ...doc, id: loadedDocument.id }]);
      } else {
        await insertClinicalDocument(db, doc);
      }

      notifyDispatch({
        type: 'set_notification',
        message: loadedDocument ? 'Record updated' : 'Record added',
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
    <AppPage
      banner={<GenericBanner text={isEditing ? 'Edit record' : 'Add record'} />}
    >
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
                setRecordType(event.target.value as ManualRecordKind)
              }
              disabled={isEditing}
              className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              {recordTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {isObservationType && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="manual-record-value"
                  className="block text-sm font-semibold text-gray-900"
                >
                  Value
                </label>
                <input
                  id="manual-record-value"
                  type="text"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-record-unit"
                  className="block text-sm font-semibold text-gray-900"
                >
                  Unit
                </label>
                <input
                  id="manual-record-unit"
                  type="text"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-record-range-low"
                  className="block text-sm font-semibold text-gray-900"
                >
                  Range low
                </label>
                <input
                  id="manual-record-range-low"
                  type="text"
                  value={rangeLow}
                  onChange={(event) => setRangeLow(event.target.value)}
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-record-range-high"
                  className="block text-sm font-semibold text-gray-900"
                >
                  Range high
                </label>
                <input
                  id="manual-record-range-high"
                  type="text"
                  value={rangeHigh}
                  onChange={(event) => setRangeHigh(event.target.value)}
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="manual-record-interpretation"
                  className="block text-sm font-semibold text-gray-900"
                >
                  Interpretation
                </label>
                <input
                  id="manual-record-interpretation"
                  type="text"
                  value={interpretation}
                  onChange={(event) => setInterpretation(event.target.value)}
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
            </div>
          )}

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

          {isDocumentType && (
            <div>
              <label
                htmlFor="manual-record-file"
                className="block text-sm font-semibold text-gray-900"
              >
                File
              </label>
              <input
                id="manual-record-file"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setFileName(file.name);
                  setFileContentType(file.type || 'application/octet-stream');
                  if (
                    file.type.startsWith('text/') ||
                    file.type.includes('xml') ||
                    file.type.includes('html')
                  ) {
                    file.text().then(setFileData);
                  } else {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = `${reader.result || ''}`;
                      setFileData(result.split(',')[1] || result);
                    };
                    reader.readAsDataURL(file);
                  }
                  if (!title.trim()) setTitle(file.name);
                }}
                className="mt-2 block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700"
              />
              {fileName && (
                <p className="mt-2 text-xs font-medium text-gray-600">
                  {fileName}
                </p>
              )}
            </div>
          )}

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
              {isSaving
                ? 'Saving'
                : isEditing
                  ? 'Update record'
                  : 'Save record'}
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
  recordType: ManualRecordKind,
  title: string,
  notes: string,
  date: string,
  observation?: {
    value: string;
    unit: string;
    rangeLow: string;
    rangeHigh: string;
    interpretation: string;
  },
) {
  const resourceType = toFhirResourceType(recordType);
  const observationData = observation ?? {
    value: '',
    unit: '',
    rangeLow: '',
    rangeHigh: '',
    interpretation: '',
  };
  const hasObservationValue = observationData.value.trim();
  return {
    fullUrl: `manual:${id}`,
    manual_kind: recordType,
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
      effectiveDateTime: date,
      date,
      issued: date,
      status: recordType === 'careplan' ? 'active' : 'final',
      class: recordType === 'encounter' ? 'manual' : undefined,
      location:
        recordType === 'encounter' && notes.trim()
          ? [{ location: { display: notes.trim() } }]
          : undefined,
      title: recordType === 'careplan' ? title.trim() : undefined,
      valueQuantity: hasObservationValue
        ? {
            value: Number.isFinite(Number(observationData.value))
              ? Number(observationData.value)
              : observationData.value.trim(),
            unit: observationData.unit.trim() || undefined,
          }
        : undefined,
      referenceRange:
        observationData.rangeLow.trim() || observationData.rangeHigh.trim()
          ? [
              {
                low: observationData.rangeLow.trim()
                  ? {
                      value: observationData.rangeLow.trim(),
                      unit: observationData.unit.trim() || undefined,
                    }
                  : undefined,
                high: observationData.rangeHigh.trim()
                  ? {
                      value: observationData.rangeHigh.trim(),
                      unit: observationData.unit.trim() || undefined,
                    }
                  : undefined,
              },
            ]
          : undefined,
      interpretation: observationData.interpretation.trim()
        ? { text: observationData.interpretation.trim() }
        : undefined,
    },
  };
}

function getClinicalResourceType(
  recordType: ManualRecordKind,
): ClinicalDocumentResourceType {
  if (recordType === 'lab' || recordType === 'vital') return 'observation';
  if (recordType === 'document') return 'documentreference_attachment';
  return recordType;
}

function getManualRecordKind(doc: ClinicalDocument): ManualRecordKind {
  const raw = doc.data_record.raw as { manual_kind?: ManualRecordKind };
  if (raw.manual_kind) return raw.manual_kind;
  if (doc.data_record.resource_type === 'observation') return 'lab';
  if (doc.data_record.resource_type === 'documentreference_attachment') {
    return 'document';
  }
  return doc.data_record.resource_type as ManualRecordKind;
}

function toFhirResourceType(recordType: ManualRecordKind) {
  switch (recordType) {
    case 'medicationstatement':
      return 'MedicationStatement';
    case 'allergyintolerance':
      return 'AllergyIntolerance';
    case 'careplan':
      return 'CarePlan';
    case 'lab':
    case 'vital':
      return 'Observation';
    default:
      return recordType.charAt(0).toUpperCase() + recordType.slice(1);
  }
}
