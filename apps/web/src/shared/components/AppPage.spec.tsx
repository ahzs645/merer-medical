/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import { AppPage } from './AppPage';

/**
 * `AppLoadingSkeleton` renders an `AppPage` while the database boots — before
 * `RouterProvider` mounts. A router hook inside this component therefore
 * throws on the very first paint, the root error boundary catches it, and the
 * whole app becomes "Something went wrong" with no route ever rendering.
 *
 * That happened once, when scroll restoration was added here rather than to
 * `TabWrapper`. Nothing in the type system says this component may not use a
 * router; this test does.
 */
describe('AppPage', () => {
  it('renders outside a Router, which is where the boot skeleton uses it', () => {
    expect(() =>
      render(
        <AppPage banner={<div>banner</div>}>
          <p>content</p>
        </AppPage>,
      ),
    ).not.toThrow();

    expect(screen.getByText('banner')).toBeTruthy();
    expect(screen.getByText('content')).toBeTruthy();
  });
});
