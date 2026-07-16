import { forecastImmunizations } from '@mere/immunization-forecast';
import { useMemo, useState } from 'react';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useUser } from '../../app/providers/UserProvider';
import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { ImmunizationCountry, ImmunizationRecord } from './types';
import { ImmunizationByTypePanel } from './components/ImmunizationByTypePanel';
import { ImmunizationDoseModal } from './components/ImmunizationDoseModal';
import { ImmunizationHeader } from './components/ImmunizationHeader';
import { ImmunizationRecommendationsPanel } from './components/ImmunizationRecommendationsPanel';
import { ImmunizationSummaryPanel } from './components/ImmunizationSummaryPanel';
import { ImmunizationTimelinePanel } from './components/ImmunizationTimelinePanel';
import { useImmunizationData } from './hooks/useImmunizationData';

export function ImmunizationsTab() {
  const { t } = useInterfaceLanguage();
  const user = useUser();
  const { records, counts, status, error } = useImmunizationData();
  const [country, setCountry] = useState<ImmunizationCountry>('CA');
  const [selectedDose, setSelectedDose] = useState<ImmunizationRecord | null>(
    null,
  );
  const recommendations = useMemo(
    () =>
      forecastImmunizations({
        country,
        patient: user?.birthday ? { birthDate: user.birthday } : undefined,
        immunizations: records.map((record) => ({
          id: record.id,
          vaccineName: record.vaccineName,
          vaccineCode: record.vaccineKey,
          date: record.date,
          status: record.status,
          doseNumber: record.doseNumber,
        })),
      }).recommendations,
    [records, country, user?.birthday],
  );

  const isLoading = status === 'loading';
  const isEmpty = status === 'success' && records.length === 0;

  return (
    <AppPage banner={<ImmunizationHeader recordCount={records.length} />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {isLoading && (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
              {t('Loading immunization records...')}
            </div>
          )}

          {status === 'error' && <ErrorPanel error={error} />}

          {status === 'success' && (
            <>
              <ImmunizationSummaryPanel counts={counts} />
              <ImmunizationRecommendationsPanel
                country={country}
                onCountryChange={setCountry}
                recommendations={recommendations}
              />
              {isEmpty ? (
                <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {t('No immunizations yet')}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                    {t(
                      'Immunizations will appear here once they are added manually or synced from a patient portal.',
                    )}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                  <ImmunizationByTypePanel
                    records={records}
                    recommendations={recommendations}
                    onSelectDose={setSelectedDose}
                  />
                  <ImmunizationTimelinePanel records={records} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ImmunizationDoseModal
        record={selectedDose ?? undefined}
        records={records}
        open={selectedDose !== null}
        onClose={() => setSelectedDose(null)}
        onSelectRecord={setSelectedDose}
      />
    </AppPage>
  );
}
