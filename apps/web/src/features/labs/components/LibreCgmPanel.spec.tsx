/** @jest-environment jsdom */
import { createElement, type PropsWithChildren } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { LibreCgmPanel } from './LibreCgmPanel';
import { LabDocument } from '../types';
import { buildAgp, buildDailyProfiles } from '../utils/libreCgmStats';

const mockCreateElement = createElement;

// Chart layout belongs to the browser. Keep the mount observable here without
// giving jsdom an invented size or suppressing Recharts' measurement warnings.
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: PropsWithChildren) =>
    mockCreateElement('div', null, children),
  ComposedChart: () =>
    mockCreateElement('div', { 'data-testid': 'glucose-chart' }),
  CartesianGrid: () => null,
  Line: () => null,
  ReferenceArea: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

jest.mock('../utils/libreCgmStats', () => {
  const actual = jest.requireActual('../utils/libreCgmStats');
  return {
    ...actual,
    buildAgp: jest.fn(actual.buildAgp),
    buildDailyProfiles: jest.fn(actual.buildDailyProfiles),
  };
});

function reading(id: string, date: string, value: number): LabDocument {
  return {
    id,
    metadata: { date },
    data_record: {
      raw: {
        resource: {
          effectiveDateTime: date,
          valueQuantity: { value },
        },
      },
    },
  } as unknown as LabDocument;
}

const readings = [
  reading('reading-1', '2026-02-01T12:00:00.000Z', 90),
  reading('reading-2', '2026-02-01T13:00:00.000Z', 110),
  reading('reading-3', '2026-02-02T12:00:00.000Z', 130),
];

describe('LibreCgmPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers the report without calculating or mounting charts during lab browsing', () => {
    render(<LibreCgmPanel labs={readings} />);

    const show = screen.getByRole('button', { name: 'Show glucose report' });
    expect(show.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('3 imported readings')).toBeTruthy();
    expect(screen.queryByText('Average')).toBeNull();
    expect(screen.queryAllByTestId('glucose-chart')).toHaveLength(0);
    expect(buildAgp).not.toHaveBeenCalled();
    expect(buildDailyProfiles).not.toHaveBeenCalled();
  });

  it('opens every existing metric and chart on request and closes them again', () => {
    render(<LibreCgmPanel labs={readings} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Show glucose report' }),
    );

    const hide = screen.getByRole('button', { name: 'Hide glucose report' });
    expect(hide.getAttribute('aria-expanded')).toBe('true');
    const report = document.getElementById(hide.getAttribute('aria-controls')!);
    expect(report?.hidden).toBe(false);
    ['Readings', 'Average', 'GMI', 'Variability', 'Date range'].forEach(
      (label) => expect(screen.getByText(label)).toBeTruthy(),
    );
    expect(screen.getByText('110 mg/dL')).toBeTruthy();
    expect(screen.getByText('2026-02-01 to 2026-02-02')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Time In Ranges' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Ambulatory Glucose Profile' }),
    ).toBeTruthy();
    // One AGP and both daily profiles remain available.
    expect(screen.getAllByTestId('glucose-chart')).toHaveLength(3);
    expect(buildAgp).toHaveBeenCalledTimes(1);
    expect(buildDailyProfiles).toHaveBeenCalledTimes(1);

    fireEvent.click(hide);

    expect(report?.hidden).toBe(true);
    expect(screen.queryAllByTestId('glucose-chart')).toHaveLength(0);
    expect(
      screen
        .getByRole('button', { name: 'Show glucose report' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('does not offer an empty report', () => {
    const { container } = render(<LibreCgmPanel labs={[]} />);

    expect(container.childElementCount).toBe(0);
    expect(buildAgp).not.toHaveBeenCalled();
    expect(buildDailyProfiles).not.toHaveBeenCalled();
  });
});
