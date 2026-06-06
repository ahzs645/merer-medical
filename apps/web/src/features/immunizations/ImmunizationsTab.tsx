import { forecastImmunizations } from '@mere/immunization-forecast';
import { useMemo, useState } from 'react';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { AppPage } from '../../shared/components/AppPage';
import { ImmunizationCountry } from './types';
import { ImmunizationByTypePanel } from './components/ImmunizationByTypePanel';
import { ImmunizationHeader } from './components/ImmunizationHeader';
import { ImmunizationRecommendationsPanel } from './components/ImmunizationRecommendationsPanel';
import { ImmunizationSummaryPanel } from './components/ImmunizationSummaryPanel';
import { ImmunizationTimelinePanel } from './components/ImmunizationTimelinePanel';
import { useImmunizationData } from './hooks/useImmunizationData';

export function ImmunizationsTab() {
  const { t } = useInterfaceLanguage();
  const { records, counts, status } = useImmunizationData();
  const [country, setCountry] = useState<ImmunizationCountry>('CA');
  const recommendations = useMemo(
    () =>
      forecastImmunizations({
        country,
        immunizations: records.map((record) => ({
          id: record.id,
          vaccineName: record.vaccineName,
          vaccineCode: record.vaccineKey,
          date: record.date,
          status: record.status,
          doseNumber: record.doseNumber,
        })),
      }).recommendations,
    [records, country],
  );

  return (
    <AppPage banner={<ImmunizationHeader recordCount={records.length} />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <ImmunizationSummaryPanel counts={counts} />
          <ImmunizationRecommendationsPanel
            country={country}
            onCountryChange={setCountry}
            recommendations={recommendations}
          />
          <ImmunizationByTypePanel records={records} />
          <ImmunizationTimelinePanel records={records} />
          {status === 'loading' && (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              {t('Loading immunization records...')}
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
