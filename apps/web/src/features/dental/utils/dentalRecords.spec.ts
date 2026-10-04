import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  buildRecordsByTooth,
  isDentalClaimDocument,
  freeTextToothTokens,
  inferSourceNumbering,
  isDentalDocument,
  mapDentalDocument,
  resolveToothNumber,
} from './dentalRecords';
import {
  buildOdontogramStatuses,
  buildTreatmentPlan,
  buildNextCleaning,
  buildPerioOverview,
  buildWorkflowContext,
  recordActionLevel,
  statedRecallMonths,
} from './dentalClinicalModels';

let sequence = 0;

function doc(
  resourceType: string,
  resource: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
): ClinicalDocument<unknown> {
  sequence += 1;
  return {
    id: `doc-${sequence}`,
    user_id: 'user',
    connection_record_id: 'connection',
    data_record: {
      raw: { resource: { resourceType, ...resource } },
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: resourceType.toLowerCase(),
      version_history: [],
    },
    metadata: { id: `${resourceType}/${sequence}`, ...metadata },
  } as unknown as ClinicalDocument<unknown>;
}

const map = (
  document: ClinicalDocument<unknown>,
  numbering?: 'universal' | 'fdi',
) => mapDentalDocument(document, { numbering });

describe('tooth numbers', () => {
  it.each([
    ['Occlusal caries tooth 36', ['19']],
    ['Extraction of tooth 48', ['32']],
    ['Crown tooth 46', ['30']],
    ['Root canal tooth 11', ['11']],
    ['Composite tooth #14 MOD', ['14']],
    ['Teeth 3-5 scaling', ['3', '4', '5']],
    ['Implant planning teeth 34-36', ['19', '20', '21']],
  ])('reads "%s" as Universal %j', (text, expected) => {
    const record = map(
      doc('Condition', { code: { text } }, { display_name: text }),
    );
    expect(record.toothNumbers).toEqual(expected);
  });

  it('does not read an invoice number as a tooth', () => {
    const record = map(
      doc(
        'Procedure',
        { code: { text: 'Dental cleaning' } },
        {
          display_name: 'Dental cleaning invoice #2024-118',
        },
      ),
    );
    expect(record.toothNumbers).toEqual([]);
  });

  it('reads 11–32 as FDI when the reader numbers in FDI', () => {
    const text = 'Caries on tooth 26';
    expect(
      map(doc('Condition', { code: { text } }), 'fdi').toothNumbers,
    ).toEqual(['14']);
    expect(
      map(doc('Condition', { code: { text } }), 'universal').toothNumbers,
    ).toEqual(['26']);
  });

  it('prefers a coded FHIR bodySite over the prose', () => {
    const record = map(
      doc('Condition', {
        code: { text: 'Caries (see tooth 3 in the narrative)' },
        bodySite: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/ex-tooth',
                code: '36',
              },
            ],
          },
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/FDI-surface',
                code: 'MO',
              },
            ],
          },
        ],
      }),
    );
    expect(record.toothNumbers).toEqual(['19']);
    expect(record.surfaces).toEqual(['M', 'O']);
  });

  it('leaves Universal supernumerary teeth off the chart', () => {
    const record = map(
      doc(
        'Procedure',
        { status: 'completed', code: { text: 'Extraction' } },
        {
          manual_specialty_details: {
            specialty: 'dental',
            numberingSystem: 'universal',
            dentalTeeth: '51',
          },
        },
      ),
    );
    expect(record.toothNumbers).toEqual([]);
  });

  it('resolves numbers that exist in only one system', () => {
    expect(resolveToothNumber('3')).toBe('3');
    expect(resolveToothNumber('38')).toBe('17');
    expect(resolveToothNumber('55')).toBe('A');
    expect(resolveToothNumber('49')).toBeUndefined();
    expect(resolveToothNumber('0')).toBeUndefined();
  });
});

describe('record kind', () => {
  it('files imaging as imaging, not as an active finding', () => {
    expect(
      map(doc('ImagingStudy', { description: 'Dental CBCT mandible' })).kind,
    ).toBe('image');
    expect(
      map(
        doc('DiagnosticReport', {
          code: { text: 'Panoramic dental radiograph report' },
        }),
      ).kind,
    ).toBe('image');
  });

  it('does not call a plan document a perio measurement', () => {
    const record = map(
      doc(
        'DocumentReference',
        {
          description: 'Dental treatment plan summary',
          content: [{ attachment: { contentType: 'application/pdf' } }],
        },
        {
          display_name:
            'Dental treatment plan summary — bleeding on probing teeth 14, 19',
        },
      ),
    );
    expect(record.kind).toBe('note');
  });

  it('keeps a completed procedure done, whatever its note plans next', () => {
    const record = map(
      doc('Procedure', {
        status: 'completed',
        code: { text: 'Crown preparation tooth 14' },
        note: [{ text: 'Final crown delivery planned.' }],
      }),
    );
    expect(record.kind).toBe('procedure');
    expect(record.status).toBe('done');
  });

  it('reads perio, recall and referral subtypes from an importer', () => {
    const subtype = (value: string) =>
      map(
        doc(
          'Observation',
          { status: 'final' },
          {
            manual_specialty_details: { specialty: 'dental', subtype: value },
          },
        ),
      ).kind;
    expect(subtype('perio')).toBe('perio');
    expect(subtype('recall')).toBe('note');
    expect(subtype('referral')).toBe('referral');
  });
});

describe('record status', () => {
  it('reads Condition.clinicalStatus', () => {
    const resolved = map(
      doc('Condition', {
        code: { text: 'Caries tooth 30' },
        clinicalStatus: { coding: [{ code: 'resolved' }] },
      }),
    );
    expect(resolved.status).toBe('resolved');
  });

  it('lets a typed status win over the fixed status the form writes', () => {
    const record = map(
      doc(
        'Observation',
        { status: 'final', code: { text: 'Caries' } },
        {
          manual_specialty_details: {
            specialty: 'dental',
            subtype: 'finding',
            toothNumber: '30',
            dentalStatus: 'resolved',
          },
        },
      ),
    );
    expect(record.status).toBe('resolved');
  });
});

describe('tooth state over time', () => {
  const caries = doc(
    'Condition',
    {
      code: { text: 'Occlusal caries tooth 30' },
      clinicalStatus: { coding: [{ code: 'active' }] },
    },
    { date: '2023-03-01T00:00:00.000Z' },
  );
  const filling = doc(
    'Procedure',
    { status: 'completed', code: { text: 'Composite filling tooth 30' } },
    { date: '2023-03-08T00:00:00.000Z' },
  );

  it('a cavity that was later filled is no longer "needs attention"', () => {
    const records = [caries, filling].map((document) => map(document));
    const [tooth30] = buildOdontogramStatuses(buildRecordsByTooth(records));
    expect(tooth30.tooth).toBe('30');
    expect(tooth30.actionLevel).toBe('complete');
    expect(buildWorkflowContext(records, 0).nextActions).toEqual([]);
  });

  it('a cavity filled before it was found is still open', () => {
    const later = doc(
      'Condition',
      { code: { text: 'Recurrent caries tooth 30' } },
      { date: '2024-01-01T00:00:00.000Z' },
    );
    const records = [later, filling].map((document) => map(document));
    const [tooth30] = buildOdontogramStatuses(buildRecordsByTooth(records));
    expect(tooth30.actionLevel).toBe('active');
  });

  it('timeline rows carry their own standing, not the tooth’s', () => {
    const pocket = doc(
      'Observation',
      { status: 'final', code: { text: 'Periodontal pocketing tooth 14' } },
      { date: '2026-02-12T00:00:00.000Z' },
    );
    const crownPrep = doc(
      'Procedure',
      { status: 'completed', code: { text: 'Crown preparation tooth 14' } },
      { date: '2026-01-20T00:00:00.000Z' },
    );
    const records = [pocket, crownPrep].map((document) => map(document));
    const byTooth = buildRecordsByTooth(records);
    const level = (title: string) =>
      recordActionLevel(
        records.find((record) => record.title.startsWith(title))!,
        byTooth,
      );
    expect(level('Periodontal')).toBe('active');
    expect(level('Crown')).toBe('complete');
  });

  it('planned procedures are plans; cancelled ones drop out', () => {
    const planned = map(
      doc('Procedure', {
        status: 'preparation',
        code: { text: 'Composite tooth 19' },
      }),
    );
    const cancelled = map(
      doc('ServiceRequest', {
        status: 'revoked',
        code: { text: 'Treatment plan crown tooth 3' },
      }),
    );
    expect(planned.kind).toBe('treatmentPlan');
    expect(
      buildTreatmentPlan([planned, cancelled]).map((item) => item.id),
    ).toEqual([planned.id]);
  });
});

describe('next cleaning', () => {
  const cleaning = (date: string, note?: string) =>
    doc(
      'Procedure',
      {
        status: 'completed',
        code: { text: 'Routine dental cleaning and exam' },
        note: note ? [{ text: note }] : undefined,
      },
      { date: `${date}T12:00:00.000Z` },
    );
  const today = new Date('2026-10-03T12:00:00.000Z');

  it('uses the interval the last cleaning states, and says overdue', () => {
    const records = [
      cleaning('2025-08-14', 'Six-month recall recommended.'),
      cleaning('2025-02-06'),
    ].map((document) => map(document));
    const next = buildNextCleaning(records, today);
    expect(next.lastCleaning?.date).toContain('2025-08-14');
    expect(next.dueDate).toBe('2026-02-14');
    expect(next.basis).toBe('stated-interval');
    expect(next.state).toBe('overdue');
  });

  it('prefers the practice recall, and a booking over "overdue"', () => {
    const recall = doc(
      'CarePlan',
      { status: 'active', title: 'Prophy' },
      {
        date: '2026-02-10T12:00:00.000Z',
        manual_specialty_details: {
          specialty: 'dental',
          subtype: 'recall',
          recallType: 'Prophy',
          recallDueDate: '2026-08-10',
          dentalFollowUp: '2026-10-20',
        },
      },
    );
    const next = buildNextCleaning(
      [recall, cleaning('2026-02-10')].map((document) => map(document)),
      today,
    );
    expect(next.basis).toBe('recall');
    expect(next.dueDate).toBe('2026-08-10');
    expect(next.scheduledDate).toBe('2026-10-20');
    expect(next.state).toBe('scheduled');
  });

  it('ignores a recall a later cleaning has already met', () => {
    const recall = doc(
      'CarePlan',
      { status: 'active' },
      {
        manual_specialty_details: {
          specialty: 'dental',
          subtype: 'recall',
          recallDueDate: '2026-03-01',
        },
      },
    );
    const next = buildNextCleaning(
      [recall, cleaning('2026-04-01')].map((document) => map(document)),
      today,
    );
    expect(next.basis).toBe('usual-interval');
    expect(next.dueDate).toBe('2026-10-01');
    expect(next.state).toBe('overdue');
  });

  it('knows nothing without a cleaning or a recall', () => {
    expect(buildNextCleaning([], today)).toEqual({
      lastCleaning: undefined,
      dueDate: undefined,
      scheduledDate: undefined,
      intervalMonths: undefined,
      basis: 'none',
      state: 'unknown',
    });
  });

  it.each([
    ['Six-month recall recommended.', 6],
    ['Recall in 4 months for perio maintenance.', 4],
    ['3-month periodontal maintenance recall', 3],
    ['Annual exam and cleaning', 12],
    ['Light plaque, no calculus.', undefined],
    ['Wear aligners 22 hours, change every 10 days for 18 months', undefined],
  ])('reads "%s" as %s months', (text, months) => {
    expect(statedRecallMonths(text)).toBe(months);
  });
});

describe('dental coverage', () => {
  it('keeps dental plans and leaves medical ones out', () => {
    const coverage = (payor: string, plan: string) =>
      doc('Coverage', {
        status: 'active',
        payor: [{ display: payor }],
        class: [{ type: { coding: [{ code: 'plan' }] }, name: plan }],
      });
    expect(
      isDentalClaimDocument(
        coverage('NorthBridge Dental Benefits', 'Family Dental'),
      ),
    ).toBe(true);
    expect(
      isDentalClaimDocument(coverage('Pacific Blue Health', 'Extended Health')),
    ).toBe(false);
    expect(
      isDentalClaimDocument(
        coverage('Sun Life', 'Canadian Dental Care Plan (CDCP)'),
      ),
    ).toBe(true);
  });

  it('counts an EOB whose lines carry dental procedure codes', () => {
    const eob = doc('ExplanationOfBenefit', {
      status: 'active',
      insurer: { display: 'Acme Benefits' },
      item: [{ productOrService: { coding: [{ code: 'D1110' }] } }],
    });
    expect(isDentalClaimDocument(eob)).toBe(true);
  });
});

describe('gum (perio) summary', () => {
  it('reads FHIR pocket-depth components and bleeding', () => {
    const exam = map(
      doc(
        'Observation',
        {
          status: 'final',
          code: { text: 'Periodontal probing depth tooth 14' },
          component: [
            {
              code: { text: 'Pocket depth MB' },
              valueQuantity: { value: 5, unit: 'mm' },
            },
            { code: { text: 'Bleeding on probing' }, valueBoolean: true },
          ],
        },
        { date: '2026-02-12T00:00:00.000Z' },
      ),
    );
    const { latestExam } = buildPerioOverview([exam]);
    expect(latestExam).toMatchObject({
      sitesProbed: 1,
      sitesFivePlus: 1,
      deepest: { depth: 5, teeth: ['14'] },
      bleedingSites: 1,
    });
  });

  it('reads an importer’s per-site string and compares exams', () => {
    const exam = (date: string, depths: string, bleeding: string) =>
      map(
        doc(
          'Observation',
          { status: 'final' },
          {
            date: `${date}T00:00:00.000Z`,
            manual_specialty_details: {
              specialty: 'dental',
              subtype: 'perio',
              perioPocketDepths: depths,
              perioBleeding: bleeding,
            },
          },
        ),
      );
    const overview = buildPerioOverview([
      exam(
        '2025-06-01',
        'tooth 3 MB:3/B:2/DB:6/ML:3/L:2/DL:4',
        'tooth 3 MB, DB',
      ),
      exam(
        '2026-06-01',
        'tooth 3 MB:3/B:2/DB:4/ML:3/L:2/DL:3; tooth 14 MB:2/B:2/DB:3',
        'tooth 3 DB',
      ),
    ]);
    expect(overview.latestExam).toMatchObject({
      sitesProbed: 9,
      sitesFourPlus: 1,
      deepest: { depth: 4, teeth: ['3'] },
      bleedingSites: 1,
    });
    expect(overview.previousExam?.deepest?.depth).toBe(6);
  });
});

describe('what counts as dental', () => {
  it.each([
    ['Dual-chamber pacemaker implant', false],
    ['Obstetric ultrasound — crown-rump length 45 mm', false],
    ['Implant placement tooth 19', true],
    ['Porcelain crown #14', true],
    ['Dental implant consultation', true],
  ])('%s → %s', (text, expected) => {
    expect(
      isDentalDocument(
        doc('Procedure', { code: { text } }, { display_name: text }),
      ),
    ).toBe(expected);
  });
});

describe("reading a source's numbering from its own records", () => {
  const text = (value: string) =>
    doc('Condition', { code: { text: value } }, { display_name: value });

  it('a source that writes 36 and 46 writes FDI, so its 26 is FDI too', () => {
    const tokens = [
      'Caries tooth 36',
      'Crown tooth 46',
      'Sealant tooth 26',
    ].flatMap((value) => freeTextToothTokens(text(value)));
    expect(inferSourceNumbering(tokens)).toBe('fdi');
    expect(
      mapDentalDocument(text('Sealant tooth 26'), {
        numbering: 'fdi',
        numberingBasis: 'source',
      }).toothNumbers,
    ).toEqual(['14']);
  });

  it('a source that writes 19 and 30 writes Universal', () => {
    const tokens = ['Implant tooth 19', 'Caries tooth 30', 'Tooth 14'].flatMap(
      (value) => freeTextToothTokens(text(value)),
    );
    expect(inferSourceNumbering(tokens)).toBe('universal');
  });

  it('decides nothing when only ambiguous numbers, or both kinds, appear', () => {
    expect(inferSourceNumbering(['14', '26'])).toBeUndefined();
    expect(inferSourceNumbering(['3', '36'])).toBeUndefined();
  });

  it('records with declared or coded teeth give no evidence', () => {
    const declared = doc(
      'Condition',
      { code: { text: 'Caries tooth 26' } },
      {
        manual_specialty_details: {
          specialty: 'dental',
          numberingSystem: 'fdi',
        },
      },
    );
    expect(freeTextToothTokens(declared)).toEqual([]);
  });

  it('says how the numbers were read', () => {
    expect(
      mapDentalDocument(text('Tooth 14'), {
        numbering: 'fdi',
        numberingBasis: 'reader',
      }).numbering,
    ).toEqual({ system: 'fdi', basis: 'reader' });
  });
});

describe('CBCT viewer address', () => {
  it('asks the viewer to wait for a folder, keeping its own path', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handoffUrl } = require('../components/CbctViewerDialog');
    expect(handoffUrl('https://ahzs645.github.io/CBCTer/')).toBe(
      'https://ahzs645.github.io/CBCTer/?handoff=postmessage',
    );
    expect(handoffUrl('http://localhost:5173/?lang=en')).toBe(
      'http://localhost:5173/?lang=en&handoff=postmessage',
    );
  });
});
