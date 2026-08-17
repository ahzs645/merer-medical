import { useEffect, useMemo, useState } from 'react';
import { BuildingOffice2Icon, UserIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { EmptyState } from '../../shared/components/records/RecordListPage';
import { RecordPageHeader } from '../../shared/components/records/RecordPageHeader';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { useRecordChangeTick } from '../../shared/utils/recordChangeSignal';
import { safeFormatDate } from '../../shared/utils/dateFormatters';

import {
  collectDirectory,
  type DirectoryFacility,
  type DirectoryProvider,
} from './collectDirectory';
import { useListViewParams } from '../../shared/hooks/useListViewParams';

export { parseFacility } from './collectDirectory';

function useDirectory() {
  const db = useRxDb();
  const user = useUser();
  // A manually added visit brings its location with it, so this list grows
  // when records change too. Refetch on the same signal every other tab uses.
  const recordChangeTick = useRecordChangeTick();
  const [providers, setProviders] = useState<DirectoryProvider[]>([]);
  const [facilities, setFacilities] = useState<DirectoryFacility[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      setError(null);
      // Every record, not just care teams and encounters: a clinician named as
      // the performer on a report is a provider, and reading two fields out of
      // twenty is what left this page empty while their names were on screen
      // everywhere else.
      const docs = await db.clinical_documents
        .find({ selector: { user_id: user.id } })
        .exec();
      if (!mounted) return;

      const { providers: providerList, facilities: facilityList } =
        collectDirectory(
          docs.map((doc) => doc.toMutableJSON() as ClinicalDocument),
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
  }, [db, user.id, recordChangeTick]);

  return { providers, facilities, status, error };
}

export function DirectoryTab() {
  const { providers, facilities, status, error } = useDirectory();
  // Search lives in the URL, so the view survives Back, can be linked, and
  // comes back the same length it left — see useListViewParams.
  const { query, setQuery } = useListViewParams();

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
    <AppPage
      banner={
        <RecordPageHeader
          title="Providers & locations"
          description="Everyone and everywhere named on your records, gathered from the records themselves."
          search={{
            query,
            onChange: setQuery,
            placeholder: 'Search providers and locations',
          }}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
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
                  <EmptyState text="No provider is named on any record yet. Names appear here as your records arrive — the clinician on a report, the author of a document, a care-team member." />
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
                        <p className="text-xs text-gray-700">
                          {provider.organization}
                        </p>
                      )}
                      {provider.contacts.length > 0 && (
                        <p className="mt-1 text-xs text-gray-700">
                          {provider.contacts.join(' · ')}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-700">
                        {provider.recordCount === 1
                          ? 'On 1 record'
                          : `On ${provider.recordCount} records`}
                        {provider.latestDate
                          ? ` · latest ${safeFormatDate(provider.latestDate, 'PP', '')}`
                          : ''}
                      </p>
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
                  <EmptyState text="No place is named on any record yet. Clinics and hospitals appear here as your visits and documents arrive." />
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
                        <p className="text-xs text-gray-700">
                          {facility.phone}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-700">
                        {facility.recordCount === 1
                          ? 'On 1 record'
                          : `On ${facility.recordCount} records`}
                        {facility.latestDate
                          ? ` · latest ${safeFormatDate(facility.latestDate, 'PP', '')}`
                          : ''}
                      </p>
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
        <span className="text-xs text-gray-700">{count}</span>
      </div>
      {children}
    </section>
  );
}
