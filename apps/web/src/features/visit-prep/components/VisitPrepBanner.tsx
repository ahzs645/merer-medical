import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { RecordPageHeader } from '../../../shared/components/records/RecordPageHeader';

export function VisitPrepBanner() {
  const { t } = useInterfaceLanguage();
  return (
    <RecordPageHeader
      title={t('Visit prep')}
      description={t(
        'Prepare questions and choose records for your next visit.',
      )}
      className="print:hidden"
    />
  );
}
