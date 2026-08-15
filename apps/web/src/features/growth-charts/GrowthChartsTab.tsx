import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { conceptCodes } from '../../shared/utils/fhirText';
import { useRecordChangeTick } from '../../shared/utils/recordChangeSignal';
import {
  GROWTH_REFERENCE,
  GrowthMetric,
  GrowthRefPoint,
} from './growthReference';

const METRICS: {
  id: GrowthMetric;
  label: string;
  loinc: string[];
  unit: string;
}[] = [
  { id: 'height', label: 'Height', loinc: ['8302-2', '3137-7'], unit: 'cm' },
  { id: 'weight', label: 'Weight', loinc: ['29463-7', '3141-9'], unit: 'kg' },
  { id: 'bmi', label: 'BMI', loinc: ['39156-5'], unit: 'kg/m²' },
];

type Metric = (typeof METRICS)[number];

const BAND_FILL = '#cbd5e1';
const MEDIAN_STROKE = '#64748b';
const PATIENT_STROKE = '#09384E';

interface PatientPoint {
  age: number;
  value: number;
  date: string;
}

/** Reference row plus the [p5, p95] pair Recharts needs for a range Area. */
interface BandPoint extends GrowthRefPoint {
  band: [number, number];
}

function ageAt(birthday: string, date: string): number | undefined {
  const dob = new Date(birthday).getTime();
  const at = new Date(date).getTime();
  if (Number.isNaN(dob) || Number.isNaN(at)) return undefined;
  return Math.round(((at - dob) / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
}

function useGrowthData() {
  const db = useRxDb();
  const user = useUser();
  // Refetch when records land — a portal sync or an .emrpkg import
  // writes straight to the collection, and this page reads it once.
  const recordChangeTick = useRecordChangeTick();
  const [docs, setDocs] = useState<ClinicalDocument[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      const found = await db.clinical_documents
        .find({
          selector: {
            user_id: user.id,
            'data_record.resource_type': 'observation',
          },
        })
        .exec();
      if (!mounted) return;
      setDocs(found.map((d) => d.toMutableJSON() as ClinicalDocument));
      setStatus('success');
    }
    load();
    return () => {
      mounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  return { docs, status };
}

function pointsForMetric(
  docs: ClinicalDocument[],
  birthday: string,
  metric: Metric,
): PatientPoint[] {
  return docs
    .map((doc) => {
      const r = getFhirResource<Record<string, unknown>>(doc);
      if (!conceptCodes(r['code']).some((c) => metric.loinc.includes(c))) {
        return null;
      }
      const vq = r['valueQuantity'] as { value?: number } | undefined;
      const date = (r['effectiveDateTime'] as string) || doc.metadata?.date;
      if (!vq?.value || !date) return null;
      const age = ageAt(birthday, date);
      if (age === undefined || age < 2 || age > 18) return null;
      return { age, value: vq.value, date };
    })
    .filter((p): p is PatientPoint => Boolean(p))
    .sort((a, b) => a.age - b.age);
}

export function GrowthChartsTab() {
  const user = useUser();
  const { docs, status } = useGrowthData();

  const sex =
    user.gender?.toLowerCase() === 'female'
      ? 'female'
      : user.gender?.toLowerCase() === 'male'
        ? 'male'
        : undefined;

  const pointsByMetric = useMemo(() => {
    const empty = {} as Record<GrowthMetric, PatientPoint[]>;
    if (!user.birthday) {
      METRICS.forEach((m) => {
        empty[m.id] = [];
      });
      return empty;
    }
    METRICS.forEach((m) => {
      empty[m.id] = pointsForMetric(docs, user.birthday as string, m);
    });
    return empty;
  }, [docs, user.birthday]);

  const bandsByMetric = useMemo(() => {
    const bands = {} as Record<GrowthMetric, BandPoint[]>;
    METRICS.forEach((m) => {
      bands[m.id] = sex
        ? GROWTH_REFERENCE[sex][m.id].map((row) => ({
            ...row,
            band: [row.p5, row.p95] as [number, number],
          }))
        : [];
    });
    return bands;
  }, [sex]);

  const hasBirthday = Boolean(user.birthday);
  const hasReferenceSex = Boolean(sex);
  const patientName = user.first_name || 'Patient';
  const patientLabel =
    [user.first_name, sex ? `(${sex})` : undefined].filter(Boolean).join(' ') ||
    'Patient';

  return (
    <AppPage banner={<GenericBanner text="Growth charts" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <p className="mb-4 text-sm text-gray-600">
            {patientLabel}
            {sex
              ? ' plotted against approximate reference percentiles.'
              : ' growth measurements use approximate reference percentiles once sex/gender is set.'}
          </p>

          {!hasBirthday ? (
            <Placeholder text="Add a birth date in Settings to see growth percentiles." />
          ) : !hasReferenceSex ? (
            <Placeholder text="Add sex/gender in Settings to choose the correct growth reference curves." />
          ) : status === 'loading' ? (
            <Placeholder text="Loading measurements…" />
          ) : (
            <div className="grid gap-4">
              {METRICS.map((metric) => (
                <MetricChart
                  key={metric.id}
                  metric={metric}
                  sex={sex as 'male' | 'female'}
                  reference={bandsByMetric[metric.id]}
                  points={pointsByMetric[metric.id]}
                  patientName={patientName}
                />
              ))}
              <p className="text-xs text-gray-600">
                Reference percentiles are approximate and for visualization only
                — not a clinical assessment.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function MetricChart({
  metric,
  sex,
  reference,
  points,
  patientName,
}: {
  metric: Metric;
  sex: 'male' | 'female';
  reference: BandPoint[];
  points: PatientPoint[];
  patientName: string;
}) {
  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {metric.label}-for-age ({metric.unit})
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        The shaded band spans the 5th to 95th percentile for {sex} children and
        the dashed line is the 50th (median). {points.length} measurement
        {points.length === 1 ? '' : 's'} plotted.
      </p>
      {/* Recharts' own <Legend> keys off series colour alone, which cannot
          distinguish the band from the median line; spell both out instead. */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <LegendItem label="5th–95th percentile">
          <span
            className="block h-3 w-4 rounded-sm"
            style={{ backgroundColor: BAND_FILL }}
          />
        </LegendItem>
        <LegendItem label="50th percentile (median)">
          <span
            className="block h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: MEDIAN_STROKE }}
          />
        </LegendItem>
        <LegendItem label={`${patientName}'s measurements`}>
          <span
            className="block h-2 w-2 rounded-full"
            style={{ backgroundColor: PATIENT_STROKE }}
          />
        </LegendItem>
      </ul>
      <div className="mt-2 h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis
              dataKey="age"
              type="number"
              domain={[2, 18]}
              tickCount={9}
              label={{
                value: 'Age (yrs)',
                position: 'insideBottom',
                offset: -2,
                fontSize: 11,
              }}
              fontSize={11}
            />
            <YAxis fontSize={11} width={40} domain={['auto', 'auto']} />
            <Tooltip
              formatter={(value, name) => [
                Array.isArray(value)
                  ? `${value[0]}–${value[1]} ${metric.unit}`
                  : `${value} ${metric.unit}`,
                name,
              ]}
              labelFormatter={(age) => `Age ${age}`}
            />
            <Area
              data={reference}
              dataKey="band"
              name="5th–95th percentile"
              fill={BAND_FILL}
              fillOpacity={0.45}
              stroke={BAND_FILL}
              strokeWidth={1}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              data={reference}
              dataKey="p50"
              name="50th percentile"
              stroke={MEDIAN_STROKE}
              dot={false}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              isAnimationActive={false}
            />
            <Scatter
              data={points}
              dataKey="value"
              name={patientName}
              fill={PATIENT_STROKE}
              line={{ stroke: PATIENT_STROKE, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {points.length === 0 && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          No {metric.label.toLowerCase()} measurements found for this person.
        </p>
      )}
    </section>
  );
}

function LegendItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      {children}
      {label}
    </li>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}
