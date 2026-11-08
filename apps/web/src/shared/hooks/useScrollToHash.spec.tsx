/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';

import { useScrollToHash } from './useScrollToHash';

function AnchorReader() {
  useScrollToHash();
  return <Link to="/records">Leave timeline</Link>;
}

function renderReader() {
  return render(
    <MemoryRouter
      initialEntries={['/timeline?q=synthetic#timeline-record-synthetic']}
    >
      <AnchorReader />
    </MemoryRouter>,
  );
}

let target: HTMLDivElement;
beforeEach(() => {
  target = document.createElement('div');
  target.id = 'timeline-record-synthetic';
  target.scrollIntoView = jest.fn();
});
afterEach(() => target.remove());

it('scrolls to a record when it arrives after the initial render', async () => {
  renderReader();
  expect(target.scrollIntoView).not.toHaveBeenCalled();
  await act(async () => {
    document.body.appendChild(target);
  });
  expect(target.scrollIntoView).toHaveBeenCalledWith(
    expect.objectContaining({ block: 'start' }),
  );
});

it('does not scroll a late record after the reader has changed pages', async () => {
  renderReader();
  fireEvent.click(screen.getByRole('link', { name: 'Leave timeline' }));
  await act(async () => {
    document.body.appendChild(target);
  });
  expect(target.scrollIntoView).not.toHaveBeenCalled();
});

it('lets an intentional scroll cancel the pending anchor', async () => {
  renderReader();
  fireEvent.wheel(window);
  await act(async () => {
    document.body.appendChild(target);
  });
  expect(target.scrollIntoView).not.toHaveBeenCalled();
});
