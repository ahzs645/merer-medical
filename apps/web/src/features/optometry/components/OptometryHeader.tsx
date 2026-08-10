import { EyeIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { Routes as AppRoutes } from '../../../Routes';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../../shared/components/records/RecordPageHeader';

export function OptometryHeader({
  recordCount,
  imageCount,
}: {
  recordCount: number;
  imageCount: number;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <RecordPageHeader
      title={t('Optometry')}
      icon={EyeIcon}
      count={
        <>
          {t('{count} eye-care records').replace('{count}', `${recordCount}`)} ·{' '}
          {t('{count} imaging or device reports').replace(
            '{count}',
            `${imageCount}`,
          )}
        </>
      }
      action={
        <RecordHeaderLink
          to={`${AppRoutes.AddRecord}?specialty=optometry`}
          label={t('Add eye-care record')}
        />
      }
    />
  );
}
