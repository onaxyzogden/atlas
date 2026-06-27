import { test, expect } from '@playwright/test';
import {
  bootDemo,
  findHomesteadCloneId,
  AMINA_DEMO_USER_ID,
  DEMO_USER_ID_KEY,
} from './_helpers';

/**
 * Happy path 3 — an Operational Role scope de-emphasizes the right domains
 * WITHOUT ever hiding an objective.
 *
 * Invariant under test (the role layer's golden rule): "never hide, only
 * de-emphasize." The live default Plan shell (PlanTierShell → ActTierObjectiveRail)
 * collapses out-of-focus objectives into a one-click "Outside your focus (N)"
 * group rather than dropping them. Switching to Full view must reveal the exact
 * same set of objective cards, with the scope annotation as the only difference.
 *
 * Precondition: the viewer must be a non-solo member with an operational role.
 * The demo seeds a 2-member roster (Yousef + Amina); we override the demo guest
 * id to Amina's before boot, so she boots as herself (food_production), the
 * project is not solo, and the role layer engages.
 */
test.describe('operational role layer — never hide, only de-emphasize', () => {
  test.beforeEach(async ({ page }) => {
    // Become Amina BEFORE any app script runs, so the offline boot mints the
    // guest with her id (email stays guest-<id>@demo.ogden.ag, so isDemoUser
    // still passes) and memberStore resolves her food_production role.
    await page.addInitScript(
      (args) => window.localStorage.setItem(args.key, args.id),
      { key: DEMO_USER_ID_KEY, id: AMINA_DEMO_USER_ID },
    );
  });

  test('role view de-emphasizes out-of-focus objectives but keeps every one reachable', async ({
    page,
  }) => {
    await bootDemo(page);
    const homesteadId = await findHomesteadCloneId(page);
    await page.goto(`/v3/project/${homesteadId}/plan`);

    // LOUD guard: the layer MUST engage. If the toggle never mounts, layerActive
    // was false — that is a broken precondition (roster/role/identity), not a
    // violation of the never-hide invariant, and the message says so.
    const toggle = page.getByTestId('view-focus-toggle');
    await expect(
      toggle,
      'Operational Role Layer did not engage on the Plan rail: ViewFocusToggle never mounted. ' +
        'layerActive was false — verify the demo seeded the 2-member roster (Yousef + Amina) ' +
        'and that demo-user-id was overridden to Amina (food_production) before boot.',
    ).toBeVisible({ timeout: 20_000 });

    // The objective cards: ActTierObjectiveCard renders an explicit role="button"
    // with data-status. Native <button>s (the toggle, switcher, filters) carry no
    // literal role attribute, so this selector targets only the objective cards.
    const cards = page.locator('[role="button"][data-status]');

    // --- My focus (role-scoped) ---
    await page.getByTestId('view-focus-role').click();
    // Out-of-focus objectives collapse into a "Outside your focus (N)" group.
    // Expand it so the count reflects every card — collapsed is NOT hidden.
    const outside = page.getByTestId('rail-outside-focus-toggle');
    if (await outside.count()) {
      if ((await outside.getAttribute('aria-expanded')) !== 'true') {
        await outside.click();
      }
    }
    await expect(cards.first()).toBeVisible();
    const focusScopes = await cards.evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-scope')),
    );
    const focusCount = focusScopes.length;
    expect(focusCount, 'role-scoped Plan rail should render objective cards').toBeGreaterThan(0);
    // In role view every card is classified (in / out / out-surfaced).
    expect(
      focusScopes.every((s) => s === 'in' || s === 'out' || s === 'out-surfaced'),
      `role view should classify every card; saw ${JSON.stringify(focusScopes)}`,
    ).toBeTruthy();
    // De-emphasis actually occurs: at least one objective sits outside Amina's
    // food_production focus (otherwise the test proves nothing about scoping).
    expect(
      focusScopes.some((s) => s === 'out' || s === 'out-surfaced'),
      'expected at least one out-of-focus objective for a food_production member',
    ).toBeTruthy();

    // --- Full view (unscoped) ---
    await page.getByTestId('view-focus-full').click();
    await expect(cards.first()).toBeVisible();
    const fullScopes = await cards.evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-scope')),
    );
    const fullCount = fullScopes.length;

    // NEVER HIDE: the objective set is identical across the toggle. Role view
    // only de-emphasized (collapsed/dimmed) cards; it removed none.
    expect(
      fullCount,
      'switching to Full view must not change the number of objectives',
    ).toBe(focusCount);
    // Unscoped view carries no scope annotation at all — byte-identical to a
    // role-blind rail.
    expect(
      fullScopes.every((s) => s === null),
      `full view should carry no data-scope annotation; saw ${JSON.stringify(fullScopes)}`,
    ).toBeTruthy();
  });
});
