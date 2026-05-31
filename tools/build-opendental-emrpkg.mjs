#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { strToU8, zipSync } from 'fflate';

const FORMAT_NAME = 'mere-emr-package';
const FORMAT_VERSION = 1;
const SOURCE_SYSTEM = 'OpenDental';

const args = parseArgs(process.argv.slice(2));

if (!args.source || !args.output) {
  console.error(`Usage:
  node tools/build-opendental-emrpkg.mjs \\
    --source /Users/ahmadjalil/Downloads/EMR/extracted_data \\
    --output /Users/ahmadjalil/Downloads/EMR/opendental.emrpkg \\
    [--profile-id opendental-demo] [--connection-name "Open Dental import"]

Reads extracted OpenDental-style .schema + .tsv files and writes a Mere .emrpkg.
The package preserves original source rows in each FHIR-like resource.`);
  process.exit(1);
}

const sourceDir = resolve(args.source);
const outputPath = resolve(args.output);
const now = Date.now();
const nowIso = new Date(now).toISOString();
const profileId = stableId(args.profileId || 'opendental-import');

const tables = new Map();
for (const table of [
  'patient',
  'provider',
  'procedurelog',
  'procedurecode',
  'fee',
  'appointment',
  'operatory',
  'carrier',
  'insplan',
  'inssub',
  'patplan',
  'benefit',
  'covcat',
  'claim',
  'claimproc',
  'claimpayment',
  'recall',
  'recalltype',
  'treatplan',
  'perioexam',
  'periomeasure',
  'toothinitial',
]) {
  tables.set(table, readTable(table));
}

const patients = table('patient');
if (patients.length === 0) {
  throw new Error(`No patient rows found in ${join(sourceDir, 'patient.tsv')}`);
}

const providerById = byKey(table('provider'), 'ProvNum');
const procedureCodeById = byKey(table('procedurecode'), 'CodeNum');
const operatoryById = byKey(table('operatory'), 'OperatoryNum');
const carrierById = byKey(table('carrier'), 'CarrierNum');
const insPlanById = byKey(table('insplan'), 'PlanNum');
const insSubById = byKey(table('inssub'), 'InsSubNum');
const claimById = byKey(table('claim'), 'ClaimNum');
const recallTypeById = byKey(table('recalltype'), 'RecallTypeNum');
const perioExamById = byKey(table('perioexam'), 'PerioExamNum');
const claimProcsByClaim = groupBy(table('claimproc'), 'ClaimNum');
const claimProcsByProc = groupBy(table('claimproc'), 'ProcNum');
const benefitsByPlan = groupBy(table('benefit'), 'PlanNum');
const patPlansByPat = groupBy(table('patplan'), 'PatNum');
const perioMeasuresByExam = groupBy(table('periomeasure'), 'PerioExamNum');

const userDocuments = patients.map((patient, index) =>
  buildUser(patient, index === 0),
);
const connectionDocuments = patients.map((patient) => buildConnection(patient));
const clinicalDocuments = [];

for (const patient of patients) {
  clinicalDocuments.push(patientClinicalDocument(patient));
}

for (const provider of table('provider')) {
  for (const patient of patients) {
    clinicalDocuments.push(practitionerClinicalDocument(provider, patient));
  }
}

for (const procedure of table('procedurelog')) {
  if (!hasPatient(procedure.PatNum)) continue;
  clinicalDocuments.push(procedureClinicalDocument(procedure));
}

for (const appointment of table('appointment')) {
  if (!hasPatient(appointment.PatNum)) continue;
  clinicalDocuments.push(appointmentClinicalDocument(appointment));
}

for (const patPlan of table('patplan')) {
  if (!hasPatient(patPlan.PatNum)) continue;
  clinicalDocuments.push(coverageClinicalDocument(patPlan));
}

for (const plan of table('insplan')) {
  for (const patPlan of table('patplan').filter(
    (row) =>
      row.InsSubNum && insSubById.get(row.InsSubNum)?.PlanNum === plan.PlanNum,
  )) {
    if (!hasPatient(patPlan.PatNum)) continue;
    clinicalDocuments.push(insurancePlanClinicalDocument(plan, patPlan.PatNum));
  }
}

for (const claim of table('claim')) {
  if (!hasPatient(claim.PatNum)) continue;
  clinicalDocuments.push(claimClinicalDocument(claim));
}

for (const recall of table('recall')) {
  if (!hasPatient(recall.PatNum)) continue;
  clinicalDocuments.push(recallClinicalDocument(recall));
}

for (const treatPlan of table('treatplan')) {
  if (!hasPatient(treatPlan.PatNum)) continue;
  clinicalDocuments.push(treatmentPlanClinicalDocument(treatPlan));
}

for (const exam of table('perioexam')) {
  if (!hasPatient(exam.PatNum)) continue;
  clinicalDocuments.push(perioExamClinicalDocument(exam));
}

for (const tooth of table('toothinitial')) {
  if (!hasPatient(tooth.PatNum)) continue;
  clinicalDocuments.push(toothInitialClinicalDocument(tooth));
}

const counts = {
  user_documents: userDocuments.length,
  connection_documents: connectionDocuments.length,
  clinical_documents: clinicalDocuments.length,
};

const files = {
  'tables/user_documents.json': strToU8(JSON.stringify(userDocuments)),
  'tables/connection_documents.json': strToU8(
    JSON.stringify(connectionDocuments),
  ),
  'tables/clinical_documents.json': strToU8(JSON.stringify(clinicalDocuments)),
  'manifest.json': strToU8(
    JSON.stringify(
      {
        format: FORMAT_NAME,
        version: FORMAT_VERSION,
        createdAt: now,
        app: { name: 'mere-medical', version: '0.0.0' },
        schema: { version: 1 },
        tables: [
          'user_documents',
          'connection_documents',
          'clinical_documents',
        ],
        counts,
        attachmentCount: 0,
      },
      null,
      2,
    ),
  ),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, zipSync(files, { level: 6 }));

console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify(counts, null, 2));

function table(name) {
  return tables.get(name) || [];
}

function readTable(name) {
  const schemaPath = join(sourceDir, `${name}.schema`);
  const tsvPath = join(sourceDir, `${name}.tsv`);
  if (!existsSync(schemaPath) || !existsSync(tsvPath)) return [];

  const columns = readFileSync(schemaPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(':')[0]);

  const text = readFileSync(tsvPath, 'utf8');
  if (!text.trim()) return [];

  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const values = line.split('\t');
      return Object.fromEntries(
        columns.map((column, index) => [column, decodeValue(values[index])]),
      );
    });
}

function decodeValue(value) {
  if (value === undefined || value === 'NULL') return undefined;
  if (value === '') return undefined;
  return value;
}

function buildUser(patient, selected) {
  return {
    id: userId(patient.PatNum),
    is_selected_user: selected,
    is_default_user: false,
    first_name: patient.FName || undefined,
    last_name: patient.LName || undefined,
    email: patient.Email || undefined,
    birthday: toIso(patient.Birthdate),
    gender: gender(patient.Gender),
    _meta: { lwt: now },
    _deleted: false,
  };
}

function buildConnection(patient) {
  return {
    id: connectionId(patient.PatNum),
    user_id: userId(patient.PatNum),
    source: 'manual',
    location: `opendental://${profileId}/patient/${patient.PatNum}`,
    name: args.connectionName || 'Open Dental import',
    access_token: '',
    expires_at: 0,
    last_refreshed: nowIso,
    _meta: { lwt: now },
    _deleted: false,
  };
}

function patientClinicalDocument(patient) {
  const id = `Patient/${patient.PatNum}`;
  return clinicalDocument({
    patientNum: patient.PatNum,
    resourceId: id,
    resourceType: 'patient',
    date: patient.DateTStamp || patient.DateFirstVisit,
    displayName:
      [patient.FName, patient.LName].filter(Boolean).join(' ') ||
      `Patient ${patient.PatNum}`,
    raw: {
      resource: {
        resourceType: 'Patient',
        id: `${patient.PatNum}`,
        name: [
          {
            family: patient.LName,
            given: [patient.FName, patient.MiddleI].filter(Boolean),
          },
        ],
        gender: gender(patient.Gender),
        birthDate: cleanDate(patient.Birthdate),
        telecom: [
          telecom('phone', patient.HmPhone, 'home'),
          telecom('phone', patient.WkPhone, 'work'),
          telecom('phone', patient.WirelessPhone, 'mobile'),
          telecom('email', patient.Email),
        ].filter(Boolean),
        address: [
          {
            line: [patient.Address, patient.Address2].filter(Boolean),
            city: patient.City,
            state: patient.State,
            postalCode: patient.Zip,
            country: patient.Country,
          },
        ],
        extension: sourceExtensions('patient', patient.PatNum, patient),
      },
    },
  });
}

function practitionerClinicalDocument(provider, patient) {
  const name = providerName(provider);
  return clinicalDocument({
    patientNum: patient.PatNum,
    resourceId: `Practitioner/${provider.ProvNum}`,
    resourceType: 'practitioner',
    date: provider.DateTStamp,
    displayName: name || `Provider ${provider.ProvNum}`,
    raw: {
      resource: {
        resourceType: 'Practitioner',
        id: `${provider.ProvNum}`,
        identifier: [
          provider.NationalProvID && {
            system: 'http://hl7.org/fhir/sid/us-npi',
            value: provider.NationalProvID,
          },
          provider.StateLicense && {
            system: 'urn:opendental:provider:state-license',
            value: provider.StateLicense,
          },
        ].filter(Boolean),
        name: [
          {
            family: provider.LName,
            given: [provider.FName, provider.MI].filter(Boolean),
            suffix: provider.Suffix ? [provider.Suffix] : undefined,
          },
        ],
        extension: sourceExtensions('provider', provider.ProvNum, provider),
      },
    },
  });
}

function procedureClinicalDocument(procedure) {
  const code = procedureCodeById.get(procedure.CodeNum);
  const provider = providerById.get(procedure.ProvNum);
  const claimProc = claimProcsByProc.get(procedure.ProcNum)?.[0];
  const claim = claimProc?.ClaimNum
    ? claimById.get(claimProc.ClaimNum)
    : undefined;
  const status = procedureStatus(procedure.ProcStatus);
  const title =
    code?.Descript ||
    code?.AbbrDesc ||
    procedure.OldCode ||
    `Dental procedure ${procedure.ProcNum}`;
  const details = dentalDetails({
    subtype:
      status === 'planned'
        ? 'treatmentPlan'
        : code?.IsHygiene === '1'
          ? 'cleaning'
          : 'procedure',
    procedureCode: code?.ProcCode || procedure.OldCode,
    dentalTeeth: procedure.ToothNum,
    toothRange: procedure.ToothRange,
    dentalSurfaces: surfaces(procedure.Surf),
    dentalStatus: status,
    dentalProvider: providerName(provider),
    sourceTable: 'procedurelog',
    sourceId: procedure.ProcNum,
    estimatedCost: money(procedure.ProcFee),
    insuranceEstimate: money(claimProc?.InsPayEst),
    patientPortion: money(
      Number(procedure.ProcFee || 0) - Number(claimProc?.InsPayEst || 0),
    ),
    claimStatus: claim?.ClaimStatus && claimStatus(claim.ClaimStatus),
    carrierName: carrierNameForPlan(claim?.PlanNum || claimProc?.PlanNum),
  });

  return clinicalDocument({
    patientNum: procedure.PatNum,
    resourceId: `Procedure/${procedure.ProcNum}`,
    resourceType: 'procedure',
    date: procedureDate(procedure),
    displayName: title,
    raw: {
      resource: {
        resourceType: 'Procedure',
        id: `${procedure.ProcNum}`,
        status: status === 'planned' ? 'preparation' : 'completed',
        subject: patientRef(procedure.PatNum),
        performedDateTime: toIso(procedureDate(procedure)),
        code: {
          text: title,
          coding: code?.ProcCode
            ? [
                {
                  system: 'http://www.ada.org/cdt',
                  code: code.ProcCode,
                  display: code.Descript,
                },
              ]
            : undefined,
        },
        bodySite: dentalBodySite(details),
        performer: provider
          ? [
              {
                actor: {
                  reference: `Practitioner/${provider.ProvNum}`,
                  display: providerName(provider),
                },
              },
            ]
          : undefined,
        note: notes([
          code?.DefaultNote,
          procedure.BillingNote,
          procedure.ClaimNote,
        ]),
        extension: sourceExtensions(
          'procedurelog',
          procedure.ProcNum,
          procedure,
        ),
      },
    },
    metadata: {
      manual_specialty: 'dental',
      manual_subtype: details.subtype,
      manual_specialty_details: details,
    },
  });
}

function appointmentClinicalDocument(appointment) {
  const provider = providerById.get(appointment.ProvNum);
  const operatory = operatoryById.get(appointment.Op);
  const title =
    appointment.ProcDescript || `Dental appointment ${appointment.AptNum}`;
  const details = dentalDetails({
    subtype: 'procedure',
    dentalProvider: providerName(provider),
    dentalLocation: operatory?.OpName || operatory?.Abbrev,
    dentalStatus: appointmentStatus(appointment.AptStatus),
    sourceTable: 'appointment',
    sourceId: appointment.AptNum,
  });
  return clinicalDocument({
    patientNum: appointment.PatNum,
    resourceId: `Appointment/${appointment.AptNum}`,
    resourceType: 'appointment',
    date: appointment.AptDateTime,
    displayName: title,
    raw: {
      resource: {
        resourceType: 'Appointment',
        id: `${appointment.AptNum}`,
        status: fhirAppointmentStatus(appointment.AptStatus),
        description: title,
        start: toIso(appointment.AptDateTime),
        participant: [
          { actor: patientRef(appointment.PatNum), status: 'accepted' },
          provider && {
            actor: {
              reference: `Practitioner/${provider.ProvNum}`,
              display: providerName(provider),
            },
            status: 'accepted',
          },
          operatory && {
            actor: {
              reference: `Location/${operatory.OperatoryNum}`,
              display: operatory.OpName || operatory.Abbrev,
            },
            status: 'accepted',
          },
        ].filter(Boolean),
        comment: appointment.Note,
        extension: sourceExtensions(
          'appointment',
          appointment.AptNum,
          appointment,
        ),
      },
    },
    metadata: {
      manual_specialty: 'dental',
      manual_subtype: details.subtype,
      manual_specialty_details: details,
    },
  });
}

function coverageClinicalDocument(patPlan) {
  const sub = insSubById.get(patPlan.InsSubNum);
  const plan = sub ? insPlanById.get(sub.PlanNum) : undefined;
  const carrier = plan ? carrierById.get(plan.CarrierNum) : undefined;
  const benefits = plan ? benefitsByPlan.get(plan.PlanNum) || [] : [];
  const title =
    [carrier?.CarrierName, plan?.GroupName || plan?.GroupNum]
      .filter(Boolean)
      .join(' - ') || `Dental coverage ${patPlan.PatPlanNum}`;
  const details = dentalDetails({
    subtype: 'note',
    sourceTable: 'patplan',
    sourceId: patPlan.PatPlanNum,
    carrierName: carrier?.CarrierName,
    planName: plan?.GroupName || plan?.GroupNum,
    subscriberId: sub?.SubscriberID,
    annualMaximum: benefitAmount(benefits, 'annual maximum'),
    deductible: benefitAmount(benefits, 'deductible'),
  });
  return clinicalDocument({
    patientNum: patPlan.PatNum,
    resourceId: `Coverage/${patPlan.PatPlanNum}`,
    resourceType: 'coverage',
    date: sub?.DateEffective || patPlan.SecDateTEntry,
    displayName: title,
    raw: {
      resource: {
        resourceType: 'Coverage',
        id: `${patPlan.PatPlanNum}`,
        status: patPlan.IsPending === '1' ? 'draft' : 'active',
        beneficiary: patientRef(patPlan.PatNum),
        subscriber: sub?.Subscriber
          ? { reference: `Patient/${sub.Subscriber}` }
          : undefined,
        subscriberId: sub?.SubscriberID,
        payor: carrier ? [{ display: carrier.CarrierName }] : undefined,
        class: [
          plan?.GroupNum && {
            type: { text: 'group' },
            value: plan.GroupNum,
            name: plan.GroupName,
          },
          patPlan.Ordinal && {
            type: { text: 'ordinal' },
            value: `${patPlan.Ordinal}`,
          },
        ].filter(Boolean),
        extension: [
          ...sourceExtensions('patplan', patPlan.PatPlanNum, patPlan),
          sourceRowExtension('inssub', sub),
          sourceRowExtension('insplan', plan),
          sourceRowExtension('carrier', carrier),
          ...benefits
            .map((benefit) => sourceRowExtension('benefit', benefit))
            .filter(Boolean),
        ].filter(Boolean),
      },
    },
    metadata: {
      manual_specialty: 'dental',
      manual_subtype: 'note',
      manual_specialty_details: details,
    },
  });
}

function insurancePlanClinicalDocument(plan, patientNum) {
  const carrier = carrierById.get(plan.CarrierNum);
  const title =
    [carrier?.CarrierName, plan.GroupName || plan.GroupNum]
      .filter(Boolean)
      .join(' - ') || `Insurance plan ${plan.PlanNum}`;
  return clinicalDocument({
    patientNum,
    resourceId: `InsurancePlan/${plan.PlanNum}`,
    resourceType: 'insuranceplan',
    date: plan.SecDateTEdit,
    displayName: title,
    raw: {
      resource: {
        resourceType: 'InsurancePlan',
        id: `${plan.PlanNum}`,
        status: plan.IsHidden === '1' ? 'retired' : 'active',
        name: title,
        ownedBy: carrier ? { display: carrier.CarrierName } : undefined,
        type: [{ text: 'Dental' }],
        extension: [
          ...sourceExtensions('insplan', plan.PlanNum, plan),
          sourceRowExtension('carrier', carrier),
        ].filter(Boolean),
      },
    },
  });
}

function claimClinicalDocument(claim) {
  const plan = insPlanById.get(claim.PlanNum);
  const carrier = carrierById.get(plan?.CarrierNum);
  const lines = claimProcsByClaim.get(claim.ClaimNum) || [];
  const details = dentalDetails({
    subtype: 'note',
    sourceTable: 'claim',
    sourceId: claim.ClaimNum,
    claimStatus: claimStatus(claim.ClaimStatus),
    carrierName: carrier?.CarrierName,
    planName: plan?.GroupName || plan?.GroupNum,
    insuranceEstimate: money(claim.InsPayEst),
    patientPortion: money(
      Number(claim.ClaimFee || 0) -
        Number(claim.InsPayAmt || claim.InsPayEst || 0),
    ),
    deductible: money(claim.DedApplied),
    eobAttachment: claim.AttachmentID,
  });
  return clinicalDocument({
    patientNum: claim.PatNum,
    resourceId: `Claim/${claim.ClaimNum}`,
    resourceType: 'documentreference',
    date: claim.DateService || claim.DateSent,
    displayName: `Dental claim ${claim.ClaimIdentifier || claim.ClaimNum}`,
    raw: {
      resource: {
        resourceType: 'DocumentReference',
        id: `${claim.ClaimNum}`,
        status: 'current',
        type: { text: 'Dental claim' },
        subject: patientRef(claim.PatNum),
        date: toIso(claim.DateService || claim.DateSent),
        description: `Claim status: ${details.claimStatus || claim.ClaimStatus || 'unknown'}`,
        content: [],
        context: {
          related: lines
            .map(
              (line) =>
                line.ProcNum && { reference: `Procedure/${line.ProcNum}` },
            )
            .filter(Boolean),
        },
        extension: [
          ...sourceExtensions('claim', claim.ClaimNum, claim),
          ...lines
            .map((line) => sourceRowExtension('claimproc', line))
            .filter(Boolean),
        ],
      },
    },
    metadata: {
      manual_specialty: 'dental',
      manual_subtype: 'note',
      manual_specialty_details: details,
    },
  });
}

function recallClinicalDocument(recall) {
  const type = recallTypeById.get(recall.RecallTypeNum);
  const details = dentalDetails({
    subtype: 'cleaning',
    sourceTable: 'recall',
    sourceId: recall.RecallNum,
    recallType: type?.Description,
    dentalRecall: type?.Procedures,
    recallDueDate: cleanDate(recall.DateDue),
    dentalFollowUp: cleanDate(recall.DateScheduled || recall.DateDue),
    dentalStatus: recall.IsDisabled === '1' ? 'disabled' : 'active',
  });
  return clinicalDocument({
    patientNum: recall.PatNum,
    resourceId: `Recall/${recall.RecallNum}`,
    resourceType: 'careplan',
    date: recall.DateDue || recall.DatePrevious,
    displayName:
      `${type?.Description || 'Dental recall'} due ${cleanDate(recall.DateDue) || ''}`.trim(),
    raw: {
      resource: {
        resourceType: 'CarePlan',
        id: `${recall.RecallNum}`,
        status: recall.IsDisabled === '1' ? 'revoked' : 'active',
        intent: 'plan',
        subject: patientRef(recall.PatNum),
        period: {
          start: cleanDate(recall.DatePrevious),
          end: cleanDate(recall.DateDue),
        },
        title: type?.Description || 'Dental recall',
        description: recall.Note,
        extension: [
          ...sourceExtensions('recall', recall.RecallNum, recall),
          sourceRowExtension('recalltype', type),
        ].filter(Boolean),
      },
    },
    metadata: {
      manual_specialty: 'dental',
      manual_subtype: 'cleaning',
      manual_specialty_details: details,
    },
  });
}

function treatmentPlanClinicalDocument(treatPlan) {
  const details = dentalDetails({
    subtype: 'treatmentPlan',
    sourceTable: 'treatplan',
    sourceId: treatPlan.TreatPlanNum,
    treatmentStatus: treatPlan.TPStatus === '1' ? 'active' : 'proposed',
    signatureStatus:
      treatPlan.DateTSigned && cleanDate(treatPlan.DateTSigned)
        ? 'signed'
        : 'unsigned',
  });
  return clinicalDocument({
    patientNum: treatPlan.PatNum,
    resourceId: `CarePlan/${treatPlan.TreatPlanNum}`,
    resourceType: 'careplan',
    date: treatPlan.DateTP || treatPlan.SecDateEntry,
    displayName:
      treatPlan.Heading || `Treatment plan ${treatPlan.TreatPlanNum}`,
    raw: {
      resource: {
        resourceType: 'CarePlan',
        id: `${treatPlan.TreatPlanNum}`,
        status: details.treatmentStatus === 'active' ? 'active' : 'draft',
        intent: 'plan',
        subject: patientRef(treatPlan.PatNum),
        created: cleanDate(treatPlan.DateTP || treatPlan.SecDateEntry),
        title: treatPlan.Heading,
        description: treatPlan.Note,
        extension: sourceExtensions(
          'treatplan',
          treatPlan.TreatPlanNum,
          treatPlan,
        ),
      },
    },
    metadata: {
      manual_specialty: 'dental',
      manual_subtype: 'treatmentPlan',
      manual_specialty_details: details,
    },
  });
}

function perioExamClinicalDocument(exam) {
  const provider = providerById.get(exam.ProvNum);
  const measures = perioMeasuresByExam.get(exam.PerioExamNum) || [];
  const teeth = measures.map((measure) => measure.IntTooth).filter(Boolean);
  const details = dentalDetails({
    subtype: 'finding',
    sourceTable: 'perioexam',
    sourceId: exam.PerioExamNum,
    dentalTeeth: [...new Set(teeth)].join(', '),
    perioPocketDepths: measures
      .map(formatPerioMeasure)
      .filter(Boolean)
      .join('; '),
    perioBleeding: measures
      .filter((measure) => measure.SequenceType === '6')
      .map(formatPerioMeasure)
      .join('; '),
    perioMobility: measures
      .filter((measure) => measure.SequenceType === '8')
      .map(formatPerioMeasure)
      .join('; '),
    dentalProvider: providerName(provider),
  });
  return clinicalDocument({
    patientNum: exam.PatNum,
    resourceId: `Observation/perio-${exam.PerioExamNum}`,
    resourceType: 'observation',
    date: exam.ExamDate || exam.DateTMeasureEdit,
    displayName: `Periodontal exam ${cleanDate(exam.ExamDate) || exam.PerioExamNum}`,
    raw: {
      resource: {
        resourceType: 'Observation',
        id: `perio-${exam.PerioExamNum}`,
        status: 'final',
        category: [{ text: 'Dental finding' }],
        code: { text: 'Periodontal exam' },
        subject: patientRef(exam.PatNum),
        effectiveDateTime: toIso(exam.ExamDate || exam.DateTMeasureEdit),
        component: measures.map(perioComponent),
        note: notes([exam.Note, details.perioPocketDepths]),
        extension: [
          ...sourceExtensions('perioexam', exam.PerioExamNum, exam),
          ...measures
            .map((measure) => sourceRowExtension('periomeasure', measure))
            .filter(Boolean),
        ],
      },
    },
    metadata: {
      manual_specialty: 'dental',
      manual_subtype: 'finding',
      manual_specialty_details: details,
    },
  });
}

function toothInitialClinicalDocument(tooth) {
  const details = dentalDetails({
    subtype: 'condition',
    sourceTable: 'toothinitial',
    sourceId: tooth.ToothInitialNum,
    dentalTeeth: tooth.ToothNum,
    dentalStatus: toothInitialType(tooth.InitialType),
  });
  return clinicalDocument({
    patientNum: tooth.PatNum,
    resourceId: `Condition/toothinitial-${tooth.ToothInitialNum}`,
    resourceType: 'condition',
    date: tooth.SecDateTEdit || tooth.SecDateTEntry,
    displayName: `Initial tooth finding ${tooth.ToothNum}`,
    raw: {
      resource: {
        resourceType: 'Condition',
        id: `toothinitial-${tooth.ToothInitialNum}`,
        clinicalStatus: { text: details.dentalStatus },
        category: [{ text: 'Dental condition' }],
        code: {
          text:
            tooth.DrawText ||
            details.dentalStatus ||
            'Initial tooth chart finding',
        },
        bodySite: dentalBodySite(details),
        subject: patientRef(tooth.PatNum),
        recordedDate: toIso(tooth.SecDateTEdit || tooth.SecDateTEntry),
        extension: sourceExtensions(
          'toothinitial',
          tooth.ToothInitialNum,
          tooth,
        ),
      },
    },
    metadata: {
      manual_specialty: 'dental',
      manual_subtype: 'condition',
      manual_specialty_details: details,
    },
  });
}

function clinicalDocument({
  patientNum,
  resourceId,
  resourceType,
  date,
  displayName,
  raw,
  metadata = {},
}) {
  return {
    id: `${connectionId(patientNum)}|${userId(patientNum)}|${resourceId}`,
    connection_record_id: connectionId(patientNum),
    user_id: userId(patientNum),
    data_record: {
      raw,
      format: 'FHIR.R4',
      content_type: 'application/json',
      resource_type: resourceType,
      version_history: [],
    },
    metadata: {
      id: resourceId,
      date: toIso(date) || nowIso,
      display_name: displayName,
      source_name: SOURCE_SYSTEM,
      source_type: 'file-import',
      source_location: sourceDir,
      retrieved_at: nowIso,
      entry_method: 'file-import',
      mapping_confidence: 'mapped',
      ...metadata,
    },
    _meta: { lwt: now },
    _deleted: false,
  };
}

function dentalDetails(details) {
  return removeEmpty({
    specialty: 'dental',
    sourceSystem: SOURCE_SYSTEM,
    mappingConfidence: 'high',
    numberingSystem: 'universal',
    ...details,
  });
}

function sourceExtensions(tableName, id, row) {
  return [sourceRowExtension(tableName, row, id)].filter(Boolean);
}

function sourceRowExtension(tableName, row, id) {
  if (!row) return undefined;
  return {
    url: 'https://mere.health/fhir/StructureDefinition/source-row',
    extension: [
      { url: 'system', valueString: SOURCE_SYSTEM },
      { url: 'table', valueString: tableName },
      {
        url: 'id',
        valueString: `${id || sourceIdForRow(tableName, row) || ''}`,
      },
      { url: 'row', valueString: JSON.stringify(row) },
    ],
  };
}

function sourceIdForRow(tableName, row) {
  const key = {
    patient: 'PatNum',
    provider: 'ProvNum',
    procedurelog: 'ProcNum',
    appointment: 'AptNum',
    patplan: 'PatPlanNum',
    inssub: 'InsSubNum',
    insplan: 'PlanNum',
    carrier: 'CarrierNum',
    benefit: 'BenefitNum',
    claim: 'ClaimNum',
    claimproc: 'ClaimProcNum',
    recall: 'RecallNum',
    recalltype: 'RecallTypeNum',
    treatplan: 'TreatPlanNum',
    perioexam: 'PerioExamNum',
    periomeasure: 'PerioMeasureNum',
    toothinitial: 'ToothInitialNum',
  }[tableName];
  return key ? row[key] : undefined;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = camelCase(arg.slice(2));
    const next = argv[index + 1];
    result[key] = !next || next.startsWith('--') ? true : next;
    if (next && !next.startsWith('--')) index += 1;
  }
  return result;
}

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function byKey(rows, key) {
  return new Map(rows.filter((row) => row[key]).map((row) => [row[key], row]));
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    if (!row[key]) continue;
    grouped.set(row[key], [...(grouped.get(row[key]) || []), row]);
  }
  return grouped;
}

function hasPatient(patNum) {
  return patients.some((patient) => patient.PatNum === patNum);
}

function userId(patNum) {
  return stableId(`${profileId}-patient-${patNum}`);
}

function connectionId(patNum) {
  return stableId(`${profileId}-connection-${patNum}`);
}

function stableId(value) {
  return `${value}`
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function cleanDate(value) {
  if (!value || value === '0001-01-01' || value.startsWith('0001-01-01'))
    return undefined;
  return `${value}`.split(' ')[0];
}

function toIso(value) {
  if (!value || value === '0001-01-01' || `${value}`.startsWith('0001-01-01'))
    return undefined;
  const text = `${value}`.trim();
  const date = text.includes('T')
    ? new Date(text)
    : new Date(
        text.includes(' ') ? text.replace(' ', 'T') : `${text}T12:00:00.000Z`,
      );
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function gender(value) {
  return value === '0' ? 'male' : value === '1' ? 'female' : 'unknown';
}

function telecom(system, value, use) {
  return value ? removeEmpty({ system, value, use }) : undefined;
}

function providerName(provider) {
  if (!provider) return undefined;
  return (
    [provider.FName, provider.MI, provider.LName, provider.Suffix]
      .filter(Boolean)
      .join(' ') || provider.Abbr
  );
}

function patientRef(patNum) {
  return { reference: `Patient/${patNum}` };
}

function procedureDate(procedure) {
  return (
    cleanDate(procedure.ProcDate) ||
    cleanDate(procedure.DateComplete) ||
    cleanDate(procedure.DateEntryC) ||
    procedure.DateTStamp
  );
}

function procedureStatus(value) {
  return (
    {
      1: 'treatment-planned',
      2: 'completed',
      3: 'existing-current',
      4: 'existing-other',
      5: 'referred',
      6: 'deleted',
    }[value] || 'unknown'
  );
}

function appointmentStatus(value) {
  return (
    {
      1: 'scheduled',
      2: 'completed',
      3: 'unscheduled',
      5: 'broken',
      6: 'planned',
    }[value] || 'unknown'
  );
}

function fhirAppointmentStatus(value) {
  const status = appointmentStatus(value);
  if (status === 'completed') return 'fulfilled';
  if (status === 'broken') return 'cancelled';
  if (status === 'planned') return 'proposed';
  return 'booked';
}

function claimStatus(value) {
  return (
    {
      S: 'sent',
      R: 'received',
      U: 'unsent',
      H: 'hold',
      W: 'waiting',
    }[value] || value
  );
}

function toothInitialType(value) {
  return (
    {
      0: 'initial',
      1: 'missing',
      2: 'hidden',
    }[value] || 'initial'
  );
}

function carrierNameForPlan(planNum) {
  const plan = insPlanById.get(planNum);
  return carrierById.get(plan?.CarrierNum)?.CarrierName;
}

function benefitAmount(benefits, label) {
  const match = benefits.find((benefit) => Number(benefit.MonetaryAmt) > 0);
  return match ? `${label}: ${money(match.MonetaryAmt)}` : undefined;
}

function surfaces(value) {
  if (!value) return [];
  return `${value}`
    .toUpperCase()
    .split('')
    .filter(
      (surface, index, list) =>
        ['M', 'O', 'I', 'D', 'B', 'F', 'L'].includes(surface) &&
        list.indexOf(surface) === index,
    );
}

function dentalBodySite(details) {
  const parts = [
    details.dentalTeeth && `teeth ${details.dentalTeeth}`,
    details.toothRange && `range ${details.toothRange}`,
    details.dentalSurfaces?.length &&
      `surfaces ${details.dentalSurfaces.join('/')}`,
  ].filter(Boolean);
  return parts.length ? [{ text: parts.join('; ') }] : undefined;
}

function notes(values) {
  const text = values.filter(Boolean).join('\n');
  return text ? [{ text }] : undefined;
}

function formatPerioMeasure(measure) {
  const values = [
    'MBvalue',
    'Bvalue',
    'DBvalue',
    'MLvalue',
    'Lvalue',
    'DLvalue',
  ]
    .map((key) =>
      measure[key] !== undefined && Number(measure[key]) >= 0
        ? `${key.replace('value', '')}:${measure[key]}`
        : undefined,
    )
    .filter(Boolean)
    .join('/');
  return values ? `tooth ${measure.IntTooth} ${values}` : undefined;
}

function perioComponent(measure) {
  return {
    code: {
      text: `Perio sequence ${measure.SequenceType} tooth ${measure.IntTooth}`,
    },
    valueString: formatPerioMeasure(measure),
  };
}

function money(value) {
  if (value === undefined || value === '' || Number.isNaN(Number(value)))
    return undefined;
  return `$${Number(value).toFixed(2)}`;
}

function removeEmpty(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}
