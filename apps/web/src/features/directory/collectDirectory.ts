import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { getFhirResource } from '../../shared/utils/fhirResource';

export interface DirectoryProvider {
  name: string;
  roles: string[];
  organization?: string;
  contacts: string[];
  /** How many records name this person, so a row says why it is here. */
  recordCount: number;
  /** ISO date of the most recent record naming them. */
  latestDate?: string;
}

export interface DirectoryFacility {
  name: string;
  address?: string;
  phone?: string;
  raw: string;
  recordCount: number;
  latestDate?: string;
}

/**
 * Best-effort split of a concatenated facility string like
 * "Jasper Healthcare Centre Lab/DI 518 Robson Street Jasper, AB T0E 1E0 780-852-6606"
 * into name / address / phone. Never throws; falls back to the raw string.
 */
export function parseFacility(display: string): DirectoryFacility {
  const raw = display.trim();
  let working = raw;
  let phone: string | undefined;
  // Match a North-American phone at the end without swallowing the trailing
  // digit of a preceding postal code (e.g. "T0E 1E0 780-852-6606").
  const phoneMatch = working.match(
    /(\+?1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\s*$/,
  );
  if (phoneMatch && phoneMatch.index !== undefined) {
    phone = phoneMatch[0].trim();
    working = working.slice(0, phoneMatch.index).trim();
  }
  // The address usually begins at the first standalone number (street number).
  let name = working;
  let address: string | undefined;
  const addressMatch = working.match(/\s(\d{1,6}\s+\S.*)$/);
  if (addressMatch && addressMatch.index !== undefined) {
    name = working.slice(0, addressMatch.index).trim();
    address = addressMatch[1].trim();
  }
  return { name: name || raw, address, phone, raw, recordCount: 0 };
}

type Ref = { display?: string; reference?: string } | undefined;
type Coding = { text?: string; coding?: { display?: string }[] } | undefined;

function refName(ref: Ref): string | undefined {
  const display = ref?.display?.trim();
  return display || undefined;
}

function codingText(value: Coding): string | undefined {
  return (
    value?.text?.trim() || value?.coding?.[0]?.display?.trim() || undefined
  );
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Every place a stored resource names a person.
 *
 * The directory used to read exactly one of these — `CareTeam.participant` —
 * which is why it sat empty on a library whose lab rows, documents and dental
 * records all print a clinician's name. A performer on a report is as much a
 * provider as a care-team member; the difference is only which field the
 * source happened to fill.
 */
function providersOnResource(
  resource: Record<string, unknown>,
): { name: string; role?: string; organization?: string; contact?: string }[] {
  const found: {
    name: string;
    role?: string;
    organization?: string;
    contact?: string;
  }[] = [];

  const organization =
    refName(
      asArray(resource['managingOrganization'] as Ref | Ref[])[0] as Ref,
    ) ||
    refName(resource['serviceProvider'] as Ref) ||
    refName(resource['custodian'] as Ref);

  // CareTeam.participant — the original source, kept.
  for (const participant of asArray(
    resource['participant'] as
      | {
          role?: Coding[];
          member?: Ref;
          individual?: Ref;
          extension?: { valueString?: string }[];
        }
      | undefined,
  )) {
    const name =
      refName(participant?.member) || refName(participant?.individual);
    if (!name) continue;
    for (const extension of participant?.extension || []) {
      if (extension.valueString) {
        found.push({ name, organization, contact: extension.valueString });
      }
    }
    const roles = (participant?.role || []).map(codingText).filter(Boolean);
    if (roles.length === 0) found.push({ name, organization });
    for (const role of roles) found.push({ name, role, organization });
  }

  // Performers, authors, recorders, requesters: the fields a report, a
  // document, a procedure and an order actually use.
  const performers = [
    ...asArray(
      resource['performer'] as
        | (Ref & { actor?: Ref; function?: Coding })
        | (Ref & { actor?: Ref; function?: Coding })[]
        | undefined,
    ).map((entry) => ({
      name: refName(entry?.actor) || refName(entry),
      role: codingText(entry?.function),
    })),
    ...asArray(resource['author'] as Ref | Ref[]).map((entry) => ({
      name: refName(entry),
      role: 'Author',
    })),
    { name: refName(resource['recorder'] as Ref), role: 'Recorded by' },
    { name: refName(resource['asserter'] as Ref), role: 'Asserted by' },
    { name: refName(resource['requester'] as Ref), role: 'Requester' },
    {
      name: refName((resource['requester'] as { agent?: Ref })?.agent),
      role: 'Requester',
    },
    {
      name: refName(resource['informationSource'] as Ref),
      role: 'Information source',
    },
    { name: refName(resource['generalPractitioner'] as Ref), role: 'GP' },
  ];

  for (const entry of performers) {
    if (entry.name)
      found.push({ name: entry.name, role: entry.role, organization });
  }

  // A Practitioner resource of its own, if the source stored one.
  const humanName = asArray(
    resource['name'] as
      | { text?: string; given?: string[]; family?: string }
      | { text?: string; given?: string[]; family?: string }[]
      | undefined,
  )[0];
  if (resource['resourceType'] === 'Practitioner' && humanName) {
    const name =
      humanName.text?.trim() ||
      [humanName.given?.join(' '), humanName.family].filter(Boolean).join(' ');
    if (name) found.push({ name, organization });
  }

  return found.filter((entry) => entry.name.length > 1);
}

/** Every place a stored resource names a place. */
function facilitiesOnResource(resource: Record<string, unknown>): string[] {
  const names: (string | undefined)[] = [
    ...asArray(
      resource['location'] as
        | { location?: Ref }
        | Ref
        | ({ location?: Ref } | Ref)[]
        | undefined,
    ).map(
      (entry) =>
        refName((entry as { location?: Ref })?.location) ||
        refName(entry as Ref),
    ),
    refName(resource['serviceProvider'] as Ref),
    refName(resource['custodian'] as Ref),
    refName(asArray(resource['managingOrganization'] as Ref | Ref[])[0] as Ref),
  ];
  return names.filter((name): name is string => !!name && name.length > 1);
}

/**
 * Builds the directory from every clinical record, rather than from the one
 * resource type that happened to be wired up.
 */
export function collectDirectory(docs: ClinicalDocument[]): {
  providers: DirectoryProvider[];
  facilities: DirectoryFacility[];
} {
  const providerByName = new Map<string, DirectoryProvider>();
  const facilityByKey = new Map<string, DirectoryFacility>();

  for (const doc of docs) {
    const resource = getFhirResource<Record<string, unknown>>(doc);
    if (!resource) continue;
    const date = doc.metadata?.date;

    const seenProviders = new Set<string>();
    for (const entry of providersOnResource(resource)) {
      const provider = providerByName.get(entry.name) || {
        name: entry.name,
        roles: [],
        contacts: [],
        recordCount: 0,
      };
      if (entry.role && !provider.roles.includes(entry.role)) {
        provider.roles.push(entry.role);
      }
      if (entry.contact && !provider.contacts.includes(entry.contact)) {
        provider.contacts.push(entry.contact);
      }
      if (!provider.organization) provider.organization = entry.organization;
      // One record naming the same person twice is still one record.
      if (!seenProviders.has(entry.name)) {
        seenProviders.add(entry.name);
        provider.recordCount += 1;
        if (date && (!provider.latestDate || date > provider.latestDate)) {
          provider.latestDate = date;
        }
      }
      providerByName.set(entry.name, provider);
    }

    const seenFacilities = new Set<string>();
    for (const display of facilitiesOnResource(resource)) {
      const facility = facilityByKey.get(display) || parseFacility(display);
      if (!seenFacilities.has(display)) {
        seenFacilities.add(display);
        facility.recordCount += 1;
        if (date && (!facility.latestDate || date > facility.latestDate)) {
          facility.latestDate = date;
        }
      }
      facilityByKey.set(display, facility);
    }
  }

  const byCountThenName = <T extends { recordCount: number; name: string }>(
    a: T,
    b: T,
  ) => b.recordCount - a.recordCount || a.name.localeCompare(b.name);

  return {
    providers: [...providerByName.values()].sort(byCountThenName),
    facilities: [...facilityByKey.values()].sort(byCountThenName),
  };
}
