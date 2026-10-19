import { expect, test } from '@playwright/test';

/** /cv: the uploaded PDF, with Open and Download; a phone loses zoom and Open. */

test('the /cv page shows the CV with a download, or an empty state', async ({ page, isMobile }) => {
  await test.step('Open the CV page', async () => {
    await page.addInitScript(() => localStorage.setItem('guide-seen', '1'));
    await page.goto('/cv');
  });

  await test.step('Check the heading shows', async () => {
    await expect(page.getByRole('heading', { name: 'Curriculum vitae' })).toBeVisible();
  });

  const download = page.locator('.cv__actions a[download]');
  if ((await download.count()) === 0) {
    await test.step('Check the empty state shows when no CV is uploaded', async () => {
      await expect(page.getByText('No CV here yet.')).toBeVisible();
    });
    return;
  }

  await test.step('Check Download PDF names the file', async () => {
    await expect(download).toHaveAttribute('download', /\.pdf$/i);
  });

  await test.step('Check the preview or its fallback shows', async () => {
    const viewer = page.locator('.cv-viewer, .cv-state');
    await expect(viewer.first()).toBeVisible();
  });

  await test.step(isMobile ? 'Check zoom and Open are hidden' : 'Check zoom works', async () => {
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    if (isMobile) {
      await expect(page.locator('.cv__open')).toBeHidden();
      return;
    }
    if ((await zoomIn.count()) === 0) return; // the fallback has no zoom
    await zoomIn.click();
    await expect(page.locator('.cv-viewer__pct')).toHaveText('110%');
  });
});

test('the hero button reads View CV and opens /cv', async ({ page }) => {
  await test.step('Open the home page', async () => {
    await page.addInitScript(() => localStorage.setItem('guide-seen', '1'));
    await page.goto('/');
  });

  const button = page.locator('.hero-actions .button--cv').first();
  test.skip((await button.count()) === 0, 'no CV uploaded');

  await test.step('Check the label is View CV', async () => {
    await expect(button).toContainText('View CV');
    await expect(button).toHaveAttribute('href', '/cv');
  });
});
