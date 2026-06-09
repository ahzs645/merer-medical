import { useEffect, useMemo, useState } from 'react';
import {
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
import { GROWTH_REFERENCE, GrowthMetric } from './growthReference';

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

interface PatientPoint {
  age: number;
  value: number;
  date: string;
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
  }, [db, user.id]);

  return { docs, status };
}

export function GrowthChartsTab() {
  const user = useUser();
  const { docs, status } = useGrowthData();
  const [metricId, setMetricId] = useState<GrowthMetric>('height');
  const metric = METRICS.find((m) => m.id === metricId) as (typeof METRICS)[0];

  const sex: 'male' | 'female' =
    user.gender?.toLowerCase() === 'female' ? 'female' : 'male';

  const points = useMemo<PatientPoint[]>(() => {
    if (!user.birthday) return [];
    return docs
      .map((doc) => {
        const r = getFhirResource<Record<string, unknown>>(doc);
        if (!conceptCodes(r['code']).some((c) => metric.loinc.includes(c))) {
          return null;
        }
        const vq = r['valueQuantity'] as { value?: number } | undefined;
        const date = (r['effectiveDateTime'] as string) || doc.metadata?.date;
        if (!vq?.value || !date) return null;
        const age = ageAt(user.birthday as string, date);
        if (age === undefined || age < 2 || age > 18) return null;
        return { age, value: vq.value, date };
      })
      .filter((p): p is PatientPoint => Boolean(p))
      .sort((a, b) => a.age - b.age);
  }, [docs, metric, user.birthday]);

  const reference = GROWTH_REFERENCE[sex][metricId];
  const hasBirthday = Boolean(user.birthday);

  return (
    <AppPage banner={<GenericBanner text="Growth Charts" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {[user.first_name, `(${sex})`].filter(Boolean).join(' ')} plotted
              against approximate reference percentiles.
            </p>
            <div className="flex gap-1 rounded-md bg-white p-1 shadow-sm ring-1 ring-gray-200">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetricId(m.id)}
                  className={`rounded px-3 py-1.5 text-sm font-medium ${
                    m.id === metricId
                      ? 'bg-primary-800 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {!hasBirthday ? (
            <Placeholder text="Add a birth date in Settings to see growth percentiles." />
          ) : status === 'loading' ? (
            <Placeholder text="Loading measurements…" />
          ) : (
            <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-1 text-base font-semibold text-gray-900">
                {metric.label}-for-age ({metric.unit})
              </h2>
              <p className="mb-3 text-xs text-gray-500">
                Shaded lines are the 5th, 50th and 95th percentiles for {sex}{' '}
                children. {points.length} measurement
                {points.length === 1 ? '' : 's'} plotted.
              </p>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  >
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
                        `${value} ${metric.unit}`,
                        name,
                      ]}
                      labelFormatter={(age) => `Age ${age}`}
                    />
                    <Line
                      data={reference}
                      dataKey="p95"
                      name="95th"
                      stroke="#cbd5e1"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line
                      data={reference}
                      dataKey="p50"
                      name="50th"
                      stroke="#94a3b8"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                    />
                    <Line
                      data={reference}
                      dataKey="p5"
                      name="5th"
                      stroke="#cbd5e1"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Scatter
                      data={points}
                      dataKey="value"
                      name={user.first_name || 'Patient'}
                      fill="#09384E"
                      line={{ stroke: '#09384E', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {points.length === 0 && (
                <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  No {metric.label.toLowerCase()} measurements found for this
                  person.
                </p>
              )}
              <p className="mt-3 text-xs text-gray-400">
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

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}
