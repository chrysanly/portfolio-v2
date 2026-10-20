import { expect, test, type Page } from '@playwright/test';

/**
 * Stack & tools: filter chips, logos, View more, and on a phone the
 * draggable cloud that opens the neighbouring tab.
 */

async function openStack(page: Page) {
  await page.addInitScript(() => localStorage.setItem('guide-seen', '1'));
  await page.goto('/');
  // React hydrates after networkidle: a click before then is lost.
  await page.locator('html[data-ready="true"]').waitFor();
  const section = page.locator('#stack');
  await section.scrollIntoViewIfNeeded();
  return section;
}

const realChip = (page: Page, name: RegExp) =>
  page.locator('.stack-chip:not([data-clone])', { hasText: name });

test('filtering by a group shows only that group, with logos', async ({ page }) => {
  const section = await test.step('Open the home page at the stack section', () =>
    openStack(page));

  await test.step('Check every tool pill has a badge', async () => {
    const pills = section.locator('.stack-pill:visible');
    await expect(pills.first()).toBeVisible();
    expect(await section.locator('.stack-pill:visible .stack-pill__badge').count()).toBe(
      await pills.count(),
    );
  });

  await test.step('Choose Payments', async () => {
    await realChip(page, /^Payments/).click();
    await expect(realChip(page, /^Payments/)).toHaveAttribute('aria-pressed', 'true');
  });

  await test.step('Check Tabby, Tamara and Etisalat show, and no database does', async () => {
    const cloud = section.locator('.stack-cloud');
    for (const name of ['Tabby', 'Tamara', 'Etisalat'])
      await expect(cloud.getByText(name, { exact: true })).toBeVisible();
    await expect(cloud.getByText('MySQL', { exact: true })).toHaveCount(0);
    await expect(section.locator('.stack-tools__count')).toContainText('in Payments');
  });

  await test.step('Check no version numbers are shown', async () => {
    await realChip(page, /^Languages/).click();
    // Languages fits under the desktop limit, so View more only shows on smaller screens.
    const more = section.locator('.stack-more');
    if (await more.isVisible()) await more.click();
    await expect(section.locator('.stack-cloud')).not.toContainText(
      /Laravel 7|Angular 7|Ionic 5|Vue 3/,
    );
    await expect(
      section.locator('.stack-cloud').getByText('Next.js', { exact: true }),
    ).toBeVisible();
  });
});

test('View more reveals the rest, and Show less folds them away', async ({ page }) => {
  const section = await test.step('Open the home page at the stack section', () =>
    openStack(page));
  const visible = section.locator('.stack-pill:visible');
  const more = section.locator('.stack-more');

  const before = await test.step('Count the pills shown first', async () => {
    await expect(more).toBeVisible();
    return visible.count();
  });

  await test.step('Press View more', async () => {
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
  });

  await test.step('Check more pills show, then Show less folds them back', async () => {
    expect(await visible.count()).toBeGreaterThan(before);
    await more.click();
    await expect(visible).toHaveCount(before);
  });
});

test('on a phone, dragging the cloud sideways opens the next tab', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'phone only');
  const section = await test.step('Open the home page at the stack section', () =>
    openStack(page));
  const cloud = section.locator('.stack-cloud');

  await test.step('Check the drag handle shows and the first view has 10 tools', async () => {
    await expect(section.locator('.stack-grab')).toBeVisible();
    await expect(section.locator('.stack-pill:visible')).toHaveCount(10);
  });

  await test.step('Drag the cloud left past the release point', async () => {
    // The page can reset its scroll shortly after load: settle, then measure.
    await page.waitForTimeout(800);
    await cloud.scrollIntoViewIfNeeded();
    const box = (await cloud.boundingBox())!;
    const y = box.y + 20;
    await page.mouse.move(box.x + box.width - 20, y);
    await page.mouse.down();
    for (let x = box.x + box.width - 20; x > box.x + box.width - 140; x -= 10)
      await page.mouse.move(x, y);
    await expect(section.locator('.stack-ghost--next')).toHaveAttribute('data-armed', '');
    await page.mouse.up();
  });

  await test.step('Check the next tab is now selected', async () => {
    await expect(realChip(page, /^Languages/)).toHaveAttribute('aria-pressed', 'true');
  });
});

test('arrow keys move focus across the filter chips', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard check on desktop');
  await test.step('Open the home page at the stack section', () => openStack(page));

  await test.step('Focus All and press the right arrow', async () => {
    await realChip(page, /^All/).focus();
    await page.keyboard.press('ArrowRight');
  });

  await test.step('Check Languages has focus', async () => {
    await expect(realChip(page, /^Languages/)).toBeFocused();
  });
});

test('the pills rise in on first view, and a soft spotlight follows the mouse', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The spotlight is mouse only');
  await page.addInitScript(() => localStorage.setItem('guide-seen', '1'));
  await page.goto('/');
  await page.locator('html[data-ready="true"]').waitFor();
  const cloud = page.locator('#stack-cloud');

  await test.step('Check the pills wait out of view', async () => {
    await expect(cloud).toHaveAttribute('data-watch', '');
    await expect(cloud).not.toHaveAttribute('data-seen', '');
  });

  await test.step('Scroll to the stack and see the pills rise in', async () => {
    // Something resets the scroll shortly after load: scroll until it holds.
    await expect
      .poll(async () => {
        await cloud.scrollIntoViewIfNeeded();
        return cloud.getAttribute('data-seen');
      })
      .toBe('');
    await expect(cloud.locator('.stack-pill').first()).toHaveCSS('opacity', '1');
  });

  await test.step('Move the mouse across a pill and check the glow follows it', async () => {
    const pill = cloud.locator('.stack-pill').first();
    const box = (await pill.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.move(box.x + 30, box.y + 12);
    await expect
      .poll(() => pill.evaluate((el) => el.style.getPropertyValue('--mx')))
      .toBe('30px');
    await expect
      .poll(() => pill.evaluate((el) => getComputedStyle(el, '::before').opacity))
      .toBe('1');
  });
});
