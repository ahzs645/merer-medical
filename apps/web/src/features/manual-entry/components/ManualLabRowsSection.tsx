import { LabResultsTable } from '../LabResultsTable';
import { createLabRow } from '../manualRecordTypes';
import type { ManualRecordFormController } from '../hooks/useManualRecordForm';

export function ManualLabRowsSection({
  form,
}: {
  form: ManualRecordFormController;
}) {
  const {
    labRows,
    submitAttempted,
    completedLabRows,
    setLabRows,
    updateLabRow,
    applyLabTerminology,
    terminologyProfile,
    terminologyLanguage,
    terminologyLookupMode,
    terminologyRemoteEnabled,
  } = form;

  return (
    <LabResultsTable
      rows={labRows}
      submitAttempted={submitAttempted}
      completedRowCount={completedLabRows.length}
      onAddRow={() => setLabRows((rows) => [...rows, createLabRow()])}
      onRemoveRow={(rowId) =>
        setLabRows((rows) => rows.filter((item) => item.id !== rowId))
      }
      onUpdateRow={updateLabRow}
      onSelectTerminology={applyLabTerminology}
      profile={terminologyProfile}
      language={terminologyLanguage}
      lookupMode={terminologyLookupMode}
      remoteEnabled={terminologyRemoteEnabled}
    />
  );
}
