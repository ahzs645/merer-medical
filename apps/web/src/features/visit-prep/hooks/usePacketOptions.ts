import { useState } from 'react';

import { PacketOptions } from '../types';

const DEFAULT_PACKET_OPTIONS: PacketOptions = {
  includeProblems: true,
  includeMedications: true,
  includeAllergies: true,
  includeLabs: true,
  includeDocuments: true,
  includeImaging: true,
  includeProcedures: true,
  includeQuestions: true,
};

export function usePacketOptions() {
  const [packetOptions, setPacketOptions] = useState(DEFAULT_PACKET_OPTIONS);

  function updatePacketOption(option: keyof PacketOptions, checked: boolean) {
    setPacketOptions((current) => ({ ...current, [option]: checked }));
  }

  return { packetOptions, updatePacketOption };
}
