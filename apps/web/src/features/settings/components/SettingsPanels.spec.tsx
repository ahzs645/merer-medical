/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import { Link, MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

import {
  SettingsPanels,
  scrollSettingsSectionIntoView,
} from './SettingsPanels';

const mountAdvanced = jest.fn();

function AdvancedEditor() {
  const [draft, setDraft] = useState('');
  useEffect(() => {
    mountAdvanced();
  }, []);
  return (
    <input
      aria-label="Draft endpoint"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current address">
        {location.pathname + location.search + location.hash}
      </output>
      <button onClick={() => navigate(-1)}>Browser Back</button>
      <Link to="/settings#about-me">Open profile</Link>
      <Link to="/settings#experimental">Open assistant settings</Link>
    </>
  );
}

function renderSettings(entry = '/settings') {
  function SettingsHost() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    return (
      <div data-testid="app-shell">
        <div ref={scrollContainerRef} data-testid="settings-scroll-container">
          <SettingsPanels
            scrollContainerRef={scrollContainerRef}
            basic={
              <input aria-label="Profile name" defaultValue="Demo person" />
            }
            advanced={<AdvancedEditor />}
          />
        </div>
        <NavigationProbe />
      </div>
    );
  }
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <SettingsHost />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mountAdvanced.mockClear();
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

describe('SettingsPanels', () => {
  it('starts with everyday settings and only initializes advanced tools on request', () => {
    renderSettings();
    expect(screen.getByRole('textbox', { name: 'Profile name' })).toBeTruthy();
    expect(
      screen.queryByRole('textbox', { name: 'Draft endpoint' }),
    ).toBeNull();
    expect(mountAdvanced).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('link', { name: 'Advanced', exact: true }),
    );

    expect(
      screen.getByRole('textbox', { name: 'Draft endpoint' }),
    ).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Profile name' })).toBeNull();
    expect(mountAdvanced).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Current address').textContent).toBe(
      '/settings?level=advanced',
    );
  });

  it('keeps unsaved values in both panels when switching levels', () => {
    renderSettings();
    fireEvent.change(screen.getByRole('textbox', { name: 'Profile name' }), {
      target: { value: 'Unsubmitted profile' },
    });
    fireEvent.click(
      screen.getByRole('link', { name: 'Advanced', exact: true }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Draft endpoint' }), {
      target: { value: 'http://localhost:11434/custom' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Basic', exact: true }));

    expect(
      (
        screen.getByRole('textbox', {
          name: 'Profile name',
        }) as HTMLInputElement
      ).value,
    ).toBe('Unsubmitted profile');
    fireEvent.click(
      screen.getByRole('link', { name: 'Advanced', exact: true }),
    );
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Draft endpoint',
        }) as HTMLInputElement
      ).value,
    ).toBe('http://localhost:11434/custom');
    expect(mountAdvanced).toHaveBeenCalledTimes(1);
  });

  it('resets only the settings content when changing levels, keeping the app shell in place', () => {
    renderSettings();
    const shell = screen.getByTestId('app-shell');
    const container = screen.getByTestId('settings-scroll-container');
    shell.scrollTop = 17;
    container.scrollTop = 280;

    fireEvent.click(
      screen.getByRole('link', { name: 'Advanced', exact: true }),
    );

    expect(container.scrollTop).toBe(0);
    expect(shell.scrollTop).toBe(17);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls a section anchor within settings with its sticky-navigation margin', () => {
    renderSettings();
    const shell = screen.getByTestId('app-shell');
    const container = screen.getByTestId('settings-scroll-container');
    const section = screen.getByRole('region', { name: 'Basic settings' });
    shell.scrollTop = 17;
    container.scrollTop = 200;
    section.style.scrollMarginTop = '80px';
    jest
      .spyOn(container, 'getBoundingClientRect')
      .mockReturnValue({ top: 100 } as DOMRect);
    jest
      .spyOn(section, 'getBoundingClientRect')
      .mockReturnValue({ top: 500 } as DOMRect);
    const scrollTo = jest.fn(({ top }: ScrollToOptions) => {
      container.scrollTop = top ?? 0;
    });
    Object.defineProperty(container, 'scrollTo', { value: scrollTo });

    scrollSettingsSectionIntoView(container, section, 'auto');

    expect(scrollTo).toHaveBeenCalledWith({ top: 520, behavior: 'auto' });
    expect(container.scrollTop).toBe(520);
    expect(shell.scrollTop).toBe(17);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('restores the selected level with browser Back and retains unrelated query parameters', () => {
    renderSettings('/settings?context=review');
    fireEvent.click(
      screen.getByRole('link', { name: 'Advanced', exact: true }),
    );
    expect(screen.getByLabelText('Current address').textContent).toBe(
      '/settings?context=review&level=advanced',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }));

    expect(screen.getByRole('textbox', { name: 'Profile name' })).toBeTruthy();
    expect(screen.getByLabelText('Current address').textContent).toBe(
      '/settings?context=review',
    );
  });

  it.each([
    '/settings?level=advanced',
    '/settings#terminology',
    '/settings#medication-interactions',
    '/settings#data',
    '/settings#experimental',
    '/settings#experimental__openmed_enabled',
    '/settings#developer',
  ])('opens advanced content directly from %s', (entry) => {
    renderSettings(entry);
    expect(
      screen.getByRole('textbox', { name: 'Draft endpoint' }),
    ).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Profile name' })).toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Advanced', exact: true })
        .getAttribute('aria-current'),
    ).toBe('page');
  });

  it.each([
    'about-me',
    'use_proxy',
    'privacy-and-security',
    'interface-language',
  ])(
    'keeps the existing basic #%s destination accessible even from an advanced URL',
    (anchor) => {
      renderSettings(`/settings?level=advanced#${anchor}`);
      expect(
        screen.getByRole('textbox', { name: 'Profile name' }),
      ).toBeTruthy();
      expect(
        screen.queryByRole('textbox', { name: 'Draft endpoint' }),
      ).toBeNull();
    },
  );

  it('follows existing in-page links across levels and clears the old anchor when a level is selected', () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole('link', { name: 'Open assistant settings' }),
    );
    expect(
      screen.getByRole('textbox', { name: 'Draft endpoint' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Basic', exact: true }));
    expect(screen.getByLabelText('Current address').textContent).toBe(
      '/settings',
    );
    fireEvent.click(
      screen.getByRole('link', { name: 'Advanced', exact: true }),
    );
    fireEvent.click(screen.getByRole('link', { name: 'Open profile' }));
    expect(screen.getByRole('textbox', { name: 'Profile name' })).toBeTruthy();
  });
});
