import { AppPage } from '../../shared/components/AppPage';
import { RecordPageHeader } from '../../shared/components/records/RecordPageHeader';
import { ALL_RECORD_CATEGORIES } from '../records/recordCategories';
import { ManualRecordForm } from './ManualRecordForm';
import { useManualRecordForm } from './hooks/useManualRecordForm';

export function ManualRecordTab() {
  const form = useManualRecordForm();
  const { t, isEditing, presetAddTitle, returnTo } = form;

  // "Add medication" used to land on a page headed "Add record" with no way
  // back except the browser button. `returnTo` already names the page whose
  // button you pressed and the record categories already name that route, so
  // both the title and the way out were handed to us and dropped. This uses
  // RecordPageHeader rather than GenericBanner only because the alias exposes
  // no back-link slot.
  const backCategory = ALL_RECORD_CATEGORIES.find(
    (category) => category.to === returnTo,
  );
  const title = isEditing
    ? t('Edit record')
    : presetAddTitle || t('Add record');

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title={title}
          backLink={
            returnTo
              ? {
                  to: returnTo,
                  label: backCategory ? t(backCategory.label) : t('Back'),
                }
              : undefined
          }
        />
      }
    >
      <ManualRecordForm form={form} />
    </AppPage>
  );
}
