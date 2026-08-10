import { FaceSmileIcon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../../shared/components/records/RecordPageHeader';

export function DentalHeader({
  recordCount,
  imageCount,
}: {
  recordCount: number;
  imageCount: number;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <RecordPageHeader
      title={t('Dental')}
      icon={FaceSmileIcon}
      count={
        <>
          {t('{count} dental records')
            .replace('{count}', `${recordCount}`)
            .replace(
              'سجل أسنان',
              recordCount === 1 ? 'سجل أسنان' : 'سجلات أسنان',
            )}{' '}
          ·{' '}
          {t('{count} dental images or scans').replace(
            '{count}',
            `${imageCount}`,
          )}
        </>
      }
      action={
        <RecordHeaderLink
          to={`${AppRoutes.AddRecord}?specialty=dental`}
          label={t('Add dental record')}
        />
      }
    />
  );
}
