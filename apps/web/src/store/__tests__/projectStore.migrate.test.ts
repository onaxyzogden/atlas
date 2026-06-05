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

  it('targets persist version 8', () => {
    expect(options.version).toBe(8);
  });
});

describe('projectStore migrate (v7 -> v8): bare-projectType -> record backfill', () => {
  // A pre-v8 blob mixing the cases the backfill must distinguish:
  //  - a legacy bare primary string with no record (should seed a record);
  //  - a kebab archetype that normalizes to a primary (should seed, normalized);
  //  - a project already holding a record (must pass through untouched);
  //  - a secondary-only string 'residential' (canBePrimary: false -> no record);
  //  - an unknown string (-> no record);
  //  - a null-type project like MTC (-> no record).
  type RecordShape = {
    primaryTypeId: string;
    secondaryTypeIds: string[];
    versionHistory: unknown[];
  };
  type LooseTypedProject = {
    id: string;
    projectType?: string | null;
    metadata?: { projectTypeRecord?: RecordShape } | null;
  };
  interface LooseTypedState {
    projects: LooseTypedProject[];
    activeProjectId: string | null;
  }

  const v7 = {
    projects: [
      { id: 'p-homestead', projectType: 'homestead' },
      { id: 'p-archetype', projectType: 'regenerative-farm' },
      {
        id: 'p-has-record',
        projectType: 'homestead',
        metadata: {
          projectTypeRecord: {
            primaryTypeId: 'silvopasture',
            secondaryTypeIds: ['orchard_food_forest'],
            versionHistory: [{ action: 'secondary-added' }],
          },
        },
      },
      { id: 'p-residential', projectType: 'residential' },
      { id: 'p-unknown', projectType: 'not-a-real-type' },
      { id: 'p-null', projectType: null },
    ],
    activeProjectId: 'p-homestead',
  };

  function migrateV7(): LooseTypedState {
    return migrate(structuredClone(v7), 7) as unknown as LooseTypedState;
  }

  it('seeds a fresh record for a legacy bare primary string', () => {
    const byId = Object.fromEntries(migrateV7().projects.map((p) => [p.id, p]));
    const record = byId['p-homestead']!.metadata?.projectTypeRecord;
    expect(record?.primaryTypeId).toBe('homestead');
    expect(record?.secondaryTypeIds).toEqual([]);
    // Mirrors setPrimaryType: no version history on a materialized record.
    expect(record?.versionHistory).toEqual([]);
  });

  it('normalizes a kebab archetype before materializing the record', () => {
    const byId = Object.fromEntries(migrateV7().projects.map((p) => [p.id, p]));
    expect(byId['p-archetype']!.metadata?.projectTypeRecord?.primaryTypeId).toBe(
      'regenerative_farm',
    );
  });

  it('leaves a project that already has a record untouched', () => {
    const byId = Object.fromEntries(migrateV7().projects.map((p) => [p.id, p]));
    const record = byId['p-has-record']!.metadata?.projectTypeRecord;
    expect(record?.primaryTypeId).toBe('silvopasture');
    expect(record?.secondaryTypeIds).toEqual(['orchard_food_forest']);
    expect(record?.versionHistory).toEqual([{ action: 'secondary-added' }]);
  });

  it('skips a secondary-only string (residential cannot be a primary)', () => {
    const byId = Object.fromEntries(migrateV7().projects.map((p) => [p.id, p]));
    expect(byId['p-residential']!.metadata?.projectTypeRecord).toBeUndefined();
  });

  it('skips unknown and null project-type strings', () => {
    const byId = Object.fromEntries(migrateV7().projects.map((p) => [p.id, p]));
    expect(byId['p-unknown']!.metadata?.projectTypeRecord).toBeUndefined();
    expect(byId['p-null']!.metadata?.projectTypeRecord).toBeUndefined();
  });

  it('preserves array order + activeProjectId', () => {
    const out = migrateV7();
    expect(out.projects.map((p) => p.id)).toEqual([
      'p-homestead',
      'p-archetype',
      'p-has-record',
      'p-residential',
      'p-unknown',
      'p-null',
    ]);
    expect(out.activeProjectId).toBe('p-homestead');
  });

  it('is idempotent — re-running on already-migrated v8 data is a no-op', () => {
    const once = migrateV7();
    const twice = migrate(
      structuredClone(once),
      8,
    ) as unknown as LooseTypedState;
    const byId = Object.fromEntries(twice.projects.map((p) => [p.id, p]));
    expect(byId['p-homestead']!.metadata?.projectTypeRecord?.primaryTypeId).toBe(
      'homestead',
    );
    expect(byId['p-residential']!.metadata?.projectTypeRecord).toBeUndefined();
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
