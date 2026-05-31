import {
  importDdinterCsvTexts,
  matchDdinterRecordsForTest,
  parseDdinterCsvForTest,
} from './ddinterStore';

describe('DDInter interaction plugin', () => {
  it('parses common DDInter-style CSV columns', () => {
    const records =
      parseDdinterCsvForTest(`DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level,Description,Management
DDInterA1,Warfarin,DDInterB1,Amiodarone,Major,"May increase bleeding risk","Monitor INR closely"
DDInterA2,Metformin,DDInterB2,Alcohol,Moderate,"May increase lactic acidosis risk","Avoid excessive alcohol"`);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      id: 'DDInterA1:DDInterB1:major',
      ddinterIdA: 'DDInterA1',
      ddinterIdB: 'DDInterB1',
      drugA: 'Warfarin',
      drugB: 'Amiodarone',
      severity: 'major',
      description: 'May increase bleeding risk',
      management: 'Monitor INR closely',
    });
  });

  it('matches normalized medication names with dose and route text', () => {
    const records =
      parseDdinterCsvForTest(`DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level,Description
DDInterA1,Warfarin,DDInterB1,Amiodarone,Major,"May increase bleeding risk"`);

    const interactions = matchDdinterRecordsForTest(records, [
      'Warfarin 5 mg oral tablet',
      'Amiodarone 200 mg tablet',
    ]);

    expect(interactions).toHaveLength(1);
    expect(interactions[0]).toMatchObject({
      id: 'DDInterA1:DDInterB1:major',
      severity: 'major',
      drugs: ['Warfarin', 'Amiodarone'],
      provenance: {
        ddinterIds: ['DDInterA1', 'DDInterB1'],
        matchStrategy: 'normalized_alias',
      },
    });
  });

  it('does not report a pair when only one side is present', () => {
    const records = parseDdinterCsvForTest(`Drug_A,Drug_B,Level
Warfarin,Amiodarone,Major`);

    expect(matchDdinterRecordsForTest(records, ['Warfarin 5 mg'])).toHaveLength(
      0,
    );
  });

  it('supports alternate CSV headings used by interaction exports', () => {
    const records =
      parseDdinterCsvForTest(`Object Drug Name,Precipitant Drug Name,Risk Level,Mechanism,Management Strategy
Sertraline,Tramadol,Major,"Serotonin syndrome risk","Avoid or monitor closely"`);

    const interactions = matchDdinterRecordsForTest(records, [
      'sertraline',
      'tramadol',
    ]);

    expect(interactions).toHaveLength(1);
    expect(interactions[0]).toMatchObject({
      severity: 'major',
      description: 'Serotonin syndrome risk',
      management: 'Avoid or monitor closely',
    });
  });

  it('normalizes contraindicated severities for future providers', () => {
    const records = parseDdinterCsvForTest(`Drug_A,Drug_B,Severity
Drug A,Drug B,Contraindicated`);

    const interactions = matchDdinterRecordsForTest(records, [
      'Drug A',
      'Drug B',
    ]);

    expect(interactions[0].severity).toBe('contraindicated');
  });

  it('sorts interactions by clinical severity', () => {
    const records = parseDdinterCsvForTest(`Drug_A,Drug_B,Severity
Aspirin,Drug C,Minor
Aspirin,Drug B,Contraindicated
Aspirin,Drug D,Moderate`);

    const interactions = matchDdinterRecordsForTest(records, [
      'Aspirin',
      'Drug B',
      'Drug C',
      'Drug D',
    ]);

    expect(interactions.map((item) => item.severity)).toEqual([
      'contraindicated',
      'moderate',
      'minor',
    ]);
  });

  it('requires the full eight-file DDInter bundle for import', async () => {
    await expect(
      importDdinterCsvTexts([
        `DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level
DDInterA1,Aspirin,DDInterB1,Warfarin,Major`,
      ]),
    ).rejects.toThrow('Expected 8 DDInter CSV files');
  });

  it('supports RxNorm-expanded provenance in matched interactions', async () => {
    const records =
      parseDdinterCsvForTest(`DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level
DDInterA1,Warfarin,DDInterB1,Amiodarone,Major`);

    const interactions = matchDdinterRecordsForTest(records, [
      'warfarin',
      'amiodarone',
    ]);

    expect(interactions[0].provenance).toMatchObject({
      ddinterIds: ['DDInterA1', 'DDInterB1'],
      matchStrategy: 'normalized_alias',
    });
  });

  it('uses manual alias overrides for hard brand/generic cases', () => {
    const records = parseDdinterCsvForTest(`Drug_A,Drug_B,Level
Warfarin,Amiodarone,Major`);

    const interactions = matchDdinterRecordsForTest(records, [
      'Coumadin',
      'Amiodarone',
    ]);

    expect(interactions).toHaveLength(1);
    expect(interactions[0].drugs).toEqual(['Warfarin', 'Amiodarone']);
  });
});
