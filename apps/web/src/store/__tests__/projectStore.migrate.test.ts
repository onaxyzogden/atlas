// @vitest-environment happy-dom
/**
 * projectStore - planShellMode discriminator migration test (Slice E).
 *
 * Covers the v6 -> v7 persist `migrate` that renames the Plan view
 * discriminator value 'tier-spine' -> 'stratum-spine' -- the internal-coherence
 * pass that followed the user-facing Stratum 1-7 rename. The migrate maps only
 * the exact legacy value; 'module-bar' and an unset planShellMode pass through
 * verbatim, and the projects array + activeProjectId are preserved.
 *
 * The migrate is exercised through the live persist option
 * (`useProjectStore.persist.getOptions().migrate`) so the test pins the actual
 * store wiring rather than a hand-copied function. Each call gets a
 * `structuredClone` of the fixture because the migrate mutates its input.
 */

import { describe, it, expect } from 'vitest';
import { useProjectStore } from '../projectStore.js';

type LooseProject = { id: string; planShellMode?: string };
interface LooseState {
  projects: LooseProject[];
  activeProjectId: string | null;
}

const options = useProjectStore.persist.getOptions();
const migrate = options.migrate!;

describe('projectStore migrate (v6 -> v7): planShellMode stratum rename', () => {
  // Pre-rename blob: one project on each of the three planShellMode states the
  // migrate must distinguish -- the legacy spine value, the legacy module bar,
  // and an unset field (builtin/default projects never persisted one).
  const v6 = {
    projects: [
      { id: 'p-tier', planShellMode: 'tier-spine' },
      { id: 'p-module', planShellMode: 'module-bar' },
      { id: 'p-undef' },
    ],
    activeProjectId: 'p-tier',
  };

  it("rewrites only 'tier-spine' -> 'stratum-spine'; others pass through", () => {
    const out = migrate(structuredClone(v6), 6) as unknown as LooseState;
    const byId = Object.fromEntries(out.projects.map((p) => [p.id, p]));
    expect(byId['p-tier']!.planShellMode).toBe('stratum-spine');
    expect(byId['p-module']!.planShellMode).toBe('module-bar');
    expect(byId['p-undef']!.planShellMode).toBeUndefined();
  });

  it('preserves the projects array order + activeProjectId', () => {
    const out = migrate(structuredClone(v6), 6) as unknown as LooseState;
    expect(out.projects.map((p) => p.id)).toEqual([
      'p-tier',
      'p-module',
      'p-undef',
    ]);
    expect(out.activeProjectId).toBe('p-tier');
  });

  it('targets persist version 7', () => {
    expect(options.version).toBe(7);
  });
});

describe('projectStore migrate - idempotency + safety', () => {
  it('leaves already-migrated stratum-spine data untouched (version gate)', () => {
    const v7 = {
      projects: [{ id: 'p', planShellMode: 'stratum-spine' }],
      activeProjectId: 'p',
    };
    const out = migrate(structuredClone(v7), 7) as unknown as LooseState;
    expect(out.projects[0]!.planShellMode).toBe('stratum-spine');
  });

  it('tolerates a projectless persisted state', () => {
    const out = migrate(
      { activeProjectId: null } as unknown,
      6,
    ) as unknown as LooseState;
    expect(out.projects).toEqual([]);
    expect(out.activeProjectId).toBeNull();
  });
});
