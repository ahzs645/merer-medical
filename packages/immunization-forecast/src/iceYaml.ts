import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import YAML from 'yaml';

import { loadConceptDeterminationMethods } from './iceXml.js';
import { loadIceRuleCatalog } from './iceRules.js';
import {
  IceAgeConstraint,
  IceCoding,
  IceDataset,
  IceDoseRule,
  IceDoseVaccine,
  IceIntervalConstraint,
  IceSeason,
  IceSeries,
  IceSeriesDefinition,
  IceVaccine,
  IceVaccineGroup,
} from './types.js';

const SERIES_METADATA_URL =
  'http://cdsframework.org/fhir/StructureDefinition/ice-series-metadata';
const DOSE_NUMBER_URL =
  'http://cdsframework.org/fhir/StructureDefinition/ice-dose-number';
const DOSE_AGE_CONSTRAINT_URL =
  'http://cdsframework.org/fhir/StructureDefinition/ice-dose-age-constraint';
const DOSE_VACCINE_URL =
  'http://cdsframework.org/fhir/StructureDefinition/ice-dose-vaccine';
const DOSE_INTERVAL_CONSTRAINT_URL =
  'http://cdsframework.org/fhir/StructureDefinition/ice-dose-interval-constraint';

export type IceDatasetPaths = {
  conceptDeterminationMethods: string;
  ruleCatalogRoot: string;
  supportedVaccines: string;
  supportedVaccineGroups: string;
  supportedSeries: string;
  supportedSeasons: string;
  seriesPlanDefinitionsDir: string;
};

export function loadIceDataset(paths: IceDatasetPaths): IceDataset {
  return {
    conceptDeterminationMethods: loadConceptDeterminationMethods(
      paths.conceptDeterminationMethods,
    ),
    ruleFiles: loadIceRuleCatalog(paths.ruleCatalogRoot),
    vaccines: loadSupportedVaccines(paths.supportedVaccines),
    vaccineGroups: loadSupportedVaccineGroups(paths.supportedVaccineGroups),
    series: loadSupportedSeries(paths.supportedSeries),
    seasons: loadSupportedSeasons(paths.supportedSeasons),
    seriesDefinitions: loadSeriesDefinitions(paths.seriesPlanDefinitionsDir),
  };
}

export function loadSupportedVaccines(path: string): IceVaccine[] {
  return extractFirstCodeSystem(readYaml(path)).concept.map((concept: any) => ({
    cvx: String(concept.code),
    display: concept.display,
    supported: booleanProperty(concept, 'supported') ?? false,
    liveVirusVaccine: booleanProperty(concept, 'liveVirusVaccine'),
    selectAdjuvantProduct: booleanProperty(concept, 'selectAdjuvantProduct'),
    unspecifiedFormulation: booleanProperty(concept, 'unspecifiedFormulation'),
    vaccineComponents: codingProperties(concept, 'vaccineComponent'),
    diseaseImmunity: codingProperties(concept, 'diseaseImmunity'),
    conceptMappings: codingProperties(concept, 'conceptMapping'),
    validMinimumAgeForUse: stringProperty(concept, 'validMinimumAgeForUse'),
    validMaximumAgeForUse: stringProperty(concept, 'validMaximumAgeForUse'),
    recommendedMinimumAgeForUse: stringProperty(
      concept,
      'recommendedMinimumAgeForUse',
    ),
    recommendedMaximumAgeForUse: stringProperty(
      concept,
      'recommendedMaximumAgeForUse',
    ),
    minimumDateForUse: stringProperty(concept, 'minimumDateForUse'),
    maximumDateForUse: stringProperty(concept, 'maximumDateForUse'),
    conflictingVaccines: codingProperties(concept, 'conflictingVaccine'),
  }));
}

export function loadSupportedVaccineGroups(path: string): IceVaccineGroup[] {
  return extractFirstCodeSystem(readYaml(path)).concept.map((concept: any) => ({
    code: String(concept.code),
    display: concept.display,
    conceptMappings: codingProperties(concept, 'conceptMapping'),
  }));
}

export function loadSupportedSeries(path: string): IceSeries[] {
  return extractFirstCodeSystem(readYaml(path)).concept.map((concept: any) => ({
    code: String(concept.code),
    display: concept.display,
    conceptMappings: codingProperties(concept, 'conceptMapping'),
  }));
}

export function loadSupportedSeasons(path: string): IceSeason[] {
  return extractFirstCodeSystem(readYaml(path)).concept.map((concept: any) => ({
    code: String(concept.code),
    display: concept.display,
    defaultSeason: booleanProperty(concept, 'defaultSeason') ?? false,
    vaccineGroup: codingProperty(concept, 'vaccineGroup'),
    startDate: stringProperty(concept, 'startDate'),
    endDate: stringProperty(concept, 'endDate'),
    defaultStartMonthAndDay: stringProperty(concept, 'defaultStartMonthAndDay'),
    defaultStopMonthAndDay: stringProperty(concept, 'defaultStopMonthAndDay'),
    conceptMappings: codingProperties(concept, 'conceptMapping'),
  }));
}

export function loadSeriesDefinitions(dir: string): IceSeriesDefinition[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .sort()
    .flatMap((file) => extractPlanDefinitions(readYaml(join(dir, file)), file));
}

function extractPlanDefinitions(root: any, sourceFile: string) {
  const planDefinitions =
    root?.['cds-engine']?.['module-canonical-definition-map']?.[
      '[http://cdsframework.org/PlanDefinition/ice-forecast|1.0.0]'
    ]?.['plan-definitions'];

  if (!planDefinitions) return [];

  return Object.entries(planDefinitions).map(([id, plan]: [string, any]) =>
    mapSeriesDefinition(id, plan, sourceFile),
  );
}

function mapSeriesDefinition(
  id: string,
  plan: any,
  sourceFile: string,
): IceSeriesDefinition {
  const metadata = extensions(plan, SERIES_METADATA_URL)[0];
  const metadataChildren = childExtensions(metadata);

  return {
    id,
    url: plan.url,
    name: plan.name,
    title: plan.title,
    numberOfDosesInSeries:
      extensionValue(metadataChildren, 'numberOfDosesInSeries') ?? 0,
    series: codeableConceptCoding(extensionValue(metadataChildren, 'series')),
    vaccineGroup: codeableConceptCoding(
      extensionValue(metadataChildren, 'vaccineGroup'),
    ),
    season: codeableConceptCoding(extensionValue(metadataChildren, 'season')),
    doses: (plan.action ?? []).map(mapDoseRule),
    sourceFile: basename(sourceFile),
  };
}

function mapDoseRule(action: any): IceDoseRule {
  const actionExtensions = childExtensions(action);
  return {
    id: action.id,
    title: action.title,
    doseNumber: extensionValue(actionExtensions, DOSE_NUMBER_URL) ?? 0,
    age: mapAgeConstraint(extensions(action, DOSE_AGE_CONSTRAINT_URL)[0]),
    vaccines: extensions(action, DOSE_VACCINE_URL).map(mapDoseVaccine),
    intervals: (action['related-action'] ?? []).flatMap(mapIntervalConstraint),
  };
}

function mapAgeConstraint(extension?: any): IceAgeConstraint | undefined {
  if (!extension) return undefined;
  const children = childExtensions(extension);
  return compactObject({
    absoluteMinimumAge: extensionValue(children, 'absoluteMinimumAge'),
    minimumAge: extensionValue(children, 'minimumAge'),
    earliestRecommendedAge: extensionValue(children, 'earliestRecommendedAge'),
    latestRecommendedAge: extensionValue(children, 'latestRecommendedAge'),
  });
}

function mapDoseVaccine(extension: any): IceDoseVaccine {
  const children = childExtensions(extension);
  const vaccine = codeableConceptCoding(extensionValue(children, 'vaccine'));
  return {
    cvx: vaccine?.code ?? '',
    display: vaccine?.display,
    preferred: extensionValue(children, 'preferred') ?? false,
  };
}

function mapIntervalConstraint(relatedAction: any): IceIntervalConstraint[] {
  return extensions(relatedAction, DOSE_INTERVAL_CONSTRAINT_URL).map(
    (extension: any) => {
      const children = childExtensions(extension);
      return compactObject({
        fromDoseId: relatedAction['action-id'],
        relationship: relatedAction.relationship,
        absoluteMinimumInterval: extensionValue(
          children,
          'absoluteMinimumInterval',
        ),
        minimumInterval: extensionValue(children, 'minimumInterval'),
        earliestRecommendedInterval: extensionValue(
          children,
          'earliestRecommendedInterval',
        ),
        latestRecommendedInterval: extensionValue(
          children,
          'latestRecommendedInterval',
        ),
      }) as IceIntervalConstraint;
    },
  );
}

function extractFirstCodeSystem(root: any) {
  const codeSystems =
    root?.['cds-engine']?.['module-canonical-definition-map']?.[
      '[http://cdsframework.org/PlanDefinition/ice-forecast|1.0.0]'
    ]?.['code-systems'];
  const first = Object.values(codeSystems ?? {})[0] as any;
  if (!first?.concept) {
    throw new Error('ICE YAML file did not contain a CodeSystem concept list.');
  }
  return first;
}

function readYaml(path: string) {
  return YAML.parse(readFileSync(path, 'utf8'));
}

function childExtensions(container?: any) {
  return container?.extension ?? [];
}

function extensions(container: any, url: string) {
  return (container?.extension ?? []).filter((item: any) => item.url === url);
}

function extensionValue(extensions: any[], url: string): any {
  const extension = extensions.find((item) => item.url === url);
  if (!extension) return undefined;
  for (const [key, value] of Object.entries(extension)) {
    if (key.startsWith('value-') || key.startsWith('value')) return value;
  }
  return undefined;
}

function booleanProperty(concept: any, code: string) {
  return concept.property?.find((property: any) => property.code === code)
    ?.valueBoolean;
}

function stringProperty(concept: any, code: string) {
  const value = concept.property?.find(
    (property: any) => property.code === code,
  )?.valueString;
  return value === null ? undefined : value;
}

function codingProperties(concept: any, code: string): IceCoding[] {
  return (concept.property ?? [])
    .filter((property: any) => property.code === code)
    .map((property: any) => mapCoding(property.valueCoding))
    .filter(Boolean);
}

function codingProperty(concept: any, code: string): IceCoding | undefined {
  const coding = concept.property?.find(
    (property: any) => property.code === code,
  )?.valueCoding;
  return coding ? mapCoding(coding) : undefined;
}

function codeableConceptCoding(value: any): IceCoding | undefined {
  const coding = value?.coding?.[0];
  return coding ? mapCoding(coding) : undefined;
}

function mapCoding(coding: any): IceCoding {
  return {
    system: coding.system,
    code: String(coding.code),
    version: coding.version,
    display: coding.display,
  };
}

function compactObject<T extends Record<string, any>>(value: T): T | undefined {
  const compact = Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
  return Object.keys(compact).length > 0 ? compact : undefined;
}
