import { BundleEntry, Patient } from 'fhir/r2';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RxDatabase, RxDocument } from 'rxdb';

import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { DatabaseCollections } from '../../app/providers/DatabaseCollections';
import { AboutMereSettingsGroup } from './components/AboutMereSettingsGroup';
import { DeveloperSettingsGroup } from './components/DeveloperSettingsGroup';
import { PrivacyAndSecuritySettingsGroup } from './components/PrivacyAndSecuritySettingsGroup';
import { UserCard } from './components/UserCard';
import { UserDataSettingsGroup } from './components/UserDataSettingsGroup';
import { TerminologySettingsGroup } from './components/TerminologySettingsGroup';
import { InterfaceLanguageSettingsGroup } from './components/InterfaceLanguageSettingsGroup';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ExperimentalSettingsGroup } from './components/ExperimentalSettingsGroup';
import { MedicationInteractionSettingsGroup } from './components/MedicationInteractionSettingsGroup';
import { UserSwitchModal } from './components/UserSwitchModal';
import { UserSwitchDrawer } from './components/UserSwitchDrawer';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useNotificationDispatch } from '../../app/providers/NotificationProvider';
import { importEmrpkgToRxDb, inspectEmrpkg } from '../../services/emrpkg';

export function fetchPatientRecords(
  db: RxDatabase<DatabaseCollections>,
  user_id: string,
) {
  return db.clinical_documents
    .find({
      selector: {
        'data_record.resource_type': `patient`,
        user_id: user_id,
      },
      sort: [{ 'metadata.date': 'desc' }],
    })
    .exec()
    .then((list) => {
      const lst = list as unknown as RxDocument<
        ClinicalDocument<BundleEntry<Patient>>
      >[];
      return lst;
    });
}

export function parseGivenName(
  item: ClinicalDocument<BundleEntry<Patient>>,
): string | undefined {
  return item?.data_record.raw.resource?.name?.[0].given?.[0];
}

export function parseFamilyName(
  item: ClinicalDocument<BundleEntry<Patient>>,
): string | undefined {
  return item?.data_record.raw.resource?.name?.[0].family?.[0];
}

export function parseEmail(
  item: ClinicalDocument<BundleEntry<Patient>>,
): string | undefined {
  return item?.data_record.raw.resource?.telecom?.find(
    (x) => x.system === 'email',
  )?.value;
}

export function parseBirthday(
  item: ClinicalDocument<BundleEntry<Patient>>,
): string | undefined {
  return item?.data_record.raw.resource?.birthDate;
}

export function parseGender(
  item: ClinicalDocument<BundleEntry<Patient>>,
): string | undefined {
  return item?.data_record.raw.resource?.gender;
}

function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target?.result;
      if (buf instanceof ArrayBuffer) resolve(new Uint8Array(buf));
      else reject(new Error('Unable to read file'));
    };
    reader.onerror = (e) =>
      reject(new Error('File read error: ' + e.target?.error));
    reader.readAsArrayBuffer(file);
  });
}

const SettingsTab: React.FC = () => {
  const { t } = useInterfaceLanguage();
  const db = useRxDb();
  const notifyDispatch = useNotificationDispatch();
  const { pathname, hash, key } = useLocation();
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const importUserProfileRef = useRef<HTMLInputElement | null>(null);

  const handleUserProfileImport = useCallback(
    async (file: File) => {
      if (!db) {
        notifyDispatch({
          type: 'set_notification',
          message: 'Import failed: database is not ready yet.',
          variant: 'error',
        });
        return;
      }

      try {
        const bytes = await readFileAsBytes(file);
        const info = await inspectEmrpkg(bytes);
        if (info.encrypted) {
          notifyDispatch({
            type: 'set_notification',
            message:
              'This user profile package is encrypted. Import it from Data settings so you can enter the passphrase.',
            variant: 'error',
          });
          return;
        }

        const { counts, unknownTables } = await importEmrpkgToRxDb(bytes, db, {
          replace: false,
        });
        const total = Object.values(counts).reduce<number>(
          (a, b) => a + (b ?? 0),
          0,
        );
        const extra = unknownTables.length
          ? ` Skipped: ${unknownTables.join(', ')}.`
          : '';
        notifyDispatch({
          type: 'set_notification',
          message: `Imported user profile with ${total} records.${extra} Reloading...`,
          variant: 'success',
        });
        setShowUserSwitcher(false);
        setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        notifyDispatch({
          type: 'set_notification',
          message: `Import failed: ${(e as Error).message}`,
          variant: 'error',
        });
      }
    },
    [db, notifyDispatch],
  );

  const openUserProfileImport = useCallback(() => {
    importUserProfileRef.current?.click();
  }, []);

  // Detect screen size - matches Tailwind's sm: breakpoint (640px)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const handleChange = () => setIsDesktop(mediaQuery.matches);

    // Set initial value
    handleChange();

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }
    }, 100);
  }, [pathname, hash, key]);

  return (
    <AppPage
      banner={<GenericBanner text={t('Settings')} />}
      contentClassName="overflow-y-auto overscroll-contain"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-x-4 px-4 pt-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          <div className="text-xl font-extrabold">{t('About Me')}</div>
          <button
            onClick={() => setShowUserSwitcher(true)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-primary-50 transition-colors"
          >
            {t('Switch User')}
          </button>
        </div>
      </div>
      <UserCard />
      <div className="mx-auto flex max-w-4xl flex-col gap-x-4 px-4 pb-20 pt-2 sm:px-6 sm:pb-6 lg:px-8">
        <InterfaceLanguageSettingsGroup />
        <PrivacyAndSecuritySettingsGroup />
        <TerminologySettingsGroup />
        <MedicationInteractionSettingsGroup />
        <UserDataSettingsGroup />
        <AboutMereSettingsGroup />
        <ExperimentalSettingsGroup />
        <DeveloperSettingsGroup />
      </div>

      {isDesktop ? (
        <UserSwitchModal
          open={showUserSwitcher}
          onClose={() => setShowUserSwitcher(false)}
          onAddNewUser={openUserProfileImport}
        />
      ) : (
        <UserSwitchDrawer
          open={showUserSwitcher}
          onClose={() => setShowUserSwitcher(false)}
          onAddNewUser={openUserProfileImport}
        />
      )}

      <input
        ref={importUserProfileRef}
        type="file"
        accept=".emrpkg,application/octet-stream,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleUserProfileImport(file);
          }
          event.target.value = '';
        }}
      />
    </AppPage>
  );
};

export default SettingsTab;
