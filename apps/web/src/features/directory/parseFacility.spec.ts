import { parseFacility } from './DirectoryTab';

describe('parseFacility', () => {
  it('splits name, address, and phone without eating the postal-code digit', () => {
    const result = parseFacility(
      'Jasper Healthcare Centre Lab/DI 518 Robson Street Jasper, AB T0E 1E0 780-852-6606',
    );
    expect(result.name).toBe('Jasper Healthcare Centre Lab/DI');
    expect(result.address).toBe('518 Robson Street Jasper, AB T0E 1E0');
    expect(result.phone).toBe('780-852-6606');
  });

  it('handles a facility with no phone', () => {
    const result = parseFacility(
      'Inpatient Crisis Stabilization Unit 7007 14 Street SW Calgary, AB T2V 1P9',
    );
    expect(result.name).toBe('Inpatient Crisis Stabilization Unit');
    expect(result.address).toBe('7007 14 Street SW Calgary, AB T2V 1P9');
    expect(result.phone).toBeUndefined();
  });

  it('falls back to the raw string when it cannot be split', () => {
    const result = parseFacility('Some Clinic');
    expect(result.name).toBe('Some Clinic');
    expect(result.address).toBeUndefined();
    expect(result.phone).toBeUndefined();
  });
});
