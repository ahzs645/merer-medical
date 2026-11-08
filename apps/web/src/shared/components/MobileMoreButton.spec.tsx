/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { MobileMoreButton } from './TabWrapper';
import { resetCloseOnBackForTests } from '../hooks/useCloseOnBack';

jest.mock('../../features/notifications/NotificationCenter', () => ({
  NotificationCenter: () => null,
}));
jest.mock('./CommandPalette', () => ({ CommandPalette: () => null }));
jest.mock('../../features/tutorial/TutorialOverlay', () => ({
  TutorialOverlay: () => null,
}));
jest.mock('../../features/sources/components/SharedPackagePanel', () => ({
  SharedPackagePanel: () => null,
}));

function MoreHarness({ onSearch }: { onSearch: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileMoreButton
      open={open}
      setOpen={setOpen}
      showAssistant={false}
      onOpenSearch={onSearch}
    />
  );
}

it('hands More off to Search after the reduced-motion sheet has closed', async () => {
  resetCloseOnBackForTests();
  const style = document.createElement('style');
  // Reproduce the application's reduced-motion branch. jsdom cannot lay out
  // the fixed full-screen dialog, so give that container its browser bounds.
  style.textContent = String.raw`
    * { transition-duration: 0.01ms !important; transition-delay: 0s; }
    .motion-reduce\:transition-none { transition-property: none; }
    .motion-reduce\:\!duration-0 { transition-duration: 0s !important; }
  `;
  document.head.appendChild(style);
  const measure = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 640,
      width: 320,
      height: 640,
      toJSON: () => ({}),
    }));

  try {
    const onSearch = jest.fn();
    render(
      <MemoryRouter initialEntries={['/records']}>
        <MoreHarness onSearch={onSearch} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More navigation' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));

    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'More' })).toBeNull(),
    );
    expect(document.querySelector('[data-headlessui-portal]')).toBeNull();
  } finally {
    measure.mockRestore();
    style.remove();
  }
});
