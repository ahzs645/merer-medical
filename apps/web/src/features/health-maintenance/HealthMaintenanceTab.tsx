import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { Routes as AppRoutes } from '../../Routes';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { conceptCodes, firstText } from '../../shared/utils/fhirText';
import {
  appliesToPatient,
  evaluateReminder,
  MAINTENANCE_RULES,
  MaintenanceRule,
  Reminder,
  ReminderStatus,
  Sex,
} from './rules';

function recordDate(
  r: Record<string, unknown>,
  doc: ClinicalDocument,
): string | undefined {
  return (
    (r['occurrenceDateTime'] as string) ||
    (r['effectiveDateTime'] as string) ||
    (r['performedDateTime'] as string) ||
    (typeof r['date'] === 'string' ? (r['date'] as string) : undefined) ||
    doc.metadata?.date
  );
}

function latest(dates: (string | undefined)[]): string | undefined {
  return dates
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => b.localeCompare(a))[0];
}

function ageFromBirthday(
  birthday?: string,
  now = new Date(),
): number | undefined {
  if (!birthday) return undefined;
  const dob = new Date(birthday);
  if (Number.isNaN(dob.getTime())) return undefined;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function sexFromGender(
  gender?: string,
): Extract<Sex, 'male' | 'female'> | undefined {
  const normalized = gender?.toLowerCase();
  if (normalized === 'female') return 'female';
  if (normalized === 'male') return 'male';
  return undefined;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function useReminders() {
  const db = useRxDb();
  const user = useUser();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      const now = new Date();
      const age = ageFromBirthday(user.birthday, now);
      const sex = sexFromGender(user.gender);

      const fetch = async (rt: string) =>
        (
          await db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': rt,
              },
            })
            .exec()
        ).map((d) => d.toMutableJSON() as ClinicalDocument);

      const [immunizations, observations, procedures] = await Promise.all([
        fetch('immunization'),
        fetch('observation'),
        fetch('procedure'),
      ]);
      if (!mounted) return;

      const immun = immunizations.map((doc) => {
        const r = getFhirResource<Record<string, unknown>>(doc);
        return {
          name: (
            doc.metadata?.display_name ||
            firstText(r['vaccineCode']) ||
            ''
          ).toLowerCase(),
          date: recordDate(r, doc),
        };
      });
      const obs = observations.map((doc) => {
        const r = getFhirResource<Record<string, unknown>>(doc);
        return {
          loinc: [
            ...(doc.metadata?.loinc_coding ?? []),
            ...conceptCodes(r['code']),
          ],
          date: recordDate(r, doc),
        };
      });
      const procs = procedures.map((doc) => {
        const r = getFhirResource<Record<string, unknown>>(doc);
        return {
          name: (
            doc.metadata?.display_name ||
            firstText(r['code']) ||
            ''
          ).toLowerCase(),
          date: recordDate(r, doc),
        };
      });

      const findLast = (rule: MaintenanceRule): string | undefined => {
        const dates: (string | undefined)[] = [];
        if (rule.immunizationKeywords) {
          immun.forEach((i) => {
            if (rule.immunizationKeywords?.some((k) => i.name.includes(k))) {
              dates.push(i.date);
            }
          });
        }
        if (rule.labLoinc) {
          obs.forEach((o) => {
            if (o.loinc.some((c) => rule.labLoinc?.includes(c))) {
              dates.push(o.date);
            }
          });
        }
        if (rule.procedureKeywords) {
          procs.forEach((p) => {
            if (rule.procedureKeywords?.some((k) => p.name.includes(k))) {
              dates.push(p.date);
            }
          });
        }
        return latest(dates);
      };

      const result = MAINTENANCE_RULES.filter((rule) =>
        appliesToPatient(rule, age, sex),
      ).map((rule) => evaluateReminder(rule, findLast(rule), now));

      setReminders(result);
      setStatus('success');
    }
    load();
    return () => {
      mounted = false;
    };
  }, [db, user.id, user.birthday, user.gender]);

  return { reminders, status };
}

const STATUS_ORDER: ReminderStatus[] = [
  'overdue',
  'due',
  'up-to-date',
  'complete',
];

// Where the "Log record" action sends the user for a given rule: matching
// vaccines, labs, or procedures so completing a reminder takes one tap.
function addRecordTarget(rule: MaintenanceRule): string {
  const type =
    rule.category === 'Immunization' || rule.immunizationKeywords?.length
      ? 'immunization'
      : rule.labLoinc?.length
        ? 'lab'
        : 'procedure';
  return `${AppRoutes.AddRecord}?type=${type}&title=${encodeURIComponent(
    rule.title,
  )}`;
}

function dismissedStorageKey(userId: string) {
  return `mere-medical:hm-dismissed:${userId}`;
}

function readDismissed(userId: string): string[] {
  try {
    const raw = localStorage.getItem(dismissedStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const STATUS_META: Record<
  ReminderStatus,
  { label: string; badge: string; dot: string }
> = {
  overdue: {
    label: 'Overdue',
    badge: 'bg-red-50 text-red-700 ring-red-600/20',
    dot: 'bg-red-500',
  },
  due: {
    label: 'Due / recommended',
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dot: 'bg-amber-500',
  },
  'up-to-date': {
    label: 'Up to date',
    badge: 'bg-green-50 text-green-700 ring-green-600/20',
    dot: 'bg-green-500',
  },
  complete: {
    label: 'Complete',
    badge: 'bg-green-50 text-green-700 ring-green-600/20',
    dot: 'bg-green-500',
  },
};

export function HealthMaintenanceTab() {
  const user = useUser();
  const { reminders, status } = useReminders();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const missingProfileFields = [
    user.birthday ? undefined : 'birth date',
    sexFromGender(user.gender) ? undefined : 'sex/gender',
  ].filter((field): field is string => Boolean(field));
  const hasLimitedProfile = missingProfileFields.length > 0;

  useEffect(() => {
    setDismissed(readDismissed(user.id));
  }, [user.id]);

  const persistDismissed = useCallback(
    (next: string[]) => {
      setDismissed(next);
      try {
        localStorage.setItem(
          dismissedStorageKey(user.id),
          JSON.stringify(next),
        );
      } catch {
        // ignore storage failures (e.g. private mode)
      }
    },
    [user.id],
  );

  const dismissReminder = useCallback(
    (ruleId: string) => {
      persistDismissed([...new Set([...dismissed, ruleId])]);
    },
    [dismissed, persistDismissed],
  );

  const visibleReminders = useMemo(
    () => reminders.filter((reminder) => !dismissed.includes(reminder.rule.id)),
    [reminders, dismissed],
  );

  const grouped = useMemo(() => {
    const map = new Map<ReminderStatus, Reminder[]>();
    visibleReminders.forEach((reminder) => {
      const list = map.get(reminder.status) ?? [];
      list.push(reminder);
      map.set(reminder.status, list);
    });
    return map;
  }, [visibleReminders]);

  const dismissedCount = reminders.length - visibleReminders.length;

  const actionCount =
    (grouped.get('overdue')?.length ?? 0) + (grouped.get('due')?.length ?? 0);

  return (
    <AppPage banner={<GenericBanner text="Health maintenance" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <Placeholder text="Checking your preventive care…" />
          ) : (
            <>
              <div className="rounded-md bg-white px-4 py-3 text-sm text-gray-700 shadow-sm ring-1 ring-gray-200">
                {hasLimitedProfile ? (
                  <span>
                    Add {joinLabels(missingProfileFields)} in{' '}
                    <Link
                      to={AppRoutes.Settings}
                      className="font-semibold text-primary-700 hover:text-primary-900"
                    >
                      Settings
                    </Link>{' '}
                    to tailor age and sex-sensitive reminders. Items that need
                    missing details are withheld.
                  </span>
                ) : actionCount > 0 ? (
                  <span>
                    <span className="font-semibold text-gray-900">
                      {actionCount} item{actionCount === 1 ? '' : 's'}
                    </span>{' '}
                    may need attention based on your records and profile.
                  </span>
                ) : (
                  <span>You appear up to date on tracked preventive care.</span>
                )}
              </div>

              {hasLimitedProfile && reminders.length === 0 && (
                <Placeholder text="Add a birth date in Settings to evaluate preventive-care reminders." />
              )}

              {STATUS_ORDER.map((key) => {
                const items = grouped.get(key);
                if (!items || items.length === 0) return null;
                const meta = STATUS_META[key];
                return (
                  <section key={key}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${meta.dot}`}
                      />
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                        {meta.label} ({items.length})
                      </h2>
                    </div>
                    <div className="grid gap-2">
                      {items.map((reminder) => (
                        <ReminderCard
                          key={reminder.rule.id}
                          reminder={reminder}
                          onDismiss={dismissReminder}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {dismissedCount > 0 && (
                <div className="flex items-center justify-between rounded-md bg-white px-4 py-1 text-xs text-gray-500 shadow-sm ring-1 ring-gray-200">
                  <span>
                    {dismissedCount} item{dismissedCount === 1 ? '' : 's'}{' '}
                    dismissed
                  </span>
                  <button
                    type="button"
                    onClick={() => persistDismissed([])}
                    className="text-primary-700 hover:text-primary-900 -mr-2 inline-flex min-h-[44px] items-center px-2 font-semibold"
                  >
                    Reset
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Simplified general-population guidance for demonstration —
                always follow your clinician's recommendations.
              </p>
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function ReminderCard({
  reminder,
  onDismiss,
}: {
  reminder: Reminder;
  onDismiss: (ruleId: string) => void;
}) {
  const meta = STATUS_META[reminder.status];
  const actionable = reminder.status === 'overdue' || reminder.status === 'due';
  return (
    <article className="rounded-md bg-white p-3 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {reminder.rule.title}
            </h3>
            <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
              {reminder.rule.category}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-600">{reminder.rule.info}</p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}
        >
          {meta.label}
        </span>
      </div>
      {/* Status line and actions share a row: the actions already stand 44px
          tall, so a separate divided footer only added dead height. */}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <ShieldCheckIcon className="h-4 w-4 shrink-0" />
          {reminder.summary}
        </p>
        {actionable && (
          <div className="flex items-center gap-1">
            <Link
              to={addRecordTarget(reminder.rule)}
              className="bg-primary hover:bg-primary-700 inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-white shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Log record
            </Link>
            <button
              type="button"
              onClick={() => onDismiss(reminder.rule.id)}
              className="inline-flex min-h-[44px] items-center rounded-md px-3 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}
