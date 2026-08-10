import { ShieldCheckIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../../shared/components/records/RecordPageHeader';

export function ImmunizationHeader({ recordCount }: { recordCount: number }) {
  const { t } = useInterfaceLanguage();

  return (
    <RecordPageHeader
      title={t('Immunizations')}
      icon={ShieldCheckIcon}
      count={
        <>
          {recordCount} {t('vaccine records with booster tracking')}
        </>
      }
      action={
        <RecordHeaderLink
          to={`${AppRoutes.AddRecord}?type=immunization`}
          label={t('Add immunization')}
        />
      }
    />
  );
}
