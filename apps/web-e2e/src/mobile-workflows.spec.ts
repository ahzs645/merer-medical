import { expect, test, type Locator, type Page } from '@playwright/test';

async function openDemo(page: Page, path: string, title: string) {
  await page.goto(`/demo${path}`);
  await expect(
    page.getByRole('heading', { level: 1, name: title, exact: true }),
  ).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      main: main
        ? { client: main.clientWidth, scroll: main.scrollWidth }
        : null,
    };
  });

  expect(
    widths.document,
    'The page must fit the phone width',
  ).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body, 'The body must not scroll sideways').toBeLessThanOrEqual(
    widths.viewport + 1,
  );
  if (!widths.main) throw new Error('The route must expose a main landmark');
  expect(
    widths.main.scroll,
    'Main content must fit its available width',
  ).toBeLessThanOrEqual(widths.main.client + 1);
}

async function expectReachableTouchTarget(control: Locator) {
  await expect(control).toBeVisible();
  await expect(control).toBeInViewport();
  const box = await control.boundingBox();
  if (!box) throw new Error('The visible control must have a touch target');
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

async function captureDemoEvidence(page: Page, name: string) {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
  });
}

test('primary navigation and More preserve the page when dismissed or returning', async ({
  page,
  viewport,
}) => {
  if (!viewport) throw new Error('The mobile project must set a viewport');
  await openDemo(page, '/records', 'Records');

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
    exact: true,
  });

  for (const title of ['Summary', 'Timeline', 'Records']) {
    const link = navigation.getByRole('link', { name: title, exact: true });
    if (viewport.width >= 768) {
      // The landscape rail is scrollable because the phone is only 390px tall.
      await link.scrollIntoViewIfNeeded();
    }
    await expectReachableTouchTarget(link);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/demo/${title.toLowerCase()}$`));
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: title === 'Timeline' ? /Welcome back|Hello/ : title,
      }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  const more = navigation.getByRole('button', {
    name: 'More navigation',
    exact: true,
  });
  if (viewport.width < 768) {
    await expectReachableTouchTarget(more);
    await more.click();
    const sheet = page.getByRole('dialog', { name: 'More', exact: true });
    await expect(sheet).toBeVisible();
    await captureDemoEvidence(page, 'more-navigation');

    await sheet
      .getByRole('button', { name: 'Close navigation', exact: true })
      .click();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/demo\/records$/);

    await more.click();
    await expect(sheet).toBeVisible();
    await page.goBack();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/demo\/records$/);

    await more.click();
    await sheet.getByRole('link', { name: 'Sources', exact: true }).click();
  } else {
    // A short landscape viewport uses the collapsed, scrollable side rail.
    await expect(more).toBeHidden();
    await navigation
      .getByRole('link', { name: 'Sources', exact: true })
      .click();
  }

  await expect(
    page.getByRole('heading', { name: 'Sources', level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/demo\/connections$/);
  await expectNoHorizontalOverflow(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/demo\/records$/);
  await expect(
    page.getByRole('dialog', { name: 'More', exact: true }),
  ).toBeHidden();
});

test('Search is reachable directly and opening a result has a single Back step', async ({
  page,
}) => {
  await openDemo(page, '/summary', 'Summary');
  const searchButton = page.getByRole('button', {
    name: 'Search',
    exact: true,
  });
  await expectReachableTouchTarget(searchButton);
  await searchButton.click();

  const search = page.getByRole('dialog', { name: 'Search', exact: true });
  await search
    .getByPlaceholder('Search records, pages, and actions')
    .fill('Labs');
  await search
    .getByRole('button')
    .filter({ has: page.getByText('Labs', { exact: true }) })
    .click();

  await expect(page).toHaveURL(/\/demo\/records\/labs$/);
  await expect(search).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 1, name: 'All lab results' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goBack();
  await expect(page).toHaveURL(/\/demo\/summary$/);
  await expect(search).toBeHidden();
});

test('Records search finds a stored result and preserves the search on Back', async ({
  page,
}) => {
  await openDemo(page, '/records', 'Records');
  const search = page.getByPlaceholder('Search records', { exact: true });
  // A real lab label in the bundled synthetic fixture, not a category name.
  await search.fill('LYMPHS');
  const result = page
    .getByRole('link')
    .filter({
      has: page.getByText('LYMPHS', { exact: true }),
    })
    .first();
  await expect(result).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await captureDemoEvidence(page, 'records-search');
  await result.click();
  await expect(page).toHaveURL(/\/demo\/records\/labs\/[^/]+$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'LYMPHS', exact: true }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/demo\/records\?.+/);
  await expect(search).toHaveValue('LYMPHS');
  await expect(result).toBeVisible();

  await search.fill('no-such-synthetic-record-92714');
  await expect(page.getByText(/No records or categories match/)).toBeVisible();
  await search.fill('');
  await expect(page.getByRole('link', { name: /^Labs\b/ })).toBeVisible();
});

test('a lab opens into a readable detail and Back restores the filtered list', async ({
  page,
}) => {
  await openDemo(page, '/records/labs', 'All lab results');
  const search = page.getByRole('searchbox', {
    name: 'Search labs',
    exact: true,
  });
  await search.fill('LYMPHS');
  const result = page.getByRole('link').filter({
    has: page.getByRole('heading', { name: 'LYMPHS', exact: true }),
  });
  await expect(result).toBeVisible();
  await result.click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'LYMPHS', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('latest result', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'All lab results', exact: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await captureDemoEvidence(page, 'lab-detail');

  await page.goBack();
  await expect(
    page.getByRole('heading', { level: 1, name: 'All lab results' }),
  ).toBeVisible();
  await expect(search).toHaveValue('LYMPHS');
  await expect(result).toBeVisible();
});

test('cancelling an add protects edits and returns to the originating category', async ({
  page,
}) => {
  await openDemo(page, '/records/medications', 'Medications');
  await page.getByRole('link', { name: 'Add medication', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Add medication' }),
  ).toBeVisible();
  const title = page.locator('#manual-record-title');
  await title.fill('Synthetic mobile cancellation check');
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  const confirmation = page.getByRole('dialog', {
    name: 'Discard unsaved changes?',
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  await confirmation
    .getByRole('button', { name: 'Keep editing', exact: true })
    .click();
  await expect(title).toHaveValue('Synthetic mobile cancellation check');

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await confirmation
    .getByRole('button', { name: 'Discard', exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo\/records\/medications$/);
  await expect(
    page.getByText('Synthetic mobile cancellation check', { exact: true }),
  ).toHaveCount(0);
});

test('imported synthetic glucose readings render a report only when requested', async ({
  page,
}) => {
  await openDemo(page, '/records/new?type=device', 'Add device');
  await page.locator('#manual-device-type').click();
  await page
    .getByRole('option', { name: 'FreeStyle Libre', exact: true })
    .click();

  const readings = [90, 105, 120, 150].map((glucose_mgdl, index) => ({
    datetime: `2026-02-01T${String(12 + index).padStart(2, '0')}:00:00Z`,
    glucose_mgdl,
  }));
  await page.getByLabel('LibreView file', { exact: true }).setInputFiles({
    name: 'mobile-synthetic-glucose.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ device: 'Synthetic CGM', readings })),
  });

  await expect(page).toHaveURL(/\/demo\/records\/labs$/);
  const report = page.getByRole('region', {
    name: 'FreeStyle Libre CGM',
    exact: true,
  });
  const show = report.getByRole('button', {
    name: 'Show glucose report',
    exact: true,
  });
  const chart = page.getByRole('heading', {
    name: 'Ambulatory Glucose Profile',
    exact: true,
  });
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(chart).toHaveCount(0);
  await expect(
    report.getByText('4 imported readings', { exact: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await captureDemoEvidence(page, 'labs-with-collapsed-glucose-report');

  await show.click();
  const hide = report.getByRole('button', {
    name: 'Hide glucose report',
    exact: true,
  });
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
  await expect(chart).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await hide.click();
  await expect(chart).toHaveCount(0);
  await expect(show).toHaveAttribute('aria-expanded', 'false');

  // Searching for a lab must not leave a device report above the matches.
  const search = page.getByRole('searchbox', {
    name: 'Search labs',
    exact: true,
  });
  await search.fill('LYMPHS');
  await expect(report).toHaveCount(0);
  await search.fill('');
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(chart).toHaveCount(0);
});

test('every Records category and the remaining shell pages fit the mobile layout', async ({
  page,
}) => {
  await openDemo(page, '/records', 'Records');
  const main = page.getByRole('main');

  // Read the actual hub links so this covers its complete public category grid,
  // including empty categories, without guessing URLs or opening clinical actions.
  const categories = await main
    .locator(
      'a[href^="/demo/records/"]:not([href^="/demo/records/new"]):visible',
    )
    .evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute('href') || '',
        label: (link as HTMLElement).innerText.split('\n')[0].trim(),
      })),
    );
  expect(categories).toHaveLength(20);

  // These page titles describe the category more fully than its compact card.
  const pageTitles: Record<string, string> = {
    Labs: 'All lab results',
    Vitals: 'Vital signs',
    Imaging: 'Imaging & scans',
    'All results': 'Results',
    Providers: 'Providers & locations',
  };

  for (const category of categories) {
    await test.step(`Open ${category.label} and return to Records`, async () => {
      await main.locator(`a[href="${category.href}"]:visible`).click();
      await expect(page).toHaveURL(new URL(category.href, page.url()).href);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: pageTitles[category.label] || category.label,
          exact: true,
        }),
      ).toBeVisible();
      await expect(main.getByText(/^Loading(?:[\s.…]|$)/)).toHaveCount(0);
      await expectNoHorizontalOverflow(page);

      await page.goBack();
      await expect(page).toHaveURL(/\/demo\/records$/);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Records', exact: true }),
      ).toBeVisible();
    });
  }

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
    exact: true,
  });
  for (const title of ['Utilities', 'Sources', 'Settings']) {
    await test.step(`Open ${title} and return to Records`, async () => {
      const more = navigation.getByRole('button', {
        name: 'More navigation',
        exact: true,
      });
      let link: Locator;
      if (await more.isVisible()) {
        await more.click();
        link = page
          .getByRole('dialog', { name: 'More', exact: true })
          .getByRole('link', { name: title, exact: true });
      } else {
        link = navigation.getByRole('link', { name: title, exact: true });
      }
      const href = await link.getAttribute('href');
      if (!href) throw new Error(`${title} must expose a navigation URL`);
      await link.click();
      await expect(page).toHaveURL(new URL(href, page.url()).href);
      await expect(
        page.getByRole('heading', { level: 1, name: title, exact: true }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.goBack();
      await expect(page).toHaveURL(/\/demo\/records$/);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Records', exact: true }),
      ).toBeVisible();
    });
  }
});
