export type ForecastCountry = 'CA' | 'US';

export type ForecastPatient = {
  birthDate?: string;
  sex?: string;
  riskFactors?: string[];
  immunities?: ForecastImmunityEvidence[];
};

export type ForecastImmunityEvidence = {
  disease: string;
  date?: string;
  reason: 'DISEASE_DOCUMENTED' | 'PROOF_OF_IMMUNITY';
};

export type ForecastImmunization = {
  id?: string;
  vaccineCode?: string;
  vaccineName: string;
  date?: string;
  status?: string;
  doseNumber?: number;
};

export type VaccineGroup =
  | 'covid-19'
  | 'influenza'
  | 'tdap-td'
  | 'hpv'
  | 'zoster'
  | 'mmr'
  | 'hepatitis-a'
  | 'hepatitis-b'
  | 'pneumococcal'
  | 'meningococcal'
  | 'varicella'
  | 'unknown';

export type ForecastScheduleRule = {
  id: string;
  country: ForecastCountry;
  vaccineGroup: VaccineGroup;
  vaccineName: string;
  seriesLabel: string;
  minimumDoses?: number;
  boosterIntervalYears?: number;
  recommendedAgeText?: string;
  notes: string;
};

export type ForecastRecommendationStatus =
  | 'due'
  | 'overdue'
  | 'upcoming'
  | 'complete'
  | 'history';

export type ForecastRecommendation = {
  rule: ForecastScheduleRule;
  status: ForecastRecommendationStatus;
  lastDoseDate?: string;
  nextDueDate?: string;
  doseCount: number;
  reason: string;
};

export type ForecastInput = {
  country: ForecastCountry;
  patient?: ForecastPatient;
  immunizations: ForecastImmunization[];
  now?: Date;
  rules?: ForecastScheduleRule[];
};

export type ForecastResult = {
  recommendations: ForecastRecommendation[];
};

export type IceDuration = string;

export type IceCoding = {
  system?: string;
  systemName?: string;
  code: string;
  version?: string;
  display?: string;
};

export type IceConceptDeterminationMethod = {
  code: string;
  displayName?: string;
  codeSystem?: string;
  version?: string;
  mappings: IceConceptMapping[];
};

export type IceConceptMapping = {
  target: IceCoding;
  sources: IceConceptSourceGroup[];
};

export type IceConceptSourceGroup = {
  codeSystem?: string;
  codeSystemName?: string;
  displayName?: string;
  concepts: IceCoding[];
};

export type IceRuleFileKind =
  | 'common'
  | 'any'
  | 'evaluation'
  | 'recommendation'
  | 'series-selection'
  | 'duplicate-shot-same-day'
  | 'candidate-doses'
  | 'candidate-series'
  | 'immunity'
  | 'dsl'
  | 'other';

export type IceRuleFile = {
  path: string;
  relativePath: string;
  fileName: string;
  extension: string;
  kind: IceRuleFileKind;
  vaccineGroup?: string;
  season?: string;
  lineCount: number;
  byteSize: number;
  rules: IceRule[];
};

export type IceRule = {
  name: string;
  line: number;
  fileName: string;
  kind: IceRuleFileKind;
  vaccineGroup?: string;
  season?: string;
  extends?: string;
  ruleflowGroup?: string;
  activationGroup?: string;
};

export type IceImplementedRulePort = {
  ruleName: string;
  behavior: string;
  testId?: string;
};

export type IceRulePortCoverage = {
  implemented: IceImplementedRulePort[];
  matched: Array<IceImplementedRulePort & { rule: IceRule }>;
  missing: IceImplementedRulePort[];
  unported: IceRule[];
  concreteUnported: IceRule[];
  abstractRules: IceRule[];
};

export type IceRulePortCoverageSummary = {
  filter: string;
  totalRules: number;
  implemented: number;
  matched: number;
  missing: number;
  unported: number;
  concreteUnported: number;
  abstractRules: number;
};

export type IceVaccine = {
  cvx: string;
  display: string;
  supported: boolean;
  liveVirusVaccine?: boolean;
  selectAdjuvantProduct?: boolean;
  unspecifiedFormulation?: boolean;
  vaccineComponents: IceCoding[];
  diseaseImmunity: IceCoding[];
  conceptMappings: IceCoding[];
  validMinimumAgeForUse?: IceDuration;
  validMaximumAgeForUse?: IceDuration;
  recommendedMinimumAgeForUse?: IceDuration;
  recommendedMaximumAgeForUse?: IceDuration;
  minimumDateForUse?: string;
  maximumDateForUse?: string;
  conflictingVaccines: IceCoding[];
};

export type IceVaccineGroup = {
  code: string;
  display: string;
  conceptMappings: IceCoding[];
};

export type IceSeries = {
  code: string;
  display: string;
  conceptMappings: IceCoding[];
};

export type IceSeason = {
  code: string;
  display: string;
  defaultSeason: boolean;
  vaccineGroup?: IceCoding;
  startDate?: string;
  endDate?: string;
  defaultStartMonthAndDay?: string;
  defaultStopMonthAndDay?: string;
  conceptMappings: IceCoding[];
};

export type IceDoseVaccine = {
  cvx: string;
  display?: string;
  preferred: boolean;
};

export type IceAgeConstraint = {
  absoluteMinimumAge?: IceDuration;
  minimumAge?: IceDuration;
  earliestRecommendedAge?: IceDuration;
  latestRecommendedAge?: IceDuration;
};

export type IceIntervalConstraint = {
  fromDoseId: string;
  relationship?: string;
  absoluteMinimumInterval?: IceDuration;
  minimumInterval?: IceDuration;
  earliestRecommendedInterval?: IceDuration;
  latestRecommendedInterval?: IceDuration;
};

export type IceDoseRule = {
  id: string;
  doseNumber: number;
  title?: string;
  age?: IceAgeConstraint;
  vaccines: IceDoseVaccine[];
  intervals: IceIntervalConstraint[];
};

export type IceSeriesDefinition = {
  id: string;
  url?: string;
  name: string;
  title?: string;
  numberOfDosesInSeries: number;
  series?: IceCoding;
  vaccineGroup?: IceCoding;
  season?: IceCoding;
  doses: IceDoseRule[];
  sourceFile: string;
};

export type IceDataset = {
  conceptDeterminationMethods: IceConceptDeterminationMethod[];
  ruleFiles: IceRuleFile[];
  vaccines: IceVaccine[];
  vaccineGroups: IceVaccineGroup[];
  series: IceSeries[];
  seasons: IceSeason[];
  seriesDefinitions: IceSeriesDefinition[];
};

export type IceSeriesForecastInput = {
  dataset: IceDataset;
  immunizations: ForecastImmunization[];
  patient?: ForecastPatient;
  evaluationDate?: string;
  seriesId?: string;
  vaccineGroup?: string;
};

export type IceSeriesDoseMatch = {
  immunization: ForecastImmunization;
  dose: IceDoseRule;
  status: 'valid' | 'invalid' | 'accepted';
  reasons: string[];
  supplementalText?: string[];
};

export type IceNextDoseForecast = {
  dose: IceDoseRule;
  recommendedVaccine?: IceDoseVaccine;
  absoluteMinimumDate?: string;
  minimumDate?: string;
  earliestRecommendedDate?: string;
  recommendedDate?: string;
  overdueDate?: string;
};

export type IceRecommendationStatus =
  | 'recommended'
  | 'conditionally-recommended'
  | 'not-recommended';

export type IceSeriesRecommendation = {
  status: IceRecommendationStatus;
  reasons: string[];
  recommendedVaccine?: IceDoseVaccine;
  earliestRecommendedDate?: string;
  recommendedDate?: string;
  overdueDate?: string;
  supplementalText?: string[];
};

export type IceSeriesForecast = {
  series: IceSeriesDefinition;
  status: 'complete' | 'not-complete';
  selected?: boolean;
  selectionReason?: string;
  completedDoses: number;
  requiredDoses: number;
  matchedDoses: IceSeriesDoseMatch[];
  invalidDoses: IceSeriesDoseMatch[];
  acceptedDoses: IceSeriesDoseMatch[];
  immunityEvidence?: ForecastImmunityEvidence[];
  nextDose?: IceDoseRule;
  nextDoseForecast?: IceNextDoseForecast;
  recommendation?: IceSeriesRecommendation;
};

export type IceSelectedSeriesForecast = {
  vaccineGroup: string;
  selected: IceSeriesForecast;
  candidates: IceSeriesForecast[];
};
