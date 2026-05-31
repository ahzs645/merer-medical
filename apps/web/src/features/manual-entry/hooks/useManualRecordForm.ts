import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useLocalConfig } from '../../../app/providers/LocalConfigProvider';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { Routes as AppRoutes } from '../../../Routes';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  findConnectionByUrl,
  upsertConnection,
} from '../../../repositories/ConnectionRepository';
import {
  getClinicalDocumentById,
  insertClinicalDocument,
  upsertClinicalDocuments,
} from '../../../repositories/ClinicalDocumentRepository';
import {
  LinkedAttachmentFile,
  saveClinicalDocumentAttachment,
  supportsClinicalDocumentAttachments,
} from '../../../repositories/AttachmentRepository';
import {
  getManualMedicationParts,
  getManualObservationInterpretation,
  getManualObservationRange,
  getManualObservationValue,
  getManualRecordNote,
  isManualRecord,
} from '../../../shared/utils/manualRecordUtils';
import {
  LabResultRow,
  ManualObservationAbsentReason,
  ManualObservationValueKind,
  TerminologyEntry,
} from '../clinicalTerminology';
import {
  createLabRow,
  dentalEntryTypes,
  optometryEntryTypes,
  recordTypes,
  type DentalEntryKind,
  type DeviceImportKind,
  type EyeSide,
  type ManualRecordKind,
  type ManualSpecialty,
  type ManualTemplate,
  type OptometryEntryKind,
} from '../manualRecordTypes';
import {
  appendSpecialtyNotes,
  buildClinicalDocument,
  buildSpecialtyDetails,
  getManualConnection,
  getManualRecordKind,
  getManualSpecialtyDetails,
  normalizeAbsentReason,
  normalizeImagingDetails,
} from '../manualRecordBuilders';
import {
  buildLibreClinicalDocument,
  buildLibreConnection,
  LIBRE_CONNECTION_LOCATION,
  parseLibreViewFile,
} from '../../diabetes/libreView';
import { appendAuditLog } from '../../audit/auditLog';

function patchReducer<T>(state: T, patch: Partial<T>): T {
  return { ...state, ...patch };
}

type DentalFields = {
  toothNumber: string;
  dentalTeeth: string;
  toothRange: string;
  dentalQuadrant: string;
  dentalArch: string;
  dentition: string;
  dentalStatus: string;
  dentalSeverity: string;
  procedureCode: string;
  dentalProvider: string;
  dentalLocation: string;
  dentalFollowUp: string;
  dentalSurfaces: string[];
  dentalRecall: string;
  orthoPhase: string;
  orthoArch: string;
  orthoAppliance: string;
  orthoStatus: string;
  alignerCurrent: string;
  alignerTotal: string;
  overjet: string;
  overbite: string;
  molarClass: string;
  nextVisit: string;
};

type OptometryFields = {
  eyeSide: EyeSide;
  odSphere: string;
  odCylinder: string;
  odAxis: string;
  odAdd: string;
  osSphere: string;
  osCylinder: string;
  osAxis: string;
  osAdd: string;
  pd: string;
  visualAcuityOd: string;
  visualAcuityOs: string;
  iopOd: string;
  iopOs: string;
  examMethod: string;
};

type ImagingFields = {
  imagingModality: string;
  imagingBodySite: string;
  imagingLaterality: string;
  imagingStudyType: string;
  imagingAccessionId: string;
  imagingStudyId: string;
};

type ObservationFields = {
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

type DocumentFileFields = {
  fileName: string;
  fileContentType: string;
  fileData?: string;
  linkedFile: LinkedAttachmentFile | null;
};

const initialDentalFields: DentalFields = {
  toothNumber: '',
  dentalTeeth: '',
  toothRange: '',
  dentalQuadrant: '',
  dentalArch: '',
  dentition: '',
  dentalStatus: '',
  dentalSeverity: '',
  procedureCode: '',
  dentalProvider: '',
  dentalLocation: '',
  dentalFollowUp: '',
  dentalSurfaces: [],
  dentalRecall: '',
  orthoPhase: '',
  orthoArch: '',
  orthoAppliance: '',
  orthoStatus: '',
  alignerCurrent: '',
  alignerTotal: '',
  overjet: '',
  overbite: '',
  molarClass: '',
  nextVisit: '',
};

const initialOptometryFields: OptometryFields = {
  eyeSide: 'OU',
  odSphere: '',
  odCylinder: '',
  odAxis: '',
  odAdd: '',
  osSphere: '',
  osCylinder: '',
  osAxis: '',
  osAdd: '',
  pd: '',
  visualAcuityOd: '',
  visualAcuityOs: '',
  iopOd: '',
  iopOs: '',
  examMethod: '',
};

const initialImagingFields: ImagingFields = {
  imagingModality: '',
  imagingBodySite: '',
  imagingLaterality: '',
  imagingStudyType: '',
  imagingAccessionId: '',
  imagingStudyId: '',
};

const initialObservationFields: ObservationFields = {
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

const initialDocumentFileFields: DocumentFileFields = {
  fileName: '',
  fileContentType: '',
  fileData: undefined,
  linkedFile: null,
};

export function useManualRecordForm() {
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
  const requestedRecordType = recordTypes.some(
    (entry) => entry.value === searchParams.get('type'),
  )
    ? (searchParams.get('type') as ManualRecordKind)
    : undefined;
  const [specialty, setSpecialty] =
    useState<ManualSpecialty>(requestedSpecialty);
  const [recordType, setRecordType] = useState<ManualRecordKind>('condition');
  const [dentalEntryKind, setDentalEntryKind] =
    useState<DentalEntryKind>('cleaning');
  const [optometryEntryKind, setOptometryEntryKind] =
    useState<OptometryEntryKind>('checkup');
  const [dentalFields, setDentalFields] = useReducer(
    patchReducer<DentalFields>,
    initialDentalFields,
  );
  const [optometryFields, setOptometryFields] = useReducer(
    patchReducer<OptometryFields>,
    initialOptometryFields,
  );
  const [imagingFields, setImagingFields] = useReducer(
    patchReducer<ImagingFields>,
    initialImagingFields,
  );
  const {
    toothNumber,
    dentalTeeth,
    toothRange,
    dentalQuadrant,
    dentalArch,
    dentition,
    dentalStatus,
    dentalSeverity,
    procedureCode,
    dentalProvider,
    dentalLocation,
    dentalFollowUp,
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
  } = dentalFields;
  const {
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
  } = optometryFields;
  const {
    imagingModality,
    imagingBodySite,
    imagingLaterality,
    imagingStudyType,
    imagingAccessionId,
    imagingStudyId,
  } = imagingFields;
  const setToothNumber = (toothNumber: string) =>
    setDentalFields({ toothNumber });
  const setDentalTeeth = (dentalTeeth: string) =>
    setDentalFields({ dentalTeeth });
  const setToothRange = (toothRange: string) => setDentalFields({ toothRange });
  const setDentalQuadrant = (dentalQuadrant: string) =>
    setDentalFields({ dentalQuadrant });
  const setDentalArch = (dentalArch: string) => setDentalFields({ dentalArch });
  const setDentition = (dentition: string) => setDentalFields({ dentition });
  const setDentalStatus = (dentalStatus: string) =>
    setDentalFields({ dentalStatus });
  const setDentalSeverity = (dentalSeverity: string) =>
    setDentalFields({ dentalSeverity });
  const setProcedureCode = (procedureCode: string) =>
    setDentalFields({ procedureCode });
  const setDentalProvider = (dentalProvider: string) =>
    setDentalFields({ dentalProvider });
  const setDentalLocation = (dentalLocation: string) =>
    setDentalFields({ dentalLocation });
  const setDentalFollowUp = (dentalFollowUp: string) =>
    setDentalFields({ dentalFollowUp });
  const setDentalSurfaces = (
    next:
      | string[]
      | ((
          current: DentalFields['dentalSurfaces'],
        ) => DentalFields['dentalSurfaces']),
  ) =>
    setDentalFields({
      dentalSurfaces:
        typeof next === 'function' ? next(dentalFields.dentalSurfaces) : next,
    });
  const setDentalRecall = (dentalRecall: string) =>
    setDentalFields({ dentalRecall });
  const setOrthoPhase = (orthoPhase: string) => setDentalFields({ orthoPhase });
  const setOrthoArch = (orthoArch: string) => setDentalFields({ orthoArch });
  const setOrthoAppliance = (orthoAppliance: string) =>
    setDentalFields({ orthoAppliance });
  const setOrthoStatus = (orthoStatus: string) =>
    setDentalFields({ orthoStatus });
  const setAlignerCurrent = (alignerCurrent: string) =>
    setDentalFields({ alignerCurrent });
  const setAlignerTotal = (alignerTotal: string) =>
    setDentalFields({ alignerTotal });
  const setOverjet = (overjet: string) => setDentalFields({ overjet });
  const setOverbite = (overbite: string) => setDentalFields({ overbite });
  const setMolarClass = (molarClass: string) => setDentalFields({ molarClass });
  const setNextVisit = (nextVisit: string) => setDentalFields({ nextVisit });
  const setEyeSide = (eyeSide: EyeSide) => setOptometryFields({ eyeSide });
  const setOdSphere = (odSphere: string) => setOptometryFields({ odSphere });
  const setOdCylinder = (odCylinder: string) =>
    setOptometryFields({ odCylinder });
  const setOdAxis = (odAxis: string) => setOptometryFields({ odAxis });
  const setOdAdd = (odAdd: string) => setOptometryFields({ odAdd });
  const setOsSphere = (osSphere: string) => setOptometryFields({ osSphere });
  const setOsCylinder = (osCylinder: string) =>
    setOptometryFields({ osCylinder });
  const setOsAxis = (osAxis: string) => setOptometryFields({ osAxis });
  const setOsAdd = (osAdd: string) => setOptometryFields({ osAdd });
  const setPd = (pd: string) => setOptometryFields({ pd });
  const setVisualAcuityOd = (visualAcuityOd: string) =>
    setOptometryFields({ visualAcuityOd });
  const setVisualAcuityOs = (visualAcuityOs: string) =>
    setOptometryFields({ visualAcuityOs });
  const setIopOd = (iopOd: string) => setOptometryFields({ iopOd });
  const setIopOs = (iopOs: string) => setOptometryFields({ iopOs });
  const setExamMethod = (examMethod: string) =>
    setOptometryFields({ examMethod });
  const setImagingModality = (imagingModality: string) =>
    setImagingFields({ imagingModality });
  const setImagingBodySite = (imagingBodySite: string) =>
    setImagingFields({ imagingBodySite });
  const setImagingLaterality = (imagingLaterality: string) =>
    setImagingFields({ imagingLaterality });
  const setImagingStudyType = (imagingStudyType: string) =>
    setImagingFields({ imagingStudyType });
  const setImagingAccessionId = (imagingAccessionId: string) =>
    setImagingFields({ imagingAccessionId });
  const setImagingStudyId = (imagingStudyId: string) =>
    setImagingFields({ imagingStudyId });
  const [deviceImportType, setDeviceImportType] =
    useState<DeviceImportKind>('manual_reading');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [observationFields, setObservationFields] = useReducer(
    patchReducer<ObservationFields>,
    initialObservationFields,
  );
  const {
    valueKind,
    comparator,
    value,
    unit,
    rangeLow,
    rangeHigh,
    rangeText,
    interpretation,
    absentReason,
  } = observationFields;
  const setValueKind = (valueKind: ManualObservationValueKind) =>
    setObservationFields({ valueKind });
  const setComparator = (comparator: string) =>
    setObservationFields({ comparator });
  const setValue = (value: string) => setObservationFields({ value });
  const setUnit = (unit: string) => setObservationFields({ unit });
  const setRangeLow = (rangeLow: string) => setObservationFields({ rangeLow });
  const setRangeHigh = (rangeHigh: string) =>
    setObservationFields({ rangeHigh });
  const setRangeText = (rangeText: string) =>
    setObservationFields({ rangeText });
  const setInterpretation = (interpretation: string) =>
    setObservationFields({ interpretation });
  const setAbsentReason = (absentReason: ManualObservationAbsentReason) =>
    setObservationFields({ absentReason });
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [route, setRoute] = useState('');
  const [documentFileFields, setDocumentFileFields] = useReducer(
    patchReducer<DocumentFileFields>,
    initialDocumentFileFields,
  );
  const { fileName, fileContentType, fileData, linkedFile } =
    documentFileFields;
  const setFileName = (fileName: string) => setDocumentFileFields({ fileName });
  const setFileContentType = (fileContentType: string) =>
    setDocumentFileFields({ fileContentType });
  const setFileData = (fileData: string | undefined) =>
    setDocumentFileFields({ fileData });
  const setLinkedFile = (linkedFile: LinkedAttachmentFile | null) =>
    setDocumentFileFields({ linkedFile });
  const [selectedTerminology, setSelectedTerminology] =
    useState<TerminologyEntry>();
  const [labRows, setLabRows] = useState<LabResultRow[]>([createLabRow()]);
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
  const isManualDeviceReadingType =
    isDeviceImportType && deviceImportType === 'manual_reading';
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
    setDentalTeeth('');
    setToothRange('');
    setDentalQuadrant('');
    setDentalArch('');
    setDentition('');
    setDentalStatus('');
    setDentalSeverity('');
    setProcedureCode('');
    setDentalProvider('');
    setDentalLocation('');
    setDentalFollowUp('');
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
    setImagingModality('');
    setImagingBodySite('');
    setImagingLaterality('');
    setImagingStudyType('');
    setImagingAccessionId('');
    setImagingStudyId('');
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
      const requestedOptometry = searchParams.get(
        'optometry',
      ) as OptometryEntryKind | null;
      applyOptometryEntryKind(
        requestedOptometry &&
          optometryEntryTypes.some(
            (entry) => entry.value === requestedOptometry,
          )
          ? requestedOptometry
          : 'checkup',
      );
    } else if (requestedRecordType) {
      setRecordType(requestedRecordType);
    }
    const requestedTitle = searchParams.get('title');
    if (requestedTitle) setTitle(requestedTitle);
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
        setDentalTeeth(manualDetails.dentalTeeth || '');
        setToothRange(manualDetails.toothRange || '');
        setDentalQuadrant(manualDetails.dentalQuadrant || '');
        setDentalArch(manualDetails.dentalArch || '');
        setDentition(manualDetails.dentition || '');
        setDentalStatus(manualDetails.dentalStatus || '');
        setDentalSeverity(manualDetails.dentalSeverity || '');
        setProcedureCode(manualDetails.procedureCode || '');
        setDentalProvider(manualDetails.dentalProvider || '');
        setDentalLocation(manualDetails.dentalLocation || '');
        setDentalFollowUp(manualDetails.dentalFollowUp || '');
        setDentalFields({ dentalSurfaces: manualDetails.dentalSurfaces || [] });
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
        const imagingDetails = doc.metadata?.manual_imaging_details;
        setImagingModality(imagingDetails?.modality || '');
        setImagingBodySite(imagingDetails?.bodySite || '');
        setImagingLaterality(imagingDetails?.laterality || '');
        setImagingStudyType(imagingDetails?.studyType || '');
        setImagingAccessionId(imagingDetails?.accessionId || '');
        setImagingStudyId(imagingDetails?.studyId || '');
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
        dentalTeeth,
        toothRange,
        dentalQuadrant,
        dentalArch,
        dentition,
        dentalStatus,
        dentalSeverity,
        procedureCode,
        dentalProvider,
        dentalLocation,
        dentalFollowUp,
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
        imagingDetails: {
          modality: imagingModality,
          bodySite: imagingBodySite,
          laterality: imagingLaterality,
          studyType: imagingStudyType,
          accessionId: imagingAccessionId,
          studyId: imagingStudyId,
        },
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
                imagingDetails: normalizeImagingDetails({
                  modality: imagingModality,
                  bodySite: imagingBodySite,
                  laterality: imagingLaterality,
                  studyType: imagingStudyType,
                  accessionId: imagingAccessionId,
                  studyId: imagingStudyId,
                }),
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
                imagingDetails: normalizeImagingDetails({
                  modality: imagingModality,
                  bodySite: imagingBodySite,
                  laterality: imagingLaterality,
                  studyType: imagingStudyType,
                  accessionId: imagingAccessionId,
                  studyId: imagingStudyId,
                }),
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

      await Promise.all(
        savedDocs.map((doc) =>
          appendAuditLog(db, {
            userId: user.id,
            actor: 'local-user',
            action: loadedDocument ? 'record.update' : 'record.create',
            targetId: doc.id,
            targetType: doc.data_record.resource_type,
            source: connection.name,
            summary: `${loadedDocument ? 'Updated' : 'Created'} ${doc.metadata?.display_name || doc.data_record.resource_type}`,
          }),
        ),
      );

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
      await appendAuditLog(db, {
        userId: user.id,
        actor: 'local-user',
        action: 'record.import',
        targetType: 'observation',
        source: file.name,
        summary: `Imported ${docs.length} FreeStyle Libre readings`,
      });

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

  return {
    t,
    notifyDispatch,
    navigate,
    recordId,
    isEditing,
    specialty,
    setSpecialty,
    recordType,
    setRecordType,
    dentalEntryKind,
    setDentalEntryKind,
    optometryEntryKind,
    setOptometryEntryKind,
    toothNumber,
    setToothNumber,
    dentalTeeth,
    setDentalTeeth,
    toothRange,
    setToothRange,
    dentalQuadrant,
    setDentalQuadrant,
    dentalArch,
    setDentalArch,
    dentition,
    setDentition,
    dentalStatus,
    setDentalStatus,
    dentalSeverity,
    setDentalSeverity,
    procedureCode,
    setProcedureCode,
    dentalProvider,
    setDentalProvider,
    dentalLocation,
    setDentalLocation,
    dentalFollowUp,
    setDentalFollowUp,
    dentalSurfaces,
    setDentalSurfaces,
    dentalRecall,
    setDentalRecall,
    orthoPhase,
    setOrthoPhase,
    orthoArch,
    setOrthoArch,
    orthoAppliance,
    setOrthoAppliance,
    orthoStatus,
    setOrthoStatus,
    alignerCurrent,
    setAlignerCurrent,
    alignerTotal,
    setAlignerTotal,
    overjet,
    setOverjet,
    overbite,
    setOverbite,
    molarClass,
    setMolarClass,
    nextVisit,
    setNextVisit,
    eyeSide,
    setEyeSide,
    odSphere,
    setOdSphere,
    odCylinder,
    setOdCylinder,
    odAxis,
    setOdAxis,
    odAdd,
    setOdAdd,
    osSphere,
    setOsSphere,
    osCylinder,
    setOsCylinder,
    osAxis,
    setOsAxis,
    osAdd,
    setOsAdd,
    pd,
    setPd,
    visualAcuityOd,
    setVisualAcuityOd,
    visualAcuityOs,
    setVisualAcuityOs,
    iopOd,
    setIopOd,
    iopOs,
    setIopOs,
    examMethod,
    setExamMethod,
    imagingModality,
    setImagingModality,
    imagingBodySite,
    setImagingBodySite,
    imagingLaterality,
    setImagingLaterality,
    imagingStudyType,
    setImagingStudyType,
    imagingAccessionId,
    setImagingAccessionId,
    imagingStudyId,
    setImagingStudyId,
    deviceImportType,
    setDeviceImportType,
    title,
    setTitle,
    date,
    setDate,
    notes,
    setNotes,
    valueKind,
    setValueKind,
    comparator,
    setComparator,
    value,
    setValue,
    unit,
    setUnit,
    selectedTerminology,
    setSelectedTerminology,
    labRows,
    setLabRows,
    rangeLow,
    setRangeLow,
    rangeText,
    setRangeText,
    rangeHigh,
    setRangeHigh,
    interpretation,
    setInterpretation,
    absentReason,
    setAbsentReason,
    dose,
    setDose,
    frequency,
    setFrequency,
    route,
    setRoute,
    fileName,
    setFileName,
    fileContentType,
    setFileContentType,
    fileData,
    setFileData,
    linkedFile,
    setLinkedFile,
    loadedDocument,
    setLoadedDocument,
    isSaving,
    setIsSaving,
    isImportingLibre,
    setIsImportingLibre,
    keepAdding,
    setKeepAdding,
    savedCount,
    setSavedCount,
    submitAttempted,
    setSubmitAttempted,
    isDeviceImportType,
    isManualDeviceReadingType,
    isLibreImportType,
    isObservationType,
    isDocumentType,
    isMedicationType,
    canLinkSourceFile,
    completedLabRows,
    titleMissing,
    fileMissing,
    terminologyProfile,
    terminologyLanguage,
    terminologyLookupMode,
    terminologyRemoteEnabled,
    isOrthodonticDentalEntry,
    resetFields,
    applyDentalEntryKind,
    applyOptometryEntryKind,
    updateSpecialty,
    toggleDentalSurface,
    applyTemplate,
    applyTerminology,
    updateLabRow,
    applyLabTerminology,
    onSubmit,
    onLibreFileSelected,
  };
}

export type ManualRecordFormController = ReturnType<typeof useManualRecordForm>;
