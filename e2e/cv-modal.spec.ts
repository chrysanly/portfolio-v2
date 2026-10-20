import { expect, type Page, test } from '@playwright/test';

/**
 * View CV opens the CV in a modal over the hero, and closes back to the
 * button: by Escape, by the scrim, and by Close.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('guide-seen', '1');
    sessionStorage.setItem('splash-seen', '1');
  });
});

async function cvButton(page: Page) {
  await page.goto('/');
  const all = page.locator('.hero-actions .button--cv');
  // Hydrated: SplashDismiss sets data-ready, and only then does the click open the modal.
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
  test.skip((await all.count()) === 0, 'no CV uploaded');
  // The static intro and the animated hero both draw the actions; one is hidden.
  const button = all.filter({ visible: true }).first();
  // The hero shows its buttons once it has been scrolled into its details,
  // so scroll down a little at a time, as a visitor would, until they show.
  await page.mouse.move(200, 300);
  for (let i = 0; i < 16 && (await button.count()) === 0; i++) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(250);
  }
  await expect(button).toBeVisible({ timeout: 5_000 });
  await expect(button).toHaveAttribute('href', '/cv');
  await button.scrollIntoViewIfNeeded();
  return button;
}

test('View CV opens a modal, Escape closes it and focus returns', async ({ page }) => {
  let button!: Awaited<ReturnType<typeof cvButton>>;
  await test.step('Open the home page', async () => {
    button = await cvButton(page);
  });

  const dialog = page.locator('.cvm [role="dialog"]');

  await test.step('Click View CV', async () => {
    await button.click();
  });

  await test.step('Check the CV modal is open, on the same page, with Close focused', async () => {
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.veil[data-on="true"]')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Close CV' })).toBeFocused();
    await expect(dialog.getByRole('link', { name: 'Download CV' })).toHaveAttribute('download', /\.pdf$/i);
    await expect(dialog.getByRole('link', { name: 'Open CV in a new tab' })).toHaveAttribute('target', '_blank');
  });

  await test.step('Check the PDF preview or its error state shows', async () => {
    await expect(dialog.locator('iframe, .cvm__err')).toBeAttached();
  });

  await test.step('Press Escape', async () => {
    await page.keyboard.press('Escape');
  });

  await test.step('Check the modal is gone and focus is back on View CV', async () => {
    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();
  });
});

test('Close and a click on the backdrop both close the CV', async ({ page, isMobile }) => {
  let button!: Awaited<ReturnType<typeof cvButton>>;
  await test.step('Open the home page', async () => {
    button = await cvButton(page);
  });
  const dialog = page.locator('.cvm [role="dialog"]');

  await test.step('Open the CV and press Close', async () => {
    await button.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close CV' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test.skip(isMobile, 'on a phone the sheet covers the whole screen, so there is no backdrop to click');

  await test.step('Open the CV and click the backdrop', async () => {
    await button.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toHaveCount(0);
  });
});

test('on a phone the CV is a full-screen sheet', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');
  let button!: Awaited<ReturnType<typeof cvButton>>;
  await test.step('Open the home page', async () => {
    button = await cvButton(page);
  });

  await test.step('Open the CV and check the sheet fills the screen', async () => {
    await button.click();
    const panel = page.locator('.cvm [role="dialog"]');
    await expect(panel).toBeVisible();
    await page.waitForTimeout(350);
    const box = (await panel.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(Math.round(box.width)).toBe(vp.width);
    expect(Math.abs(box.height - vp.height)).toBeLessThanOrEqual(2);
  });
});
