/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ImmunizationRecommendation } from '../types';
import { ImmunizationRecommendationsPanel } from './ImmunizationRecommendationsPanel';

jest.mock('../../../app/providers/UserProvider', () => ({
  useUser: () => ({ id: 'test-user' }),
}));

function recommendation(
  id: string,
  status: ImmunizationRecommendation['status'],
): ImmunizationRecommendation {
  return {
    rule: {
      id,
      country: 'CA',
      vaccineGroup: id as ImmunizationRecommendation['rule']['vaccineGroup'],
      vaccineName: `${id} vaccine`,
      seriesLabel: `${id} series`,
      recommendedAgeText: 'Adults 50+',
      notes: '',
    },
    status,
    doseCount: 0,
    reason: 'No matching doses found in the record.',
  } as ImmunizationRecommendation;
}

function renderPanel(props: {
  hasRecords: boolean;
  hasBirthDate: boolean;
  recommendations?: ImmunizationRecommendation[];
}) {
  return render(
    <MemoryRouter>
      <ImmunizationRecommendationsPanel
        country="CA"
        onCountryChange={() => undefined}
        recommendations={
          props.recommendations ?? [
            recommendation('zoster', 'due'),
            recommendation('influenza', 'overdue'),
          ]
        }
        hasRecords={props.hasRecords}
        hasBirthDate={props.hasBirthDate}
      />
    </MemoryRouter>,
  );
}

/**
 * The forecast cannot tell "no dose on file" from "no dose given", so over an
 * empty record set it marks the whole routine schedule due or overdue. A
 * brand-new install therefore told somebody who may be fully vaccinated that
 * five vaccines needed attention — while Health maintenance, which answers the
 * same question, withheld its own reminders and said why.
 */
describe('ImmunizationRecommendationsPanel with nothing recorded', () => {
  it('does not count routine vaccines as needing attention', () => {
    renderPanel({ hasRecords: false, hasBirthDate: true });

    expect(
      screen.queryByText(/items need attention based on the selected schedule/),
    ).toBeNull();
    expect(
      screen.getByText(/No immunization records yet, so nothing below/),
    ).toBeTruthy();
  });

  it('badges each rule as unassessed rather than due or overdue', () => {
    renderPanel({ hasRecords: false, hasBirthDate: true });

    expect(screen.queryByText('Due now')).toBeNull();
    expect(screen.queryByText('Overdue')).toBeNull();
    expect(screen.getAllByText('No records yet').length).toBe(2);
  });

  it('still counts them once records exist', () => {
    renderPanel({ hasRecords: true, hasBirthDate: true });

    expect(
      screen.getByText(/2 items need attention based on the selected schedule/),
    ).toBeTruthy();
    expect(screen.getByText('Due now')).toBeTruthy();
    expect(screen.getByText('Overdue')).toBeTruthy();
  });
});

describe('ImmunizationRecommendationsPanel next due date', () => {
  const withDueDate = [
    {
      ...recommendation('influenza', 'overdue'),
      nextDueDate: '2025-10-22',
      reason: 'Estimated next dose date is 2025-10-22.',
    } as ImmunizationRecommendation,
  ];

  it('prints the day in the field and drops the sentence repeating it', () => {
    renderPanel({
      hasRecords: true,
      hasBirthDate: true,
      recommendations: withDueDate,
    });

    expect(screen.getByText('Oct 22, 2025')).toBeTruthy();
    expect(screen.queryByText(/Estimated next dose date/)).toBeNull();
  });

  it('keeps a reason that says something the field cannot', () => {
    renderPanel({
      hasRecords: true,
      hasBirthDate: true,
      recommendations: [recommendation('influenza', 'due')],
    });

    expect(
      screen.getByText('No matching doses found in the record.'),
    ).toBeTruthy();
  });
});

describe('ImmunizationRecommendationsPanel without a birth date', () => {
  it('says the list is not filtered by age, and where to fix that', () => {
    renderPanel({ hasRecords: true, hasBirthDate: false });

    expect(screen.getByText(/this list is not filtered by age/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Add a birth date in Settings' }),
    ).toBeTruthy();
  });

  it('stays quiet once the profile carries one', () => {
    renderPanel({ hasRecords: true, hasBirthDate: true });

    expect(screen.queryByText(/this list is not filtered by age/)).toBeNull();
  });
});
