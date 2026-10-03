/**
 * The `dentalRecords` section of a transposed document: a dental letter,
 * treatment estimate, perio chart printout or recall card, written as rows.
 *
 * What a dental row has to get right, and the general sections can't hold:
 *
 * - **Which tooth.** A number means nothing without its system: "26" is the
 *   upper-left first molar in FDI (Canada, the UK, Europe, Australia) and a
 *   lower-right incisor in Universal (US). A row that names teeth must say
 *   `numberingSystem`; the builder writes each tooth as an FDI-coded bodySite,
 *   which the app reads before any prose.
 * - **Where it stands.** `status` is a fixed word per kind, so the app can
 *   tell an open finding from a filled one and a proposal from done work.
 * - **When the next visit is due**, and **what pockets measured**, as data.
 */

export const DENTAL_KINDS = [
  'finding',
  'condition',
  'procedure',
  'treatmentPlan',
  'cleaning',
  'recall',
  'perioExam',
  'referral',
];

export const DENTAL_STATUSES = {
  finding: ['active', 'resolved'],
  condition: ['active', 'resolved'],
  procedure: ['done', 'planned', 'cancelled'],
  treatmentPlan: ['proposed', 'accepted', 'scheduled', 'done', 'declined'],
  cleaning: ['done'],
  recall: ['due', 'scheduled', 'cancelled'],
  perioExam: ['done'],
  referral: ['open', 'done', 'cancelled'],
};

const PERIO_SITES = ['MB', 'B', 'DB', 'ML', 'L', 'DL'];

// Universal 1–32 run clockwise from the upper right third molar; primary
// teeth A–T the same way. FDI is quadrant + position from the midline.
const PERMANENT = Array.from({ length: 32 }, (_, index) => {
  const n = index + 1;
  const fdi = n <= 8 ? 19 - n : n <= 16 ? 12 + n : n <= 24 ? 55 - n : 16 + n;
  return { universal: `${n}`, fdi: `${fdi}` };
});
const PRIMARY = 'ABCDEFGHIJKLMNOPQRST'.split('').map((letter, index) => {
  const fdi =
    index <= 4
      ? 55 - index
      : index <= 9
        ? 56 + index
        : index <= 14
          ? 85 - index
          : 66 + index;
  return { universal: letter, fdi: `${fdi}` };
});
const ALL = [...PERMANENT, ...PRIMARY];

/** A tooth as written → its FDI code, or undefined if it is not a tooth. */
export function toFdi(tooth, numberingSystem) {
  const value = `${tooth}`.trim().toUpperCase();
  const match =
    numberingSystem === 'fdi'
      ? ALL.find((item) => item.fdi === value)
      : ALL.find((item) => item.universal === value);
  return match?.fdi;
}

/** A tooth as written → its Universal id (what the app keys teeth by). */
export function toUniversal(tooth, numberingSystem) {
  const value = `${tooth}`.trim().toUpperCase();
  const match =
    numberingSystem === 'fdi'
      ? ALL.find((item) => item.fdi === value)
      : ALL.find((item) => item.universal === value);
  return match?.universal;
}

/** Errors for one `dentalRecords` row, beyond the shared required/date checks. */
export function validateDentalRow(row, at) {
  const errors = [];
  if (!row || typeof row !== 'object') return errors;
  const teeth = [
    ...(row.teeth || []),
    ...(row.perio?.sites || []).map((site) => site.tooth),
    ...(row.perio?.bleeding || []).map((site) => site.tooth),
  ];
  if (row.teeth !== undefined && !Array.isArray(row.teeth)) {
    errors.push(`${at}.teeth: expected an array of tooth numbers as written`);
  }
  if (teeth.length > 0) {
    if (!['fdi', 'universal'].includes(row.numberingSystem)) {
      errors.push(
        `${at}.numberingSystem: required when a row names teeth — "fdi" or "universal". "26" is an upper molar in FDI and a lower incisor in Universal; the letterhead's country usually settles it (US → universal, almost everywhere else → fdi).`,
      );
    } else {
      for (const tooth of teeth) {
        if (!toFdi(tooth, row.numberingSystem)) {
          errors.push(
            `${at}: tooth ${JSON.stringify(tooth)} is not a tooth in ${row.numberingSystem} numbering`,
          );
        }
      }
    }
  }
  const allowed = DENTAL_STATUSES[row.kind];
  if (allowed && row.status !== undefined && !allowed.includes(row.status)) {
    errors.push(
      `${at}.status: for ${row.kind} expected one of ${allowed.join(', ')}, got ${JSON.stringify(row.status)}`,
    );
  }
  for (const surface of row.surfaces || []) {
    if (!/^[MODBLIF]$/.test(surface)) {
      errors.push(
        `${at}.surfaces: ${JSON.stringify(surface)} — one letter each: M, O, D, B, L, I, F`,
      );
    }
  }
  if (row.kind === 'perioExam') {
    if (!row.perio?.sites?.length) {
      errors.push(
        `${at}.perio.sites: a perio exam needs its probing depths — [{ "tooth": "16", "MB": 3, "B": 2, … }]`,
      );
    }
    for (const [index, site] of (row.perio?.sites || []).entries()) {
      const values = PERIO_SITES.filter((key) => site[key] !== undefined);
      if (values.length === 0) {
        errors.push(
          `${at}.perio.sites[${index}]: no depths — use ${PERIO_SITES.join(', ')} in mm`,
        );
      }
      for (const key of values) {
        if (!Number.isFinite(Number(site[key]))) {
          errors.push(
            `${at}.perio.sites[${index}].${key}: expected a number of mm, got ${JSON.stringify(site[key])}`,
          );
        }
      }
    }
  }
  if (row.kind === 'recall' && !row.recallDueDate) {
    errors.push(`${at}.recallDueDate: a recall is a due date — required`);
  }
  return errors;
}

const FHIR_STATUS = {
  procedure: {
    done: 'completed',
    planned: 'preparation',
    cancelled: 'not-done',
  },
  cleaning: { done: 'completed' },
  treatmentPlan: {
    proposed: 'draft',
    accepted: 'active',
    scheduled: 'active',
    done: 'completed',
    declined: 'revoked',
  },
  recall: { due: 'active', scheduled: 'active', cancelled: 'revoked' },
  referral: { open: 'active', done: 'completed', cancelled: 'revoked' },
};

/**
 * One row → the FHIR resource type, the resource body (without id/notes,
 * which the builder adds), and the dental details the app reads.
 */
export function buildDentalRow(row) {
  const system = row.numberingSystem;
  const teeth = row.teeth || [];
  const bodySite = [
    ...teeth.map((tooth) => ({
      text: `tooth ${tooth} (${system === 'fdi' ? 'FDI' : 'Universal'})`,
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/ex-tooth',
          code: toFdi(tooth, system),
        },
      ],
    })),
    ...(row.surfaces?.length
      ? [
          {
            text: `surfaces ${row.surfaces.join('')}`,
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/FDI-surface',
                code: row.surfaces.join(''),
              },
            ],
          },
        ]
      : []),
  ];
  const bodySites = bodySite.length ? bodySite : undefined;
  const code = {
    text: row.name,
    coding: row.code ? [row.code] : undefined,
  };
  const status = row.status;
  const perio = row.kind === 'perioExam' ? perioDetails(row) : {};

  const details = removeEmpty({
    specialty: 'dental',
    subtype: SUBTYPES[row.kind],
    numberingSystem: system,
    dentalTeeth:
      row.kind === 'perioExam'
        ? perio.teethOfConcern
        : teeth.join(', ') || undefined,
    dentalSurfaces: row.surfaces?.length ? row.surfaces : undefined,
    dentalStatus: status,
    procedureCode: row.code?.code,
    dentalProvider: row.provider,
    dentalLocation: row.location,
    recallDueDate: row.recallDueDate,
    dentalRecall: row.intervalMonths
      ? `${row.intervalMonths}-month recall`
      : undefined,
    recallType: row.kind === 'recall' ? row.name : undefined,
    estimatedCost: row.fee,
    insuranceEstimate: row.insuranceEstimate,
    patientPortion: row.patientPortion,
    treatmentPriority: row.priority,
    ...perio.fields,
  });

  switch (row.kind) {
    case 'finding':
      return {
        resourceType: 'observation',
        resource: {
          resourceType: 'Observation',
          status: 'final',
          category: [
            {
              text: 'Dental finding',
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'exam',
                  display: 'Exam',
                },
              ],
            },
          ],
          code,
          bodySite: bodySite[0],
        },
        details,
      };
    case 'perioExam':
      return {
        resourceType: 'observation',
        resource: {
          resourceType: 'Observation',
          status: 'final',
          category: [{ text: 'Dental finding' }],
          code,
          component: perio.components,
        },
        details,
      };
    case 'condition':
      return {
        resourceType: 'condition',
        resource: {
          resourceType: 'Condition',
          clinicalStatus: {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: status === 'resolved' ? 'resolved' : 'active',
              },
            ],
          },
          category: [{ text: 'Dental condition' }],
          code,
          bodySite: bodySites,
        },
        details,
      };
    case 'procedure':
    case 'cleaning':
      return {
        resourceType: 'procedure',
        resource: {
          resourceType: 'Procedure',
          status: FHIR_STATUS[row.kind][status || 'done'],
          code,
          bodySite: bodySites,
        },
        details,
      };
    case 'treatmentPlan':
    case 'recall':
      return {
        resourceType: 'careplan',
        resource: {
          resourceType: 'CarePlan',
          status:
            FHIR_STATUS[row.kind][
              status || (row.kind === 'recall' ? 'due' : 'proposed')
            ],
          intent: 'plan',
          title: row.name,
          period: row.recallDueDate ? { end: row.recallDueDate } : undefined,
        },
        details,
      };
    case 'referral':
      return {
        resourceType: 'servicerequest',
        resource: {
          resourceType: 'ServiceRequest',
          status: FHIR_STATUS.referral[status || 'open'],
          intent: 'order',
          code,
          bodySite: bodySites,
        },
        details,
      };
    default:
      throw new Error(`Unknown dental kind ${row.kind}`);
  }
}

const SUBTYPES = {
  finding: 'finding',
  condition: 'condition',
  procedure: 'procedure',
  treatmentPlan: 'treatmentPlan',
  cleaning: 'cleaning',
  recall: 'recall',
  perioExam: 'perio',
  referral: 'referral',
};

/**
 * Perio sites as the app reads them: per-site strings keyed by Universal
 * tooth id (as the Open Dental importer writes them), plus FHIR components,
 * and the teeth worth naming — a 4 mm+ pocket or a bleeding site.
 */
function perioDetails(row) {
  const system = row.numberingSystem;
  const sites = row.perio?.sites || [];
  const bleeding = row.perio?.bleeding || [];
  const universal = (tooth) => toUniversal(tooth, system);
  const concern = new Set([
    ...sites
      .filter((site) => PERIO_SITES.some((key) => Number(site[key]) >= 4))
      .map((site) => universal(site.tooth)),
    ...bleeding.map((site) => universal(site.tooth)),
  ]);
  const depths = sites.flatMap((site) =>
    PERIO_SITES.filter((key) => site[key] !== undefined).map((key) =>
      Number(site[key]),
    ),
  );
  return {
    teethOfConcern: [...concern].filter(Boolean).join(', ') || undefined,
    fields: {
      perioPocketDepths: sites
        .map(
          (site) =>
            `tooth ${universal(site.tooth)} ${PERIO_SITES.filter(
              (key) => site[key] !== undefined,
            )
              .map((key) => `${key}:${site[key]}`)
              .join('/')}`,
        )
        .join('; '),
      perioBleeding: bleeding.length
        ? bleeding
            .map(
              (site) =>
                `tooth ${universal(site.tooth)} ${(site.sites || []).join(', ')}`,
            )
            .join('; ')
        : undefined,
      perioDeepestPocket: depths.length ? `${Math.max(...depths)}` : undefined,
      perioSitesProbed: depths.length ? `${depths.length}` : undefined,
      perioSitesFourPlus: depths.length
        ? `${depths.filter((depth) => depth >= 4).length}`
        : undefined,
    },
    components: sites.flatMap((site) =>
      PERIO_SITES.filter((key) => site[key] !== undefined).map((key) => ({
        code: {
          text: `Pocket depth ${key}, tooth ${site.tooth} (${system === 'fdi' ? 'FDI' : 'Universal'})`,
        },
        valueQuantity: { value: Number(site[key]), unit: 'mm' },
      })),
    ),
  };
}

function removeEmpty(object) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== '' && value !== null,
    ),
  );
}
