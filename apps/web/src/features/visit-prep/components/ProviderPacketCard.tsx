import { formatRecordDate } from '../../../shared/utils/dateFormatters';

import { PacketOptions, PacketSections } from '../types';
import { PacketSection } from './PacketSection';

export function ProviderPacketCard({
  user,
  status,
  packet,
  packetOptions,
  questions,
  visitPurpose,
}: {
  user: { first_name?: string; last_name?: string };
  status: 'loading' | 'success' | 'error';
  packet: PacketSections;
  packetOptions: PacketOptions;
  questions: string;
  visitPurpose: string;
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

      {status !== 'success' ? (
        <p className="py-8 text-sm text-gray-600">
          {status === 'error'
            ? 'Unable to load records for this profile. Reload the page to try again.'
            : 'Loading records for this profile…'}
        </p>
      ) : (
        <div className="mt-5 grid gap-5">
          {packetOptions.includeQuestions && (
            <>
              {visitPurpose.trim() && (
                <section>
                  <h3 className="text-base font-semibold text-gray-900">
                    Visit purpose
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {visitPurpose}
                  </p>
                </section>
              )}
              <section>
                <h3 className="text-base font-semibold text-gray-900">
                  Questions for visit
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {questions.trim() || 'No questions saved.'}
                </p>
              </section>
            </>
          )}
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
        </div>
      )}
    </div>
  );
}
