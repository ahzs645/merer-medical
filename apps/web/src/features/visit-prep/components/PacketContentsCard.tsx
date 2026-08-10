import { PacketOptions } from '../types';
import { CheckboxField } from './CheckboxField';

export function PacketContentsCard({
  packetOptions,
  updatePacketOption,
}: {
  packetOptions: PacketOptions;
  updatePacketOption: (option: keyof PacketOptions, checked: boolean) => void;
}) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">Packet contents</h2>
      {/* Eight options: 2 or 4 columns divide evenly, 3 leaves a hole. */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CheckboxField
          checked={packetOptions.includeProblems}
          label="Problems"
          onChange={(checked) => updatePacketOption('includeProblems', checked)}
        />
        <CheckboxField
          checked={packetOptions.includeMedications}
          label="Medications"
          onChange={(checked) =>
            updatePacketOption('includeMedications', checked)
          }
        />
        <CheckboxField
          checked={packetOptions.includeAllergies}
          label="Allergies"
          onChange={(checked) =>
            updatePacketOption('includeAllergies', checked)
          }
        />
        <CheckboxField
          checked={packetOptions.includeLabs}
          label="Abnormal labs"
          onChange={(checked) => updatePacketOption('includeLabs', checked)}
        />
        <CheckboxField
          checked={packetOptions.includeDocuments}
          label="Documents"
          onChange={(checked) =>
            updatePacketOption('includeDocuments', checked)
          }
        />
        <CheckboxField
          checked={packetOptions.includeImaging}
          label="Imaging"
          onChange={(checked) => updatePacketOption('includeImaging', checked)}
        />
        <CheckboxField
          checked={packetOptions.includeProcedures}
          label="Procedures"
          onChange={(checked) =>
            updatePacketOption('includeProcedures', checked)
          }
        />
        <CheckboxField
          checked={packetOptions.includeQuestions}
          label="Visit questions"
          onChange={(checked) =>
            updatePacketOption('includeQuestions', checked)
          }
        />
      </div>
    </div>
  );
}
