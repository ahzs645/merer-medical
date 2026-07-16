import { useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { exportEmrpkgFromRxDb } from '../../../services/emrpkg';
import { appendAuditLog } from '../../audit/auditLog';
import { downloadBlob, filenameDate } from '../utils/packetExport';

export function useRecordPackageExport() {
  const db = useRxDb();
  const user = useUser();
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportBusy, setExportBusy] = useState(false);

  async function downloadRecordPackage() {
    if (passwordProtect && !exportPassphrase.trim()) return;
    setExportBusy(true);
    try {
      const bytes = await exportEmrpkgFromRxDb(db, {
        passphrase: passwordProtect ? exportPassphrase : undefined,
        exportNotes: {
          scope: 'visit',
          userId: user.id,
          includeProvenance: true,
          includeAttachments,
          includeAuditTrail,
        },
      });
      await appendAuditLog(db, {
        userId: user.id,
        actor: 'local-user',
        action: 'record.export',
        targetType: 'emrpkg',
        source: 'Visit prep',
        summary: 'Exported visit-prep record package',
      });
      downloadBlob(
        new Blob([bytes], { type: 'application/octet-stream' }),
        `visit-prep-records-${filenameDate(new Date())}${
          passwordProtect ? '.enc' : ''
        }.emrpkg`,
      );
    } finally {
      setExportBusy(false);
    }
  }

  return {
    includeAttachments,
    setIncludeAttachments,
    includeAuditTrail,
    setIncludeAuditTrail,
    passwordProtect,
    setPasswordProtect,
    exportPassphrase,
    setExportPassphrase,
    exportBusy,
    downloadRecordPackage,
  };
}
