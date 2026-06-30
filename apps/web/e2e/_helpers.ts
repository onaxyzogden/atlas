// Shared helpers for the offline-demo E2E smoke suite (pre-launch audit F4).
//
// These keep the three happy-path specs thin: each boots the same client-only
// demo bundle, then reads project state through the projectStore test seam
// (`window.__ogdenProjectStore`, projectStore.ts) rather than scraping the DOM
// for data that only the store authoritatively holds.

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Amina — the seeded demo member whose single operational role
 *  (`food_production`) engages the Operational Role Layer. Overriding the demo
 *  guest id to hers (before boot) is how the role-scope spec becomes a
 *  non-solo, role-bearing viewer. See builtinSampleObserveData.ts (DEMO_MEMBERS). */
export const AMINA_DEMO_USER_ID = '00000000-0000-4000-8000-000000000002';

/** localStorage key the offline-demo boot reads to mint/restore the guest
 *  (demoSession.ts, DEMO_USER_ID_KEY). */
export const DEMO_USER_ID_KEY = 'demo-user-id';

/** Prefix of the homestead sample's per-clone seed sentinel
 *  (seedHomesteadSample.ts, SEEDED_PREFIX). Its presence proves the async
 *  (queueMicrotask) seed actually ran, not merely that the clone exists. */
export const HOMESTEAD_SEED_PREFIX = 'homestead-sample-seeded@v1:';

/** metadata.instantiatedFromTemplate value carried by the homestead clone. */
export const HOMESTEAD_TEMPLATE = 'homestead-sample';

/** A project record as the store holds it (only the fields these specs read). */
interface ProjectRecord {
  id: string;
  name: string;
  status?: string;
  isBuiltin?: boolean;
  metadata?: { instantiatedFromTemplate?: string } | null;
}

interface ProjectStoreState {
  projects: ProjectRecord[];
  updateProject: (id: string, updates: Record<string, unknown>) => void;
}

/** Minimal shape of the projectStore test seam exposed on window
 *  (`window.__ogdenProjectStore = useProjectStore`, a zustand hook). Only the
 *  members these specs touch are typed. `setState` is the raw store writer —
 *  the demo samples are `isBuiltin`, so `updateProject`/`archiveProject` refuse
 *  to change their `status`; setState is how a test fabricates that state. */
interface ProjectStoreSeam {
  getState: () => ProjectStoreState;
  setState: (
    partial: (state: ProjectStoreState) => Partial<ProjectStoreState>,
  ) => void;
}

declare global {
  interface Window {
    __ogdenProjectStore?: ProjectStoreSeam;
  }
}

export interface DemoProject {
  id: string;
  name: string;
  status: string;
  template: string | null;
}

/** Escape a string for safe interpolation into a `RegExp` (project names,
 *  ids — used by `toHaveURL` / accessible-name matchers). */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Boot the offline demo: load `/`, confirm it serves and redirects to the
 * portfolio (the offline landing rule), then wait until the builtin sample
 * projects have been cloned into the store. Every spec starts here.
 */
export async function bootDemo(page: Page): Promise<void> {
  const resp = await page.goto('/');
  expect(resp?.ok(), 'offline-demo index did not respond OK').toBeTruthy();
  await expect(
    page,
    'offline demo should redirect / to the portfolio',
  ).toHaveURL(/\/v3\/portfolio/, { timeout: 30_000 });

  // The builtin sample projects (house351, mtc, homestead) are cloned during
  // boot; wait until the store actually holds them before any test reads ids.
  await page.waitForFunction(
    () =>
      (window.__ogdenProjectStore
        ?.getState()
        .projects.filter((p) => p.status !== 'archived').length ?? 0) >= 3,
    undefined,
    { timeout: 30_000 },
  );
}

/** Read the demo project roster from the store seam (id / name / status /
 *  originating template). */
export async function readProjects(page: Page): Promise<DemoProject[]> {
  return page.evaluate(() => {
    const state = window.__ogdenProjectStore?.getState();
    return (state?.projects ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status ?? 'active',
      template: p.metadata?.instantiatedFromTemplate ?? null,
    }));
  });
}

/** Resolve the homestead sample clone's project id (fails loudly if absent —
 *  it is the richest-seeded project and the role-scope spec depends on it). */
export async function findHomesteadCloneId(page: Page): Promise<string> {
  const id = await page.evaluate((tpl) => {
    const state = window.__ogdenProjectStore?.getState();
    const clone = (state?.projects ?? []).find(
      (p) => p.metadata?.instantiatedFromTemplate === tpl,
    );
    return clone?.id ?? null;
  }, HOMESTEAD_TEMPLATE);
  expect(
    id,
    'expected a homestead-sample clone in the offline-demo project store',
  ).toBeTruthy();
  return id as string;
}
