import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { ManualRecordForm } from './ManualRecordForm';
import { useManualRecordForm } from './hooks/useManualRecordForm';

export function ManualRecordTab() {
  const form = useManualRecordForm();
  const { t, isEditing } = form;

  return (
    <AppPage
      banner={
        <GenericBanner text={t(isEditing ? 'Edit record' : 'Add record')} />
      }
    >
      <ManualRecordForm form={form} />
    </AppPage>
  );
}
