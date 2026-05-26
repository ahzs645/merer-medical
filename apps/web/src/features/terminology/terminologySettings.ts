import {
  TerminologyLanguage,
  TerminologyLookupMode,
  TerminologyProfile,
} from '@mere/domain';

export const DEFAULT_TERMINOLOGY_PROFILE: TerminologyProfile = 'canada';
export const DEFAULT_TERMINOLOGY_LOOKUP_MODE: TerminologyLookupMode = 'hybrid';
export const DEFAULT_TERMINOLOGY_LANGUAGE: TerminologyLanguage = 'en';
export const DEFAULT_TERMINOLOGY_REMOTE_ENABLED = false;

export type TerminologySettings = {
  profile: TerminologyProfile;
  lookupMode: TerminologyLookupMode;
  language: TerminologyLanguage;
  remoteEnabled: boolean;
};
