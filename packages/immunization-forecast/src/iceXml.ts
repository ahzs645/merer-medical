import { readFileSync } from 'node:fs';

import { XMLParser } from 'fast-xml-parser';

import {
  IceCoding,
  IceConceptDeterminationMethod,
  IceConceptMapping,
} from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: (name) =>
    ['conceptDeterminationMethod', 'conceptMapping', 'fromConcepts', 'concept'].includes(
      name,
    ),
});

export function loadConceptDeterminationMethods(
  path: string,
): IceConceptDeterminationMethod[] {
  const root = parser.parse(readFileSync(path, 'utf8'));
  const methods =
    root?.['ns2:conceptDeterminationMethods']?.conceptDeterminationMethod ?? [];

  return methods.map((method: any) => ({
    code: method.code,
    displayName: method.displayName,
    codeSystem: method.codeSystem,
    version: method.version,
    mappings: (method.conceptMapping ?? []).map(mapConceptMapping),
  }));
}

export function findIceConceptMappingsForSource({
  methods,
  sourceCode,
  sourceCodeSystem,
}: {
  methods: IceConceptDeterminationMethod[];
  sourceCode: string;
  sourceCodeSystem?: string;
}): IceConceptMapping[] {
  return methods.flatMap((method) =>
    method.mappings.filter((mapping) =>
      mapping.sources.some(
        (source) =>
          (!sourceCodeSystem || source.codeSystem === sourceCodeSystem) &&
          source.concepts.some((concept) => concept.code === sourceCode),
      ),
    ),
  );
}

function mapConceptMapping(mapping: any): IceConceptMapping {
  return {
    target: mapConcept(mapping.toConcept),
    sources: (mapping.fromConcepts ?? []).map((source: any) => ({
      codeSystem: source.codeSystem,
      codeSystemName: source.codeSystemName,
      displayName: source.displayName,
      concepts: (source.concept ?? []).map((concept: any) =>
        mapConcept({
          ...concept,
          codeSystem: source.codeSystem,
          codeSystemName: source.codeSystemName,
        }),
      ),
    })),
  };
}

function mapConcept(concept: any): IceCoding {
  return {
    system: concept.codeSystem,
    systemName: concept.codeSystemName,
    code: String(concept.code),
    version: concept.version,
    display: concept.displayName ?? concept.display,
  };
}
