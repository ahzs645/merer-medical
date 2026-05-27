import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useLocalConfig } from '../../app/providers/LocalConfigProvider';
import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
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
  LinkedAttachmentFile,
  prepareLinkedAttachmentFile,
  saveClinicalDocumentAttachment,
  supportsClinicalDocumentAttachments,
} from '../../repositories/AttachmentRepository';
import {
  getManualMedicationParts,
  getManualObservationInterpretation,
  getManualObservationRange,
  getManualObservationValue,
  getManualRecordNote,
  isManualRecord,
} from '../../shared/utils/manualRecordUtils';
import {
  LabResultRow,
  ManualObservationAbsentReason,
  ManualObservationComparator,
  ManualObservationValueKind,
  TerminologyEntry,
} from './clinicalTerminology';
import { LabResultsTable } from './LabResultsTable';
import { TerminologySuggestions } from './TerminologyCombobox';
import {
  buildLibreClinicalDocument,
  buildLibreConnection,
  LIBRE_CONNECTION_LOCATION,
  parseLibreViewFile,
} from '../diabetes/libreView';

const MANUAL_CONNECTION_LOCATION = 'manual://local';

type ManualRecordKind =
  | 'condition'
  | 'visionprescription'
  | 'medicationstatement'
  | 'immunization'
  | 'procedure'
  | 'allergyintolerance'
  | 'encounter'
  | 'careplan'
  | 'document'
  | 'lab'
  | 'vital'
  | 'device';

type ClinicalManualRecordKind = Exclude<ManualRecordKind, 'device'>;
type DeviceImportKind = 'freestyle_libre';
type ManualSpecialty = 'general' | 'dental' | 'optometry';
type DentalEntryKind =
  | 'cleaning'
  | 'finding'
  | 'condition'
  | 'procedure'
  | 'treatmentPlan'
  | 'imaging'
  | 'orthodonticAssessment'
  | 'orthodonticTreatmentPlan'
  | 'orthodonticAppliance'
  | 'orthodonticAdjustment'
  | 'alignerCase'
  | 'cephalometricAnalysis'
  | 'retention'
  | 'orthodonticConsent';
type OptometryEntryKind =
  | 'checkup'
  | 'glassesPrescription'
  | 'contactLensPrescription'
  | 'refraction'
  | 'visualAcuity'
  | 'iop'
  | 'diagnosis'
  | 'procedure'
  | 'imaging'
  | 'retail';
type EyeSide = 'OD' | 'OS' | 'OU';

const recordTypes: Array<{ value: ManualRecordKind; label: string }> = [
  { value: 'condition', label: 'Condition' },
  { value: 'visionprescription', label: 'Vision prescription' },
  { value: 'medicationstatement', label: 'Medication' },
  { value: 'immunization', label: 'Immunization' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'allergyintolerance', label: 'Allergy' },
  { value: 'encounter', label: 'Encounter' },
  { value: 'careplan', label: 'Care plan' },
  { value: 'document', label: 'Document / file' },
  { value: 'lab', label: 'Lab / result' },
  { value: 'vital', label: 'Vital sign' },
  { value: 'device', label: 'Device' },
];

const specialtyOptions: Array<{ value: ManualSpecialty; label: string }> = [
  { value: 'general', label: 'General medical' },
  { value: 'dental', label: 'Dental' },
  { value: 'optometry', label: 'Optometry' },
];

const dentalEntryTypes: Array<{
  value: DentalEntryKind;
  label: string;
  recordType: ClinicalManualRecordKind;
  title: string;
}> = [
  {
    value: 'cleaning',
    label: 'Cleaning / hygiene',
    recordType: 'procedure',
    title: 'Dental cleaning',
  },
  {
    value: 'finding',
    label: 'Tooth finding',
    recordType: 'vital',
    title: 'Dental finding',
  },
  {
    value: 'condition',
    label: 'Dental condition',
    recordType: 'condition',
    title: 'Dental condition',
  },
  {
    value: 'procedure',
    label: 'Dental procedure',
    recordType: 'procedure',
    title: 'Dental procedure',
  },
  {
    value: 'treatmentPlan',
    label: 'Treatment plan',
    recordType: 'careplan',
    title: 'Dental treatment plan',
  },
  {
    value: 'imaging',
    label: 'Dental image / scan',
    recordType: 'document',
    title: 'Dental image or scan',
  },
  {
    value: 'orthodonticAssessment',
    label: 'Ortho assessment',
    recordType: 'condition',
    title: 'Orthodontic assessment',
  },
  {
    value: 'orthodonticTreatmentPlan',
    label: 'Ortho treatment plan',
    recordType: 'careplan',
    title: 'Orthodontic treatment plan',
  },
  {
    value: 'orthodonticAppliance',
    label: 'Appliance / hardware',
    recordType: 'procedure',
    title: 'Orthodontic appliance',
  },
  {
    value: 'alignerCase',
    label: 'Aligner case',
    recordType: 'procedure',
    title: 'Aligner case',
  },
  {
    value: 'orthodonticAdjustment',
    label: 'Adjustment visit',
    recordType: 'encounter',
    title: 'Orthodontic adjustment visit',
  },
  {
    value: 'cephalometricAnalysis',
    label: 'Ceph analysis',
    recordType: 'vital',
    title: 'Cephalometric analysis',
  },
  {
    value: 'retention',
    label: 'Retention',
    recordType: 'procedure',
    title: 'Orthodontic retention',
  },
  {
    value: 'orthodonticConsent',
    label: 'Consent / transfer',
    recordType: 'document',
    title: 'Orthodontic consent',
  },
];

const optometryEntryTypes: Array<{
  value: OptometryEntryKind;
  label: string;
  recordType: ClinicalManualRecordKind;
  title: string;
}> = [
  {
    value: 'checkup',
    label: 'Eye exam / checkup',
    recordType: 'encounter',
    title: 'Optometry checkup',
  },
  {
    value: 'glassesPrescription',
    label: 'Glasses prescription',
    recordType: 'visionprescription',
    title: 'Glasses prescription',
  },
  {
    value: 'contactLensPrescription',
    label: 'Contact lens prescription',
    recordType: 'visionprescription',
    title: 'Contact lens prescription',
  },
  {
    value: 'refraction',
    label: 'Refraction',
    recordType: 'vital',
    title: 'Refraction',
  },
  {
    value: 'visualAcuity',
    label: 'Visual acuity',
    recordType: 'vital',
    title: 'Visual acuity',
  },
  { value: 'iop', label: 'IOP', recordType: 'vital', title: 'IOP' },
  {
    value: 'diagnosis',
    label: 'Ocular diagnosis',
    recordType: 'condition',
    title: 'Ocular diagnosis',
  },
  {
    value: 'procedure',
    label: 'Eye procedure / test',
    recordType: 'procedure',
    title: 'Eye procedure',
  },
  {
    value: 'imaging',
    label: 'Eye image / device report',
    recordType: 'document',
    title: 'Eye image or device report',
  },
  {
    value: 'retail',
    label: 'Optical retail order',
    recordType: 'document',
    title: 'Optical order',
  },
];

const toothSurfaces = ['M', 'O', 'I', 'D', 'B', 'F', 'L'];

const deviceImportTypes: Array<{ value: DeviceImportKind; label: string }> = [
  { value: 'freestyle_libre', label: 'FreeStyle Libre' },
];

type ManualTemplate = {
  label: string;
  kind: ClinicalManualRecordKind;
  title: string;
  unit: string;
  terminology?: TerminologyEntry;
};

// One-tap presets for the most common vitals and labs people log by hand.
const quickTemplates: ManualTemplate[] = [
  {
    label: 'Blood pressure',
    kind: 'vital',
    title: 'Blood pressure',
    unit: 'mmHg',
  },
  { label: 'Heart rate', kind: 'vital', title: 'Heart rate', unit: 'bpm' },
  { label: 'Body weight', kind: 'vital', title: 'Body weight', unit: 'kg' },
  {
    label: 'Body temperature',
    kind: 'vital',
    title: 'Body temperature',
    unit: '°C',
  },
  {
    label: 'Oxygen saturation',
    kind: 'vital',
    title: 'Oxygen saturation',
    unit: '%',
  },
  {
    label: 'Blood glucose',
    kind: 'lab',
    title: 'Blood glucose',
    unit: 'mg/dL',
  },
];

function createLabRow(): LabResultRow {
  return {
    id: uuid4(),
    title: '',
    valueKind: 'quantity',
    comparator: '',
    value: '',
    unit: '',
    rangeLow: '',
    rangeHigh: '',
    rangeText: '',
    interpretation: '',
    absentReason: 'pending',
  };
}

export function ManualRecordTab() {
  const db = useRxDb();
  const user = useUser();
  const { recordId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const localConfig = useLocalConfig();
  const notifyDispatch = useNotificationDispatch();
  const { t } = useInterfaceLanguage();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const requestedSpecialty =
    searchParams.get('specialty') === 'dental' ||
    searchParams.get('specialty') === 'optometry'
      ? (searchParams.get('specialty') as ManualSpecialty)
      : 'general';
  const [specialty, setSpecialty] =
    useState<ManualSpecialty>(requestedSpecialty);
  const [recordType, setRecordType] = useState<ManualRecordKind>('condition');
  const [dentalEntryKind, setDentalEntryKind] =
    useState<DentalEntryKind>('cleaning');
  const [optometryEntryKind, setOptometryEntryKind] =
    useState<OptometryEntryKind>('checkup');
  const [toothNumber, setToothNumber] = useState('');
  const [dentalSurfaces, setDentalSurfaces] = useState<string[]>([]);
  const [dentalRecall, setDentalRecall] = useState('');
  const [orthoPhase, setOrthoPhase] = useState('');
  const [orthoArch, setOrthoArch] = useState('');
  const [orthoAppliance, setOrthoAppliance] = useState('');
  const [orthoStatus, setOrthoStatus] = useState('');
  const [alignerCurrent, setAlignerCurrent] = useState('');
  const [alignerTotal, setAlignerTotal] = useState('');
  const [overjet, setOverjet] = useState('');
  const [overbite, setOverbite] = useState('');
  const [molarClass, setMolarClass] = useState('');
  const [nextVisit, setNextVisit] = useState('');
  const [eyeSide, setEyeSide] = useState<EyeSide>('OU');
  const [odSphere, setOdSphere] = useState('');
  const [odCylinder, setOdCylinder] = useState('');
  const [odAxis, setOdAxis] = useState('');
  const [odAdd, setOdAdd] = useState('');
  const [osSphere, setOsSphere] = useState('');
  const [osCylinder, setOsCylinder] = useState('');
  const [osAxis, setOsAxis] = useState('');
  const [osAdd, setOsAdd] = useState('');
  const [pd, setPd] = useState('');
  const [visualAcuityOd, setVisualAcuityOd] = useState('');
  const [visualAcuityOs, setVisualAcuityOs] = useState('');
  const [iopOd, setIopOd] = useState('');
  const [iopOs, setIopOs] = useState('');
  const [examMethod, setExamMethod] = useState('');
  const [deviceImportType, setDeviceImportType] =
    useState<DeviceImportKind>('freestyle_libre');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [valueKind, setValueKind] =
    useState<ManualObservationValueKind>('quantity');
  const [comparator, setComparator] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [selectedTerminology, setSelectedTerminology] =
    useState<TerminologyEntry>();
  const [labRows, setLabRows] = useState<LabResultRow[]>([createLabRow()]);
  const [rangeLow, setRangeLow] = useState('');
  const [rangeHigh, setRangeHigh] = useState('');
  const [rangeText, setRangeText] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [absentReason, setAbsentReason] =
    useState<ManualObservationAbsentReason>('pending');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [route, setRoute] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContentType, setFileContentType] = useState('');
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [linkedFile, setLinkedFile] = useState<LinkedAttachmentFile | null>(
    null,
  );
  const [loadedDocument, setLoadedDocument] = useState<ClinicalDocument | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isImportingLibre, setIsImportingLibre] = useState(false);
  const [keepAdding, setKeepAdding] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const isEditing = !!recordId;
  const isDeviceImportType = recordType === 'device';
  const isLibreImportType =
    isDeviceImportType && deviceImportType === 'freestyle_libre';
  const isObservationType = recordType === 'lab' || recordType === 'vital';
  const isDocumentType = recordType === 'document';
  const isMedicationType = recordType === 'medicationstatement';
  const canLinkSourceFile = supportsClinicalDocumentAttachments();
  const completedLabRows = labRows.filter((row) => row.title.trim());
  const titleMissing =
    recordType === 'lab' || isDeviceImportType ? false : !title.trim();
  const fileMissing = isDocumentType && !fileData;
  const terminologyProfile = localConfig.terminology_profile || 'canada';
  const terminologyLanguage = localConfig.terminology_language || 'en';
  const terminologyLookupMode = localConfig.terminology_lookup_mode || 'hybrid';
  const terminologyRemoteEnabled =
    localConfig.terminology_remote_enabled || false;

  function resetFields() {
    setTitle('');
    setNotes('');
    setValueKind('quantity');
    setComparator('');
    setValue('');
    setUnit('');
    setSelectedTerminology(undefined);
    setLabRows([createLabRow()]);
    setRangeLow('');
    setRangeHigh('');
    setRangeText('');
    setInterpretation('');
    setAbsentReason('pending');
    setDose('');
    setFrequency('');
    setRoute('');
    setFileName('');
    setFileContentType('');
    setFileData(undefined);
    setLinkedFile(null);
    setToothNumber('');
    setDentalSurfaces([]);
    setDentalRecall('');
    setOrthoPhase('');
    setOrthoArch('');
    setOrthoAppliance('');
    setOrthoStatus('');
    setAlignerCurrent('');
    setAlignerTotal('');
    setOverjet('');
    setOverbite('');
    setMolarClass('');
    setNextVisit('');
    setEyeSide('OU');
    setOdSphere('');
    setOdCylinder('');
    setOdAxis('');
    setOdAdd('');
    setOsSphere('');
    setOsCylinder('');
    setOsAxis('');
    setOsAdd('');
    setPd('');
    setVisualAcuityOd('');
    setVisualAcuityOs('');
    setIopOd('');
    setIopOs('');
    setExamMethod('');
    setSubmitAttempted(false);
  }

  function applyDentalEntryKind(nextKind: DentalEntryKind) {
    const config = dentalEntryTypes.find((entry) => entry.value === nextKind);
    if (!config) return;
    setDentalEntryKind(nextKind);
    setRecordType(config.recordType);
    if (!title.trim() || specialty !== 'dental') setTitle(config.title);
    setSpecialty('dental');
    setSubmitAttempted(false);
  }

  function applyOptometryEntryKind(nextKind: OptometryEntryKind) {
    const config = optometryEntryTypes.find(
      (entry) => entry.value === nextKind,
    );
    if (!config) return;
    setOptometryEntryKind(nextKind);
    setRecordType(config.recordType);
    if (!title.trim() || specialty !== 'optometry') setTitle(config.title);
    setSpecialty('optometry');
    setSubmitAttempted(false);
  }

  function updateSpecialty(nextSpecialty: ManualSpecialty) {
    setSpecialty(nextSpecialty);
    if (nextSpecialty === 'dental') {
      applyDentalEntryKind(dentalEntryKind);
    } else if (nextSpecialty === 'optometry') {
      applyOptometryEntryKind(optometryEntryKind);
    }
  }

  function toggleDentalSurface(surface: string) {
    setDentalSurfaces((surfaces) =>
      surfaces.includes(surface)
        ? surfaces.filter((item) => item !== surface)
        : [...surfaces, surface],
    );
  }

  const isOrthodonticDentalEntry =
    dentalEntryKind.startsWith('orthodontic') ||
    dentalEntryKind === 'alignerCase' ||
    dentalEntryKind === 'cephalometricAnalysis' ||
    dentalEntryKind === 'retention';

  function applyTemplate(template: ManualTemplate) {
    setRecordType(template.kind);
    setTitle(template.title);
    setUnit(template.unit);
    setSelectedTerminology(template.terminology);
    if (template.kind === 'lab') {
      setLabRows([
        {
          ...createLabRow(),
          title: template.title,
          unit: template.unit,
          terminology: template.terminology,
        },
      ]);
    }
    setSubmitAttempted(false);
  }

  function applyTerminology(entry: TerminologyEntry) {
    setSelectedTerminology(entry);
    setTitle(entry.display);
    if (entry.defaultUnit) setUnit(entry.defaultUnit);
  }

  function updateLabRow(
    rowId: string,
    patch: Partial<Omit<LabResultRow, 'id'>>,
  ) {
    setLabRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  }

  function applyLabTerminology(rowId: string, entry: TerminologyEntry) {
    updateLabRow(rowId, {
      title: entry.display,
      unit: entry.defaultUnit || '',
      terminology: entry,
    });
  }

  useEffect(() => {
    if (recordId) return;
    if (requestedSpecialty === 'dental') {
      const requestedDental = searchParams.get(
        'dental',
      ) as DentalEntryKind | null;
      applyDentalEntryKind(
        requestedDental &&
          dentalEntryTypes.some((entry) => entry.value === requestedDental)
          ? requestedDental
          : 'cleaning',
      );
    } else if (requestedSpecialty === 'optometry') {
      applyOptometryEntryKind('checkup');
    }
    // Apply URL presets once on initial add form load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const manualDetails = getManualSpecialtyDetails(doc);
        setSpecialty(manualDetails.specialty);
        if (manualDetails.dentalEntryKind) {
          setDentalEntryKind(manualDetails.dentalEntryKind);
        }
        if (manualDetails.optometryEntryKind) {
          setOptometryEntryKind(manualDetails.optometryEntryKind);
        }
        setToothNumber(manualDetails.toothNumber || '');
        setDentalSurfaces(manualDetails.dentalSurfaces || []);
        setDentalRecall(manualDetails.dentalRecall || '');
        setOrthoPhase(manualDetails.orthoPhase || '');
        setOrthoArch(manualDetails.orthoArch || '');
        setOrthoAppliance(manualDetails.orthoAppliance || '');
        setOrthoStatus(manualDetails.orthoStatus || '');
        setAlignerCurrent(manualDetails.alignerCurrent || '');
        setAlignerTotal(manualDetails.alignerTotal || '');
        setOverjet(manualDetails.overjet || '');
        setOverbite(manualDetails.overbite || '');
        setMolarClass(manualDetails.molarClass || '');
        setNextVisit(manualDetails.nextVisit || '');
        setEyeSide(manualDetails.eyeSide || 'OU');
        setOdSphere(manualDetails.odSphere || '');
        setOdCylinder(manualDetails.odCylinder || '');
        setOdAxis(manualDetails.odAxis || '');
        setOdAdd(manualDetails.odAdd || '');
        setOsSphere(manualDetails.osSphere || '');
        setOsCylinder(manualDetails.osCylinder || '');
        setOsAxis(manualDetails.osAxis || '');
        setOsAdd(manualDetails.osAdd || '');
        setPd(manualDetails.pd || '');
        setVisualAcuityOd(manualDetails.visualAcuityOd || '');
        setVisualAcuityOs(manualDetails.visualAcuityOs || '');
        setIopOd(manualDetails.iopOd || '');
        setIopOs(manualDetails.iopOs || '');
        setExamMethod(manualDetails.examMethod || '');
        setTitle(doc.metadata?.display_name || '');
        setDate((doc.metadata?.date || today).slice(0, 10));
        setNotes(getManualRecordNote(doc) || '');
        const observationValue = getManualObservationValue(doc);
        const rawObservation = doc.data_record.raw as {
          resource?: {
            valueQuantity?: { comparator?: string };
            valueString?: string;
            valueCodeableConcept?: { text?: string };
            dataAbsentReason?: {
              coding?: Array<{ code?: string }>;
              text?: string;
            };
            referenceRange?: Array<{ text?: string }>;
          };
        };
        if (rawObservation.resource?.dataAbsentReason) {
          setValueKind('absent');
          setAbsentReason(
            normalizeAbsentReason(
              rawObservation.resource.dataAbsentReason.coding?.[0]?.code ||
                rawObservation.resource.dataAbsentReason.text,
            ),
          );
        } else if (rawObservation.resource?.valueCodeableConcept) {
          setValueKind('coded');
        } else if (rawObservation.resource?.valueString) {
          setValueKind('string');
        } else {
          setValueKind('quantity');
        }
        setComparator(rawObservation.resource?.valueQuantity?.comparator || '');
        setRangeText(rawObservation.resource?.referenceRange?.[0]?.text || '');
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
        const medication = getManualMedicationParts(doc);
        setDose(medication.dose);
        setFrequency(medication.frequency);
        setRoute(medication.route);
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
    setSubmitAttempted(true);
    if (!db || isSaving) return;
    if (recordType === 'device') return;
    if (titleMissing || fileMissing) return;
    if (recordType === 'lab' && completedLabRows.length === 0) return;

    setIsSaving(true);
    try {
      const connection = await getManualConnection(db, user.id);
      const recordDate = new Date(`${date}T12:00:00.000Z`).toISOString();
      const specialtyDetails = buildSpecialtyDetails({
        specialty,
        dentalEntryKind,
        toothNumber,
        dentalSurfaces,
        dentalRecall,
        orthoPhase,
        orthoArch,
        orthoAppliance,
        orthoStatus,
        alignerCurrent,
        alignerTotal,
        overjet,
        overbite,
        molarClass,
        nextVisit,
        optometryEntryKind,
        eyeSide,
        odSphere,
        odCylinder,
        odAxis,
        odAdd,
        osSphere,
        osCylinder,
        osAxis,
        osAdd,
        pd,
        visualAcuityOd,
        visualAcuityOs,
        iopOd,
        iopOs,
        examMethod,
      });
      const enrichedNotes = appendSpecialtyNotes(notes, specialtyDetails);
      const docs =
        recordType === 'lab' && !loadedDocument
          ? completedLabRows.map((row) =>
              buildClinicalDocument({
                connectionId: connection.id,
                userId: user.id,
                recordType,
                recordDate,
                title: row.title,
                notes: enrichedNotes,
                fileData,
                fileName,
                fileContentType,
                specialtyDetails,
                observation: {
                  valueKind: row.valueKind,
                  comparator: row.comparator,
                  value: row.value,
                  unit: row.unit,
                  rangeLow: row.rangeLow,
                  rangeHigh: row.rangeHigh,
                  rangeText: row.rangeText,
                  interpretation: row.interpretation,
                  absentReason: row.absentReason,
                },
                terminology: row.terminology,
              }),
            )
          : [
              buildClinicalDocument({
                connectionId:
                  loadedDocument?.connection_record_id || connection.id,
                userId: user.id,
                recordType,
                recordDate,
                title,
                notes: enrichedNotes,
                fileData,
                fileName,
                fileContentType,
                specialtyDetails,
                observation: {
                  valueKind,
                  comparator,
                  value,
                  unit,
                  rangeLow,
                  rangeHigh,
                  rangeText,
                  interpretation,
                  absentReason,
                },
                medication: { dose, frequency, route },
                terminology: selectedTerminology,
                loadedDocument,
              }),
            ];

      const savedDocs = loadedDocument
        ? await upsertClinicalDocuments(db, docs)
        : await Promise.all(docs.map((doc) => insertClinicalDocument(db, doc)));

      if (linkedFile) {
        await Promise.all(
          savedDocs.map((doc) =>
            saveClinicalDocumentAttachment(doc, linkedFile),
          ),
        );
      }

      // Batch mode: stay on the form and clear the inputs so the next
      // record can be entered without navigating away.
      if (keepAdding && !loadedDocument) {
        setSavedCount((count) => count + docs.length);
        resetFields();
        notifyDispatch({
          type: 'set_notification',
          message: 'Record added — ready for the next one',
          variant: 'success',
        });
        return;
      }

      notifyDispatch({
        type: 'set_notification',
        message: loadedDocument
          ? 'Record updated'
          : `${docs.length} record${docs.length === 1 ? '' : 's'} added`,
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

  async function onLibreFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!db || !file || isImportingLibre) return;

    setIsImportingLibre(true);
    try {
      const parsed = parseLibreViewFile(await file.text(), file.name);
      const existingConnection = await findConnectionByUrl(
        db,
        user.id,
        LIBRE_CONNECTION_LOCATION,
      );
      const connection = buildLibreConnection({
        userId: user.id,
        existingId: existingConnection?.id,
        importMeta: parsed,
      });
      await upsertConnection(db, user.id, connection);

      const docs = parsed.readings.map((reading) =>
        buildLibreClinicalDocument({
          userId: user.id,
          connectionId: connection.id,
          reading,
          importMeta: parsed,
        }),
      );
      await upsertClinicalDocuments(db, docs);

      notifyDispatch({
        type: 'set_notification',
        message: `Imported ${docs.length} FreeStyle Libre readings`,
        variant: 'success',
      });
      navigate(AppRoutes.Labs);
    } catch (error) {
      console.error(error);
      notifyDispatch({
        type: 'set_notification',
        message: `Unable to import LibreView file: ${(error as Error).message}`,
        variant: 'error',
      });
    } finally {
      event.target.value = '';
      setIsImportingLibre(false);
    }
  }

  return (
    <AppPage
      banner={
        <GenericBanner text={t(isEditing ? 'Edit record' : 'Add record')} />
      }
    >
      <div className="h-full overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
          >
            {recordType === 'lab' && !isEditing ? null : (
              <div>
                <label
                  htmlFor="manual-record-type"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Type')}
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
                      {t(type.label)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isDeviceImportType && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="manual-record-specialty"
                      className="block text-sm font-semibold text-gray-900"
                    >
                      {t('Section')}
                    </label>
                    <select
                      id="manual-record-specialty"
                      value={specialty}
                      onChange={(event) =>
                        updateSpecialty(event.target.value as ManualSpecialty)
                      }
                      className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    >
                      {specialtyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.label)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {specialty === 'dental' && (
                    <div>
                      <label
                        htmlFor="manual-record-dental-kind"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Dental record')}
                      </label>
                      <select
                        id="manual-record-dental-kind"
                        value={dentalEntryKind}
                        onChange={(event) =>
                          applyDentalEntryKind(
                            event.target.value as DentalEntryKind,
                          )
                        }
                        disabled={isEditing}
                        className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                      >
                        {dentalEntryTypes.map((entry) => (
                          <option key={entry.value} value={entry.value}>
                            {t(entry.label)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {specialty === 'optometry' && (
                    <div>
                      <label
                        htmlFor="manual-record-optometry-kind"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Eye-care record')}
                      </label>
                      <select
                        id="manual-record-optometry-kind"
                        value={optometryEntryKind}
                        onChange={(event) =>
                          applyOptometryEntryKind(
                            event.target.value as OptometryEntryKind,
                          )
                        }
                        disabled={isEditing}
                        className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                      >
                        {optometryEntryTypes.map((entry) => (
                          <option key={entry.value} value={entry.value}>
                            {t(entry.label)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {specialty === 'dental' && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="manual-record-tooth"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Tooth')}
                      </label>
                      <input
                        id="manual-record-tooth"
                        type="number"
                        min="1"
                        max="32"
                        value={toothNumber}
                        placeholder={t('e.g. 14')}
                        onChange={(event) => setToothNumber(event.target.value)}
                        className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <p className="block text-sm font-semibold text-gray-900">
                        {t('Surfaces')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {toothSurfaces.map((surface) => (
                          <button
                            key={surface}
                            type="button"
                            onClick={() => toggleDentalSurface(surface)}
                            className={`h-9 min-w-9 rounded-md border px-3 text-sm font-semibold ${
                              dentalSurfaces.includes(surface)
                                ? 'border-primary-600 bg-primary-50 text-primary-800'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {surface}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="manual-record-dental-recall"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Recall or follow-up')}
                      </label>
                      <input
                        id="manual-record-dental-recall"
                        type="text"
                        value={dentalRecall}
                        placeholder={t('e.g. 6-month cleaning recall')}
                        onChange={(event) =>
                          setDentalRecall(event.target.value)
                        }
                        className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                      />
                    </div>
                    {isOrthodonticDentalEntry && (
                      <>
                        <SpecialtyTextInput
                          label={t('Phase')}
                          value={orthoPhase}
                          placeholder={t('Phase I, Phase II, retention')}
                          onChange={setOrthoPhase}
                        />
                        <SpecialtyTextInput
                          label={t('Arch')}
                          value={orthoArch}
                          placeholder={t('Upper, lower, both')}
                          onChange={setOrthoArch}
                        />
                        <SpecialtyTextInput
                          label={t('Appliance')}
                          value={orthoAppliance}
                          placeholder={t(
                            'Braces, aligners, expander, retainer',
                          )}
                          onChange={setOrthoAppliance}
                        />
                        <SpecialtyTextInput
                          label={t('Status')}
                          value={orthoStatus}
                          placeholder={t('Active, planned, complete')}
                          onChange={setOrthoStatus}
                        />
                        <SpecialtyTextInput
                          label={t('Aligner current')}
                          value={alignerCurrent}
                          placeholder={t('e.g. 8')}
                          onChange={setAlignerCurrent}
                        />
                        <SpecialtyTextInput
                          label={t('Aligner total')}
                          value={alignerTotal}
                          placeholder={t('e.g. 24')}
                          onChange={setAlignerTotal}
                        />
                        <SpecialtyTextInput
                          label={t('Overjet (mm)')}
                          value={overjet}
                          placeholder={t('e.g. 4')}
                          onChange={setOverjet}
                        />
                        <SpecialtyTextInput
                          label={t('Overbite (mm)')}
                          value={overbite}
                          placeholder={t('e.g. 3')}
                          onChange={setOverbite}
                        />
                        <SpecialtyTextInput
                          label={t('Molar / canine class')}
                          value={molarClass}
                          placeholder={t('Class II div 1, right Class I')}
                          onChange={setMolarClass}
                        />
                        <SpecialtyTextInput
                          label={t('Next visit')}
                          value={nextVisit}
                          placeholder={t('6 weeks, wire change, tray review')}
                          onChange={setNextVisit}
                        />
                      </>
                    )}
                  </div>
                )}

                {specialty === 'optometry' && (
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label
                          htmlFor="manual-record-eye-side"
                          className="block text-sm font-semibold text-gray-900"
                        >
                          {t('Eye')}
                        </label>
                        <select
                          id="manual-record-eye-side"
                          value={eyeSide}
                          onChange={(event) =>
                            setEyeSide(event.target.value as EyeSide)
                          }
                          className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                        >
                          <option value="OU">{t('OU / both')}</option>
                          <option value="OD">{t('OD / right')}</option>
                          <option value="OS">{t('OS / left')}</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="manual-record-exam-method"
                          className="block text-sm font-semibold text-gray-900"
                        >
                          {t('Method or device')}
                        </label>
                        <input
                          id="manual-record-exam-method"
                          type="text"
                          value={examMethod}
                          placeholder={t('e.g. Goldmann, OCT, Snellen')}
                          onChange={(event) =>
                            setExamMethod(event.target.value)
                          }
                          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                        />
                      </div>
                    </div>

                    {(optometryEntryKind === 'glassesPrescription' ||
                      optometryEntryKind === 'contactLensPrescription' ||
                      optometryEntryKind === 'refraction') && (
                      <div className="grid gap-3 rounded-md bg-white p-3 ring-1 ring-gray-200">
                        <p className="text-sm font-semibold text-gray-900">
                          {t('Refraction / Rx')}
                        </p>
                        <div className="grid gap-3 md:grid-cols-5">
                          <PrescriptionInput
                            label={t('OD sphere')}
                            value={odSphere}
                            onChange={setOdSphere}
                          />
                          <PrescriptionInput
                            label={t('OD cylinder')}
                            value={odCylinder}
                            onChange={setOdCylinder}
                          />
                          <PrescriptionInput
                            label={t('OD axis')}
                            value={odAxis}
                            onChange={setOdAxis}
                          />
                          <PrescriptionInput
                            label={t('OD add')}
                            value={odAdd}
                            onChange={setOdAdd}
                          />
                          <PrescriptionInput
                            label={t('PD')}
                            value={pd}
                            onChange={setPd}
                          />
                          <PrescriptionInput
                            label={t('OS sphere')}
                            value={osSphere}
                            onChange={setOsSphere}
                          />
                          <PrescriptionInput
                            label={t('OS cylinder')}
                            value={osCylinder}
                            onChange={setOsCylinder}
                          />
                          <PrescriptionInput
                            label={t('OS axis')}
                            value={osAxis}
                            onChange={setOsAxis}
                          />
                          <PrescriptionInput
                            label={t('OS add')}
                            value={osAdd}
                            onChange={setOsAdd}
                          />
                        </div>
                      </div>
                    )}

                    {(optometryEntryKind === 'visualAcuity' ||
                      optometryEntryKind === 'checkup') && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <PrescriptionInput
                          label={t('OD visual acuity')}
                          value={visualAcuityOd}
                          placeholder="20/20"
                          onChange={setVisualAcuityOd}
                        />
                        <PrescriptionInput
                          label={t('OS visual acuity')}
                          value={visualAcuityOs}
                          placeholder="20/25"
                          onChange={setVisualAcuityOs}
                        />
                      </div>
                    )}

                    {(optometryEntryKind === 'iop' ||
                      optometryEntryKind === 'checkup') && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <PrescriptionInput
                          label={t('OD IOP')}
                          value={iopOd}
                          placeholder="14"
                          onChange={setIopOd}
                        />
                        <PrescriptionInput
                          label={t('OS IOP')}
                          value={iopOs}
                          placeholder="15"
                          onChange={setIopOs}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isDeviceImportType && !isEditing && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <label
                  htmlFor="manual-device-type"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Device')}
                </label>
                <select
                  id="manual-device-type"
                  value={deviceImportType}
                  onChange={(event) =>
                    setDeviceImportType(event.target.value as DeviceImportKind)
                  }
                  className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                >
                  {deviceImportTypes.map((device) => (
                    <option key={device.value} value={device.value}>
                      {t(device.label)}
                    </option>
                  ))}
                </select>

                {isLibreImportType && (
                  <div className="mt-4">
                    <label
                      htmlFor="libre-import-file"
                      className="block text-sm font-semibold text-gray-900"
                    >
                      {t('LibreView file')}
                    </label>
                    <p className="mt-1 text-sm text-gray-600">
                      {t(
                        'Import a LibreView JSON or CSV export. Readings will appear as glucose observations in Labs.',
                      )}
                    </p>
                    <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-800">
                      {t(isImportingLibre ? 'Importing...' : 'Choose file')}
                      <input
                        id="libre-import-file"
                        type="file"
                        accept=".json,.csv,application/json,text/csv"
                        className="sr-only"
                        disabled={isImportingLibre}
                        onChange={onLibreFileSelected}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {!isEditing && !isDeviceImportType && (
              <div>
                <p className="block text-sm font-semibold text-gray-900">
                  {t('Quick templates')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickTemplates.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      {t(template.label)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isMedicationType && !isDeviceImportType && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="manual-record-dose"
                    className="block text-sm font-semibold text-gray-900"
                  >
                    {t('Dose')}
                  </label>
                  <input
                    id="manual-record-dose"
                    type="text"
                    value={dose}
                    placeholder={t('e.g. 10 mg')}
                    onChange={(event) => setDose(event.target.value)}
                    className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-record-frequency"
                    className="block text-sm font-semibold text-gray-900"
                  >
                    {t('Frequency')}
                  </label>
                  <input
                    id="manual-record-frequency"
                    type="text"
                    value={frequency}
                    placeholder={t('e.g. twice daily')}
                    onChange={(event) => setFrequency(event.target.value)}
                    className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-record-route"
                    className="block text-sm font-semibold text-gray-900"
                  >
                    {t('Route')}
                  </label>
                  <input
                    id="manual-record-route"
                    type="text"
                    value={route}
                    placeholder={t('e.g. oral')}
                    onChange={(event) => setRoute(event.target.value)}
                    className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </div>
              </div>
            )}

            {isObservationType && !isDeviceImportType && (
              <div className="grid gap-4 sm:grid-cols-2">
                {recordType === 'lab' && !isEditing && (
                  <LabResultsTable
                    rows={labRows}
                    submitAttempted={submitAttempted}
                    completedRowCount={completedLabRows.length}
                    onAddRow={() =>
                      setLabRows((rows) => [...rows, createLabRow()])
                    }
                    onRemoveRow={(rowId) =>
                      setLabRows((rows) =>
                        rows.filter((item) => item.id !== rowId),
                      )
                    }
                    onUpdateRow={updateLabRow}
                    onSelectTerminology={applyLabTerminology}
                    profile={terminologyProfile}
                    language={terminologyLanguage}
                    lookupMode={terminologyLookupMode}
                    remoteEnabled={terminologyRemoteEnabled}
                  />
                )}

                {recordType === 'lab' && !isEditing ? null : (
                  <>
                    <div>
                      <label
                        htmlFor="manual-record-value-kind"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Value type')}
                      </label>
                      <select
                        id="manual-record-value-kind"
                        value={valueKind}
                        onChange={(event) =>
                          setValueKind(
                            event.target.value as ManualObservationValueKind,
                          )
                        }
                        className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                      >
                        <option value="quantity">{t('Quantity')}</option>
                        <option value="string">{t('Text')}</option>
                        <option value="coded">{t('Coded')}</option>
                        <option value="absent">{t('Absent')}</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="manual-record-comparator"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Comparator')}
                      </label>
                      <select
                        id="manual-record-comparator"
                        value={comparator}
                        disabled={valueKind !== 'quantity'}
                        onChange={(event) => setComparator(event.target.value)}
                        className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">=</option>
                        <option value="<">&lt;</option>
                        <option value="<=">&lt;=</option>
                        <option value=">">&gt;</option>
                        <option value=">=">&gt;=</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="manual-record-value"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Value')}
                      </label>
                      {valueKind === 'absent' ? (
                        <select
                          id="manual-record-value"
                          value={absentReason}
                          onChange={(event) =>
                            setAbsentReason(
                              event.target
                                .value as ManualObservationAbsentReason,
                            )
                          }
                          className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                        >
                          <option value="pending">{t('Pending')}</option>
                          <option value="not-performed">
                            {t('Not performed')}
                          </option>
                          <option value="unknown">{t('Unknown')}</option>
                          <option value="not-applicable">{t('N/A')}</option>
                        </select>
                      ) : (
                        <input
                          id="manual-record-value"
                          type="text"
                          value={value}
                          onChange={(event) => setValue(event.target.value)}
                          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                        />
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="manual-record-unit"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Unit')}
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
                        {t('Range low')}
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
                        {t('Range high')}
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
                        htmlFor="manual-record-range-text"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Range text')}
                      </label>
                      <input
                        id="manual-record-range-text"
                        type="text"
                        value={rangeText}
                        placeholder={t('e.g. Negative')}
                        onChange={(event) => setRangeText(event.target.value)}
                        className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="manual-record-interpretation"
                        className="block text-sm font-semibold text-gray-900"
                      >
                        {t('Interpretation')}
                      </label>
                      <input
                        id="manual-record-interpretation"
                        type="text"
                        value={interpretation}
                        onChange={(event) =>
                          setInterpretation(event.target.value)
                        }
                        className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {!isDeviceImportType && (
              <div>
                <label
                  htmlFor="manual-record-title"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Name')} <span className="text-red-600">*</span>
                </label>
                <input
                  id="manual-record-title"
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setSelectedTerminology(undefined);
                  }}
                  aria-invalid={submitAttempted && titleMissing}
                  className={`mt-2 block w-full rounded-md border px-3 py-2 text-base text-gray-900 shadow-sm focus:outline-none focus:ring-1 ${
                    submitAttempted && titleMissing
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-600 focus:ring-primary-600'
                  }`}
                />
                {!isDocumentType &&
                  recordType !== 'lab' &&
                  recordType !== 'careplan' &&
                  recordType !== 'visionprescription' && (
                    <TerminologySuggestions
                      kind={recordType}
                      query={title}
                      selected={selectedTerminology}
                      onSelect={applyTerminology}
                      profile={terminologyProfile}
                      language={terminologyLanguage}
                      lookupMode={terminologyLookupMode}
                      remoteEnabled={terminologyRemoteEnabled}
                    />
                  )}
                {submitAttempted && titleMissing && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {t('A name is required.')}
                  </p>
                )}
              </div>
            )}

            {isDocumentType && (
              <div>
                <label
                  htmlFor="manual-record-file"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('File')}
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
                {submitAttempted && fileMissing && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {t('Select a file before saving this document.')}
                  </p>
                )}
              </div>
            )}

            {!isDeviceImportType && (
              <div>
                <label
                  htmlFor="manual-record-source-file"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Link original document')}
                </label>
                <p className="mt-1 text-sm text-gray-600">
                  {t(
                    'Attach a scan, photo, PDF, or lab report to this record in the local database.',
                  )}
                </p>
                <input
                  id="manual-record-source-file"
                  type="file"
                  disabled={!canLinkSourceFile}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setLinkedFile(null);
                      return;
                    }
                    prepareLinkedAttachmentFile(file)
                      .then(setLinkedFile)
                      .catch((error) => {
                        console.error(error);
                        notifyDispatch({
                          type: 'set_notification',
                          message: `Unable to read linked file: ${(error as Error).message}`,
                          variant: 'error',
                        });
                      });
                  }}
                  className="mt-2 block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 file:ring-1 file:ring-inset file:ring-primary-200 hover:file:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {linkedFile && (
                  <p className="mt-2 text-xs font-medium text-gray-600">
                    {t('Linked')}: {linkedFile.filename}
                  </p>
                )}
                {!canLinkSourceFile && (
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    {t(
                      'File linking is available when the local Dexie database is enabled.',
                    )}
                  </p>
                )}
              </div>
            )}

            {!isDeviceImportType && (
              <div>
                <label
                  htmlFor="manual-record-date"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Date')}
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
            )}

            {!isDeviceImportType && (
              <div>
                <label
                  htmlFor="manual-record-notes"
                  className="block text-sm font-semibold text-gray-900"
                >
                  {t('Notes')}
                </label>
                <textarea
                  id="manual-record-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  className="mt-2 block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
            )}

            {!isEditing && !isDeviceImportType && (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={keepAdding}
                  onChange={(event) => setKeepAdding(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                />
                {t('Keep adding more records after saving')}
              </label>
            )}

            {!isDeviceImportType && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-gray-500">
                  {savedCount > 0 &&
                    t(
                      `${savedCount} record${savedCount === 1 ? '' : 's'} added this session`,
                    )}
                </span>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(AppRoutes.Timeline)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                  >
                    {t(savedCount > 0 && !isEditing ? 'Done' : 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {t(
                      isSaving
                        ? 'Saving'
                        : isEditing
                          ? 'Update record'
                          : keepAdding
                            ? 'Save & add another'
                            : 'Save record',
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </AppPage>
  );
}

function PrescriptionInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const id = `manual-record-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
      />
    </div>
  );
}

const SpecialtyTextInput = PrescriptionInput;

type ManualSpecialtyDetails = {
  specialty: ManualSpecialty;
  subtype?: DentalEntryKind | OptometryEntryKind;
  toothNumber?: string;
  dentalSurfaces?: string[];
  dentalRecall?: string;
  orthoPhase?: string;
  orthoArch?: string;
  orthoAppliance?: string;
  orthoStatus?: string;
  alignerCurrent?: string;
  alignerTotal?: string;
  overjet?: string;
  overbite?: string;
  molarClass?: string;
  nextVisit?: string;
  eyeSide?: EyeSide;
  odSphere?: string;
  odCylinder?: string;
  odAxis?: string;
  odAdd?: string;
  osSphere?: string;
  osCylinder?: string;
  osAxis?: string;
  osAdd?: string;
  pd?: string;
  visualAcuityOd?: string;
  visualAcuityOs?: string;
  iopOd?: string;
  iopOs?: string;
  examMethod?: string;
};

type ManualSpecialtyFormValues = Required<
  Omit<ManualSpecialtyDetails, 'subtype' | 'dentalSurfaces'>
> & {
  dentalSurfaces: string[];
  dentalEntryKind: DentalEntryKind;
  optometryEntryKind: OptometryEntryKind;
};

function buildSpecialtyDetails(
  params: ManualSpecialtyFormValues,
): ManualSpecialtyDetails | undefined {
  if (params.specialty === 'general') return undefined;
  if (params.specialty === 'dental') {
    return {
      specialty: 'dental',
      subtype: params.dentalEntryKind,
      toothNumber: params.toothNumber.trim(),
      dentalSurfaces: params.dentalSurfaces,
      dentalRecall: params.dentalRecall.trim(),
      orthoPhase: params.orthoPhase.trim(),
      orthoArch: params.orthoArch.trim(),
      orthoAppliance: params.orthoAppliance.trim(),
      orthoStatus: params.orthoStatus.trim(),
      alignerCurrent: params.alignerCurrent.trim(),
      alignerTotal: params.alignerTotal.trim(),
      overjet: params.overjet.trim(),
      overbite: params.overbite.trim(),
      molarClass: params.molarClass.trim(),
      nextVisit: params.nextVisit.trim(),
    };
  }
  return {
    specialty: 'optometry',
    subtype: params.optometryEntryKind,
    eyeSide: params.eyeSide,
    odSphere: params.odSphere.trim(),
    odCylinder: params.odCylinder.trim(),
    odAxis: params.odAxis.trim(),
    odAdd: params.odAdd.trim(),
    osSphere: params.osSphere.trim(),
    osCylinder: params.osCylinder.trim(),
    osAxis: params.osAxis.trim(),
    osAdd: params.osAdd.trim(),
    pd: params.pd.trim(),
    visualAcuityOd: params.visualAcuityOd.trim(),
    visualAcuityOs: params.visualAcuityOs.trim(),
    iopOd: params.iopOd.trim(),
    iopOs: params.iopOs.trim(),
    examMethod: params.examMethod.trim(),
  };
}

function appendSpecialtyNotes(
  notes: string,
  details?: ManualSpecialtyDetails,
): string {
  if (!details) return notes;
  const lines = [''];
  if (details.specialty === 'dental') {
    if (details.toothNumber) lines.push(`Tooth: ${details.toothNumber}`);
    if (details.dentalSurfaces?.length) {
      lines.push(`Surfaces: ${details.dentalSurfaces.join('/')}`);
    }
    if (details.dentalRecall) lines.push(`Recall: ${details.dentalRecall}`);
    if (details.orthoPhase) lines.push(`Ortho phase: ${details.orthoPhase}`);
    if (details.orthoArch) lines.push(`Arch: ${details.orthoArch}`);
    if (details.orthoAppliance) {
      lines.push(`Appliance: ${details.orthoAppliance}`);
    }
    if (details.orthoStatus) lines.push(`Ortho status: ${details.orthoStatus}`);
    if (details.alignerCurrent || details.alignerTotal) {
      lines.push(
        `Aligner: ${details.alignerCurrent || '-'} of ${details.alignerTotal || '-'}`,
      );
    }
    if (details.overjet) lines.push(`Overjet: ${details.overjet} mm`);
    if (details.overbite) lines.push(`Overbite: ${details.overbite} mm`);
    if (details.molarClass)
      lines.push(`Molar/canine class: ${details.molarClass}`);
    if (details.nextVisit) lines.push(`Next visit: ${details.nextVisit}`);
  } else {
    if (details.eyeSide) lines.push(`Eye: ${details.eyeSide}`);
    if (details.examMethod) lines.push(`Method: ${details.examMethod}`);
    if (
      details.odSphere ||
      details.odCylinder ||
      details.odAxis ||
      details.odAdd
    ) {
      lines.push(
        `OD Rx: ${formatRxLine(details.odSphere, details.odCylinder, details.odAxis, details.odAdd)}`,
      );
    }
    if (
      details.osSphere ||
      details.osCylinder ||
      details.osAxis ||
      details.osAdd
    ) {
      lines.push(
        `OS Rx: ${formatRxLine(details.osSphere, details.osCylinder, details.osAxis, details.osAdd)}`,
      );
    }
    if (details.pd) lines.push(`PD: ${details.pd}`);
    if (details.visualAcuityOd)
      lines.push(`OD visual acuity: ${details.visualAcuityOd}`);
    if (details.visualAcuityOs)
      lines.push(`OS visual acuity: ${details.visualAcuityOs}`);
    if (details.iopOd) lines.push(`OD IOP: ${details.iopOd} mmHg`);
    if (details.iopOs) lines.push(`OS IOP: ${details.iopOs} mmHg`);
  }
  const structured = lines.filter(Boolean).join('\n');
  return [notes.trim(), structured].filter(Boolean).join('\n');
}

function formatRxLine(
  sphere?: string,
  cylinder?: string,
  axis?: string,
  add?: string,
) {
  return [
    sphere && `sphere ${sphere}`,
    cylinder && `cylinder ${cylinder}`,
    axis && `axis ${axis}`,
    add && `add ${add}`,
  ]
    .filter(Boolean)
    .join(', ');
}

function getManualSpecialtyDetails(
  doc: ClinicalDocument,
): ManualSpecialtyDetails & {
  dentalEntryKind?: DentalEntryKind;
  optometryEntryKind?: OptometryEntryKind;
} {
  const raw = doc.data_record.raw as {
    manual_specialty?: ManualSpecialty;
    manual_subtype?: DentalEntryKind | OptometryEntryKind;
    manual_specialty_details?: ManualSpecialtyDetails;
  };
  const details: ManualSpecialtyDetails = raw.manual_specialty_details || {
    specialty: 'general',
  };
  const specialty = raw.manual_specialty || details.specialty || 'general';
  return {
    ...details,
    specialty,
    dentalEntryKind:
      specialty === 'dental'
        ? ((raw.manual_subtype || details.subtype) as DentalEntryKind)
        : undefined,
    optometryEntryKind:
      specialty === 'optometry'
        ? ((raw.manual_subtype || details.subtype) as OptometryEntryKind)
        : undefined,
  };
}

function buildVisionLensSpecification(details?: ManualSpecialtyDetails) {
  if (!details) return undefined;
  const lenses = [
    {
      eye: 'right',
      sphere: details.odSphere,
      cylinder: details.odCylinder,
      axis: details.odAxis,
      add: details.odAdd,
    },
    {
      eye: 'left',
      sphere: details.osSphere,
      cylinder: details.osCylinder,
      axis: details.osAxis,
      add: details.osAdd,
    },
  ]
    .map((lens) => ({
      eye: lens.eye,
      sphere: parseNumber(lens.sphere),
      cylinder: parseNumber(lens.cylinder),
      axis: parseNumber(lens.axis),
      add: parseNumber(lens.add),
    }))
    .filter(
      (lens) =>
        lens.sphere !== undefined ||
        lens.cylinder !== undefined ||
        lens.axis !== undefined ||
        lens.add !== undefined,
    );
  return lenses.length ? lenses : undefined;
}

function parseNumber(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function buildClinicalDocument({
  connectionId,
  userId,
  recordType,
  recordDate,
  title,
  notes,
  fileData,
  fileName,
  fileContentType,
  specialtyDetails,
  observation,
  medication,
  terminology,
  loadedDocument,
}: {
  connectionId: string;
  userId: string;
  recordType: ClinicalManualRecordKind;
  recordDate: string;
  title: string;
  notes: string;
  fileData?: string;
  fileName: string;
  fileContentType: string;
  specialtyDetails?: ManualSpecialtyDetails;
  observation?: {
    valueKind: ManualObservationValueKind;
    comparator: string;
    value: string;
    unit: string;
    rangeLow: string;
    rangeHigh: string;
    rangeText: string;
    interpretation: string;
    absentReason: ManualObservationAbsentReason;
  };
  medication?: {
    dose: string;
    frequency: string;
    route: string;
  };
  terminology?: TerminologyEntry;
  loadedDocument?: ClinicalDocument | null;
}): ClinicalDocument {
  const nextRecordId =
    loadedDocument?.metadata?.id?.replace(/^manual:/, '') || uuid4();
  const resourceType = getClinicalResourceType(recordType);
  const raw =
    recordType === 'document'
      ? fileData || ''
      : buildManualFhirEntry(
          nextRecordId,
          recordType,
          title,
          notes,
          recordDate,
          observation,
          medication,
          terminology,
          specialtyDetails,
        );

  return {
    id: loadedDocument?.id || '',
    connection_record_id: connectionId,
    user_id: userId,
    data_record: {
      raw,
      format: recordType === 'careplan' ? 'FHIR.R4' : 'FHIR.DSTU2',
      content_type:
        recordType === 'document'
          ? fileContentType || 'application/octet-stream'
          : 'application/json',
      resource_type: resourceType,
      version_history: loadedDocument ? [loadedDocument.data_record.raw] : [],
    },
    metadata: {
      id: `manual:${nextRecordId}`,
      date: recordDate,
      display_name: title.trim() || fileName,
      loinc_coding:
        terminology?.system === 'http://loinc.org' ? [terminology.code] : [],
      terminology_profile: terminology?.profile,
      terminology_source: terminology?.source,
      terminology_source_version: terminology?.sourceVersion,
      manual_uncoded: recordType !== 'document' && !terminology,
      manual_specialty: specialtyDetails?.specialty,
      manual_subtype: specialtyDetails?.subtype,
      manual_specialty_details: specialtyDetails,
    },
  };
}

function buildManualFhirEntry(
  id: string,
  recordType: ClinicalManualRecordKind,
  title: string,
  notes: string,
  date: string,
  observation?: {
    valueKind: ManualObservationValueKind;
    comparator: string;
    value: string;
    unit: string;
    rangeLow: string;
    rangeHigh: string;
    rangeText: string;
    interpretation: string;
    absentReason: ManualObservationAbsentReason;
  },
  medication?: {
    dose: string;
    frequency: string;
    route: string;
  },
  terminology?: TerminologyEntry,
  specialtyDetails?: ManualSpecialtyDetails,
) {
  const resourceType = toFhirResourceType(recordType);
  const observationData = observation ?? {
    valueKind: 'quantity' as ManualObservationValueKind,
    comparator: '',
    value: '',
    unit: '',
    rangeLow: '',
    rangeHigh: '',
    rangeText: '',
    interpretation: '',
    absentReason: 'pending' as ManualObservationAbsentReason,
  };
  const medicationData = medication ?? { dose: '', frequency: '', route: '' };
  const hasMedicationDetail =
    recordType === 'medicationstatement' &&
    (medicationData.dose.trim() ||
      medicationData.frequency.trim() ||
      medicationData.route.trim());
  const observationValue = buildObservationValue(observationData);
  return {
    fullUrl: `manual:${id}`,
    manual_kind: recordType,
    manual_uncoded: !terminology,
    terminology_profile: terminology?.profile,
    terminology_source: terminology?.source,
    terminology_source_version: terminology?.sourceVersion,
    resource: {
      resourceType,
      id,
      category: specialtyDetails?.specialty
        ? [{ text: specialtyDetails.specialty }]
        : undefined,
      code: {
        text: title.trim(),
        coding: terminology
          ? [
              {
                system: terminology.system,
                code: terminology.code,
                display: terminology.display,
              },
            ]
          : undefined,
      },
      text: notes.trim()
        ? {
            status: 'generated',
            div: notes.trim(),
          }
        : undefined,
      note: notes.trim() ? [{ text: notes.trim() }] : undefined,
      bodySite:
        specialtyDetails?.specialty === 'dental' && specialtyDetails.toothNumber
          ? [
              {
                text: `Tooth ${specialtyDetails.toothNumber}${
                  specialtyDetails.dentalSurfaces?.length
                    ? ` surfaces ${specialtyDetails.dentalSurfaces.join('/')}`
                    : ''
                }`,
              },
            ]
          : undefined,
      method: specialtyDetails?.examMethod
        ? { text: specialtyDetails.examMethod }
        : undefined,
      lensSpecification:
        recordType === 'visionprescription'
          ? buildVisionLensSpecification(specialtyDetails)
          : undefined,
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
      valueQuantity: observationValue.valueQuantity,
      valueString: observationValue.valueString,
      valueCodeableConcept: observationValue.valueCodeableConcept,
      dataAbsentReason: observationValue.dataAbsentReason,
      referenceRange:
        observationData.rangeLow.trim() ||
        observationData.rangeHigh.trim() ||
        observationData.rangeText.trim()
          ? [
              {
                text: observationData.rangeText.trim() || undefined,
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
      dosage: hasMedicationDetail
        ? [
            {
              text: medicationData.dose.trim() || undefined,
              route: medicationData.route.trim()
                ? { text: medicationData.route.trim() }
                : undefined,
              timing: medicationData.frequency.trim()
                ? { code: { text: medicationData.frequency.trim() } }
                : undefined,
            },
          ]
        : undefined,
    },
  };
}

function buildObservationValue(observationData: {
  valueKind: ManualObservationValueKind;
  comparator: string;
  value: string;
  unit: string;
  absentReason: ManualObservationAbsentReason;
}) {
  const value = observationData.value.trim();
  const unit = observationData.unit.trim();
  const parsedQuantity = parseQuantityInput(value);
  const comparator =
    normalizeComparator(observationData.comparator) ||
    parsedQuantity.comparator;

  if (observationData.valueKind === 'absent') {
    return {
      dataAbsentReason: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason',
            code: observationData.absentReason,
            display: formatAbsentReason(observationData.absentReason),
          },
        ],
        text: formatAbsentReason(observationData.absentReason),
      },
    };
  }

  if (!value) return {};

  if (observationData.valueKind === 'quantity') {
    const numericValue = Number(parsedQuantity.value);
    if (Number.isFinite(numericValue)) {
      return {
        valueQuantity: {
          value: numericValue,
          comparator,
          unit: unit || undefined,
          system: unit ? 'http://unitsofmeasure.org' : undefined,
          code: unit || undefined,
        },
      };
    }

    return {
      valueString: `${comparator || ''}${value}${unit ? ` ${unit}` : ''}`,
    };
  }

  if (observationData.valueKind === 'coded') {
    return {
      valueCodeableConcept: {
        text: value,
        coding: [{ display: value }],
      },
    };
  }

  return {
    valueString: unit ? `${value} ${unit}` : value,
  };
}

function parseQuantityInput(value: string): {
  comparator?: ManualObservationComparator;
  value: string;
} {
  const match = value.trim().match(/^(<=|>=|<|>)\s*(.+)$/);
  if (!match) return { value };
  return {
    comparator: normalizeComparator(match[1]),
    value: match[2].trim(),
  };
}

function normalizeComparator(
  comparator: string,
): ManualObservationComparator | undefined {
  return comparator === '<' ||
    comparator === '<=' ||
    comparator === '>' ||
    comparator === '>='
    ? comparator
    : undefined;
}

function formatAbsentReason(reason: ManualObservationAbsentReason) {
  switch (reason) {
    case 'not-performed':
      return 'Not performed';
    case 'not-applicable':
      return 'Not applicable';
    case 'unknown':
      return 'Unknown';
    case 'pending':
    default:
      return 'Pending';
  }
}

function normalizeAbsentReason(reason?: string): ManualObservationAbsentReason {
  switch (reason?.toLowerCase()) {
    case 'not-performed':
    case 'not performed':
      return 'not-performed';
    case 'not-applicable':
    case 'not applicable':
    case 'n/a':
      return 'not-applicable';
    case 'unknown':
      return 'unknown';
    case 'pending':
    default:
      return 'pending';
  }
}

function getClinicalResourceType(
  recordType: ClinicalManualRecordKind,
): ClinicalDocumentResourceType {
  if (recordType === 'lab' || recordType === 'vital') return 'observation';
  if (recordType === 'document') return 'documentreference_attachment';
  if (recordType === 'visionprescription') return 'visionprescription';
  return recordType;
}

function getManualRecordKind(doc: ClinicalDocument): ManualRecordKind {
  const raw = doc.data_record.raw as { manual_kind?: ManualRecordKind };
  if (raw.manual_kind) return raw.manual_kind;
  if (doc.data_record.resource_type === 'observation') return 'lab';
  if (doc.data_record.resource_type === 'documentreference_attachment') {
    return 'document';
  }
  if (doc.data_record.resource_type === 'visionprescription') {
    return 'visionprescription';
  }
  return doc.data_record.resource_type as ManualRecordKind;
}

function toFhirResourceType(recordType: ClinicalManualRecordKind) {
  switch (recordType) {
    case 'medicationstatement':
      return 'MedicationStatement';
    case 'allergyintolerance':
      return 'AllergyIntolerance';
    case 'careplan':
      return 'CarePlan';
    case 'visionprescription':
      return 'VisionPrescription';
    case 'lab':
    case 'vital':
      return 'Observation';
    default:
      return recordType.charAt(0).toUpperCase() + recordType.slice(1);
  }
}
