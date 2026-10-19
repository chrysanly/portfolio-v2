import { expect, test } from '@playwright/test';

/**
 * The hero on a small laptop: no nested scrollbars, the mouse cue at the foot,
 * and the first tour step sitting clear above it with an arrow.
 */

const LAPTOPS = [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
];

for (const size of LAPTOPS) {
  test(`the hero ledger fits ${size.width}×${size.height} without its own scrollbar`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'laptop sizes only');

    await test.step(`Open the home page at ${size.width}×${size.height}`, async () => {
      await page.setViewportSize(size);
      await page.addInitScript(() => localStorage.setItem('guide-seen', '1'));
      await page.goto('/');
    });

    await test.step('Check the facts box does not scroll on its own', async () => {
      const facts = page.locator('.hero .facts');
      await expect(facts).toBeVisible();
      const box = await facts.evaluate((el) => ({
        overflow: getComputedStyle(el).overflowY,
        scroll: el.scrollHeight,
        client: el.clientHeight,
      }));
      expect(box.overflow).toBe('visible');
      expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
    });

    await test.step('Check the facts sit two rows of three', async () => {
      const columns = await page
        .locator('.hero .facts')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(3);
    });
  });
}

test('the scroll cue is a 22×34 mouse at the foot of the hero', async ({ page, isMobile }) => {
  test.skip(isMobile, 'touch shows the swipe cue instead');

  await test.step('Open the home page', async () => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.addInitScript(() => localStorage.setItem('guide-seen', '1'));
    await page.goto('/');
  });

  await test.step('Check the mouse is drawn at 22×34, 20px off the bottom', async () => {
    const mouse = page.locator('.cue-mouse svg');
    await expect(mouse).toBeVisible();
    const box = await mouse.boundingBox();
    expect(Math.round(box!.width)).toBe(22);
    expect(Math.round(box!.height)).toBe(34);
    const cue = await page.locator('.hero__cue').boundingBox();
    expect(Math.round(768 - (cue!.y + cue!.height))).toBe(20);
  });
});

test('the first tour step sits clear above the cue and points at it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'on a phone the card docks to an edge with no arrow');

  await test.step('Open the home page as a first visit', async () => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
  });

  await test.step('Wait for the tour card', async () => {
    await expect(page.locator('.tour-card[data-show]')).toBeVisible({ timeout: 10_000 });
  });

  await test.step('Check it has the arrow, rounded corners and does not overlap the mouse', async () => {
    const card = page.locator('.tour-card');
    await expect(card).toHaveAttribute('data-arrow', '');
    expect(await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('14px');
    const cardBox = await card.boundingBox();
    const mouseBox = await page.locator('.cue-mouse svg').boundingBox();
    expect(cardBox!.y + cardBox!.height).toBeLessThan(mouseBox!.y);
  });
});

test('on a phone the first tour step docks with no arrow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');

  await test.step('Open the home page as a first visit', async () => {
    await page.goto('/');
  });

  await test.step('Check the card shows without an arrow', async () => {
    const card = page.locator('.tour-card[data-show]');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).not.toHaveAttribute('data-arrow', '');
  });
});
