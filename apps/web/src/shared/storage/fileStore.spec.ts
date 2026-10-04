import {
  classifyFileSet,
  formatBytes,
  getRecordFileSet,
  summarize,
} from './fileStore';
import { safeFileName } from './fileSetZip';

describe('file store helpers', () => {
  it.each([
    [[{ name: 'IM000001' }, { name: 'IM000002' }], 'files'],
    [[{ name: 'IM000001', dicomSignature: true }], 'dicom'],
    [[{ name: 'slice.dcm' }], 'dicom'],
    [[{ name: 'x', type: 'application/dicom' }], 'dicom'],
    [[{ name: 'upper.stl' }, { name: 'lower.ply' }], 'mesh'],
    [[{ name: 'photo.jpg' }], 'files'],
    [[{ name: 'upper.stl' }, { name: 'notes.pdf' }], 'files'],
  ])('classifies %j as %s', (files, kind) => {
    expect(classifyFileSet(files)).toBe(kind);
  });

  it('summarises a folder by its name, size and first paths', () => {
    const summary = summarize(
      'set',
      Array.from({ length: 7 }, (_, index) => ({
        name: `IM${index}.dcm`,
        relativePath: `CBCT 2026/IM${index}`,
        mime: '',
        size: 1024,
      })),
    );
    expect(summary).toMatchObject({
      id: 'set',
      kind: 'dicom',
      label: 'CBCT 2026',
      count: 7,
      totalSize: 7168,
    });
    expect(summary.sample).toHaveLength(5);
  });

  it('reads a record’s file set and ignores anything else', () => {
    expect(getRecordFileSet({ metadata: { file_set: { id: 'a' } } })?.id).toBe(
      'a',
    );
    expect(getRecordFileSet({ metadata: {} })).toBeUndefined();
    expect(getRecordFileSet({ metadata: { file_set: 'x' } })).toBeUndefined();
  });

  it('formats sizes and file names', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(350 * 1024 ** 2)).toBe('350.0 MB');
    expect(safeFileName('CBCT: 2026/02/12')).toBe('CBCT 2026 02 12');
  });
});
