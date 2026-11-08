import { buildPacketHtml, buildPacketMarkdown } from './packetExport';
import { PacketOptions, PacketSections } from '../types';

const packet: PacketSections = {
  problems: [{ id: 'demo', title: 'Example condition' }],
  medications: [],
  allergies: [],
  labs: [],
  documents: [],
  imaging: [],
  procedures: [],
};
const options: PacketOptions = {
  includeProblems: true,
  includeMedications: false,
  includeAllergies: false,
  includeLabs: false,
  includeDocuments: false,
  includeImaging: false,
  includeProcedures: false,
  includeQuestions: true,
};
const input = {
  packet,
  options,
  questions: 'What should I ask?',
  visitPurpose: 'Follow-up <script>alert(1)</script>',
  patientName: 'Demo patient',
  generatedAt: new Date('2026-11-08T12:00:00Z'),
};

describe('visit summary exports', () => {
  it('puts the visit purpose and questions before the selected clinical records in both formats', () => {
    const html = buildPacketHtml(input);
    const markdown = buildPacketMarkdown(input);
    for (const output of [html, markdown]) {
      expect(output.indexOf('Visit purpose')).toBeLessThan(
        output.indexOf('Questions for visit'),
      );
      expect(output.indexOf('Questions for visit')).toBeLessThan(
        output.indexOf('Active problems'),
      );
      expect(output).toContain('What should I ask?');
      expect(output).toContain('Example condition');
      expect(output).not.toContain('Current medications');
    }
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('excludes both purpose and questions when visit questions is deselected', () => {
    for (const build of [buildPacketHtml, buildPacketMarkdown]) {
      const output = build({
        ...input,
        options: { ...options, includeQuestions: false },
      });
      expect(output).not.toContain('Follow-up');
      expect(output).not.toContain('What should I ask?');
      expect(output).toContain('Example condition');
    }
  });
});
