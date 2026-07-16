export type PacketItem = {
  id: string;
  title: string;
  detail?: string;
  date?: string;
};

export type PacketSections = {
  problems: PacketItem[];
  medications: PacketItem[];
  allergies: PacketItem[];
  labs: PacketItem[];
  documents: PacketItem[];
  imaging: PacketItem[];
  procedures: PacketItem[];
};

export type PacketOptions = {
  includeProblems: boolean;
  includeMedications: boolean;
  includeAllergies: boolean;
  includeLabs: boolean;
  includeDocuments: boolean;
  includeImaging: boolean;
  includeProcedures: boolean;
  includeQuestions: boolean;
};

export type PreviewFile = {
  name: string;
  type: string;
  size: number;
  url: string;
  previewType: 'pdf' | 'image' | 'text' | 'unsupported';
  text?: string;
};
