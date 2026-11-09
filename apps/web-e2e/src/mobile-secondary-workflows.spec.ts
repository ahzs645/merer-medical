import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function openDemo(page: Page, path: string, title: string) {
  await page.goto(`/demo${path}`);
  await expect(
    page.getByRole('heading', { level: 1, name: title, exact: true }),
  ).toBeVisible();
  await dismissDemoNotification(page);
}

async function dismissDemoNotification(page: Page) {
  const toast = page
    .locator('[aria-live="assertive"]')
    // The notification's first button is its close control in every language.
    .getByRole('button')
    .first();
  if (!(await toast.isVisible())) return;
  try {
    await toast.click({ timeout: 2_000 });
  } catch (error) {
    // Its own dismissal timer can remove it between the visibility check and
    // Playwright's actionability check. A still-visible obstruction is a failure.
    if (await toast.isVisible()) throw error;
  }
  await expect(toast).toBeHidden({ timeout: 3_000 });
}

async function fits(page: Page) {
  const sizes = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      viewport: document.documentElement.clientWidth,
      page: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      main: main ? [main.clientWidth, main.scrollWidth] : null,
    };
  });
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport + 1);
  expect(sizes.main).not.toBeNull();
  expect(sizes.main![1]).toBeLessThanOrEqual(sizes.main![0] + 1);
}

async function capture(page: Page, name: string) {
  await dismissDemoNotification(page);
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
  });
}

async function expectChoiceInRow(choice: Locator, row: Locator) {
  await expect
    .poll(
      async () => {
        const [item, bounds] = await Promise.all([
          choice.boundingBox(),
          row.boundingBox(),
        ]);
        return Boolean(
          item &&
            bounds &&
            item.x >= bounds.x - 2 &&
            item.x + item.width <= bounds.x + bounds.width + 2,
        );
      },
      {
        message:
          'The selected choice must be fully visible in its scrolling row',
      },
    )
    .toBe(true);
}

test('Sources starts with tasks and device imports return to the chosen task', async ({
  page,
}) => {
  await openDemo(page, '/connections', 'Sources');
  const main = page.getByRole('main');
  for (const name of [
    'Import a file',
    'Connect a patient portal',
    'Add a record manually',
  ]) {
    await expect(main.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await expect(
    main.getByRole('heading', { name: 'Source health / sync history' }),
  ).toHaveCount(0);
  await fits(page);
  await capture(page, 'sources-task-choices');
  await main.getByRole('link', { name: 'Import a file', exact: true }).click();
  await expect(page).toHaveURL(/\/connections\?task=import$/);
  await expect(
    main.getByRole('button', { name: 'Choose .emrpkg file' }),
  ).toBeVisible();
  await expect(main.getByRole('button', { name: 'Export backup' })).toHaveCount(
    0,
  );
  await fits(page);
  await main
    .getByRole('button', { name: 'Choose .emrpkg file' })
    .scrollIntoViewIfNeeded();
  await page.goBack();
  await expect(page).toHaveURL(/\/connections$/);
  await expect(
    main.getByRole('link', { name: 'Import a file', exact: true }),
  ).toBeInViewport();
  await main.getByRole('link', { name: 'Import a file', exact: true }).click();
  await main
    .getByRole('link', { name: 'Import device file', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Import device file' }),
  ).toBeVisible();
  await expect(
    page.getByLabel('LibreView file', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/connections\?task=import$/);
  await main
    .getByRole('link', { name: 'All source tasks', exact: true })
    .click();

  await main
    .getByRole('link', { name: 'Connect a patient portal', exact: true })
    .click();
  await expect(
    main.getByRole('button', { name: 'Find a patient portal', exact: true }),
  ).toBeVisible();
  await fits(page);
  await page.goBack();
  await main
    .getByRole('link', { name: 'Add a record manually', exact: true })
    .click();
  for (const name of [
    'Add a medical record',
    'Add a dental record',
    'Add an optometry record',
  ]) {
    await expect(main.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await page.goBack();
  await main.getByRole('link', { name: 'Manage sources', exact: true }).click();
  await expect(
    main.getByRole('heading', { name: 'Source health / sync history' }),
  ).toBeVisible();
  await fits(page);
});

test('Visit prep starts with saved notes, has one optional preview, and exports the chosen content', async ({
  page,
}) => {
  await openDemo(page, '/utilities/visit-prep', 'Visit prep');
  const purpose = page.getByRole('textbox', {
    name: 'Visit purpose',
    exact: true,
  });
  const questions = page.getByRole('textbox', {
    name: 'Questions for visit',
    exact: true,
  });
  await expect(purpose).toBeInViewport();
  await expect(page.locator('iframe')).toHaveCount(0);
  await purpose.fill('Synthetic follow-up visit');
  await questions.fill('Synthetic question: which records should I bring?');
  await capture(page, 'visit-preparation-first');
  await page
    .getByRole('button', { name: 'Save visit notes', exact: true })
    .click();
  await page.reload();
  await expect(purpose).toHaveValue('Synthetic follow-up visit');
  await dismissDemoNotification(page);
  await expect(questions).toHaveValue(
    'Synthetic question: which records should I bring?',
  );

  // The complete printable packet must work without mounting the preview or
  // inheriting the app's viewport-height scroll containers.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#root')).toBeHidden();
  const printPacket = page.locator('.visit-prep-print-packet');
  await expect(printPacket).toBeVisible();
  await expect(
    printPacket.getByText('Synthetic follow-up visit', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
  const pdf = await page.pdf({
    path: test.info().outputPath('synthetic-visit-summary.pdf'),
    format: 'A4',
    printBackground: true,
  });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  await page.emulateMedia({ media: 'screen' });

  const showPreview = page.getByRole('button', {
    name: 'Show preview',
    exact: true,
  });
  await showPreview.click();
  await expect(page.locator('iframe')).toHaveCount(1);
  const preview = page.frameLocator(
    'iframe[title="Visit prep packet preview"]',
  );
  await expect(
    preview.getByText('Synthetic follow-up visit', { exact: true }),
  ).toBeVisible();
  await fits(page);
  await page.getByRole('button', { name: 'Hide preview', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(questions).toHaveValue(
    'Synthetic question: which records should I bring?',
  );

  // The actual exported file must reflect the selection, while the editor
  // retains its saved notes even when they are excluded from the summary.
  await page.getByText('Visit questions', { exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Visit questions', exact: true }),
  ).not.toBeChecked();
  await expect(purpose).toHaveValue('Synthetic follow-up visit');
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download HTML', exact: true })
    .click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const html = await readFile(downloadPath!, 'utf8');
  expect(html).not.toContain('Synthetic follow-up visit');
  expect(html).not.toContain('Synthetic question:');
  await page.getByText('Visit questions', { exact: true }).click();
  await showPreview.click();
  await expect(
    preview.getByText('Synthetic follow-up visit', { exact: true }),
  ).toBeVisible();
});

test('Sharing tasks preserve drafts and distinguish a local log from remote access', async ({
  page,
}) => {
  await openDemo(page, '/utilities/sharing', 'Sharing');
  const sections = page.locator('details[id^="sharing-"]');
  await expect(sections).toHaveCount(4);
  await expect(page.locator('details[id^="sharing-"][open]')).toHaveCount(0);
  await fits(page);
  await capture(page, 'sharing-task-choices');

  const caregivers = page.locator('#sharing-caregivers');
  await caregivers.locator('summary').click();
  const name = caregivers.getByRole('textbox', { name: 'Name', exact: true });
  await name.fill('Synthetic caregiver');
  await caregivers.locator('summary').click();
  await expect(name).toBeHidden();
  await caregivers.locator('summary').click();
  await expect(name).toHaveValue('Synthetic caregiver');
  await caregivers
    .getByRole('button', { name: 'Add caregiver', exact: true })
    .click();
  await expect(
    caregivers.getByText('Synthetic caregiver', { exact: true }),
  ).toBeVisible();
  await caregivers.locator('summary').click();

  const log = page.locator('#sharing-log');
  await log.locator('summary').click();
  await expect(
    log.getByText(
      /Log entries do not grant access, create links, or revoke downloaded copies/,
    ),
  ).toBeVisible();
  await log
    .getByRole('textbox', { name: 'Recipient', exact: true })
    .fill('Synthetic recipient');
  await log
    .getByRole('textbox', { name: 'Purpose', exact: true })
    .fill('Demo workflow review');
  await log.locator('summary').click();
  await log.locator('summary').click();
  await expect(
    log.getByRole('textbox', { name: 'Recipient', exact: true }),
  ).toHaveValue('Synthetic recipient');
  await log
    .getByRole('button', { name: 'Record a share', exact: true })
    .click();
  await expect(
    log.getByText('Synthetic recipient', { exact: true }),
  ).toBeVisible();
  await log.locator('summary').click();

  const download = page.locator('#sharing-download');
  await download.locator('summary').click();
  await expect(
    download.getByRole('radio', { name: /^Selected profile only/ }),
  ).toBeChecked();
  await expect(
    download.getByText(
      /Downloading does not send records or create a share link/,
    ),
  ).toBeVisible();
  await fits(page);
});

test('Settings separates everyday preferences and preserves advanced navigation through Back', async ({
  page,
}) => {
  await openDemo(page, '/settings', 'Settings');
  const nav = page.getByRole('navigation', {
    name: 'Settings sections',
    exact: true,
  });
  const basic = page.getByRole('region', {
    name: 'Basic settings',
    exact: true,
  });
  const advanced = page.getByRole('region', {
    name: 'Advanced settings',
    exact: true,
    includeHidden: true,
  });
  await expect(basic).toBeVisible();
  await expect(advanced).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Terminology', exact: true }),
  ).toHaveCount(0);
  await fits(page);
  await capture(page, 'settings-basic');
  await nav.getByRole('link', { name: 'Advanced', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\?level=advanced$/);
  await expect(advanced).toBeVisible();
  await expect(basic).toBeHidden();
  await expect(
    advanced.getByRole('heading', { name: 'Terminology', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeInViewport();
  await fits(page);
  await capture(page, 'settings-advanced');
  await page.goBack();
  await expect(basic).toBeVisible();
  await expect(advanced).toBeHidden();

  await page.goto('/demo/settings#data');
  await expect(advanced).toBeVisible();
  await expect(
    nav.getByRole('link', { name: 'Advanced', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#data')).toBeInViewport();
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeInViewport();
  await fits(page);
});

test('Labs keeps reading controls compact and shows the active reference after changing options', async ({
  page,
}) => {
  await openDemo(page, '/records/labs', 'All lab results');
  const search = page.getByRole('searchbox', {
    name: 'Search labs',
    exact: true,
  });
  await search.fill('LYMPHS');
  const result = page
    .getByRole('link')
    .filter({ has: page.getByText('LYMPHS', { exact: true }) })
    .first();
  await expect(result).toBeInViewport();
  await page.getByRole('button', { name: 'Lab options', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /^Lab options/ });
  await dialog
    .getByRole('combobox', { name: 'Reference', exact: true })
    .selectOption('original');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText('Reference: Original', { exact: true }),
  ).toBeVisible();
  await expect(search).toHaveValue('LYMPHS');
  await expect(result).toBeInViewport();
  await fits(page);
  await capture(page, 'labs-compact-header');
});

test('Specialty navigation reveals off-screen choices and selected routes in English and Arabic', async ({
  page,
}) => {
  await page.goto('/demo/records/dental');
  for (const language of ['en', 'ar']) {
    await page.evaluate(
      (value) => localStorage.setItem('mere.interfaceLanguage', value),
      language,
    );
    for (const specialty of ['dental', 'optometry']) {
      await page.goto(`/demo/records/${specialty}`);
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        language === 'ar' ? 'rtl' : 'ltr',
      );
      const nav = page
        .getByRole('main')
        .getByRole('navigation')
        .filter({
          has: page.locator(`a[href="/demo/records/${specialty}/records"]`),
        });
      await expect(nav).toBeVisible();
      await dismissDemoNotification(page);
      await fits(page);
      const next = nav.locator('..').getByRole('button').last();
      const lastTab = nav.locator(
        `a[href="/demo/records/${specialty}/records"]`,
      );
      // Native scrolling, or the arrows where shown, must expose the last section.
      for (
        let attempts = 0;
        attempts < 8 && (await next.isVisible()) && (await next.isEnabled());
        attempts++
      ) {
        await next.click();
        await page.waitForTimeout(180);
      }
      // Touch screens get an edge fade instead of arrows: swipe the row.
      if (!(await next.isVisible())) await lastTab.scrollIntoViewIfNeeded();
      await expectChoiceInRow(lastTab, nav);
      await lastTab.click();
      await expect(lastTab).toHaveAttribute('aria-current', 'page');
      await expectChoiceInRow(lastTab, nav);
      await fits(page);
      if (specialty === 'optometry')
        await capture(page, `optometry-navigation-${language}`);
      await page.reload();
      await expectChoiceInRow(lastTab, nav);
      await dismissDemoNotification(page);
    }
  }
});

test('Secondary pages remain usable with doubled interface text', async ({
  page,
}) => {
  for (const [path, title] of [
    ['/connections', 'Sources'],
    ['/utilities/visit-prep', 'Visit prep'],
    ['/utilities/sharing', 'Sharing'],
    ['/settings', 'Settings'],
    ['/records/labs', 'All lab results'],
  ]) {
    await openDemo(page, path, title);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await fits(page);
    const scrollArea = page.getByRole('main');
    await expect(scrollArea).toBeVisible();
    if (path === '/utilities/visit-prep') {
      const editor = page.getByRole('textbox', {
        name: 'Questions for visit',
        exact: true,
      });
      await editor.scrollIntoViewIfNeeded();
      await expect(editor).toBeInViewport();
      await editor.fill('Synthetic enlarged-text check');
      await capture(page, 'visit-prep-enlarged-text');
    }
    if (path === '/records/labs') {
      await page
        .getByRole('searchbox', { name: 'Search labs', exact: true })
        .fill('LYMPHS');
      const result = page
        .getByRole('link')
        .filter({ has: page.getByText('LYMPHS', { exact: true }) })
        .first();
      const resultTitle = result.getByText('LYMPHS', { exact: true });
      await resultTitle.scrollIntoViewIfNeeded();
      await expect(resultTitle).toBeInViewport();
    }
  }
  await capture(page, 'labs-enlarged-text');
});
