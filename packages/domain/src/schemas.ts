import { z } from 'zod';

const base = {
  id: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  deletedAt: z.number().int().nonnegative().optional(),
};

export const userSchema = z.object({
  ...base,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  gender: z.string().optional(),
  birthday: z.string().optional(),
  isSelected: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  profilePictureAttachmentId: z.string().optional(),
});

export const userPreferencesSchema = z.object({
  ...base,
  userId: z.string(),
  useProxy: z.boolean(),
});

export const connectionSourceSchema = z.enum([
  'epic',
  'onpatient',
  'cerner',
  'veradigm',
  'va',
  'healow',
  'freestyle_libre',
  'manual',
]);

export const connectionSchema = z.object({
  ...base,
  userId: z.string(),
  source: connectionSourceSchema,
  name: z.string(),
  location: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  scope: z.string().optional(),
  expiresAt: z.number().int(),
  lastRefreshedAt: z.number().int().optional(),
  lastSyncAttemptAt: z.number().int().optional(),
  lastSyncWasError: z.boolean().optional(),
  authUri: z.string().optional(),
  tokenUri: z.string().optional(),
  clientId: z.string().optional(),
  tenantId: z.string().optional(),
  patient: z.string().optional(),
  fhirVersion: z.enum(['DSTU2', 'R4']).optional(),
});

export const clinicalDocumentSchema = z.object({
  ...base,
  userId: z.string(),
  connectionId: z.string(),
  format: z.enum(['FHIR.DSTU2', 'FHIR.R4']),
  contentType: z.string(),
  resourceType: z.string(),
  raw: z.unknown(),
  versionHistory: z.array(z.unknown()).optional(),
  attachmentIds: z.array(z.string()).optional(),
  metadata: z
    .object({
      sourceId: z.string().optional(),
      date: z.string().optional(),
      displayName: z.string().optional(),
      loincCoding: z.array(z.string()).optional(),
      terminologyProfile: z.enum(['canada', 'us', 'global']).optional(),
      terminologySource: z.string().optional(),
      terminologySourceVersion: z.string().optional(),
      manualUncoded: z.boolean().optional(),
      manualSpecialty: z.string().optional(),
      manualSubtype: z.string().optional(),
      manualSpecialtyDetails: z.unknown().optional(),
      manualImagingDetails: z
        .object({
          modality: z.string().optional(),
          bodySite: z.string().optional(),
          laterality: z.string().optional(),
          studyType: z.string().optional(),
          accessionId: z.string().optional(),
          studyId: z.string().optional(),
        })
        .optional(),
      sourceName: z.string().optional(),
      sourceType: z.string().optional(),
      sourceLocation: z.string().optional(),
      retrievedAt: z.string().optional(),
      entryMethod: z
        .enum(['portal-sync', 'manual-entry', 'file-import', 'device-import'])
        .optional(),
      originalFilename: z.string().optional(),
      mappingConfidence: z
        .enum(['source', 'mapped', 'manual', 'unknown'])
        .optional(),
      provenanceNotes: z.string().optional(),
    })
    .optional(),
});

export const clinicalDemoSourceSchema = z.object({
  ...base,
  kind: z.enum(['open-dental-demo']),
  name: z.string(),
  sourcePath: z.string().optional(),
  databaseVersion: z.string().optional(),
  practiceName: z.string().optional(),
  importedAt: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const sourceCodeSystemKindSchema = z.enum([
  'CDT',
  'ICD9',
  'ICD10',
  'CPT',
  'HCPCS',
  'SNOMED',
  'LOINC',
  'CVX',
  'RxNorm',
  'UCUM',
  'OpenDentalProcedureCode',
  'OpenDentalDefinition',
  'other',
]);

export const sourceCodeSystemSchema = z.object({
  ...base,
  demoSourceId: z.string().optional(),
  kind: sourceCodeSystemKindSchema,
  name: z.string(),
  version: z.string().optional(),
  sourceTable: z.string().optional(),
  sourceColumn: z.string().optional(),
  codeCount: z.number().int().nonnegative().optional(),
  populated: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
});

export const dentalTerminologySetSchema = z.object({
  ...base,
  jurisdiction: z.enum(['CA', 'US', 'global']),
  name: z.string(),
  source: z.string(),
  sourceVersion: z.string().optional(),
  sourcePath: z.string().optional(),
  importedAt: z.number().int().nonnegative().optional(),
  codeCount: z.number().int().nonnegative().optional(),
  languageCoverage: z.array(z.enum(['en', 'fr'])).optional(),
  license: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const dentalTerminologyCodeSchema = z.object({
  ...base,
  terminologySetId: z.string(),
  jurisdiction: z.enum(['CA', 'US', 'global']),
  system: z.string(),
  sourceTable: z.string().optional(),
  sourceCodeId: z.string().optional(),
  code: z.string(),
  display: z.string(),
  abbreviatedDisplay: z.string().optional(),
  category: z.string().optional(),
  treatmentArea: z.string().optional(),
  procedureTime: z.string().optional(),
  defaultNote: z.string().optional(),
  defaultClaimNote: z.string().optional(),
  defaultTreatmentPlanNote: z.string().optional(),
  laymanTerm: z.string().optional(),
  medicalCode: z.string().optional(),
  diagnosticCodes: z.array(z.string()).optional(),
  alternateCode: z.string().optional(),
  substitutionCode: z.string().optional(),
  substitutionRule: z.string().optional(),
  flags: z
    .object({
      noBillInsurance: z.boolean().optional(),
      prosthesis: z.boolean().optional(),
      hygiene: z.boolean().optional(),
      taxed: z.boolean().optional(),
      canadianLab: z.boolean().optional(),
      preExisting: z.boolean().optional(),
      multiVisit: z.boolean().optional(),
      radiology: z.boolean().optional(),
      areaAlsoToothRange: z.boolean().optional(),
    })
    .optional(),
  units: z
    .object({
      baseUnits: z.number().optional(),
      canadaTimeUnits: z.number().optional(),
    })
    .optional(),
  visual: z
    .object({
      paintType: z.string().optional(),
      graphicColor: z.string().optional(),
      paintText: z.string().optional(),
    })
    .optional(),
  providerIdDefault: z.string().optional(),
  revenueCodeDefault: z.string().optional(),
  active: z.boolean(),
  raw: z.unknown().optional(),
});

const dentalSurfaceSchema = z.string().min(1);

const dentalToothStateSchema = z.object({
  tooth: z.string(),
  surfaces: z.array(dentalSurfaceSchema).optional(),
  dentition: z.enum(['permanent', 'deciduous', 'mixed', 'unknown']).optional(),
  status: z.string().optional(),
  sourceProcedureIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const dentalPatientProfileSchema = z.object({
  ...base,
  userId: z.string().optional(),
  demoSourceId: z.string().optional(),
  sourcePatientId: z.string(),
  chartNumber: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleInitial: z.string().optional(),
  preferredName: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  status: z.string().optional(),
  language: z.string().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  telecom: z
    .object({
      homePhone: z.string().optional(),
      workPhone: z.string().optional(),
      mobilePhone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  familyAccount: z
    .object({
      guarantorSourcePatientId: z.string().optional(),
      responsiblePartySourcePatientId: z.string().optional(),
      superFamilySourcePatientId: z.string().optional(),
    })
    .optional(),
  providerIds: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
    })
    .optional(),
  raw: z.unknown().optional(),
});

export const dentalToothChartSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  numberingSystem: z.enum(['universal', 'iso-3950', 'palmer', 'open-dental']),
  teeth: z.array(dentalToothStateSchema),
  sourceProcedureIds: z.array(z.string()).optional(),
  sourceTables: z.array(z.string()).optional(),
  raw: z.unknown().optional(),
});

export const dentalProcedureRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  dentalToothChartId: z.string().optional(),
  demoSourceId: z.string().optional(),
  sourceProcedureId: z.string(),
  sourceAppointmentId: z.string().optional(),
  procedureDate: z.string().optional(),
  completedAt: z.string().optional(),
  status: z.string().optional(),
  providerId: z.string().optional(),
  code: z
    .object({
      system: z.string(),
      code: z.string(),
      display: z.string().optional(),
      sourceCodeId: z.string().optional(),
    })
    .optional(),
  fee: z.number().optional(),
  tooth: z.string().optional(),
  surfaces: z.array(dentalSurfaceSchema).optional(),
  toothRange: z.string().optional(),
  diagnosisCodes: z
    .array(
      z.object({
        system: z.string(),
        code: z.string(),
        display: z.string().optional(),
      }),
    )
    .optional(),
  notes: z.string().optional(),
  raw: z.unknown().optional(),
});

export const dentalInsuranceRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  sourcePatPlanId: z.string().optional(),
  sourceInsSubId: z.string().optional(),
  sourcePlanId: z.string().optional(),
  sourceCarrierId: z.string().optional(),
  ordinal: z.number().int().optional(),
  relationship: z.string().optional(),
  subscriberSourcePatientId: z.string().optional(),
  subscriberId: z.string().optional(),
  effectiveDate: z.string().optional(),
  terminationDate: z.string().optional(),
  carrierName: z.string().optional(),
  groupName: z.string().optional(),
  groupNumber: z.string().optional(),
  planType: z.string().optional(),
  benefits: z
    .array(
      z.object({
        sourceBenefitId: z.string().optional(),
        sourceCoverageCategoryId: z.string().optional(),
        category: z.string().optional(),
        benefitType: z.string().optional(),
        percent: z.number().optional(),
        monetaryAmount: z.number().optional(),
        timePeriod: z.string().optional(),
        quantityQualifier: z.string().optional(),
        quantity: z.number().optional(),
        code: z.string().optional(),
        coverageLevel: z.string().optional(),
        treatmentArea: z.string().optional(),
        toothRange: z.string().optional(),
        raw: z.unknown().optional(),
      }),
    )
    .optional(),
  benefitSummary: z.unknown().optional(),
  raw: z.unknown().optional(),
});

export const dentalProviderRecordSchema = z.object({
  ...base,
  demoSourceId: z.string().optional(),
  sourceProviderId: z.string(),
  abbreviation: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  preferredName: z.string().optional(),
  suffix: z.string().optional(),
  specialty: z.string().optional(),
  npi: z.string().optional(),
  stateLicense: z.string().optional(),
  deaNumber: z.string().optional(),
  taxonomyCode: z.string().optional(),
  medicaidId: z.string().optional(),
  isSecondary: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isNotPerson: z.boolean().optional(),
  isErxEnabled: z.boolean().optional(),
  feeScheduleId: z.string().optional(),
  emailAddressId: z.string().optional(),
  clinicIds: z.array(z.string()).optional(),
  schedulingNote: z.string().optional(),
  raw: z.unknown().optional(),
});

const dentalClaimLineSchema = z.object({
  sourceClaimProcId: z.string().optional(),
  sourceProcedureId: z.string().optional(),
  procedureDate: z.string().optional(),
  codeSent: z.string().optional(),
  lineNumber: z.number().int().optional(),
  feeBilled: z.number().optional(),
  allowedAmount: z.number().optional(),
  deductibleApplied: z.number().optional(),
  deductibleEstimate: z.number().optional(),
  insuranceEstimate: z.number().optional(),
  insurancePaid: z.number().optional(),
  writeOff: z.number().optional(),
  copayAmount: z.number().optional(),
  percentOverride: z.number().optional(),
  status: z.string().optional(),
  remarks: z.string().optional(),
  raw: z.unknown().optional(),
});

const dentalClaimPaymentSchema = z.object({
  sourceClaimPaymentId: z.string().optional(),
  checkDate: z.string().optional(),
  checkAmount: z.number().optional(),
  checkNumber: z.string().optional(),
  carrierName: z.string().optional(),
  bankBranch: z.string().optional(),
  note: z.string().optional(),
  paymentType: z.string().optional(),
  raw: z.unknown().optional(),
});

export const dentalClaimRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  sourceClaimId: z.string(),
  sourcePlanId: z.string().optional(),
  sourceInsSubId: z.string().optional(),
  sourceCarrierId: z.string().optional(),
  claimType: z.string().optional(),
  status: z.string().optional(),
  dateService: z.string().optional(),
  dateSent: z.string().optional(),
  dateReceived: z.string().optional(),
  providerTreatingId: z.string().optional(),
  providerBillingId: z.string().optional(),
  clinicId: z.string().optional(),
  claimFee: z.number().optional(),
  insuranceEstimate: z.number().optional(),
  insurancePaid: z.number().optional(),
  writeOff: z.number().optional(),
  patientRelation: z.string().optional(),
  isOrtho: z.boolean().optional(),
  orthoMonthsRemaining: z.number().optional(),
  orthoDate: z.string().optional(),
  narrative: z.string().optional(),
  note: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
  lines: z.array(dentalClaimLineSchema),
  payments: z.array(dentalClaimPaymentSchema).optional(),
  raw: z.unknown().optional(),
});

export const dentalRecallRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  sourceRecallId: z.string(),
  sourceRecallTypeId: z.string().optional(),
  type: z.string().optional(),
  dueDateCalculated: z.string().optional(),
  dueDate: z.string().optional(),
  previousDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  interval: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  disabled: z.boolean().optional(),
  disabledUntilDate: z.string().optional(),
  note: z.string().optional(),
  procedures: z.array(z.string()).optional(),
  raw: z.unknown().optional(),
});

export const dentalOrthoRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  sourceOrthoCaseId: z.string().optional(),
  providerId: z.string().optional(),
  clinicId: z.string().optional(),
  orthoType: z.string().optional(),
  isActive: z.boolean().optional(),
  bandingDate: z.string().optional(),
  debondDate: z.string().optional(),
  expectedDebondDate: z.string().optional(),
  isTransfer: z.boolean().optional(),
  patientFee: z.number().optional(),
  primaryInsuranceFee: z.number().optional(),
  secondaryInsuranceFee: z.number().optional(),
  lips: z.string().optional(),
  facialProfile: z.string().optional(),
  oralHygiene: z.string().optional(),
  skeletalRelationship: z.number().optional(),
  molarRelationship: z.number().optional(),
  canineRelationship: z.number().optional(),
  overjetMm: z.number().optional(),
  overbiteMm: z.number().optional(),
  upperSpaceAvailableMm: z.number().optional(),
  upperSpaceNeededMm: z.number().optional(),
  lowerSpaceAvailableMm: z.number().optional(),
  lowerSpaceNeededMm: z.number().optional(),
  crossScissorBiteTeeth: z.array(z.string()).optional(),
  problems: z.array(z.string()).optional(),
  appliancePlan: z.array(z.string()).optional(),
  nextVisitNotes: z.array(z.string()).optional(),
  isStarted: z.boolean().optional(),
  startedDate: z.string().optional(),
  isFinished: z.boolean().optional(),
  finishedDate: z.string().optional(),
  visits: z
    .array(
      z.object({
        id: z.string().optional(),
        visitNumber: z.number().int().optional(),
        date: z.string().optional(),
        appliance: z.string().optional(),
        target: z.string().optional(),
        notes: z.string().optional(),
        photoAttachmentIds: z.array(z.string()).optional(),
        photos: z
          .array(
            z.object({
              attachmentId: z.string().optional(),
              view: z.string().optional(),
              comment: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  chartRows: z
    .array(
      z.object({
        sourceOrthoChartRowId: z.string().optional(),
        serviceDate: z.string().optional(),
        providerId: z.string().optional(),
        signature: z.string().optional(),
        fields: z
          .array(
            z.object({
              sourceOrthoChartId: z.string().optional(),
              name: z.string().optional(),
              value: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  hardware: z
    .array(
      z.object({
        sourceOrthoHardwareId: z.string().optional(),
        examDate: z.string().optional(),
        hardwareType: z.string().optional(),
        description: z.string().optional(),
        toothRange: z.string().optional(),
        note: z.string().optional(),
        hidden: z.boolean().optional(),
      }),
    )
    .optional(),
  schedule: z
    .object({
      sourceOrthoScheduleId: z.string().optional(),
      bandingDateOverride: z.string().optional(),
      debondDateOverride: z.string().optional(),
      bandingAmount: z.number().optional(),
      visitAmount: z.number().optional(),
      debondAmount: z.number().optional(),
    })
    .optional(),
  raw: z.unknown().optional(),
});

export const dentalToothConditionRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  dentalToothChartId: z.string().optional(),
  demoSourceId: z.string().optional(),
  sourceToothInitialId: z.string().optional(),
  tooth: z.string(),
  conditionType: z.string().optional(),
  displayLabel: z.string().optional(),
  displayColor: z.string().optional(),
  actionLevel: z.string().optional(),
  movement: z.number().optional(),
  drawingSegment: z.string().optional(),
  drawColor: z.string().optional(),
  drawText: z.string().optional(),
  recordedAt: z.string().optional(),
  raw: z.unknown().optional(),
});

const dentalPerioMeasurementSchema = z.object({
  sourcePerioMeasureId: z.string().optional(),
  sequenceType: z.string().optional(),
  tooth: z.string(),
  toothValue: z.number().optional(),
  values: z
    .object({
      MB: z.number().optional(),
      B: z.number().optional(),
      DB: z.number().optional(),
      ML: z.number().optional(),
      L: z.number().optional(),
      DL: z.number().optional(),
    })
    .optional(),
  raw: z.unknown().optional(),
});

export const dentalPerioExamSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  sourcePerioExamId: z.string(),
  examDate: z.string().optional(),
  providerId: z.string().optional(),
  note: z.string().optional(),
  measurements: z.array(dentalPerioMeasurementSchema),
  raw: z.unknown().optional(),
});

const dentalTreatmentPlanProcedureSchema = z.object({
  sourceProcTpId: z.string().optional(),
  sourceProcedureId: z.string().optional(),
  itemOrder: z.number().int().optional(),
  priority: z.string().optional(),
  tooth: z.string().optional(),
  surfaces: z.array(dentalSurfaceSchema).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  fee: z.number().optional(),
  primaryInsuranceEstimate: z.number().optional(),
  secondaryInsuranceEstimate: z.number().optional(),
  patientAmount: z.number().optional(),
  discount: z.number().optional(),
  prognosis: z.string().optional(),
  providerId: z.string().optional(),
  clinicId: z.string().optional(),
  plannedDate: z.string().optional(),
  raw: z.unknown().optional(),
});

export const dentalTreatmentPlanSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  sourceTreatmentPlanId: z.string(),
  heading: z.string().optional(),
  note: z.string().optional(),
  status: z.string().optional(),
  dateCreated: z.string().optional(),
  datePresented: z.string().optional(),
  responsiblePartySourcePatientId: z.string().optional(),
  procedures: z.array(dentalTreatmentPlanProcedureSchema),
  raw: z.unknown().optional(),
});

const dentalFeeScheduleEntrySchema = z.object({
  sourceFeeId: z.string().optional(),
  sourceCodeId: z.string().optional(),
  code: z.string().optional(),
  amount: z.number().optional(),
  clinicId: z.string().optional(),
  providerId: z.string().optional(),
  effectiveDate: z.string().optional(),
  useDefaultFee: z.boolean().optional(),
  raw: z.unknown().optional(),
});

export const dentalFeeScheduleSchema = z.object({
  ...base,
  demoSourceId: z.string().optional(),
  sourceFeeScheduleId: z.string(),
  description: z.string(),
  scheduleType: z.string().optional(),
  isHidden: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  entries: z.array(dentalFeeScheduleEntrySchema),
  raw: z.unknown().optional(),
});

export const dentalAppointmentRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  sourceAppointmentId: z.string(),
  sourceOperatoryId: z.string().optional(),
  sourceProviderId: z.string().optional(),
  sourceProviderHygienistId: z.string().optional(),
  sourceAppointmentTypeId: z.string().optional(),
  sourceScheduleOpId: z.string().optional(),
  appointmentDate: z.string().optional(),
  status: z.string().optional(),
  confirmed: z.string().optional(),
  isNewPatient: z.boolean().optional(),
  isHygiene: z.boolean().optional(),
  priority: z.string().optional(),
  note: z.string().optional(),
  procedureDescriptions: z.string().optional(),
  procedures: z
    .array(
      z.object({
        description: z.string().optional(),
        tooth: z.string().optional(),
        surfaces: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  clinicId: z.string().optional(),
  raw: z.unknown().optional(),
});

export const dentalOperatoryRecordSchema = z.object({
  ...base,
  demoSourceId: z.string().optional(),
  sourceOperatoryId: z.string(),
  opName: z.string(),
  abbreviation: z.string().optional(),
  providerDentistId: z.string().optional(),
  providerHygienistId: z.string().optional(),
  isHygiene: z.boolean().optional(),
  clinicId: z.string().optional(),
  operatoryType: z.string().optional(),
  itemOrder: z.number().int().optional(),
  isHidden: z.boolean().optional(),
  isWebSched: z.boolean().optional(),
  isNewPatAppt: z.boolean().optional(),
  raw: z.unknown().optional(),
});

const dentalScheduleOpRecordSchema = z.object({
  sourceScheduleOpId: z.string().optional(),
  sourceOperatoryId: z.string().optional(),
  raw: z.unknown().optional(),
});

export const dentalScheduleRecordSchema = z.object({
  ...base,
  demoSourceId: z.string().optional(),
  sourceScheduleId: z.string(),
  scheduleDate: z.string().optional(),
  startTime: z.string().optional(),
  stopTime: z.string().optional(),
  providerId: z.string().optional(),
  blockoutType: z.string().optional(),
  scheduleType: z.string().optional(),
  note: z.string().optional(),
  clinicId: z.string().optional(),
  operatories: z.array(dentalScheduleOpRecordSchema),
  raw: z.unknown().optional(),
});

export const dentalImagingRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  clinicalDocumentId: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
  sourceDocumentId: z.string().optional(),
  sourceMountId: z.string().optional(),
  sourceMountItemId: z.string().optional(),
  description: z.string().optional(),
  imageRole: z.string().optional(),
  modality: z.string().optional(),
  acquisitionDate: z.string().optional(),
  toothNumbers: z.array(z.string()).optional(),
  galleryPosition: z.number().int().optional(),
  thumbnailAttachmentId: z.string().optional(),
  previewAttachmentId: z.string().optional(),
  orientation: z
    .object({
      rotatedDegrees: z.number().optional(),
      flippedHorizontal: z.boolean().optional(),
      flippedVertical: z.boolean().optional(),
      crop: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        })
        .optional(),
    })
    .optional(),
  mount: z
    .object({
      description: z.string().optional(),
      itemOrder: z.number().int().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      rotation: z.number().optional(),
    })
    .optional(),
  annotations: z
    .array(
      z.object({
        sourceImageDrawId: z.string().optional(),
        drawType: z.string().optional(),
        color: z.string().optional(),
        text: z.string().optional(),
        details: z.string().optional(),
      }),
    )
    .optional(),
  raw: z.unknown().optional(),
});

export const dentalLabCaseSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string(),
  demoSourceId: z.string().optional(),
  sourceLabCaseId: z.string(),
  sourceAppointmentId: z.string().optional(),
  sourcePlannedAppointmentId: z.string().optional(),
  caseTitle: z.string().optional(),
  caseDetails: z.string().optional(),
  laboratoryName: z.string().optional(),
  laboratoryContact: z.string().optional(),
  providerId: z.string().optional(),
  operatingProviderIds: z.array(z.string()).optional(),
  involvedTeeth: z.array(z.string()).optional(),
  dueAt: z.string().optional(),
  createdAtSource: z.string().optional(),
  sent: z.boolean().optional(),
  sentAt: z.string().optional(),
  received: z.boolean().optional(),
  receivedAt: z.string().optional(),
  checkedAt: z.string().optional(),
  instructions: z.string().optional(),
  price: z.number().optional(),
  labFee: z.number().optional(),
  paid: z.boolean().optional(),
  paidAt: z.string().optional(),
  invoiceNumber: z.string().optional(),
  raw: z.unknown().optional(),
});

export const dentalFormRecordSchema = z.object({
  ...base,
  userId: z.string().optional(),
  dentalPatientProfileId: z.string().optional(),
  demoSourceId: z.string().optional(),
  clinicalDocumentId: z.string().optional(),
  sourceSheetId: z.string().optional(),
  sourceSheetDefId: z.string().optional(),
  sourceDocumentId: z.string().optional(),
  sheetType: z.string().optional(),
  description: z.string().optional(),
  completedAt: z.string().optional(),
  internalNote: z.string().optional(),
  fields: z.array(
    z.object({
      sourceSheetFieldId: z.string().optional(),
      fieldType: z.string().optional(),
      name: z.string().optional(),
      value: z.string().optional(),
      reportableName: z.string().optional(),
      required: z.boolean().optional(),
      signedAt: z.string().optional(),
    }),
  ),
  raw: z.unknown().optional(),
});

export const attachmentSchema = z.object({
  ...base,
  ownerType: z.enum(['clinical_document', 'user_profile', 'note', 'other']),
  ownerId: z.string(),
  filename: z.string().optional(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  sha256: z.string().optional(),
});

export const instanceConfigSchema = z.object({
  ...base,
  experimental: z.record(z.boolean()).optional(),
  tutorialCompletedAt: z.number().int().optional(),
  setupCompletedAt: z.number().int().optional(),
  terminologyProfile: z.enum(['canada', 'us', 'global']).optional(),
  terminologyLookupMode: z
    .enum(['local-only', 'hybrid', 'server-first'])
    .optional(),
  terminologyLanguage: z.enum(['en', 'fr']).optional(),
  terminologyRemoteEnabled: z.boolean().optional(),
});

export const summaryPagePreferencesSchema = z.object({
  ...base,
  userId: z.string(),
  cards: z.array(
    z.object({
      id: z.string(),
      visible: z.boolean(),
      order: z.number().int(),
    }),
  ),
});

export const workflowRecordSchema = z.object({
  ...base,
  userId: z.string(),
  kind: z.enum([
    'audit-log-entry',
    'care-task',
    'tracker-entry',
    'sharing-state',
  ]),
  payload: z.unknown(),
});

export const tableSchemas = {
  users: userSchema,
  user_preferences: userPreferencesSchema,
  connections: connectionSchema,
  clinical_documents: clinicalDocumentSchema,
  clinical_demo_sources: clinicalDemoSourceSchema,
  source_code_systems: sourceCodeSystemSchema,
  dental_terminology_sets: dentalTerminologySetSchema,
  dental_terminology_codes: dentalTerminologyCodeSchema,
  dental_provider_records: dentalProviderRecordSchema,
  dental_patient_profiles: dentalPatientProfileSchema,
  dental_tooth_charts: dentalToothChartSchema,
  dental_procedure_records: dentalProcedureRecordSchema,
  dental_insurance_records: dentalInsuranceRecordSchema,
  dental_claim_records: dentalClaimRecordSchema,
  dental_recall_records: dentalRecallRecordSchema,
  dental_ortho_records: dentalOrthoRecordSchema,
  dental_tooth_condition_records: dentalToothConditionRecordSchema,
  dental_perio_exams: dentalPerioExamSchema,
  dental_treatment_plans: dentalTreatmentPlanSchema,
  dental_fee_schedules: dentalFeeScheduleSchema,
  dental_imaging_records: dentalImagingRecordSchema,
  dental_lab_cases: dentalLabCaseSchema,
  dental_form_records: dentalFormRecordSchema,
  dental_appointment_records: dentalAppointmentRecordSchema,
  dental_operatory_records: dentalOperatoryRecordSchema,
  dental_schedule_records: dentalScheduleRecordSchema,
  attachments: attachmentSchema,
  instance_config: instanceConfigSchema,
  summary_page_preferences: summaryPagePreferencesSchema,
  workflow_records: workflowRecordSchema,
} as const;

export type TableSchemas = typeof tableSchemas;
