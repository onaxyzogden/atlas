import { test, expect } from '@playwright/test';

/**
 * Phase-0 harness sanity check: the offline-demo bundle builds, serves, and
 * boots far enough to redirect `/` to the portfolio (the offline landing rule).
 * This validates the webServer (build + preview) wiring before the real specs
 * lean on it. Safe to keep as a fast canary.
 */
test('offline-demo bundle builds, serves, and boots to the portfolio', async ({ page }) => {
  const resp = await page.goto('/');
  expect(resp?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/v3\/portfolio/, { timeout: 30_000 });
});
