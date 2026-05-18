# B2 Soil Food-Web Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only per-guild soil food-web audit card and an editable persisted compost-cycle designer card to the already-registered `soil-fertility` plan module, additively (no DB migration, no API, no goal-tree criterion).

**Architecture:** Mirrors the proven B1 template exactly: a pure deterministic math module + a static lookup table + colocated vitest specs + a read-only audit card; a net-new isolated Zustand persist slice + colocated specs + an auto-persist editable card; and a 2-file append-only registration. `soil-fertility` is already a registered `PlanModule`, so no union member is added and every `Record<PlanModule,_>` map and the `never`-guarded switch stay inert (confirmed by `tsc`, not edited).

**Tech Stack:** React 18 + TypeScript (`apps/web`), Zustand 4 + `persist` middleware, Vitest 2.1.9 (happy-dom for store specs), pnpm/Turborepo monorepo (pnpm NOT on PATH — use the explicit node/npx commands below).

---

## Environment / command reference (Windows, pnpm not on PATH)

Run all commands from the atlas repo root:
`C:\Users\MY OWN AXIS\Documents\MAQASID OS - V2.1\atlas`

- **Run specs (positional filters are substrings, separate args):**
  `node node_modules/vitest/vitest.mjs run soilFoodWebMath compostCycleStore --root apps/web`
- **Run one spec file:**
  `node node_modules/vitest/vitest.mjs run soilFoodWebMath --root apps/web`
- **tsc apps/web (whole-project tsc OOMs at default heap — raise it):**
  PowerShell: `$env:NODE_OPTIONS='--max-old-space-size=8192'; & 'C:\Program Files\nodejs\npx.ps1' --no-install tsc -p apps/web --noEmit`
- **tsc shared (confirm no transitive break):**
  `$env:NODE_OPTIONS='--max-old-space-size=8192'; & 'C:\Program Files\nodejs\npx.ps1' --no-install tsc -p packages/shared --noEmit`

> **Pre-existing out-of-band tsc errors are expected and NOT B2:**
> `useFlowEndpointOptions*` (Paddock), `workItemStore.ts`,
> `workItemStore.migration.ts`, `workItemStore.migration.test.ts`. These
> are uncommitted D0 work owned elsewhere — leave untouched, do not stage
> them, and do not treat them as B2 failures. B2 is green when no NEW tsc
> error originates from a B2 file.

## File structure

Create:
- `apps/web/src/v3/plan/cards/soil-fertility/soilBiologyProfiles.ts` — static speciesId→profile lookup (owns its own table; `plantCatalog` is not extended).
- `apps/web/src/v3/plan/cards/soil-fertility/soilFoodWebMath.ts` — pure deterministic checker (no React, no store import).
- `apps/web/src/v3/plan/cards/soil-fertility/__tests__/soilFoodWebMath.test.ts` — colocated unit specs.
- `apps/web/src/v3/plan/cards/soil-fertility/SoilFoodWebCard.tsx` — read-only audit card.
- `apps/web/src/store/compostCycleStore.ts` — net-new isolated persist slice.
- `apps/web/src/store/__tests__/compostCycleStore.test.ts` — colocated store specs.
- `apps/web/src/v3/plan/cards/soil-fertility/CompostCycleCard.tsx` — editable auto-persist designer.

Modify (append-only):
- `apps/web/src/v3/plan/types.ts` — 2 lines appended to `MODULE_CARDS['soil-fertility']`.
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — 2 `lazy()` imports + 2 switch cases (+ card-count comment bump if one exists).

Read-only reuse (do not modify): `data/plantCatalog.ts` (`findEntry`), `store/polycultureStore.ts` (`Guild`/`GuildMember` types), `store/compostInventoryStore.ts` (`useCompostInventoryStore` for a display-only context line), `v3/_shared/stageCard/stageCard.module.css`.

---

## Task 1: Static soil-biology profile lookup

**Files:**
- Create: `apps/web/src/v3/plan/cards/soil-fertility/soilBiologyProfiles.ts`

- [ ] **Step 1: Write the module**

```typescript
/**
 * soilBiologyProfiles — Sub-project B2, soil food-web layer (static data).
 *
 * A B2-owned lookup of per-species root-zone biology: mycorrhizal
 * association type and dominant root-exudate class. The plant catalog
 * has no mycorrhizal/exudate fields and is deliberately NOT extended —
 * B2 owns this table the way B1's checker owns the companion bridge.
 *
 * Coverage is best-effort, not exhaustive. soilFoodWebMath emits an
 * explicit `unmatched` info finding for any guild member absent here,
 * so a missing species is reported, never silently passed.
 *
 * Keys are plantCatalog speciesIds. resolveProfile (in soilFoodWebMath)
 * adds a normalized-commonName fallback probe.
 */

export type MycorrhizaType = 'arbuscular' | 'ecto' | 'ericoid' | 'none';
export type ExudateClass = 'sugar' | 'organic_acid' | 'phenolic' | 'mixed';

export interface SoilBiologyProfile {
  mycorrhiza: MycorrhizaType;
  exudateClass: ExudateClass;
  note?: string;
}

/**
 * speciesId → soil-biology profile. Generalised at family level from
 * published mycorrhizal-association literature; treat as a design
 * heuristic, not a soil assay.
 */
export const SOIL_BIOLOGY_PROFILES: Record<string, SoilBiologyProfile> = {
  // Rosaceae pome/stone fruit — arbuscular
  apple: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  pear: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  plum: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  cherry: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  peach: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },

  // Juglandaceae — arbuscular, juglone-bearing phenolic exudate
  black_walnut: {
    mycorrhiza: 'arbuscular',
    exudateClass: 'phenolic',
    note: 'Juglone-dominated rhizosphere — allelopathic phenolic load.',
  },
  pecan: { mycorrhiza: 'arbuscular', exudateClass: 'phenolic' },

  // Fagaceae — ectomycorrhizal
  white_oak: { mycorrhiza: 'ecto', exudateClass: 'phenolic' },
  red_oak: { mycorrhiza: 'ecto', exudateClass: 'phenolic' },
  chestnut: { mycorrhiza: 'ecto', exudateClass: 'phenolic' },

  // Pinaceae / Betulaceae — ectomycorrhizal
  pine: { mycorrhiza: 'ecto', exudateClass: 'organic_acid' },
  birch: { mycorrhiza: 'ecto', exudateClass: 'organic_acid' },

  // Ericaceae — ericoid
  blueberry: { mycorrhiza: 'ericoid', exudateClass: 'organic_acid' },

  // Fabaceae legumes — arbuscular, sugar-rich (nodule-supported)
  clover: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  alfalfa: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  vetch: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },

  // Dynamic accumulators / herbaceous — arbuscular, organic-acid bias
  comfrey: {
    mycorrhiza: 'arbuscular',
    exudateClass: 'organic_acid',
    note: 'Deep tap-root mineral mobiliser — organic-acid rhizosphere.',
  },
  yarrow: { mycorrhiza: 'arbuscular', exudateClass: 'mixed' },

  // Brassicaceae — non-mycorrhizal
  mustard: { mycorrhiza: 'none', exudateClass: 'phenolic' },
  radish: { mycorrhiza: 'none', exudateClass: 'phenolic' },
};
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/v3/plan/cards/soil-fertility/soilBiologyProfiles.ts"
git commit -m "feat(plan): B2 static soil-biology profile lookup"
```

---

## Task 2: Pure soil food-web checker (TDD)

**Files:**
- Create: `apps/web/src/v3/plan/cards/soil-fertility/soilFoodWebMath.ts`
- Test: `apps/web/src/v3/plan/cards/soil-fertility/__tests__/soilFoodWebMath.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import {
  checkGuild,
  checkGuilds,
  resolveProfile,
} from '../soilFoodWebMath.js';
import type { Guild } from '../../../../../store/polycultureStore.js';

function guild(
  members: { speciesId: string; layer: Guild['members'][number]['layer'] }[],
  anchorSpeciesId = members[0]?.speciesId ?? 'apple',
): Guild {
  return {
    id: 'g1',
    projectId: 'p1',
    name: 'Test guild',
    anchorSpeciesId,
    members,
    createdAt: new Date(0).toISOString(),
  };
}

describe('resolveProfile (speciesId → soil-biology lookup)', () => {
  it('resolves a known catalog species', () => {
    const r = resolveProfile('apple');
    expect(r.matched).toBe(true);
    expect(r.profile?.mycorrhiza).toBe('arbuscular');
  });

  it('reports unmatched for an id absent from the table', () => {
    const r = resolveProfile('definitely_not_a_real_species');
    expect(r.matched).toBe(false);
    expect(r.profile).toBeNull();
  });
});

describe('checkGuild — mycorrhizal coherence', () => {
  it('warns when an ecto member sits under an arbuscular anchor', () => {
    const f = checkGuild(
      guild(
        [
          { speciesId: 'apple', layer: 'canopy' },
          { speciesId: 'white_oak', layer: 'sub_canopy' },
        ],
        'apple',
      ),
    );
    const myc = f.filter((x) => x.kind === 'mycorrhiza');
    expect(myc).toHaveLength(1);
    expect(myc[0]!.severity).toBe('warning');
  });

  it('does not warn when all members share the anchor mycorrhiza type', () => {
    const f = checkGuild(
      guild(
        [
          { speciesId: 'apple', layer: 'canopy' },
          { speciesId: 'clover', layer: 'ground_cover' },
        ],
        'apple',
      ),
    );
    expect(f.some((x) => x.kind === 'mycorrhiza')).toBe(false);
  });
});

describe('checkGuild — unmatched info (never a false all-clear)', () => {
  it('emits an info finding when a member has no profile', () => {
    const f = checkGuild(
      guild([
        { speciesId: 'definitely_not_a_real_species', layer: 'canopy' },
        { speciesId: 'apple', layer: 'sub_canopy' },
      ]),
    );
    const info = f.filter((x) => x.kind === 'unmatched');
    expect(info.length).toBeGreaterThanOrEqual(1);
    expect(info[0]!.severity).toBe('info');
  });
});

describe('checkGuild — dominant-exudate rollup', () => {
  it('emits one info exudate finding naming the dominant class', () => {
    const f = checkGuild(
      guild([
        { speciesId: 'apple', layer: 'canopy' }, // sugar
        { speciesId: 'pear', layer: 'canopy' }, // sugar
        { speciesId: 'comfrey', layer: 'herbaceous' }, // organic_acid
      ]),
    );
    const ex = f.filter((x) => x.kind === 'exudate');
    expect(ex).toHaveLength(1);
    expect(ex[0]!.severity).toBe('info');
    expect(ex[0]!.rationale).toContain('sugar');
  });
});

describe('checkGuild / checkGuilds — edges', () => {
  it('returns [] for an empty guild', () => {
    expect(checkGuild(guild([]))).toEqual([]);
  });

  it('flattens findings across guilds', () => {
    const g1 = guild(
      [
        { speciesId: 'apple', layer: 'canopy' },
        { speciesId: 'white_oak', layer: 'sub_canopy' },
      ],
      'apple',
    );
    const g2: Guild = { ...g1, id: 'g2' };
    expect(checkGuilds([g1, g2]).length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run soilFoodWebMath --root apps/web`
Expected: FAIL — cannot resolve `../soilFoodWebMath.js` (module not yet created).

- [ ] **Step 3: Write minimal implementation**

```typescript
/**
 * soilFoodWebMath — Sub-project B2, soil food-web layer (pure).
 *
 * Design-time soil-biology audit over guild members:
 *   1. Mycorrhizal-network coherence — members forming a different
 *      (non-`none`) mycorrhiza type than the anchor cannot share a
 *      hyphal network with it. Heuristic warning, never error.
 *   2. Dominant-exudate rollup — one info finding per guild naming the
 *      dominant root-exudate class across profiled members.
 *   3. Unmatched — explicit info finding for members with no profile,
 *      so a coverage gap is reported, never a false all-clear.
 *
 * Pure: no React, no store import — takes Guild types only and reads the
 * static soilBiologyProfiles table + the plant catalog for labels.
 * Deterministic. Mirrors the B1 guildIntegrityMath precedent.
 */

import type { Guild, GuildMember } from '../../../../store/polycultureStore.js';
import { findEntry } from '../../../../data/plantCatalog.js';
import {
  SOIL_BIOLOGY_PROFILES,
  type ExudateClass,
  type SoilBiologyProfile,
} from './soilBiologyProfiles.js';

export type SoilWebFindingKind = 'mycorrhiza' | 'exudate' | 'unmatched';

export interface SoilWebFinding {
  guildId: string;
  guildName: string;
  kind: SoilWebFindingKind;
  severity: 'error' | 'warning' | 'info';
  speciesA: string;
  speciesB?: string;
  labelA: string;
  labelB?: string;
  rationale: string;
}

/** Human label for a member — catalog commonName, else the raw speciesId. */
export function labelFor(speciesId: string): string {
  return findEntry(speciesId)?.commonName ?? speciesId;
}

interface ResolvedProfile {
  matched: boolean;
  profile: SoilBiologyProfile | null;
}

/**
 * speciesId → soil-biology profile. Tries the direct speciesId key, then
 * the catalog commonName normalized to snake_case. Returns matched=false
 * when neither resolves (caller emits an explicit `unmatched` finding).
 */
export function resolveProfile(speciesId: string): ResolvedProfile {
  const direct = SOIL_BIOLOGY_PROFILES[speciesId];
  if (direct) return { matched: true, profile: direct };
  const entry = findEntry(speciesId);
  if (entry?.commonName) {
    const norm = entry.commonName.trim().toLowerCase().replace(/\s+/g, '_');
    const hit = SOIL_BIOLOGY_PROFILES[norm];
    if (hit) return { matched: true, profile: hit };
  }
  return { matched: false, profile: null };
}

interface MatchedMember {
  speciesId: string;
  profile: SoilBiologyProfile;
}

/** All checks for a single guild → flat findings (possibly empty). */
export function checkGuild(guild: Guild): SoilWebFinding[] {
  const findings: SoilWebFinding[] = [];
  const members = guild.members ?? [];
  if (members.length === 0) return [];
  const base = { guildId: guild.id, guildName: guild.name };

  const resolved = members.map((m) => ({
    speciesId: m.speciesId,
    ...resolveProfile(m.speciesId),
  }));

  // ── Unmatched info — never a false all-clear ────────────────────────────
  const unmatched = resolved.filter((r) => !r.matched);
  if (unmatched.length > 0) {
    const head = unmatched[0]!;
    const labels = unmatched.map((u) => labelFor(u.speciesId)).join(', ');
    findings.push({
      ...base,
      kind: 'unmatched',
      severity: 'info',
      speciesA: head.speciesId,
      labelA: labelFor(head.speciesId),
      rationale: `Soil-biology profile unavailable for ${labels}. Mycorrhizal/exudate coherence for this guild could not be fully verified — reported, never silently passed.`,
    });
  }

  const matched: MatchedMember[] = resolved
    .filter((r): r is { speciesId: string } & ResolvedProfile =>
      Boolean(r.matched && r.profile),
    )
    .map((r) => ({ speciesId: r.speciesId, profile: r.profile! }));

  // ── Mycorrhizal-network coherence vs the anchor ─────────────────────────
  const anchor = resolveProfile(guild.anchorSpeciesId);
  if (
    anchor.matched &&
    anchor.profile &&
    anchor.profile.mycorrhiza !== 'none'
  ) {
    const anchorType = anchor.profile.mycorrhiza;
    for (const r of matched) {
      if (r.speciesId === guild.anchorSpeciesId) continue;
      const t = r.profile.mycorrhiza;
      if (t !== 'none' && t !== anchorType) {
        findings.push({
          ...base,
          kind: 'mycorrhiza',
          severity: 'warning',
          speciesA: guild.anchorSpeciesId,
          speciesB: r.speciesId,
          labelA: labelFor(guild.anchorSpeciesId),
          labelB: labelFor(r.speciesId),
          rationale: `${labelFor(
            guild.anchorSpeciesId,
          )} forms ${anchorType} mycorrhizae while ${labelFor(
            r.speciesId,
          )} forms ${t} — no shared hyphal network, so mycorrhizal nutrient transfer between them is unlikely. Heuristic design hint, not a soil assay.`,
        });
      }
    }
  }

  // ── Dominant-exudate rollup (info) ──────────────────────────────────────
  if (matched.length > 0) {
    const counts = new Map<ExudateClass, number>();
    for (const r of matched) {
      counts.set(
        r.profile.exudateClass,
        (counts.get(r.profile.exudateClass) ?? 0) + 1,
      );
    }
    let dom: ExudateClass = matched[0]!.profile.exudateClass;
    let best = 0;
    for (const [k, n] of counts) {
      if (n > best) {
        best = n;
        dom = k;
      }
    }
    findings.push({
      ...base,
      kind: 'exudate',
      severity: 'info',
      speciesA: guild.anchorSpeciesId,
      labelA: labelFor(guild.anchorSpeciesId),
      rationale: `Dominant root-exudate character across ${matched.length} profiled member(s): ${dom} (${best}/${matched.length}). Signals the rhizosphere microbial bias this guild will tend to recruit.`,
    });
  }

  return findings;
}

/** Run `checkGuild` across many guilds → one flat finding list. */
export function checkGuilds(guilds: Guild[]): SoilWebFinding[] {
  return guilds.flatMap(checkGuild);
}

export type { GuildMember };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run soilFoodWebMath --root apps/web`
Expected: PASS — all describe blocks green (8 assertions across 7 `it`s).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/v3/plan/cards/soil-fertility/soilFoodWebMath.ts" "apps/web/src/v3/plan/cards/soil-fertility/__tests__/soilFoodWebMath.test.ts"
git commit -m "feat(plan): B2 pure soil food-web checker + specs"
```

---

## Task 3: Read-only soil food-web audit card

**Files:**
- Create: `apps/web/src/v3/plan/cards/soil-fertility/SoilFoodWebCard.tsx`

- [ ] **Step 1: Write the card**

```tsx
/**
 * SoilFoodWebCard — Plan Module 5 (Soil Fertility), Sub-project B2.
 *
 * Design-time soil-biology audit over this project's guilds:
 * mycorrhizal-network coherence vs the anchor, dominant root-exudate
 * rollup, and an explicit unverified flag for members with no profile.
 * Pure read — no store writes, no save gate, no goal-tree criterion
 * (mirrors the B1 GuildIntegrity / EdgeConnectivity precedent; B2 has
 * no observation stream to score).
 *
 * Reads:
 *   - `usePolycultureStore.guilds` filtered by `project.id`.
 *   - the static soilBiologyProfiles table (via soilFoodWebMath).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import {
  checkGuilds,
  type SoilWebFinding,
} from './soilFoodWebMath.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SEVERITY_LABEL: Record<SoilWebFinding['severity'], string> = {
  error: 'CONFLICT',
  warning: 'REVIEW',
  info: 'NOTE',
};

export default function SoilFoodWebCard({ project }: Props) {
  const guilds = usePolycultureStore((s) => s.guilds);

  const projectGuilds = useMemo(
    () => guilds.filter((g) => g.projectId === project.id),
    [guilds, project.id],
  );

  const findings = useMemo<SoilWebFinding[]>(
    () => checkGuilds(projectGuilds),
    [projectGuilds],
  );

  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const infos = findings.filter((f) => f.severity === 'info').length;

  const byGuild = useMemo(() => {
    const map = new Map<string, SoilWebFinding[]>();
    for (const f of findings) {
      const arr = map.get(f.guildId) ?? [];
      arr.push(f);
      map.set(f.guildId, arr);
    }
    return map;
  }, [findings]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Soil food-web</h1>
        <p className={styles.lede}>
          A design-time soil-biology read of every guild in this project:
          mycorrhizal-network coherence against the guild anchor, the
          dominant root-exudate character that biases which rhizosphere
          microbes the guild recruits, and an explicit note for any member
          whose soil-biology profile is unavailable. This card never blocks
          a save — it surfaces design signal only, and never silently
          passes an unprofiled species.
        </p>
      </header>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Project rollup</h2>
        <div className={styles.statRow}>
          <span>Guilds audited</span>
          <span>{projectGuilds.length}</span>
        </div>
        <div className={styles.statRow}>
          <span>Mycorrhizal reviews</span>
          <span>{warnings}</span>
        </div>
        <div className={styles.statRow}>
          <span>Notes (exudate / unprofiled)</span>
          <span>{infos}</span>
        </div>
      </div>

      {projectGuilds.length === 0 && (
        <div className={styles.section}>
          <p className={styles.empty}>
            No guilds in this project yet. Compose a guild from the Plant
            Systems tools; this card will read its soil biology as soon as
            it has members.
          </p>
        </div>
      )}

      {projectGuilds.map((g) => {
        const gf = byGuild.get(g.id) ?? [];
        return (
          <div className={styles.section} key={g.id}>
            <h2 className={styles.sectionTitle}>
              {g.name}
              {gf.length === 0 && (
                <span
                  className={`${styles.pill} ${styles.pillMet ?? ''}`}
                  style={{ marginLeft: 8 }}
                >
                  CLEAR
                </span>
              )}
            </h2>
            {gf.length === 0 ? (
              <p className={styles.empty}>
                No mycorrhizal or profile issues detected.
              </p>
            ) : (
              <ul className={styles.list}>
                {gf.map((f, i) => (
                  <li
                    key={`${f.guildId}-${f.kind}-${f.speciesA}-${
                      f.speciesB ?? ''
                    }-${i}`}
                    className={styles.listRow}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong>
                          {f.labelA}
                          {f.labelB ? ` ↔ ${f.labelB}` : ''}
                        </strong>
                        <span
                          className={`${styles.pill} ${
                            f.severity === 'warning'
                              ? (styles.pillUnmet ?? '')
                              : (styles.pill ?? '')
                          }`}
                        >
                          {SEVERITY_LABEL[f.severity]} · {f.kind}
                        </span>
                      </div>
                      <div className={styles.listMeta}>{f.rationale}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `$env:NODE_OPTIONS='--max-old-space-size=8192'; & 'C:\Program Files\nodejs\npx.ps1' --no-install tsc -p apps/web --noEmit`
Expected: No NEW error from `SoilFoodWebCard.tsx` or `soilFoodWebMath.ts`. Only the pre-existing out-of-band errors listed in the command reference remain.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/v3/plan/cards/soil-fertility/SoilFoodWebCard.tsx"
git commit -m "feat(plan): B2 read-only soil food-web audit card"
```

---

## Task 4: Compost-cycle persist slice (TDD)

**Files:**
- Create: `apps/web/src/store/compostCycleStore.ts`
- Test: `apps/web/src/store/__tests__/compostCycleStore.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// @vitest-environment happy-dom
/**
 * compostCycleStore — additive B2 persist slice.
 *
 * Covers: addBatch, updateBatch idempotency on id, removeBatch,
 * per-project isolation, clearProject.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCompostCycleStore,
  type CompostBatch,
} from '../compostCycleStore.js';

function batch(id: string, over: Partial<CompostBatch> = {}): CompostBatch {
  return {
    id,
    method: 'hot',
    startDateISO: '2026-05-01',
    status: 'planned',
    ...over,
  };
}

function reset(): void {
  useCompostCycleStore.setState({ byProject: {} });
}

describe('compostCycleStore', () => {
  beforeEach(reset);

  it('addBatch appends a batch for a project', () => {
    useCompostCycleStore.getState().addBatch('p1', batch('b1'));
    expect(useCompostCycleStore.getState().byProject['p1']).toHaveLength(1);
  });

  it('updateBatch replaces by id and is idempotent on id', () => {
    const { addBatch, updateBatch } = useCompostCycleStore.getState();
    addBatch('p1', batch('b1'));
    addBatch('p1', batch('b2'));
    updateBatch('p1', batch('b1', { method: 'vermicompost' }));
    const list = useCompostCycleStore.getState().byProject['p1']!;
    expect(list).toHaveLength(2);
    expect(list.find((b) => b.id === 'b1')!.method).toBe('vermicompost');
  });

  it('removeBatch drops only the matching id', () => {
    const { addBatch, removeBatch } = useCompostCycleStore.getState();
    addBatch('p1', batch('b1'));
    addBatch('p1', batch('b2'));
    removeBatch('p1', 'b1');
    const list = useCompostCycleStore.getState().byProject['p1']!;
    expect(list.map((b) => b.id)).toEqual(['b2']);
  });

  it('isolates batches per project', () => {
    const { addBatch } = useCompostCycleStore.getState();
    addBatch('p1', batch('b1'));
    addBatch('p2', batch('b2'));
    addBatch('p2', batch('b3'));
    const { byProject } = useCompostCycleStore.getState();
    expect(byProject['p1']!).toHaveLength(1);
    expect(byProject['p2']!).toHaveLength(2);
  });

  it('clearProject removes the project entry entirely', () => {
    const { addBatch, clearProject } = useCompostCycleStore.getState();
    addBatch('p1', batch('b1'));
    clearProject('p1');
    expect(useCompostCycleStore.getState().byProject['p1']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run compostCycleStore --root apps/web`
Expected: FAIL — cannot resolve `../compostCycleStore.js` (module not yet created).

- [ ] **Step 3: Write minimal implementation**

```typescript
/**
 * compostCycleStore — Sub-project B2, compost-cycle designer.
 *
 * A net-new, additive persisted slice (A-series additive covenant: no
 * DB migration, no API endpoint). Deliberately a *separate* store with
 * its own persist key and `version: 1`, NO `temporal`, NO `migrate` —
 * zero risk to the `ogden-compost-inventory` / `ogden-closed-loop`
 * slices it sits beside. CompostCycleCard reads compost-inventory for a
 * display-only context line but never writes across stores.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CompostMethod = 'hot' | 'cold' | 'vermicompost' | 'compost_tea';
export type CompostStatus = 'planned' | 'active' | 'cured';

export interface CompostBatch {
  id: string;
  method: CompostMethod;
  /** ISO date (YYYY-MM-DD) the batch is started / built. */
  startDateISO: string;
  /** Turn cadence in days (hot/cold only); optional. */
  turnEveryDays?: number;
  /** ISO date the batch is expected ready / cured; optional. */
  readyDateISO?: string;
  feedstockNote?: string;
  status: CompostStatus;
}

interface CompostCycleState {
  byProject: Record<string, CompostBatch[]>;
  addBatch: (projectId: string, batch: CompostBatch) => void;
  updateBatch: (projectId: string, batch: CompostBatch) => void;
  removeBatch: (projectId: string, id: string) => void;
  clearProject: (projectId: string) => void;
}

function listFor(
  state: CompostCycleState,
  projectId: string,
): CompostBatch[] {
  return state.byProject[projectId] ?? [];
}

export const useCompostCycleStore = create<CompostCycleState>()(
  persist(
    (set) => ({
      byProject: {},

      addBatch: (projectId, batch) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: [...listFor(s, projectId), batch],
          },
        })),

      updateBatch: (projectId, batch) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: listFor(s, projectId).map((b) =>
              b.id === batch.id ? batch : b,
            ),
          },
        })),

      removeBatch: (projectId, id) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: listFor(s, projectId).filter((b) => b.id !== id),
          },
        })),

      clearProject: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: 'ogden-compost-cycle', version: 1 },
  ),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run compostCycleStore --root apps/web`
Expected: PASS — all 5 `it`s green.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/store/compostCycleStore.ts" "apps/web/src/store/__tests__/compostCycleStore.test.ts"
git commit -m "feat(store): B2 compost-cycle additive persist slice + specs"
```

---

## Task 5: Editable compost-cycle designer card

**Files:**
- Create: `apps/web/src/v3/plan/cards/soil-fertility/CompostCycleCard.tsx`

- [ ] **Step 1: Write the card**

```tsx
/**
 * CompostCycleCard — Plan Module 5 (Soil Fertility), Sub-project B2.
 *
 * Editable compost / vermicompost / compost-tea cycle designer over the
 * additive `compostCycleStore` slice. Rows auto-persist (no save gate,
 * matching the B1 SuccessionPathCard precedent). A method-driven cadence
 * hint and a display-only feedstock-inventory context line (read from
 * compostInventoryStore — no cross-store writes) guide the steward;
 * inline warnings are non-blocking.
 *
 * The read-only closed-loop graph remains the system projection; this
 * card is the editable cycle intent.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useCompostInventoryStore } from '../../../../store/compostInventoryStore.js';
import {
  useCompostCycleStore,
  type CompostBatch,
  type CompostMethod,
} from '../../../../store/compostCycleStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const METHOD_LABEL: Record<CompostMethod, string> = {
  hot: 'Hot (thermophilic)',
  cold: 'Cold (slow)',
  vermicompost: 'Vermicompost',
  compost_tea: 'Compost tea',
};

const METHOD_HINT: Record<CompostMethod, string> = {
  hot: 'Turn ≈ every 7 days; ready ≈ 8 weeks.',
  cold: 'No turning required; ready ≈ 6–12 months.',
  vermicompost: 'No turning; harvest ≈ 12 weeks; keep 15–25 °C.',
  compost_tea: 'Brew 24–48 h with aeration; use within hours.',
};

const METHODS: CompostMethod[] = [
  'hot',
  'cold',
  'vermicompost',
  'compost_tea',
];

function newId(): string {
  return `cb_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CompostCycleCard({ project }: Props) {
  const byProject = useCompostCycleStore((s) => s.byProject);
  const addBatch = useCompostCycleStore((s) => s.addBatch);
  const updateBatch = useCompostCycleStore((s) => s.updateBatch);
  const removeBatch = useCompostCycleStore((s) => s.removeBatch);
  const clearProject = useCompostCycleStore((s) => s.clearProject);

  const inventory = useCompostInventoryStore((s) => s.byProject);

  const batches = byProject[project.id] ?? [];

  const feedstock = useMemo(() => {
    const inv = inventory[project.id] ?? {};
    const ids = Object.keys(inv);
    const totalM3 = Object.values(inv).reduce((a, b) => a + b, 0);
    return { count: ids.length, totalM3 };
  }, [inventory, project.id]);

  const onAdd = () => {
    addBatch(project.id, {
      id: newId(),
      method: 'hot',
      startDateISO: todayISO(),
      status: 'planned',
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Compost cycle</h1>
        <p className={styles.lede}>
          The editable compost, vermicompost, and compost-tea cycle for
          this project: when each batch is built, how often it is turned,
          and when it is expected ready. Edits persist immediately — there
          is no save step. The read-only closed-loop graph remains the
          system projection.
        </p>
      </header>

      <div className={styles.section}>
        <div className={styles.statRow}>
          <span>Feedstock streams inventoried (Greens &amp; browns)</span>
          <span>
            {feedstock.count} · ~{Math.round(feedstock.totalM3)} m³
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <button
            type="button"
            className={styles.pill}
            style={{ cursor: 'pointer' }}
            onClick={onAdd}
          >
            Add batch
          </button>
          {batches.length > 0 && (
            <button
              type="button"
              className={styles.pill}
              style={{ cursor: 'pointer' }}
              onClick={() => clearProject(project.id)}
              title="Clear all compost batches for this project"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {batches.length === 0 && (
        <div className={styles.section}>
          <p className={styles.empty}>
            No compost batches yet. Use “Add batch” to plan a hot,
            cold, vermicompost, or compost-tea cycle.
          </p>
        </div>
      )}

      {batches.map((b) => {
        const readyBeforeStart =
          !!b.readyDateISO &&
          !!b.startDateISO &&
          b.readyDateISO < b.startDateISO;
        const badCadence =
          b.turnEveryDays != null && b.turnEveryDays <= 0;
        const noFeedstock = !b.feedstockNote?.trim();
        const patch = (over: Partial<CompostBatch>) =>
          updateBatch(project.id, { ...b, ...over });
        return (
          <div className={styles.section} key={b.id}>
            <h2 className={styles.sectionTitle}>
              <select
                value={b.method}
                onChange={(e) =>
                  patch({ method: e.target.value as CompostMethod })
                }
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.pill}
                style={{ cursor: 'pointer', marginLeft: 8 }}
                onClick={() => removeBatch(project.id, b.id)}
              >
                Remove
              </button>
            </h2>

            <p className={styles.listMeta}>{METHOD_HINT[b.method]}</p>

            <div className={styles.statRow}>
              <span>Start date</span>
              <input
                type="date"
                value={b.startDateISO}
                onChange={(e) => patch({ startDateISO: e.target.value })}
              />
            </div>
            <div className={styles.statRow}>
              <span>Ready date</span>
              <input
                type="date"
                value={b.readyDateISO ?? ''}
                onChange={(e) =>
                  patch({ readyDateISO: e.target.value || undefined })
                }
              />
            </div>
            <div className={styles.statRow}>
              <span>Turn every (days)</span>
              <input
                type="number"
                min={1}
                value={b.turnEveryDays ?? ''}
                onChange={(e) =>
                  patch({
                    turnEveryDays: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                style={{ width: 80 }}
              />
            </div>
            <div className={styles.statRow}>
              <span>Status</span>
              <select
                value={b.status}
                onChange={(e) =>
                  patch({
                    status: e.target.value as CompostBatch['status'],
                  })
                }
              >
                <option value="planned">planned</option>
                <option value="active">active</option>
                <option value="cured">cured</option>
              </select>
            </div>
            <div className={styles.statRow}>
              <span>Feedstock note</span>
              <input
                type="text"
                value={b.feedstockNote ?? ''}
                onChange={(e) =>
                  patch({ feedstockNote: e.target.value || undefined })
                }
                placeholder="e.g. 2:1 browns:greens, manure"
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>

            {(readyBeforeStart || badCadence || noFeedstock) && (
              <ul className={styles.list}>
                {readyBeforeStart && (
                  <li className={styles.listRow}>
                    <span
                      className={`${styles.pill} ${styles.pillUnmet ?? ''}`}
                    >
                      ready date is before start date
                    </span>
                  </li>
                )}
                {badCadence && (
                  <li className={styles.listRow}>
                    <span
                      className={`${styles.pill} ${styles.pillUnmet ?? ''}`}
                    >
                      turn cadence must be ≥ 1 day
                    </span>
                  </li>
                )}
                {noFeedstock && (
                  <li className={styles.listRow}>
                    <span className={styles.pill}>
                      no feedstock note — C:N balance unrecorded
                    </span>
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `$env:NODE_OPTIONS='--max-old-space-size=8192'; & 'C:\Program Files\nodejs\npx.ps1' --no-install tsc -p apps/web --noEmit`
Expected: No NEW error from `CompostCycleCard.tsx`. Only the pre-existing out-of-band errors remain.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/v3/plan/cards/soil-fertility/CompostCycleCard.tsx"
git commit -m "feat(plan): B2 editable compost-cycle designer card"
```

---

## Task 6: Register both cards (append-only, 2 files)

**Files:**
- Modify: `apps/web/src/v3/plan/types.ts` (the `MODULE_CARDS['soil-fertility']` array — entries currently end with `{ label: 'Soil-building plan', sectionId: 'plan-soil-building-plan' }`)
- Modify: `apps/web/src/v3/plan/PlanModuleSlideUp.tsx`

- [ ] **Step 1: Append the two card entries in `types.ts`**

Find this exact block inside `MODULE_CARDS`:

```typescript
    { label: 'Greens & browns', sectionId: 'plan-soil-resources' },
    { label: 'Soil-building plan', sectionId: 'plan-soil-building-plan' },
  ],
```

Replace it with:

```typescript
    { label: 'Greens & browns', sectionId: 'plan-soil-resources' },
    { label: 'Soil-building plan', sectionId: 'plan-soil-building-plan' },
    { label: 'Soil food-web', sectionId: 'plan-soil-foodweb' },
    { label: 'Compost cycle', sectionId: 'plan-compost-cycle' },
  ],
```

- [ ] **Step 2: Add the two lazy imports in `PlanModuleSlideUp.tsx`**

Find this exact line:

```typescript
const FertilityColocationCard = lazy(() => import('./cards/soil-fertility/FertilityColocationCard.js'));
```

Add immediately after it:

```typescript
const SoilFoodWebCard         = lazy(() => import('./cards/soil-fertility/SoilFoodWebCard.js'));
const CompostCycleCard        = lazy(() => import('./cards/soil-fertility/CompostCycleCard.js'));
```

- [ ] **Step 3: Add the two switch cases in `PlanModuleSlideUp.tsx`**

Find this exact line:

```typescript
    case 'plan-fertility-colocation': return <FertilityColocationCard project={project} onSwitchToMap={noop} />;
```

Add immediately after it:

```typescript
    case 'plan-soil-foodweb':        return <SoilFoodWebCard project={project} onSwitchToMap={noop} />;
    case 'plan-compost-cycle':       return <CompostCycleCard project={project} onSwitchToMap={noop} />;
```

- [ ] **Step 4: Bump the card-count comment if one exists**

Run: `node node_modules/vitest/vitest.mjs --version` is NOT needed here — instead grep the file for a card-count comment:
Search `PlanModuleSlideUp.tsx` for a comment containing a card count near the lazy-import block (the B1 slice bumped it from "16" to "18"). If such a numeric comment exists, increase it by 2. If no such comment exists, skip this step (do not invent one).

- [ ] **Step 5: Typecheck — confirms the inert `Record<PlanModule,_>` maps too**

Run: `$env:NODE_OPTIONS='--max-old-space-size=8192'; & 'C:\Program Files\nodejs\npx.ps1' --no-install tsc -p apps/web --noEmit`
Expected: No NEW error. `soil-fertility` is already a `PlanModule` member, so no union/exhaustiveness change is required and the maps stay inert.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/v3/plan/types.ts" "apps/web/src/v3/plan/PlanModuleSlideUp.tsx"
git commit -m "feat(plan): register B2 soil food-web + compost cycle cards"
```

---

## Task 7: Full verification gate

- [ ] **Step 1: Run both B2 spec files together**

Run: `node node_modules/vitest/vitest.mjs run soilFoodWebMath compostCycleStore --root apps/web`
Expected: PASS — soilFoodWebMath (7 `it`s) + compostCycleStore (5 `it`s) all green.

- [ ] **Step 2: Typecheck apps/web**

Run: `$env:NODE_OPTIONS='--max-old-space-size=8192'; & 'C:\Program Files\nodejs\npx.ps1' --no-install tsc -p apps/web --noEmit`
Expected: Only the pre-existing out-of-band errors (`useFlowEndpointOptions*`, `workItemStore*`). Zero errors originating from any B2 file.

- [ ] **Step 3: Typecheck packages/shared (confirm no transitive break)**

Run: `$env:NODE_OPTIONS='--max-old-space-size=8192'; & 'C:\Program Files\nodejs\npx.ps1' --no-install tsc -p packages/shared --noEmit`
Expected: exit 0 (shared untouched by B2).

- [ ] **Step 4: Confirm no stray changes staged**

Run: `git status --porcelain`
Expected: only the 7 B2 files + 2 modified registration files committed across Tasks 1–6; no out-of-band D0 files (`workItemStore*`, `workItem.schema.ts`, `*LogStore`, `syncManifest.ts`, run5 doc) staged or committed. If any appear, do NOT commit them — they are someone else's uncommitted work.

> Cards are plain React behind module nav (Plan → Soil Fertility → Soil
> food-web / Compost cycle) requiring a project with guilds and a deep
> nav path. Per the screenshot-honesty rule, do not claim a browser
> screenshot you cannot honestly produce — the vitest + tsc gates above
> are the authoritative verification.

---

## Self-Review

**Spec coverage:**
- Card A pure module + static lookup + read-only card → Tasks 1–3 ✓
- Card B isolated persist slice (key `ogden-compost-cycle`, v1, no temporal/migrate) + editable card → Tasks 4–5 ✓
- 2-file append-only registration, no `PlanModule` union change → Task 6 ✓
- No goal-tree criterion (B1 precedent) → no `goalTreeTemplates.ts` task; consistent with spec ✓
- Two-tier `resolveProfile` + explicit `unmatched` info (never false all-clear) → Task 2 impl + test ✓
- Display-only compost-inventory C:N context line, no cross-store write → Task 5 (`feedstock` useMemo reads `useCompostInventoryStore`, never writes) ✓
- Non-blocking inline warnings (ready-before-start, bad cadence, no feedstock) → Task 5 ✓
- Verification: vitest + tsc web & shared, screenshot-honesty → Task 7 ✓

**Placeholder scan:** No "TBD"/"TODO"/"similar to". The only conditional step is Task 6 Step 4 (card-count comment) — gated on "if one exists", with an explicit "skip, do not invent" branch, which is a real instruction not a placeholder.

**Type consistency:** `SoilWebFinding`/`SoilWebFindingKind`/`resolveProfile`/`checkGuild`/`checkGuilds`/`labelFor` are defined in Task 2 and consumed identically in Task 3. `CompostBatch`/`CompostMethod`/`CompostStatus`/`addBatch`/`updateBatch`/`removeBatch`/`clearProject` are defined in Task 4 and consumed identically in Task 5's `CompostCycleCard`. `ExudateClass`/`MycorrhizaType`/`SoilBiologyProfile`/`SOIL_BIOLOGY_PROFILES` defined in Task 1, imported in Task 2. Section IDs `plan-soil-foodweb`/`plan-compost-cycle` match between Task 6 `types.ts` entries and switch cases. No drift.
