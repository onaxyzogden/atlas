import { test, expect } from '@playwright/test';
import {
  bootDemo,
  readProjects,
  HOMESTEAD_SEED_PREFIX,
  HOMESTEAD_TEMPLATE,
} from './_helpers';

/**
 * Happy path 1 — FEATURE_DEMO_OFFLINE boots client-only and the homestead
 * sample seed loads.
 *
 * Proves the offline bundle launches with no API/auth/sync, lands on the
 * portfolio, shows the demo banner, and that the built-in sample projects
 * (including the homestead sample, whose data seeds asynchronously) are present.
 */
test.describe('offline demo — boot & sample seed', () => {
  test('boots client-only and lands on the portfolio with the demo banner', async ({
    page,
  }) => {
    await bootDemo(page);

    // The demo banner is the user-facing signal that the synthetic guest session
    // is active (DemoBanner renders only when DEMO_OFFLINE_ENABLED && isDemoUser).
    // Match a plain substring to sidestep the curly apostrophe / em-dash in the
    // full copy ("You're exploring a free demo — your work is saved ...").
    await expect(page.getByText(/exploring a free demo/i)).toBeVisible();
  });

  test('seeds at least three sample projects including the homestead sample', async ({
    page,
  }) => {
    await bootDemo(page);

    const active = (await readProjects(page)).filter((p) => p.status !== 'archived');
    expect(
      active.length,
      `expected >=3 seeded sample projects, got ${active.length}`,
    ).toBeGreaterThanOrEqual(3);
    expect(
      active.some((p) => p.template === HOMESTEAD_TEMPLATE),
      'expected a homestead-sample project among the seeded demo projects',
    ).toBeTruthy();

    // The homestead sample seeds its observe/plan data asynchronously
    // (queueMicrotask, fired when the clone appears in the projectStore). Wait
    // for its idempotency sentinel so we assert the seed RAN, not just that the
    // clone exists.
    await page.waitForFunction(
      (prefix) =>
        Object.keys(window.localStorage).some((k) => k.startsWith(prefix)),
      HOMESTEAD_SEED_PREFIX,
      { timeout: 20_000 },
    );
  });
});
