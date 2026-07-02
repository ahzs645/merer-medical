import { useEffect, useMemo, useState } from 'react';
import { BuildingOffice2Icon, UserIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import {
  EmptyState,
  SearchInput,
} from '../../shared/components/records/RecordListPage';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { getFhirResource } from '../../shared/utils/fhirResource';

interface Provider {
  name: string;
  roles: string[];
  organization?: string;
  contacts: string[];
}

interface Facility {
  name: string;
  address?: string;
  phone?: string;
  raw: string;
}

type CareTeamResource = {
  participant?: Array<{
    role?: Array<{ text?: string }>;
    member?: { display?: string };
    extension?: Array<{ valueString?: string }>;
  }>;
  managingOrganization?: Array<{ display?: string }>;
};

type EncounterResource = {
  location?: Array<{ location?: { display?: string } }>;
};

/** Best-effort split of a concatenated facility string like
 * "Jasper Healthcare Centre Lab/DI 518 Robson Street Jasper, AB T0E 1E0 780-852-6606"
 * into name / address / phone. Never throws; falls back to the raw string. */
export function parseFacility(display: string): Facility {
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
  return { name: name || raw, address, phone, raw };
}

function useDirectory() {
  const db = useRxDb();
  const user = useUser();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      setError(null);
      const [careTeamDocs, encounterDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'careteam',
            },
          })
          .exec(),
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'encounter',
            },
          })
          .exec(),
      ]);
      if (!mounted) return;

      const providerByName = new Map<string, Provider>();
      for (const doc of careTeamDocs) {
        const d = doc.toMutableJSON() as ClinicalDocument;
        const resource = getFhirResource<CareTeamResource>(d);
        const organization = resource?.managingOrganization?.[0]?.display;
        for (const participant of resource?.participant || []) {
          const name = participant.member?.display?.trim();
          if (!name) continue;
          const provider =
            providerByName.get(name) ||
            ({ name, roles: [], organization, contacts: [] } as Provider);
          for (const role of participant.role || []) {
            if (role.text && !provider.roles.includes(role.text)) {
              provider.roles.push(role.text);
            }
          }
          for (const extension of participant.extension || []) {
            if (
              extension.valueString &&
              !provider.contacts.includes(extension.valueString)
            ) {
              provider.contacts.push(extension.valueString);
            }
          }
          if (!provider.organization) provider.organization = organization;
          providerByName.set(name, provider);
        }
      }

      const facilityByKey = new Map<string, Facility>();
      for (const doc of encounterDocs) {
        const d = doc.toMutableJSON() as ClinicalDocument;
        const resource = getFhirResource<EncounterResource>(d);
        for (const entry of resource?.location || []) {
          const display = entry.location?.display?.trim();
          if (!display) continue;
          if (!facilityByKey.has(display)) {
            facilityByKey.set(display, parseFacility(display));
          }
        }
      }

      const providerList = Array.from(providerByName.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const facilityList = Array.from(facilityByKey.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      setProviders(providerList);
      setFacilities(facilityList);
      setStatus('success');
    }
    load().catch((e) => {
      if (!mounted) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
    });
    return () => {
      mounted = false;
    };
  }, [db, user.id]);

  return { providers, facilities, status, error };
}

export function DirectoryTab() {
  const { providers, facilities, status, error } = useDirectory();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filteredProviders = useMemo(
    () =>
      !q
        ? providers
        : providers.filter((p) =>
            [p.name, p.organization, ...p.roles]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
          ),
    [providers, q],
  );
  const filteredFacilities = useMemo(
    () =>
      !q
        ? facilities
        : facilities.filter((f) =>
            [f.name, f.address, f.phone]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
          ),
    [facilities, q],
  );

  return (
    <AppPage banner={<GenericBanner text="Providers & locations" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search providers and locations"
            label="Search providers and locations"
          />

          {status === 'loading' ? (
            <EmptyState text="Loading directory…" />
          ) : status === 'error' ? (
            <ErrorPanel error={error} text="Unable to load directory." />
          ) : (
            <>
              <Section
                title="Providers"
                icon={<UserIcon className="h-5 w-5" />}
                count={filteredProviders.length}
              >
                {providers.length === 0 ? (
                  <EmptyState text="No providers recorded yet." />
                ) : filteredProviders.length === 0 ? (
                  <EmptyState text="No providers match this search." />
                ) : (
                  filteredProviders.map((provider) => (
                    <article
                      key={provider.name}
                      className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
                    >
                      <h3 className="text-sm font-semibold text-gray-900">
                        {provider.name}
                      </h3>
                      {provider.roles.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-600">
                          {provider.roles.join(' · ')}
                        </p>
                      )}
                      {provider.organization && (
                        <p className="text-xs text-gray-500">
                          {provider.organization}
                        </p>
                      )}
                      {provider.contacts.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          {provider.contacts.join(' · ')}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </Section>

              <Section
                title="Locations"
                icon={<BuildingOffice2Icon className="h-5 w-5" />}
                count={filteredFacilities.length}
              >
                {facilities.length === 0 ? (
                  <EmptyState text="No locations recorded yet." />
                ) : filteredFacilities.length === 0 ? (
                  <EmptyState text="No locations match this search." />
                ) : (
                  filteredFacilities.map((facility) => (
                    <article
                      key={facility.raw}
                      className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
                    >
                      <h3 className="text-sm font-semibold text-gray-900">
                        {facility.name}
                      </h3>
                      {facility.address && (
                        <p className="mt-0.5 text-xs text-gray-600">
                          {facility.address}
                        </p>
                      )}
                      {facility.phone && (
                        <p className="text-xs text-gray-500">
                          {facility.phone}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center gap-2 text-gray-700">
        <span className="bg-primary-50 text-primary-700 flex h-7 w-7 items-center justify-center rounded-full">
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      {children}
    </section>
  );
}
