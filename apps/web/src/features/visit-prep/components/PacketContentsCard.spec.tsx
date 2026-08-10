/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { PacketOptions } from '../types';
import { PacketContentsCard } from './PacketContentsCard';

const ALL_ON: PacketOptions = {
  includeProblems: true,
  includeMedications: true,
  includeAllergies: true,
  includeLabs: true,
  includeDocuments: true,
  includeImaging: true,
  includeProcedures: true,
  includeQuestions: true,
};

const ALL_OFF: PacketOptions = Object.fromEntries(
  Object.keys(ALL_ON).map((key) => [key, false]),
) as PacketOptions;

/**
 * The chips are the only control over what a provider receives, so the state
 * they show and the keys they toggle have to stay wired to the real option
 * names — a chip that looks checked while its section is missing from the
 * packet is worse than no chip at all.
 */
describe('PacketContentsCard', () => {
  it('reports each chip as a checkbox carrying its own checked state', () => {
    render(
      <PacketContentsCard
        packetOptions={{ ...ALL_ON, includeImaging: false }}
        updatePacketOption={() => undefined}
      />,
    );

    const checked = (name: string) =>
      (screen.getByRole('checkbox', { name }) as HTMLInputElement).checked;

    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    expect(checked('Problems')).toBe(true);
    expect(checked('Imaging')).toBe(false);
    expect(screen.getByText('7 of 8 included')).toBeTruthy();
  });

  it('toggles the option the chip stands for', () => {
    const updatePacketOption = jest.fn();
    render(
      <PacketContentsCard
        packetOptions={ALL_ON}
        updatePacketOption={updatePacketOption}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Abnormal labs' }));

    expect(updatePacketOption).toHaveBeenCalledWith('includeLabs', false);
  });

  it('clears every section at once, and offers to select them back', () => {
    const updatePacketOption = jest.fn();
    const { rerender } = render(
      <PacketContentsCard
        packetOptions={ALL_ON}
        updatePacketOption={updatePacketOption}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(updatePacketOption).toHaveBeenCalledTimes(8);
    expect(updatePacketOption.mock.calls.every(([, on]) => on === false)).toBe(
      true,
    );

    updatePacketOption.mockClear();
    rerender(
      <PacketContentsCard
        packetOptions={ALL_OFF}
        updatePacketOption={updatePacketOption}
      />,
    );

    expect(screen.getByText('0 of 8 included')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));

    expect(updatePacketOption).toHaveBeenCalledTimes(8);
    expect(updatePacketOption.mock.calls.every(([, on]) => on === true)).toBe(
      true,
    );
  });

  it('keeps every chip a 44px target', () => {
    const { container } = render(
      <PacketContentsCard
        packetOptions={ALL_ON}
        updatePacketOption={() => undefined}
      />,
    );

    container.querySelectorAll('label > span').forEach((chip) => {
      expect(chip.getAttribute('class')).toContain('min-h-[44px]');
    });
  });
});
