import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { EmptyUserPlaceholder } from './EmptyUserPlaceholder';
import { EditUserForm, NewUserFormFields } from './EditUserModalForm';
import { useEffect, useState } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import { Modal } from '../../../shared/components/Modal';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import {
  fetchPatientRecords,
  parseGivenName,
  parseFamilyName,
  parseEmail,
  parseBirthday,
  parseGender,
} from '../SettingsTab';

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-end font-medium text-gray-900">
        {value}
      </dd>
    </div>
  );
}

export function UserCard() {
  const user = useUser(),
    db = useRxDb(),
    [defaultValues, setDefaultValues] = useState<NewUserFormFields | undefined>(
      undefined,
    ),
    [openEditUserModal, setOpenEditUserModal] = useState(false);

  useEffect(() => {
    fetchPatientRecords(db, user.id).then((data) => {
      const res = data.map((item) => item.toMutableJSON());
      const firstName = parseGivenName(
          res.filter((i) => parseGivenName(i) !== undefined)?.[0],
        ),
        lastName = parseFamilyName(
          res.filter((i) => parseFamilyName(i) !== undefined)?.[0],
        ),
        email = parseEmail(res.filter((i) => parseEmail(i) !== undefined)?.[0]),
        birthDate = parseBirthday(
          res.filter((i) => parseBirthday(i) !== undefined)?.[0],
        ),
        gender = parseGender(
          res.filter(
            (i) =>
              parseGender(i) !== undefined &&
              parseGender(i)?.toLocaleLowerCase() !== 'unknown',
          )?.[0],
        );

      setDefaultValues({
        firstName,
        lastName,
        email,
        birthday: birthDate,
        gender,
      });
    });
  }, [db, user.id]);

  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ');

  // 'PP' is date-fns' localized long date, so the birthday is never rendered
  // as an ambiguous US-only MM/DD/YYYY.
  const birthdayLabel = safeFormatDate(user?.birthday, 'PP');

  return (
    <>
      {(user === undefined || user.is_default_user) && (
        <EmptyUserPlaceholder
          openModal={() => {
            setOpenEditUserModal(true);
          }}
        />
      )}
      {user !== undefined && !user.is_default_user && (
        <div>
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Avatar stays small on phones so a setting is visible without
                scrolling; it only grows once there is room for it. */}
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-gray-300 sm:h-24 sm:w-24">
              {user?.profile_picture?.data ? (
                <img
                  className="h-full w-full object-cover"
                  src={user.profile_picture.data}
                  alt="profile"
                ></img>
              ) : (
                <svg
                  className="h-full w-full text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <p className="min-w-0 flex-1 break-words text-base font-semibold text-gray-900 sm:text-lg">
              {fullName}
            </p>
            <button
              type="button"
              className="focus:ring-primary-500 -me-2 inline-flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2"
              onClick={() => {
                setOpenEditUserModal(true);
              }}
            >
              <PencilIcon className="h-4 w-4" aria-hidden="true" />
              Edit profile
            </button>
          </div>
          <dl className="mt-3 divide-y divide-gray-100 border-t border-gray-100 text-sm sm:mt-4">
            <ProfileField label="Birthday" value={birthdayLabel} />
            <ProfileField label="Email" value={user.email} />
          </dl>
        </div>
      )}
      <Modal
        open={openEditUserModal}
        setOpen={() => setOpenEditUserModal((x) => !x)}
      >
        <EditUserForm
          defaultValues={
            !user.is_default_user
              ? ({
                  birthday: user.birthday,
                  email: user.email,
                  firstName: user.first_name,
                  gender: user.gender,
                  lastName: user.last_name,
                  profilePhoto: user.profile_picture,
                } as NewUserFormFields)
              : defaultValues
          }
          toggleModal={() => setOpenEditUserModal((x) => !x)}
        />
      </Modal>
    </>
  );
}
