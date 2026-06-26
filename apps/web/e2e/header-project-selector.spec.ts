import { test, expect } from '@playwright/test';
import { bootDemo, readProjects, escapeRegExp } from './_helpers';

/**
 * Happy path 2 — the header project selector switches projects, and degrades
 * correctly to a single-project portfolio.
 *
 * The selector (HeaderProjectSelector) renders inside the project layout, so
 * each test first lands on a concrete project route. Switching is driven purely
 * through the accessible listbox the way a user would.
 */
test.describe('header project selector', () => {
  test('switches the active project across a multi-project portfolio', async ({
    page,
  }) => {
    await bootDemo(page);
    const projects = (await readProjects(page)).filter((p) => p.status !== 'archived');
    expect(
      projects.length,
      'multi-project switch needs >=2 demo projects',
    ).toBeGreaterThanOrEqual(2);

    const start = projects[0];
    await page.goto(`/v3/project/${start.id}/observe`);

    const trigger = page.getByRole('button', { name: /Click to switch project/i });
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await trigger.click();

    const listbox = page.getByRole('listbox', { name: 'Switch project' });
    await expect(listbox).toBeVisible();

    // The non-current rows are <Link role="option" aria-selected="false">,
    // each pointing at /v3/project/<id>/<stage>. Pick the first and switch.
    const others = listbox.getByRole('option', { selected: false });
    expect(await others.count(), 'expected at least one other project to switch to').toBeGreaterThanOrEqual(1);
    const targetHref = await others.first().getAttribute('href');
    expect(targetHref, 'switch target should be a project link').toMatch(/\/v3\/project\/[^/]+/);
    const targetId = (targetHref as string).split('/v3/project/')[1].split('/')[0];
    expect(targetId, 'switch target id must differ from the starting project').not.toBe(start.id);

    await others.first().click();

    // The route now points at the chosen project — the switch took effect.
    await expect(page).toHaveURL(
      new RegExp(`/v3/project/${escapeRegExp(targetId)}`),
      { timeout: 20_000 },
    );
    // ...and the selector trigger re-renders for the now-current project.
    await expect(
      page.getByRole('button', { name: /Click to switch project/i }),
    ).toBeVisible();
  });

  test('shows only the current project when it is the sole non-archived project', async ({
    page,
  }) => {
    await bootDemo(page);
    const keep = (await readProjects(page)).filter((p) => p.status !== 'archived')[0];

    // Land on the project first; the selector mounts and tracks the store
    // reactively. The demo samples are isBuiltin (so updateProject/archiveProject
    // refuse to change their status), and a reload re-injects them fresh — so
    // fabricate the sole-project state via the raw store writer AFTER mounting,
    // with no further navigation, to exercise the selector's single-project branch.
    await page.goto(`/v3/project/${keep.id}/observe`);
    const trigger = page.getByRole('button', { name: /Click to switch project/i });
    await expect(trigger).toBeVisible({ timeout: 20_000 });

    await page.evaluate((keepId) => {
      window.__ogdenProjectStore?.setState((state) => ({
        projects: state.projects.map((p) =>
          p.id === keepId ? p : { ...p, status: 'archived' },
        ),
      }));
    }, keep.id);

    await trigger.click();

    const listbox = page.getByRole('listbox', { name: 'Switch project' });
    await expect(listbox).toBeVisible();

    // Only the current row remains; there are no other projects to switch to.
    await expect(listbox.getByRole('option')).toHaveCount(1);
    await expect(listbox.getByRole('option', { selected: true })).toHaveCount(1);
    await expect(listbox.getByRole('option', { selected: false })).toHaveCount(0);
    // The "all projects" escape hatch is always offered.
    await expect(listbox.getByRole('link', { name: /All projects/i })).toBeVisible();
  });
});
