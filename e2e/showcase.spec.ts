import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * The "My work" showcase: the chapter bar fills with the scroll, the CTA
 * reacts to hover, NDA shots keep their ribbon with no blur (the owner blurs
 * the file), frames with several shots are slideshows with no on-screen
 * controls, and the page never scrolls sideways at any width.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('guide-seen', '1');
    sessionStorage.setItem('splash-seen', '1');
  });
});

async function openHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
  /*
   * data-ready alone is not hydration: with the splash already seen, the head
   * script sets it before React runs, and SplashDismiss's mount effect then
   * scrolls to the top, undoing any scroll made before it. The showcase sets
   * data-showcase-active only on the client, so wait for that, then a beat
   * for the passive effects that follow it.
   */
  if ((await page.locator('.showcase__track').count()) > 0) {
    await expect(page.locator('html')).toHaveAttribute('data-showcase-active', /^(on|off)$/, { timeout: 20_000 });
    await page.waitForTimeout(300);
  }
}

/**
 * Scroll to a fraction of the showcase track, then let the spring settle.
 * Something on the page can put the scroll back to the top shortly after
 * load, so the scroll is repeated until it holds.
 */
async function scrollTrackTo(page: Page, fraction: number) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const target = await page.evaluate((p) => {
      const track = document.querySelector<HTMLElement>('.showcase__track')!;
      const stage = track.querySelector<HTMLElement>('.showcase__stage')!;
      const top = track.getBoundingClientRect().top + window.scrollY;
      const y = Math.round(top + (track.offsetHeight - stage.offsetHeight) * p);
      window.scrollTo(0, y);
      return y;
    }, fraction);
    await page.waitForTimeout(600);
    if (Math.abs((await page.evaluate(() => window.scrollY)) - target) <= 4) return;
  }
  throw new Error(`the page would not stay scrolled to ${fraction * 100}% of the showcase`);
}

/**
 * Click where a visitor would, without Playwright's scroll-into-view first.
 * For an element inside the pinned (sticky) stage, Chrome computes that
 * scroll from the element's unstuck position and pages the showcase on to the
 * next project, which unmounts the very control being clicked.
 */
async function press(page: Page, target: Locator) {
  const box = (await target.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function hoverAt(page: Page, target: Locator) {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

/** The scaleX of a computed `matrix(a, b, c, d, e, f)`; `none` is 1. */
const scaleXOf = (m: string) => (m === 'none' ? 1 : Number(m.match(/matrix\(([^,]+)/)?.[1] ?? NaN));

test('the current chapter bar fills with the scroll', async ({ page }) => {
  await test.step('Open the home page', async () => {
    await openHome(page);
    await expect(page.locator('.showcase__track')).toBeAttached();
  });

  for (const at of [0.25, 0.5, 0.75]) {
    await test.step(`Scroll ${at * 100}% through the work`, async () => {
      await scrollTrackTo(page, at);
    });

    await test.step(`Check the current bar is part-filled at ${at * 100}%`, async () => {
      const bar = page.locator('.chapter[data-state="current"] .chapter__bar i');
      await expect(bar).toHaveCount(1);
      const sx = scaleXOf(await bar.evaluate((el) => getComputedStyle(el).transform));
      expect(sx).toBeGreaterThan(0);
      expect(sx).toBeLessThanOrEqual(1);
    });
  }

  await test.step('Check bars already passed are full and dimmed', async () => {
    const past = page.locator('.chapter[data-state="past"] .chapter__bar i').first();
    await expect(past).toHaveCSS('opacity', '0.45');
    expect(scaleXOf(await past.evaluate((el) => getComputedStyle(el).transform))).toBe(1);
  });
});

test('View case study lifts when hovered', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover is for a mouse');

  await test.step('Open the home page and scroll into the first project', async () => {
    await openHome(page);
    await scrollTrackTo(page, 0.05);
  });

  const cta = page.locator('.ptext .panel__button').filter({ visible: true }).first();

  await test.step('Hover View case study', async () => {
    await expect(cta).toBeVisible();
    await page.mouse.move(5, 5);
    await expect(cta).toHaveCSS('transform', 'none');
    await cta.hover();
  });

  await test.step('Check the button has lifted', async () => {
    await expect(cta).not.toHaveCSS('transform', 'none');
  });
});

test('NDA shots keep the ribbon and nothing is blurred', async ({ page }) => {
  await test.step('Open the home page', async () => {
    await openHome(page);
  });

  await test.step('Check no screenshot in the showcase has a blur filter', async () => {
    const filters = await page
      .locator('.showcase .shot__media')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).filter));
    for (const filter of filters) expect(filter).not.toContain('blur');
  });

  await test.step('Check every NDA mark still draws its ribbon', async () => {
    const marks = page.locator('.showcase .shot .nda');
    const n = await marks.count();
    test.skip(n === 0, 'no NDA screenshots uploaded');
    for (let i = 0; i < n; i++) await expect(marks.nth(i).locator('.nda__ribbon')).toHaveCount(1);
  });
});

test('a slideshow has no on-screen controls; tap, swipe and arrow keys change the shot', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the small shells are tap targets on a phone; the laptop is checked on desktop');

  await test.step('Open the home page', async () => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await openHome(page);
  });

  await test.step('Check no frame draws prev, next, segments or a count', async () => {
    await expect(page.locator('.showcase :is(.rig__ctl, .rig__nav, .rig__dots, .rig__dot, .rig__count)')).toHaveCount(0);
  });

  const stories = page.locator('.showcase .ptext');
  const n = await stories.count();
  let found = false;

  for (let i = 0; i < n && !found; i++) {
    await test.step(`Go to project ${i + 1}`, async () => {
      await scrollTrackTo(page, (i + 0.5) / n);
    });

    const candidate = page.locator('.showcase .rig > [data-slides]:not([data-off])').first();
    if ((await candidate.count()) === 0) continue;
    found = true;
    // Pin the shell by its device, so a re-render cannot swap it under the test.
    const device = (await candidate.getAttribute('class'))!.match(/rig__(laptop|tablet|phone)/)![0];
    const shell = page.locator(`.showcase .rig > .${device}`);
    const hit = shell.locator('.rig__hit');
    const at = (i + 0.5) / n;

    // Which of this project's shots is showing: the index of its `data-on` media.
    const onIndex = () =>
      page.evaluate(
        ([cls, k]) => {
          const shot = document.querySelector(`.showcase .${cls} .rig__screen > .shot:nth-child(${k + 1})`);
          return [...(shot?.querySelectorAll('.shot__media') ?? [])].findIndex((m) => m.hasAttribute('data-on'));
        },
        [device, i] as const,
      );

    await test.step('Hover the device to hold autoplay', async () => {
      await scrollTrackTo(page, at); // the page can reset its scroll; hold this project
      await hoverAt(page, hit);
      await expect(shell).not.toHaveAttribute('data-playing', '');
    });

    const start = await onIndex();

    await test.step('Tap the device to show the next shot', async () => {
      await press(page, hit);
      await expect.poll(onIndex).not.toBe(start);
    });

    await test.step('Swipe right on the device to go back', async () => {
      await scrollTrackTo(page, at);
      const box = (await hit.boundingBox())!;
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width / 2 - 40, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 40, y, { steps: 4 });
      await page.mouse.up();
      await expect.poll(onIndex).toBe(start);
    });

    await test.step('Focus the device and press the right arrow key', async () => {
      await scrollTrackTo(page, at);
      await hit.evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
      await page.keyboard.press('ArrowRight');
      await expect.poll(onIndex).not.toBe(start);
    });
  }

  test.skip(!found, 'no project has two or more shots for one device in this content');
});

for (const width of [320, 360, 768, 1024, 1366, 1920]) {
  test(`no sideways scroll at ${width}px wide`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'widths are set explicitly; one project is enough');

    await test.step(`Open the home page at ${width}px`, async () => {
      await page.setViewportSize({ width, height: width < 768 ? 780 : 900 });
      await openHome(page);
    });

    await test.step('Scroll into the work', async () => {
      if ((await page.locator('.showcase__track').count()) > 0) await scrollTrackTo(page, 0.5);
    });

    await test.step('Check the page is no wider than the window', async () => {
      const { scroll, inner } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: document.documentElement.clientWidth,
      }));
      expect(scroll).toBeLessThanOrEqual(inner);
    });
  });
}

test('a device with no upload is not drawn, and the rig matches every project', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one pass on desktop covers the data; phones are the width loop above');

  await test.step('Open the home page', async () => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await openHome(page);
    await expect(page.locator('.showcase__track')).toBeAttached();
  });

  const rig = page.locator('.showcase .rig');
  test.skip((await rig.count()) === 0, 'no project has screenshots');
  const stories = page.locator('.showcase .ptext');
  const n = await stories.count();
  let mobileless = -1;

  for (let i = 0; i < n; i++) {
    await test.step(`Scroll to project ${i + 1} and check its devices`, async () => {
      const y = Number(await stories.nth(i).getAttribute('data-substep-y'));
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(500);
      // What the data gave this project: a screen has a picture only for its own uploads.
      const has = await page.evaluate((k) => {
        const own = (shell: string) =>
          !!document.querySelector(`.showcase .${shell} .rig__screen > .shot:nth-child(${k + 1}) :is(img, video)`);
        return ['laptop', 'mobile', 'tablet'].filter((d) =>
          own(d === 'laptop' ? 'rig__laptop' : d === 'mobile' ? 'rig__phone' : 'rig__tablet'),
        );
      }, i);
      await expect(rig).toHaveAttribute('data-devices', has.join(' '));
      if (!has.includes('mobile') && mobileless < 0) mobileless = i;
    });
  }

  test.skip(mobileless < 0, 'every project has a mobile shot in this content');

  await test.step('Go to the project with no mobile shot', async () => {
    const y = Number(await stories.nth(mobileless).getAttribute('data-substep-y'));
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(500);
  });

  await test.step('Check the phone is not shown and cannot be clicked', async () => {
    await expect(rig).not.toHaveAttribute('data-devices', /mobile/);
    await expect(page.locator('.showcase .rig__phone')).toBeHidden();
    await expect(page.locator('.showcase .rig__phone')).toHaveAttribute('aria-hidden', 'true');
  });

  await test.step('Check nothing spills sideways', async () => {
    const { scroll, inner } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(inner);
  });
});
