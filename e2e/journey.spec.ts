import { expect, test } from '@playwright/test';

/**
 * The journey: the current stop's plate reads "… – Present", and on a big
 * screen the stop's details sit inline in a wide, top-aligned panel.
 * The engine draws into an open shadow root; Playwright's CSS locators pierce it.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('guide-seen', '1');
    sessionStorage.setItem('splash-seen', '1');
  });
});

test('the stop held now reads "Present" on its plate', async ({ page, isMobile }) => {
  await test.step('Open the home page', async () => {
    await page.goto('/');
  });

  await test.step('Check one plate ends in "Present" and none in a bare dash', async () => {
    const plates = isMobile ? page.locator('.jw-host .plaque b') : page.locator('.jw-host .plq text');
    await expect(plates.first()).toBeAttached();
    const labels = await plates.allTextContents();
    expect(labels.some((l) => /^\d{4} – Present$/.test(l))).toBe(true);
    expect(labels.every((l) => !/[–-]$/.test(l))).toBe(true);
  });
});

test('on a big screen the stop panel is wide, top-aligned and shows everything inline', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the ladder panel is 1024 and up');

  await test.step('Open the home page at 1920×1080', async () => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
  });

  await test.step('Scroll to the first stop', async () => {
    const marker = page.locator('.jw-host [data-substep-title]').first();
    await expect(marker).toHaveAttribute('data-substep-y', /\d+/);
    const y = Number(await marker.getAttribute('data-substep-y'));
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await expect(page.locator('.jw-host .card__body h3')).toBeVisible();
  });

  await test.step('Check the panel is wide and starts in the top third', async () => {
    const box = await page.locator('.jw-host .card').boundingBox();
    expect(box!.width).toBeGreaterThan(600);
    expect(box!.y).toBeLessThan(1080 / 3);
  });

  await test.step('Check View more is there, and shows only if something is cut', async () => {
    // The first stop is the degree: no projects, so it may have no details at all.
    const more = page.locator('.jw-host .card__body button[data-more]');
    await expect(more).toHaveCount(1);
    if ((await page.locator('.jw-host .card__body .cols').count()) === 0) await expect(more).toBeHidden();
  });
});

/* Scrolls to the stop whose card reads `title` at `org`; returns false if the content has no such stop. */
async function goToStop(page: import('@playwright/test').Page, title: string, org: RegExp) {
  const markers = page.locator(`.jw-host [data-substep-title="${title}"]`);
  for (let i = 0; i < (await markers.count()); i++) {
    const y = Number(await markers.nth(i).getAttribute('data-substep-y'));
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await expect(page.locator('.jw-host .card__body h3')).toHaveText(title, { timeout: 8000 });
    await page.waitForTimeout(400);
    if (org.test((await page.locator('.jw-host .card__body .org').textContent()) ?? '')) return true;
  }
  return false;
}

for (const size of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 1280, height: 650 },
]) {
  test(`at ${size.width}×${size.height} the long Web Developer stop never scrolls and opens the rest in View more`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the ladder panel is 1024 and up');

    await test.step(`Open the home page at ${size.width}×${size.height}`, async () => {
      await page.setViewportSize(size);
      await page.goto('/');
      await expect(page.locator('html[data-ready="true"]')).toBeAttached();
    });

    await test.step('Scroll to the Web Developer stop at ThinkBit', async () => {
      await expect(page.locator('.jw-host [data-substep-title]').first()).toHaveAttribute('data-substep-y', /\d+/);
      test.skip(!(await goToStop(page, 'Web Developer', /ThinkBit/)), 'no ThinkBit Web Developer stop in this content');
    });

    await test.step('Check the panel has no scrollbar and the buttons stay on screen', async () => {
      const fit = await page.locator('.jw-host .side').evaluate((side) => ({
        scroll: side.scrollHeight,
        client: side.clientHeight,
        overflow: getComputedStyle(side).overflowY,
      }));
      expect(fit.overflow).toBe('hidden');
      expect(fit.scroll).toBeLessThanOrEqual(fit.client);
      const stage = (await page.locator('.jw-host .stage').boundingBox())!;
      const nav = (await page.locator('.jw-host #next').boundingBox())!;
      expect(nav.y + nav.height).toBeLessThanOrEqual(stage.y + stage.height);
    });

    await test.step('Check the long "What I took from it" is clamped and View more shows', async () => {
      await expect(page.locator('.jw-host .took')).toHaveAttribute('data-clamped', '');
      const more = page.locator('.jw-host .card__body button[data-more]');
      await expect(more).toBeVisible();
      expect((await more.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });

    await test.step('Open View more and see the full text', async () => {
      await page.locator('.jw-host .card__body button[data-more]').click();
      const dialog = page.locator('.jsm [role="dialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('What I took from it')).toBeVisible();
    });

    await test.step('Close it and check focus is back on View more', async () => {
      await page.keyboard.press('Escape');
      await expect(page.locator('.jsm [role="dialog"]')).toBeHidden();
      const focused = await page.locator('.jw-host').evaluate((h) => h.shadowRoot?.activeElement?.textContent ?? '');
      expect(focused).toMatch(/^View more/);
    });
  });
}
