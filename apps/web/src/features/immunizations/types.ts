import type {
  ForecastCountry,
  ForecastRecommendation,
  VaccineGroup,
} from '@mere/immunization-forecast';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

export type ImmunizationCountry = ForecastCountry;

export type ImmunizationRecord = {
  id: string;
  document: ClinicalDocument<unknown>;
  vaccineKey: VaccineGroup;
  vaccineName: string;
  date?: string;
  lotNumber?: string;
  manufacturer?: string;
  performer?: string;
  status?: string;
  doseNumber?: number;
  summary?: string;
};

export type ImmunizationRecommendation = ForecastRecommendation;
