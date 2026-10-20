import { expect, test } from '@playwright/test';

/**
 * The hanging ID badge: dragged hard to either side, it stops at the edge of
 * the screen instead of leaving it.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('guide-seen', '1');
    sessionStorage.setItem('splash-seen', '1');
  });
});

test('the badge stays on screen when dragged past the left and right edges', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the badge is hidden on phones');
  const vw = 1920;

  await test.step('Open the home page at 1920×1080', async () => {
    await page.setViewportSize({ width: vw, height: 1080 });
    await page.goto('/');
    await expect(page.locator('.lanyard__card')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
  });

  const card = page.locator('.lanyard__card');

  for (const [side, toX] of [
    ['left', 1],
    ['right', vw - 1],
  ] as const) {
    await test.step(`Drag the badge hard to the ${side} edge`, async () => {
      const box = (await card.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + 40);
      await page.mouse.down();
      await page.mouse.move(toX, box.y + 40, { steps: 12 });
      await page.waitForTimeout(300);
    });

    await test.step(`Check the badge is still fully on screen while held on the ${side}`, async () => {
      const held = (await card.boundingBox())!;
      expect(held.x).toBeGreaterThanOrEqual(-2);
      expect(held.x + held.width).toBeLessThanOrEqual(vw + 2);
    });

    await test.step('Let go and check it stays on screen as it swings back', async () => {
      await page.mouse.up();
      await page.waitForTimeout(400);
      const after = (await card.boundingBox())!;
      expect(after.x).toBeGreaterThanOrEqual(-2);
      expect(after.x + after.width).toBeLessThanOrEqual(vw + 2);
    });
  }
});
