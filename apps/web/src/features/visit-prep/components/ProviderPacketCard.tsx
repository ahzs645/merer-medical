import { CheckIcon } from '@heroicons/react/24/outline';

import { formatRecordDate } from '../../../shared/utils/dateFormatters';

import { PacketOptions, PacketSections } from '../types';
import { PacketSection } from './PacketSection';
import { SaveStatus } from './SaveStatus';

export function ProviderPacketCard({
  user,
  status,
  packet,
  packetOptions,
  questions,
  questionsSavedAt,
  questionsSaveStatus,
  saveQuestions,
  updateQuestions,
}: {
  user: { first_name?: string; last_name?: string };
  status: 'loading' | 'success';
  packet: PacketSections;
  packetOptions: PacketOptions;
  questions: string;
  questionsSavedAt: string;
  questionsSaveStatus: 'idle' | 'saved' | 'error';
  saveQuestions: () => void;
  updateQuestions: (value: string) => void;
}) {
  return (
    <div className="rounded-md bg-white p-5 shadow-sm ring-1 ring-gray-200 print:shadow-none print:ring-0">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          Provider packet
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {user.first_name} {user.last_name} | Generated{' '}
          {formatRecordDate(new Date().toISOString())}
        </p>
      </div>

      {status === 'loading' ? (
        <p className="py-8 text-sm text-gray-600">Loading records...</p>
      ) : (
        <div className="mt-5 grid gap-5">
          {packetOptions.includeProblems ? (
            <PacketSection title="Active problems" items={packet.problems} />
          ) : null}
          {packetOptions.includeMedications ? (
            <PacketSection
              title="Current medications"
              items={packet.medications}
            />
          ) : null}
          {packetOptions.includeAllergies ? (
            <PacketSection title="Allergies" items={packet.allergies} />
          ) : null}
          {packetOptions.includeLabs ? (
            <PacketSection title="Abnormal labs" items={packet.labs} />
          ) : null}
          {packetOptions.includeDocuments ? (
            <PacketSection title="Recent documents" items={packet.documents} />
          ) : null}
          {packetOptions.includeImaging ? (
            <PacketSection title="Recent imaging" items={packet.imaging} />
          ) : null}
          {packetOptions.includeProcedures ? (
            <PacketSection
              title="Recent procedures"
              items={packet.procedures}
            />
          ) : null}

          {packetOptions.includeQuestions ? (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {/* The heading is the field's label — `htmlFor` on it, rather
                      than leaving the textarea named only by placeholder text
                      that disappears at the first keystroke. */}
                  <h3 className="text-base font-semibold text-gray-900">
                    <label htmlFor="visit-questions">Questions for visit</label>
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 print:hidden">
                    Saved on this device.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <SaveStatus
                    savedAt={questionsSavedAt}
                    status={questionsSaveStatus}
                  />
                  <button
                    type="button"
                    onClick={saveQuestions}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Save questions
                  </button>
                </div>
              </div>
              <textarea
                id="visit-questions"
                className="mt-2 min-h-36 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary print:border-gray-300"
                value={questions}
                onChange={(event) => updateQuestions(event.target.value)}
                placeholder="Add symptoms, goals, and questions to discuss."
              />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
