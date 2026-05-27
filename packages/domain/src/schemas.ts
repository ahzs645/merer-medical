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
    })
    .optional(),
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

export const tableSchemas = {
  users: userSchema,
  user_preferences: userPreferencesSchema,
  connections: connectionSchema,
  clinical_documents: clinicalDocumentSchema,
  attachments: attachmentSchema,
  instance_config: instanceConfigSchema,
  summary_page_preferences: summaryPagePreferencesSchema,
} as const;

export type TableSchemas = typeof tableSchemas;
