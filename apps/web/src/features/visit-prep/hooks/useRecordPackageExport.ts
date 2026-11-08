import { useEffect, useRef, useState } from 'react';

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
  const [exportError, setExportError] = useState<string | null>(null);
  const exportGenerationRef = useRef(0);
  const exportOwnerRef = useRef({ db, userId: user.id });
  exportOwnerRef.current = { db, userId: user.id };

  useEffect(() => {
    exportGenerationRef.current += 1;
    setExportBusy(false);
    setExportError(null);
    setExportPassphrase('');
    return () => {
      exportGenerationRef.current += 1;
    };
  }, [db, user.id]);

  async function downloadRecordPackage() {
    if (exportBusy || (passwordProtect && !exportPassphrase.trim())) return;
    const generation = ++exportGenerationRef.current;
    const isCurrent = () =>
      generation === exportGenerationRef.current &&
      exportOwnerRef.current.db === db &&
      exportOwnerRef.current.userId === user.id;
    setExportBusy(true);
    setExportError(null);
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
      if (!isCurrent()) return;
      await appendAuditLog(db, {
        userId: user.id,
        actor: 'local-user',
        action: 'record.export',
        targetType: 'emrpkg',
        source: 'Visit prep',
        summary: 'Exported visit-prep record package',
      });
      if (!isCurrent()) return;
      downloadBlob(
        new Blob([bytes], { type: 'application/octet-stream' }),
        `visit-prep-records-${filenameDate(new Date())}${
          passwordProtect ? '.enc' : ''
        }.emrpkg`,
      );
    } catch {
      if (isCurrent()) {
        setExportError('Unable to prepare the package. Try downloading again.');
      }
    } finally {
      if (isCurrent()) setExportBusy(false);
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
    exportError,
    downloadRecordPackage,
  };
}
