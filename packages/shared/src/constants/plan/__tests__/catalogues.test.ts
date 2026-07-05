import { describe, it, expect } from 'vitest';
import {
  PlanStratumObjectiveSchema,
  PlanDecisionChecklistItemSchema,
  PatchRecordSchema,
  type PlanStratumObjective,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import {
  UNIVERSAL_PLAN_OBJECTIVES,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  ECOVILLAGE_PRIMARY_OBJECTIVES,
  AGRITOURISM_PRIMARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
  WELLNESS_PRIMARY_OBJECTIVES,
  WELLNESS_SECONDARY_OBJECTIVES,
  SILVOPASTURE_PRIMARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_PATCHES,
  ORCHARD_PRIMARY_OBJECTIVES,
  ORCHARD_SECONDARY_OBJECTIVES,
  ORCHARD_SECONDARY_PATCHES,
  NURSERY_SECONDARY_OBJECTIVES,
  HOMESTEAD_PRIMARY_OBJECTIVES,
  EDUCATION_PRIMARY_OBJECTIVES,
  CONSERVATION_PRIMARY_OBJECTIVES,
  MARKET_GARDEN_PRIMARY_OBJECTIVES,
  OFF_GRID_PRIMARY_OBJECTIVES,
  LIVESTOCK_PRIMARY_OBJECTIVES,
  LIVESTOCK_SECONDARY_OBJECTIVES,
  LIVESTOCK_SECONDARY_PATCHES,
  STRATUM_PREREQS,
} from '../catalogues/index.js';
import {
  resolveProjectObjectives,
  findPlanStratumObjectiveIn,
} from '../../../relationships/resolveProjectObjectives.js';
import { UNIVERSAL_DOMAINS } from '../../universalDomain.js';
import { detectCovenantBanned } from '../../covenant/bannedTerms.js';

const ALL_AUTHORED: readonly PlanStratumObjective[] = [
  ...UNIVERSAL_PLAN_OBJECTIVES,
  ...REGEN_FARM_PRIMARY_OBJECTIVES,
  ...ECOVILLAGE_PRIMARY_OBJECTIVES,
  ...AGRITOURISM_PRIMARY_OBJECTIVES,
  ...RESIDENTIAL_ADDITIVE_OBJECTIVES,
  ...WELLNESS_PRIMARY_OBJECTIVES,
  ...WELLNESS_SECONDARY_OBJECTIVES,
  ...NURSERY_SECONDARY_OBJECTIVES,
  ...SILVOPASTURE_PRIMARY_OBJECTIVES,
  ...SILVOPASTURE_SECONDARY_OBJECTIVES,
  ...ORCHARD_PRIMARY_OBJECTIVES,
  ...ORCHARD_SECONDARY_OBJECTIVES,
  ...HOMESTEAD_PRIMARY_OBJECTIVES,
  ...EDUCATION_PRIMARY_OBJECTIVES,
  ...CONSERVATION_PRIMARY_OBJECTIVES,
  ...MARKET_GARDEN_PRIMARY_OBJECTIVES,
  ...OFF_GRID_PRIMARY_OBJECTIVES,
  ...LIVESTOCK_PRIMARY_OBJECTIVES,
  ...LIVESTOCK_SECONDARY_OBJECTIVES,
];

const OBJECTIVE_REF = /^(U|RF|RES|EV|AG|WELL|SILV|ORCH|NRS|HMS|EDU|CON|MGD|OFG|LVS)-S[1-7]\.\d+$/;

const PATCH_REF = /^(RES|SILV|ORCH|LVS)>(U|RF)-S[1-7]\.\d+$/;

describe('catalogue conformance - schema validity', () => {
  it('every authored objective parses via PlanStratumObjectiveSchema', () => {
    for (const o of ALL_AUTHORED) {
      // .parse throws a descriptive ZodError naming the offending objective.
      expect(() => PlanStratumObjectiveSchema.parse(o), o.id).not.toThrow();
    }
  });

  it('every residential patch parses via PatchRecordSchema', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      expect(() => PatchRecordSchema.parse(p), p.ref).not.toThrow();
    }
  });

  // Tier-2 (Stratum-3) restructure 2026-06-16: the four new optional objective
  // fields (intentLens / observeOutput / buildsOnDisplay / excludedFromResolution)
  // must round-trip through the schema when set AND be absent when omitted, so
  // every pre-existing catalogue/skeleton object validates unchanged.
  describe('reception display fields round-trip', () => {
    const hydro = UNIVERSAL_PLAN_OBJECTIVES.find((o) => o.id === 's3-hydrology');

    it('preserves intentLens / observeOutput / buildsOnDisplay / excludedFromResolution + Mode-4 fields when set', () => {
      // s3-hydrology already carries the three display fields (authored in 1B);
      // add the resolution flag plus the two Mode-4 design fields (2026-06-17)
      // to exercise all six on one object.
      // Threshold-2 tighten (2026-06-18): indicators are >=2 { metric, frequency }
      // pairs and feeds is a UniversalDomain enum id (not free text).
      const withAll = {
        ...hydro!,
        excludedFromResolution: true,
        monitoringProtocol: {
          indicators: [
            { metric: 'Water table depth', frequency: 'monthly' },
            { metric: 'Storage drawdown rate', frequency: 'per cycle' },
          ],
          triggers: ['Drawdown exceeds recharge for two cycles'],
          feeds: 'hydrology',
        },
        planningDirectionMandate:
          'Carries the approved water direction; raises any water conditional for closure downstream.',
        // Mode-5 Launch Preparation (Tier 6, 2026-06-18): >=2 { metric, cadence }
        // execution milestones, DISPLAY-ONLY, no Observe `feeds`.
        progressTracking: {
          milestones: [
            { metric: 'Phase-1 tasks complete vs plan', cadence: 'weekly' },
            { metric: 'Capital spent vs budget', cadence: 'monthly' },
          ],
        },
      };
      const parsed = PlanStratumObjectiveSchema.parse(withAll);
      expect(parsed.intentLens?.length ?? 0).toBeGreaterThan(0);
      expect(parsed.intentLens?.every((row) => !!row.typeId && !!row.text)).toBe(
        true,
      );
      expect(typeof parsed.observeOutput).toBe('string');
      expect(typeof parsed.buildsOnDisplay).toBe('string');
      expect(parsed.excludedFromResolution).toBe(true);
      expect(parsed.monitoringProtocol?.indicators.length).toBe(2);
      expect(parsed.monitoringProtocol?.indicators[0]).toEqual({
        metric: 'Water table depth',
        frequency: 'monthly',
      });
      expect(parsed.monitoringProtocol?.triggers.length).toBe(1);
      expect(parsed.monitoringProtocol?.feeds).toBe('hydrology');
      expect(typeof parsed.planningDirectionMandate).toBe('string');
      expect(parsed.progressTracking?.milestones.length).toBe(2);
      expect(parsed.progressTracking?.milestones[0]).toEqual({
        metric: 'Phase-1 tasks complete vs plan',
        cadence: 'weekly',
      });
    });

    it('leaves all seven optional fields undefined when omitted (legacy objectives unchanged)', () => {
      const vision = UNIVERSAL_PLAN_OBJECTIVES.find((o) => o.id === 's1-vision');
      const parsed = PlanStratumObjectiveSchema.parse(vision!);
      expect(parsed.intentLens).toBeUndefined();
      expect(parsed.observeOutput).toBeUndefined();
      expect(parsed.buildsOnDisplay).toBeUndefined();
      expect(parsed.excludedFromResolution).toBeUndefined();
      expect(parsed.monitoringProtocol).toBeUndefined();
      expect(parsed.planningDirectionMandate).toBeUndefined();
      expect(parsed.progressTracking).toBeUndefined();
    });
  });

  // 2026-06-17 Mode-4 restructure: old objective 3.1 ('s4-direction') is retired
  // (Threshold 1 now performs that synthesis). It must stay DEFINED but excluded,
  // and must be dropped from the S5 prereq gate (an excluded objective never
  // resolves -- gating S5 on it would dangle).
  describe('Mode-4 restructure - s4-direction retire + S5 gate rewire', () => {
    it('s4-direction is defined but excludedFromResolution', () => {
      const dir = UNIVERSAL_PLAN_OBJECTIVES.find((o) => o.id === 's4-direction');
      expect(dir, 's4-direction must remain authored (references stay valid)').toBeDefined();
      expect(dir!.excludedFromResolution).toBe(true);
    });

    it('the S5 gate no longer references s4-direction', () => {
      const gate = STRATUM_PREREQS['s5-system-design'];
      expect(gate).not.toContain('s4-direction');
      expect(gate).toEqual(['s4-water-strategy', 's4-zones']);
    });

    it('a Regen+Residential+Silvopasture resolve omits s4-direction from s4', () => {
      const r = resolveProjectObjectives({
        primaryTypeId: 'regenerative_farm',
        secondaryTypeIds: ['residential', 'silvopasture'],
      });
      const s4Ids = r.objectives
        .filter((o) => o.stratumId === 's4-foundation-decisions')
        .map((o) => o.id);
      expect(s4Ids).not.toContain('s4-direction');
    });
  });
});

describe('catalogue conformance - Mode-4 design fields (s4 / Tier 3)', () => {
  // 2026-06-17 Mode-4 restructure: every resolving s4-foundation-decisions
  // objective gains a DISPLAY-ONLY monitoringProtocol (Key Indicators / Response
  // Triggers / Feeds) -- the design input to the Observe stage. The 7 spec config
  // objectives carry the verbatim spec copy; silv-sec-s4-stock-infrastructure
  // additionally RAISES the Silvopasture water conditional via a
  // planningDirectionMandate (display-only, never a gate). The canonical config
  // is the resolution target: Regen (primary) + Residential + Silvopasture.
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential', 'silvopasture'],
  });

  // The spec's 7 Tier-3 config objectives (3.1-3.7).
  const CONFIG_S4_IDS = [
    's4-water-strategy',
    's4-zones',
    'rf-s4-fertility-strategy',
    'rf-s4-biodiversity-strategy',
    'silv-sec-s4-stock-infrastructure',
    'silv-sec-s4-grazing-design',
    'res-s4-living-zone',
  ];

  it('every spec config s4 objective carries a non-empty monitoringProtocol', () => {
    for (const id of CONFIG_S4_IDS) {
      const o = findPlanStratumObjectiveIn(objectives, id);
      expect(o, id).toBeDefined();
      const mp = o!.monitoringProtocol;
      expect(mp, `${id} monitoringProtocol`).toBeDefined();
      expect(mp!.indicators.length, `${id} indicators`).toBeGreaterThan(0);
      expect(mp!.triggers.length, `${id} triggers`).toBeGreaterThan(0);
      expect(mp!.feeds.trim().length, `${id} feeds`).toBeGreaterThan(0);
    }
  });

  it('every resolving s4 objective carries a monitoringProtocol (s4-direction excluded)', () => {
    const s4 = objectives.filter(
      (o) => o.stratumId === 's4-foundation-decisions',
    );
    expect(s4.length).toBeGreaterThan(0);
    for (const o of s4) {
      const mp = o.monitoringProtocol;
      expect(mp, o.id).toBeDefined();
      expect(mp!.indicators.length, o.id).toBeGreaterThan(0);
      expect(mp!.triggers.length, o.id).toBeGreaterThan(0);
      expect(mp!.feeds.trim().length, o.id).toBeGreaterThan(0);
    }
    // s4-direction is excludedFromResolution -> never reaches the resolved spine.
    expect(s4.map((o) => o.id)).not.toContain('s4-direction');
  });

  it('silv-sec-s4-stock-infrastructure raises the Silvopasture water conditional (display-only mandate)', () => {
    const stock = findPlanStratumObjectiveIn(
      objectives,
      'silv-sec-s4-stock-infrastructure',
    );
    expect(stock).toBeDefined();
    expect(typeof stock!.planningDirectionMandate).toBe('string');
    expect(stock!.planningDirectionMandate!.trim().length).toBeGreaterThan(0);
    // prereqs stay universal-ids-only: the mandate must NOT have become a gate.
    expect(stock!.prerequisiteObjectiveIds ?? []).not.toContain(
      's4-water-strategy',
    );
  });

  it('Amanah: monitoringProtocol + planningDirectionMandate copy is covenant-clean across ALL authored s4 objectives', () => {
    // Scan ONLY the two new Mode-4 fields -- NOT scopeNotes, which legitimately
    // DOCUMENTS the prohibition using banned words (e.g. ag-s4-revenue-model's
    // membership-benefit scope note names "advance sale" / "CSA" to forbid them).
    // Full union (hard-ban + conditional) via the shared covenant source: active
    // authored copy admits NEITHER tier -- only a forbidding scopeNote may name a
    // term, and scopeNotes are deliberately excluded from this scan (see above).
    const s4Authored = ALL_AUTHORED.filter(
      (o) => o.stratumId === 's4-foundation-decisions',
    );
    const strings: string[] = [];
    for (const o of s4Authored) {
      const mp = o.monitoringProtocol;
      if (mp) {
        // Threshold-2 tighten: indicators are now { metric, frequency } objects;
        // scan BOTH nested strings (a banned term could hide in either).
        for (const ind of mp.indicators) strings.push(ind.metric, ind.frequency);
        strings.push(...mp.triggers, mp.feeds);
      }
      if (o.planningDirectionMandate) strings.push(o.planningDirectionMandate);
    }
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) {
      expect(detectCovenantBanned(s), s).toBe(false);
    }
  });
});

describe('catalogue conformance - Mode-4 design fields (s5 / Tier 4)', () => {
  // 2026-06-17 Mode-4 restructure (Tier 4 - System Design): every resolving
  // s5-system-design objective gains a DISPLAY-ONLY monitoringProtocol plus a
  // buildsOnDisplay lineage line ("Builds on 3.x"). The 7 spec config objectives
  // carry the verbatim spec copy; s5-water-infrastructure additionally CLOSES the
  // Silvopasture water conditional via a planningDirectionMandate (display-only,
  // never a gate). Canonical config: Regen (primary) + Residential + Silvopasture.
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential', 'silvopasture'],
  });

  // The spec's 7 Tier-4 config objectives (4.1-4.7).
  const CONFIG_S5_IDS = [
    's5-access',
    's5-water-infrastructure',
    's5-soil-improvement',
    'rf-s5-fertility-system',
    'rf-s5-windbreaks',
    'silv-sec-s5-tree-establishment',
    'res-s5-living-infrastructure',
  ];

  it('every spec config s5 objective carries a non-empty monitoringProtocol + buildsOnDisplay', () => {
    for (const id of CONFIG_S5_IDS) {
      const o = findPlanStratumObjectiveIn(objectives, id);
      expect(o, id).toBeDefined();
      const mp = o!.monitoringProtocol;
      expect(mp, `${id} monitoringProtocol`).toBeDefined();
      expect(mp!.indicators.length, `${id} indicators`).toBeGreaterThan(0);
      expect(mp!.triggers.length, `${id} triggers`).toBeGreaterThan(0);
      expect(mp!.feeds.trim().length, `${id} feeds`).toBeGreaterThan(0);
      expect(o!.buildsOnDisplay?.trim().length, `${id} buildsOnDisplay`).toBeGreaterThan(0);
    }
  });

  it('every authored s5-system-design objective carries a monitoringProtocol (all project types)', () => {
    // Covers all 61 s5 objectives across all 15 catalogues, not just the config
    // subset -- no s5 objective is excludedFromResolution, so every one resolves.
    const s5 = ALL_AUTHORED.filter((o) => o.stratumId === 's5-system-design');
    expect(s5.length).toBeGreaterThan(0);
    for (const o of s5) {
      const mp = o.monitoringProtocol;
      expect(mp, o.id).toBeDefined();
      expect(mp!.indicators.length, o.id).toBeGreaterThan(0);
      expect(mp!.triggers.length, o.id).toBeGreaterThan(0);
      expect(mp!.feeds.trim().length, o.id).toBeGreaterThan(0);
    }
  });

  it('s5-water-infrastructure CLOSES the Silvopasture water conditional (display-only mandate)', () => {
    const water = findPlanStratumObjectiveIn(objectives, 's5-water-infrastructure');
    expect(water).toBeDefined();
    const mandate = water!.planningDirectionMandate;
    expect(typeof mandate).toBe('string');
    expect(mandate!.trim().length).toBeGreaterThan(0);
    // The copy narrates closure of the conditional raised at Stratum 4.
    expect(/clos/i.test(mandate!), mandate).toBe(true);
    // Display-only: the conditional source must NOT have become a hard prereq.
    expect(water!.prerequisiteObjectiveIds ?? []).not.toContain(
      'silv-sec-s4-stock-infrastructure',
    );
  });

  it('the RES>U-S5.1 residential access patch resolves, matches the ref format, and injects a group', () => {
    const patch = RESIDENTIAL_PATCHES.find((p) => p.ref === 'RES>U-S5.1');
    expect(patch, 'RES>U-S5.1 patch').toBeDefined();
    expect(patch!.ref).toMatch(PATCH_REF);
    expect(patch!.targetObjectiveId).toBe('s5-access');
    expect(patch!.injectedItems.length).toBeGreaterThan(0);
    expect(patch!.injectedGroups.length).toBeGreaterThan(0);
    for (const item of patch!.injectedItems) {
      expect(item.id, item.id).toMatch(/^s5-access-pres-\d+$/);
    }
  });

  it('Amanah: monitoringProtocol + buildsOnDisplay + planningDirectionMandate copy is covenant-clean across ALL authored s5 objectives', () => {
    // Full union (hard-ban + conditional) via the shared covenant source.
    const s5Authored = ALL_AUTHORED.filter(
      (o) => o.stratumId === 's5-system-design',
    );
    const strings: string[] = [];
    for (const o of s5Authored) {
      const mp = o.monitoringProtocol;
      if (mp) {
        // Threshold-2 tighten: indicators are now { metric, frequency } objects.
        for (const ind of mp.indicators) strings.push(ind.metric, ind.frequency);
        strings.push(...mp.triggers, mp.feeds);
      }
      if (o.buildsOnDisplay) strings.push(o.buildsOnDisplay);
      if (o.planningDirectionMandate) strings.push(o.planningDirectionMandate);
    }
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) {
      expect(detectCovenantBanned(s), s).toBe(false);
    }
  });
});

describe('catalogue conformance - Mode-4 monitoringProtocol tightened shape (Threshold 2, Section C)', () => {
  // 2026-06-18 Threshold-2 (Coherence Check, Section C) schema tighten: the
  // shipped Mode-4 sweep distributed a DISPLAY-ONLY monitoringProtocol onto every
  // resolving s4 + s5 objective. Section C enforces the spec letter, so the field
  // is now: indicators = >=2 { metric, frequency } pairs (structured measurement
  // cadence) and feeds = a UniversalDomain enum id (the named Observe-stage
  // destination), never a free-text label. This pins the migrated shape across
  // EVERY authored protocol so a future authoring slip fails loudly. The schema
  // makes the runtime audit a presence/coverage check -- still NEVER a gate.
  const WITH_PROTOCOL = ALL_AUTHORED.filter((o) => o.monitoringProtocol != null);

  it('covers the full migrated set (>=120 authored protocols)', () => {
    // Guards against a catalogue silently dropping its protocols in a future edit.
    expect(WITH_PROTOCOL.length).toBeGreaterThanOrEqual(120);
  });

  it('every protocol carries >=2 { metric, frequency } indicators with non-empty text', () => {
    for (const o of WITH_PROTOCOL) {
      const mp = o.monitoringProtocol!;
      expect(mp.indicators.length, `${o.id} indicators`).toBeGreaterThanOrEqual(2);
      for (const ind of mp.indicators) {
        expect(ind.metric.trim().length, `${o.id} metric`).toBeGreaterThan(0);
        expect(ind.frequency.trim().length, `${o.id} frequency`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it('every protocol carries >=1 response trigger', () => {
    for (const o of WITH_PROTOCOL) {
      expect(
        o.monitoringProtocol!.triggers.length,
        o.id,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('every feeds is a valid UniversalDomain id (no free-text label survived migration)', () => {
    for (const o of WITH_PROTOCOL) {
      const feeds = o.monitoringProtocol!.feeds;
      expect(
        UNIVERSAL_DOMAINS.includes(feeds),
        `${o.id} feeds=${feeds}`,
      ).toBe(true);
    }
  });

  it('Amanah: every indicator metric + frequency across ALL protocols is covenant-clean', () => {
    // Section C nests authored copy inside indicators[].{metric,frequency}; the
    // banned-term scan must reach that new nesting (the s4/s5 scans above now do
    // too). Covers the whole migrated set, not just the resolved canonical config.
    const strings: string[] = [];
    for (const o of WITH_PROTOCOL) {
      for (const ind of o.monitoringProtocol!.indicators) {
        strings.push(ind.metric, ind.frequency);
      }
    }
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) {
      expect(detectCovenantBanned(s), s).toBe(false);
    }
  });
});

describe('catalogue conformance - Mode-5 progressTracking sweep (Tier 6 / Launch Preparation)', () => {
  // 2026-06-18 Tier-6 restructure (Launch Preparation): every resolving
  // s7-phasing-resourcing objective gains a DISPLAY-ONLY progressTracking field
  // (project-management milestones: milestone-vs-plan / expenditure-vs-budget /
  // capacity-deployment cadence). It is distinct from monitoringProtocol -- it has
  // NO Observe `feeds` destination (progress tracking is PM bookkeeping, not an
  // Observe-stage design input) -- and like every other display field it NEVER
  // gates. The 5 reference objectives carry the verbatim spec copy; the other 43
  // are derived faithfully from each objective's own checklist / completionGate /
  // focusedQuestion (the Mode-4 derivation method). This pins the full 48-objective
  // sweep so a future authoring slip (a dropped or single-milestone field) fails
  // loudly.
  const S7 = ALL_AUTHORED.filter(
    (o) => o.stratumId === 's7-phasing-resourcing',
  );

  it('covers every resolving s7 objective (the full 48-objective census)', () => {
    expect(S7.length).toBe(48);
    for (const o of S7) {
      // No s7 objective is excludedFromResolution -- every one resolves.
      expect(o.excludedFromResolution ?? false, o.id).toBe(false);
    }
  });

  it('every s7 objective carries >=2 progressTracking milestones with non-empty metric + cadence', () => {
    for (const o of S7) {
      const pt = o.progressTracking;
      expect(pt, `${o.id} progressTracking`).toBeDefined();
      expect(pt!.milestones.length, `${o.id} milestones`).toBeGreaterThanOrEqual(
        2,
      );
      for (const m of pt!.milestones) {
        expect(m.metric.trim().length, `${o.id} metric`).toBeGreaterThan(0);
        expect(m.cadence.trim().length, `${o.id} cadence`).toBeGreaterThan(0);
      }
    }
  });

  it('progressTracking carries no Observe feeds (it is PM bookkeeping, not an Observe input)', () => {
    // Distinct from monitoringProtocol: the schema has no `feeds` key on
    // progressTracking. This guards against a future authoring slip that conflates
    // the two display fields.
    for (const o of S7) {
      expect(
        (o.progressTracking as Record<string, unknown>).feeds,
        o.id,
      ).toBeUndefined();
    }
  });

  it('Amanah: every milestone metric + cadence across ALL s7 objectives is covenant-clean', () => {
    // The Tier-6 sweep nests authored copy inside progressTracking.milestones[].
    // {metric,cadence}; the banned-term scan must reach that new nesting. Covers
    // the whole authored s7 set (the Amanah-sensitive financial / marketing
    // objectives -- ev-s7-financial-plan, ag-s7-booking-system, lvs-s7-marketing --
    // are deliberately framed with no advance-sale / subscription / yield-share
    // wording in their progress milestones).
    const strings: string[] = [];
    for (const o of S7) {
      for (const m of o.progressTracking!.milestones) {
        strings.push(m.metric, m.cadence);
      }
    }
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) {
      expect(detectCovenantBanned(s), s).toBe(false);
    }
  });
});

describe('catalogue conformance - Tier-1 (Stratum-2) Land-Reading reception fields', () => {
  // The 2026-06-16 Tier-1 (Stratum-2) restructure reframed the six s2-* Land-
  // Reading objectives as a reception tier: each gains a reception-register
  // focusedQuestion, a per-type intentLens, and an observeOutput survey record.
  // buildsOnDisplay is deliberately omitted (there is no prior reception tier;
  // the Tier-0 connection rides the intent lens). 1.1-1.4 are universal (farm +
  // silvopasture + residential lenses); 1.5-1.6 are the regen primary (farm +
  // silvopasture lenses, NO residential per the spec).
  const findAuthored = (id: string): PlanStratumObjective | undefined =>
    [...UNIVERSAL_PLAN_OBJECTIVES, ...REGEN_FARM_PRIMARY_OBJECTIVES].find(
      (o) => o.id === id,
    );

  const EXPECTED_LENS: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['s2-terrain', ['regenerative_farm', 'silvopasture', 'residential']],
    ['s2-climate', ['regenerative_farm', 'silvopasture', 'residential']],
    ['s2-ecology', ['regenerative_farm', 'silvopasture', 'residential']],
    ['s2-infrastructure', ['regenerative_farm', 'silvopasture', 'residential']],
    ['rf-s2-land-health', ['regenerative_farm', 'silvopasture']],
    ['rf-s2-landscape-context', ['regenerative_farm', 'silvopasture']],
  ];

  it('all six carry observeOutput + the spec per-type intentLens, buildsOnDisplay omitted', () => {
    for (const [id, expectedTypes] of EXPECTED_LENS) {
      const o = findAuthored(id);
      expect(o, id).toBeDefined();
      expect(o!.stratumId, id).toBe('s2-land-reading');
      expect(typeof o!.observeOutput, id).toBe('string');
      expect(o!.observeOutput!.length, id).toBeGreaterThan(0);
      expect(o!.buildsOnDisplay, id).toBeUndefined();
      const lensTypes = (o!.intentLens ?? []).map((row) => row.typeId);
      expect(new Set(lensTypes), id).toEqual(new Set(expectedTypes));
      expect(lensTypes.length, id).toBe(expectedTypes.length);
      for (const row of o!.intentLens ?? []) {
        expect(row.text.trim().length, `${id} ${row.typeId}`).toBeGreaterThan(0);
      }
    }
  });

  it('round-trips the reception display fields through the schema on s2-terrain (1.1)', () => {
    const terrain = findAuthored('s2-terrain');
    const parsed = PlanStratumObjectiveSchema.parse(terrain!);
    expect(parsed.intentLens?.length).toBe(3);
    expect(
      parsed.intentLens?.every((row) => !!row.typeId && !!row.text),
    ).toBe(true);
    expect(typeof parsed.observeOutput).toBe('string');
    expect(parsed.buildsOnDisplay).toBeUndefined();
    expect(parsed.excludedFromResolution).toBeUndefined();
  });

  it('Amanah: no advance-sale / subscription / yield-share wording across the resolved set + new patches', () => {
    // Tier 1 is pure observation of existing land + assets - no capital surface.
    // Pin the resolved canonical triad's s2-land-reading objectives (base copy +
    // silvopasture/residential injected items, gate amendments, scope notes) and
    // the authored S2 patch strings against advance-sale / CSA / CSRA / salam.
    const r = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['residential', 'silvopasture'],
    });
    const strings: string[] = [];
    for (const o of r.objectives.filter(
      (x) => x.stratumId === 's2-land-reading',
    )) {
      strings.push(o.title, o.focusedQuestion);
      if (o.completionGate) strings.push(o.completionGate);
      if (o.actHandoff) strings.push(o.actHandoff);
      if (o.observeOutput) strings.push(o.observeOutput);
      if (o.scopeNotes) strings.push(o.scopeNotes);
      for (const row of o.intentLens ?? []) strings.push(row.text);
      for (const c of o.checklist) strings.push(c.label);
    }
    const s2Patches = [
      ...SILVOPASTURE_SECONDARY_PATCHES,
      ...RESIDENTIAL_PATCHES,
    ].filter((p) => /S2\.\d/.test(p.ref ?? ''));
    for (const p of s2Patches) {
      for (const item of p.injectedItems) strings.push(item.label);
      if (p.completionGateAmendment) strings.push(p.completionGateAmendment);
      if (p.scopeNote) strings.push(p.scopeNote);
    }
    expect(strings.length).toBeGreaterThan(0);
    for (const s of strings) {
      expect(detectCovenantBanned(s), s).toBe(false);
    }
  });
});

describe('catalogue conformance - authoring rubric (Standards v1.4)', () => {
  it('every objective has 5-15 checklist items', () => {
    for (const o of ALL_AUTHORED) {
      expect(o.checklist.length, o.id).toBeGreaterThanOrEqual(5);
      expect(o.checklist.length, o.id).toBeLessThanOrEqual(15);
    }
  });

  it('every objective carries a completion gate and act handoff', () => {
    for (const o of ALL_AUTHORED) {
      expect(o.completionGate?.trim(), o.id).toBeTruthy();
      expect(o.actHandoff?.trim(), o.id).toBeTruthy();
    }
  });

  it('every objective ref matches the Authoring Standards format', () => {
    for (const o of ALL_AUTHORED) {
      expect(o.ref, o.id).toMatch(OBJECTIVE_REF);
    }
  });

  it('every patch ref matches the cross-reference format', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      expect(p.ref, p.targetObjectiveId).toMatch(PATCH_REF);
    }
  });

  it('every injected patch item id follows the <target>-pres-<n> rubric', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      for (const item of p.injectedItems) {
        expect(item.id, item.id).toMatch(
          new RegExp(`^${p.targetObjectiveId}-pres-\\d+$`),
        );
      }
    }
  });
});

describe('catalogue conformance - source/layer discipline', () => {
  it('universal objectives are source=universal with no sourceTypeId', () => {
    for (const o of UNIVERSAL_PLAN_OBJECTIVES) {
      expect(o.source, o.id).toBe('universal');
      expect(o.sourceTypeId, o.id).toBeUndefined();
    }
  });

  it('regen primary objectives are source=primary, sourceTypeId=regenerative_farm', () => {
    for (const o of REGEN_FARM_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('regenerative_farm');
    }
  });

  it('ecovillage primary objectives are source=primary, sourceTypeId=ecovillage', () => {
    for (const o of ECOVILLAGE_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('ecovillage');
    }
  });

  it('agritourism primary objectives are source=primary, sourceTypeId=agritourism', () => {
    for (const o of AGRITOURISM_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('agritourism');
    }
  });

  it('residential additive objectives are source=secondary/additive, sourceTypeId=residential', () => {
    for (const o of RESIDENTIAL_ADDITIVE_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('residential');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });

  it('wellness primary objectives are source=primary, sourceTypeId=wellness', () => {
    for (const o of WELLNESS_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('wellness');
    }
  });

  it('silvopasture primary objectives are source=primary, sourceTypeId=silvopasture', () => {
    for (const o of SILVOPASTURE_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('silvopasture');
    }
  });

  it('orchard primary objectives are source=primary, sourceTypeId=orchard_food_forest', () => {
    for (const o of ORCHARD_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('orchard_food_forest');
    }
  });

  it('wellness secondary objectives are source=secondary/additive, sourceTypeId=wellness', () => {
    // Authored under the 2026-05-30 "derive + author" override (the v1.0 source
    // has no secondary section). Additive only - no patch records.
    for (const o of WELLNESS_SECONDARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('wellness');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });

  it('nursery secondary objectives are source=secondary/additive, sourceTypeId=nursery', () => {
    for (const o of NURSERY_SECONDARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('nursery');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });

  it('silvopasture secondary objectives are source=secondary/additive, sourceTypeId=silvopasture', () => {
    for (const o of SILVOPASTURE_SECONDARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('silvopasture');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });

  it('homestead primary objectives are source=primary, sourceTypeId=homestead', () => {
    for (const o of HOMESTEAD_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('homestead');
    }
  });

  it('education primary objectives are source=primary, sourceTypeId=education', () => {
    for (const o of EDUCATION_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('education');
    }
  });

  it('conservation primary objectives are source=primary, sourceTypeId=conservation', () => {
    for (const o of CONSERVATION_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('conservation');
    }
  });

  it('market garden primary objectives are source=primary, sourceTypeId=market_garden', () => {
    for (const o of MARKET_GARDEN_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('market_garden');
    }
  });

  it('off-grid primary objectives are source=primary, sourceTypeId=off_grid', () => {
    for (const o of OFF_GRID_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('off_grid');
    }
  });

  it('livestock primary objectives are source=primary, sourceTypeId=livestock_operation', () => {
    for (const o of LIVESTOCK_PRIMARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('primary');
      expect(o.sourceTypeId, o.id).toBe('livestock_operation');
    }
  });

  it('livestock secondary objectives are source=secondary/additive, sourceTypeId=livestock_operation', () => {
    for (const o of LIVESTOCK_SECONDARY_OBJECTIVES) {
      expect(o.source, o.id).toBe('secondary');
      expect(o.sourceTypeId, o.id).toBe('livestock_operation');
      expect(o.secondaryClass, o.id).toBe('additive');
    }
  });
});

describe('catalogue conformance - global id uniqueness', () => {
  it('authored objective ids are globally unique across catalogues', () => {
    const ids = ALL_AUTHORED.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all checklist item ids in the regen+residential resolved set are globally unique', () => {
    // The planTierStore.toProgressMap flatten requires this (injected items
    // included) or two items would collapse onto one progress key.
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['residential'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);

    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

describe('catalogue conformance - patch targets + bridge ids', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential'],
  });

  it('every residential patch target exists in the regen+residential resolved set', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      expect(
        findPlanStratumObjectiveIn(objectives, p.targetObjectiveId),
        p.targetObjectiveId,
      ).toBeDefined();
    }
  });

  it('preserves the 3 visionProfileToChecklist bridge ids (c1/c2 on s1-vision, capital band on s1-steward)', () => {
    // s1-vision-c1/c2 are written by the bridge; they MUST exist or seeded
    // Tier-0 progress is orphaned. The capital band (formerly s1-vision-c3)
    // moved to s1-steward-c6 in the 2026-06-16 Tier-0 restructure that split
    // people/labour/capital off the vision objective onto a dedicated steward
    // objective; it MUST still resolve on the new objective. (s1-stewardship-c1/c2
    // are intentionally NOT in the per-type model - RegenFarm v1.3 has external
    // stakeholders, not an internal-team T0 objective; those two bridge mappings
    // are inert for per-type projects and only resolve against the legacy
    // fallback skeleton. They are distinct from the new universal s1-steward.)
    const vision = findPlanStratumObjectiveIn(objectives, 's1-vision');
    const visionItemIds = new Set(vision?.checklist.map((i) => i.id));
    expect(visionItemIds.has('s1-vision-c1')).toBe(true);
    expect(visionItemIds.has('s1-vision-c2')).toBe(true);

    const steward = findPlanStratumObjectiveIn(objectives, 's1-steward');
    const stewardItemIds = new Set(steward?.checklist.map((i) => i.id));
    expect(stewardItemIds.has('s1-steward-c6')).toBe(true);
  });

  it('s1-vision-c4 is removed (covered by c1 primary-purpose definition)', () => {
    // c4 ("Confirm any secondary land uses") was removed because the primary
    // purpose defined in c1 already captures land use type; the item was redundant.
    const vision = findPlanStratumObjectiveIn(objectives, 's1-vision');
    const c4 = vision?.checklist.find((i) => i.id === 's1-vision-c4');
    expect(c4).toBeUndefined();
  });

  it('carries the s1-vision-steward stewardship answerSpec recap item', () => {
    // s1-vision-steward surfaces the wizard Team-step roster (primary steward +
    // co-stewards) read-only on per-type projects, since the legacy
    // s1-stewardship objective only exists in the fallback skeleton. Optional,
    // steward fieldType, partitioned into the "Purpose & intent" group.
    const vision = findPlanStratumObjectiveIn(objectives, 's1-vision');
    const steward = vision?.checklist.find((i) => i.id === 's1-vision-steward');
    expect(steward).toBeDefined();
    expect(steward?.optional).toBe(true);
    expect(steward?.answerSpec?.fieldType).toBe('steward');
    expect(steward?.answerSpec?.sourceField).toEqual([
      'team.primarySteward',
      'team.coStewards',
    ]);
  });
});

describe('catalogue conformance - Tier-0 restructure (s1-steward + Amanah)', () => {
  // The 2026-06-16 restructure split the old single "vision" objective into an
  // Intent Object (s1-vision) and a Steward/Team Object (s1-steward), and added
  // the silvopasture SILV>RF-S1.4 patch onto the regen enterprise-mix (0.5).
  // The operator's project config is the canonical resolution target here:
  // Regenerative Farm (primary) + Residential + Silvopasture (secondaries).
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential', 'silvopasture'],
  });

  it('exposes exactly 20 universal objectives, including the new s1-steward', () => {
    expect(UNIVERSAL_PLAN_OBJECTIVES.length).toBe(20);
    const ids = new Set(UNIVERSAL_PLAN_OBJECTIVES.map((o) => o.id));
    expect(ids.has('s1-steward')).toBe(true);
  });

  it('resolves s1-steward as a universal S1 objective gated on s1-vision', () => {
    const steward = findPlanStratumObjectiveIn(objectives, 's1-steward');
    expect(steward).toBeDefined();
    expect(steward!.source).toBe('universal');
    expect(steward!.sourceTypeId).toBeUndefined();
    expect(steward!.stratumId).toBe('s1-project-foundation');
    // CRITICAL INVARIANT: prereqs reference ONLY universal ids (an absent prereq
    // silently locks an objective forever); s1-vision is universal -> safe.
    expect(steward!.prerequisiteObjectiveIds).toEqual(['s1-vision']);
  });

  it('s1-steward carries the canonical 8-item / 3-group Team Object surface', () => {
    const steward = findPlanStratumObjectiveIn(objectives, 's1-steward');
    // The standalone operational-roles item (c9, ADR 2026-06-24) was RETIRED on
    // 2026-06-28 (Phase-4 consolidation): the operational-role pills now live on
    // the People & roles capture (c2), which replaced its free-text "team role"
    // input, so the duplicate c9 item + its dg1 entry are gone.
    expect(steward!.checklist.map((i) => i.id)).toEqual([
      's1-steward-c1',
      's1-steward-c2',
      's1-steward-c3',
      's1-steward-c4',
      's1-steward-c5',
      's1-steward-c6',
      's1-steward-c7',
      's1-steward-c8',
    ]);
    expect(steward!.decisionGroups.map((g) => g.id)).toEqual([
      's1-steward-dg1',
      's1-steward-dg2',
      's1-steward-dg3',
    ]);
    expect(steward!.actHandoff).toBe('Steward Team & Capability Register');
  });

  it('s1-steward c1 roster is the auto-satisfying steward answerSpec; c6 is the capital band', () => {
    // c1 roster reuses the wizard team answerSpec (optional, auto-satisfies via
    // computeEffectiveProgress); c6 is the budget+timeline band re-homed from the
    // retired s1-vision-c3 (both axes required to count as answered).
    const steward = findPlanStratumObjectiveIn(objectives, 's1-steward');
    const c1 = steward!.checklist.find((i) => i.id === 's1-steward-c1');
    expect(c1?.optional).toBe(true);
    expect(c1?.answerSpec?.fieldType).toBe('steward');
    const c6 = steward!.checklist.find((i) => i.id === 's1-steward-c6');
    expect(c6?.answerSpec?.fieldType).toBe('band');
    expect(c6?.answerSpec?.sourceField).toEqual([
      'visionProfile.budgetRange',
      'visionProfile.timelineProgress',
    ]);
  });

  it('s1-vision no longer carries the labour roster or capital band items', () => {
    // Both were re-homed onto s1-steward (c5 labour, c6 capital). The Intent
    // Object must be free of people/resource items after the split.
    const vision = findPlanStratumObjectiveIn(objectives, 's1-vision');
    const visionItemIds = new Set(vision!.checklist.map((i) => i.id));
    expect(visionItemIds.has('s1-vision-labour')).toBe(false);
    expect(visionItemIds.has('s1-vision-c3')).toBe(false);
  });

  it('Amanah wording-pin: no advance-sale / subscription / yield-share framing in 0.5, 0.6, or the silvopasture patch', () => {
    // Covenant guard (CSRA erased 2026-05-04, bay` ma laysa `indak): the
    // resident-vs-commercial allocation is a possessed-production split ONLY -
    // never an advance sale, membership yield-share, or CSA/CSRA pre-sale.
    // Scans every authored string the operator's config surfaces in declaration.
    const objectiveStrings = (o: PlanStratumObjective): string[] => [
      o.title,
      o.shortTitle ?? '',
      o.focusedQuestion,
      o.completionGate ?? '',
      o.actHandoff ?? '',
      o.scopeNotes ?? '',
      ...o.checklist.flatMap((i) => [
        i.label,
        i.feedHint ?? '',
        i.feedNote ?? '',
        i.mode ?? '',
      ]),
      ...o.decisionGroups.map((g) => g.label),
    ];

    // 0.5 (resolved, includes the injected silvopasture items) + 0.6.
    const enterpriseMix = findPlanStratumObjectiveIn(
      objectives,
      'rf-s1-enterprise-mix',
    );
    const household = findPlanStratumObjectiveIn(
      objectives,
      'res-s1-household-needs',
    );
    expect(enterpriseMix).toBeDefined();
    expect(household).toBeDefined();

    // The raw SILV>RF-S1.4 patch record (scopeNote / gate amendment / injected
    // copy) - not all of these surface as objective fields after resolution.
    const silvPatch = SILVOPASTURE_SECONDARY_PATCHES.find(
      (p) => p.ref === 'SILV>RF-S1.4',
    );
    expect(silvPatch).toBeDefined();
    const patchStrings = [
      silvPatch!.scopeNote ?? '',
      silvPatch!.completionGateAmendment ?? '',
      ...silvPatch!.injectedItems.map((i) => i.label),
      ...silvPatch!.injectedGroups.map((g) => g.label),
    ];

    const haystack = [
      ...objectiveStrings(enterpriseMix!),
      ...objectiveStrings(household!),
      ...patchStrings,
    ];
    for (const s of haystack) {
      expect(detectCovenantBanned(s), s).toBe(false);
    }
  });
});

describe('catalogue conformance - ecovillage primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'ecovillage',
    secondaryTypeIds: [],
  });

  it('resolves to 50 objectives (19 universal + 31 primary)', () => {
    // The source header table reads "Primary: 29", but the per-tier sub-headers
    // and the (now 50) total both confirm 31. This locks the corrected count.
    // Universal RESOLVES to 19: it has 20 authored objectives, but the
    // 2026-06-17 Mode-4 restructure excludes s4-direction from resolution
    // (migrated to Threshold 1), so the resolved universal count is 19.
    expect(ECOVILLAGE_PRIMARY_OBJECTIVES.length).toBe(31);
    expect(objectives.length).toBe(50);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every ecovillage ref is unique within the primary set', () => {
    // Guards the source's duplicate "6.6" (adaptive management), reassigned to
    // EV-S7.9 in ecovillage.ts.
    const refs = ECOVILLAGE_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('catalogue conformance - agritourism primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'agritourism',
    secondaryTypeIds: [],
  });

  it('resolves to 53 objectives (19 universal + 34 primary)', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
    expect(AGRITOURISM_PRIMARY_OBJECTIVES.length).toBe(34);
    expect(objectives.length).toBe(53);
  });

  it('carries the 5 eco-resort / glamping extension objectives, each conditionally scoped', () => {
    const extensionRefs = [
      'AG-S3.7',
      'AG-S4.9',
      'AG-S5.9',
      'AG-S5.10',
      'AG-S7.8',
    ];
    const extension = AGRITOURISM_PRIMARY_OBJECTIVES.filter((o) =>
      extensionRefs.includes(o.ref ?? ''),
    );
    expect(extension).toHaveLength(extensionRefs.length);
    for (const o of extension) {
      expect(typeof o.scopeNotes).toBe('string');
      expect(o.scopeNotes && o.scopeNotes.length).toBeGreaterThan(0);
    }
  });

  it('carries the Amanah membership / season-pass flag on the AG-S4.8 revenue model', () => {
    // feedback_csa_in_catalogues: a season-pass / membership instrument is an
    // advance-sale surface (bay` ma laysa `indak / gharar) that must be surfaced
    // AND flagged + routed to Scholar Council, never silently omitted. AG-S7.8
    // deferred it; AG-S4.8 now realises it as a membership benefit, not prepayment.
    const revenue = AGRITOURISM_PRIMARY_OBJECTIVES.find(
      (o) => o.id === 'ag-s4-revenue-model',
    );
    expect(revenue?.scopeNotes).toBeTruthy();
    expect(revenue?.scopeNotes).toContain('Scholar Council');
    expect(revenue?.scopeNotes).toContain('membership benefit');
    const membershipItem = revenue?.checklist.find(
      (i) => i.id === 'ag-s4-revenue-model-c8',
    );
    expect(membershipItem?.label.toLowerCase()).toContain('membership benefit');
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every agritourism ref is unique within the primary set', () => {
    // The source index carries no duplicate refs (unlike ecovillage's 6.6);
    // this locks that the encoded set keeps them unique.
    const refs = AGRITOURISM_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('catalogue conformance - wellness primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'wellness',
    secondaryTypeIds: [],
  });

  it('resolves to 46 objectives (19 universal + 27 primary)', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
    expect(WELLNESS_PRIMARY_OBJECTIVES.length).toBe(27);
    expect(objectives.length).toBe(46);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every wellness primary ref is unique within the primary set', () => {
    const refs = WELLNESS_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('well-s7-program-launch meets the 5-item floor (operator-authorized c5)', () => {
    // Source lists 4; c5 added under the 2026-05-30 "draft 5th" ruling.
    const launch = WELLNESS_PRIMARY_OBJECTIVES.find(
      (o) => o.id === 'well-s7-program-launch',
    );
    expect(launch?.checklist.length).toBe(5);
  });
});

describe('catalogue conformance - wellness secondary resolution', () => {
  it('contributes 5 additive overlay objectives and no patches', () => {
    expect(WELLNESS_SECONDARY_OBJECTIVES.length).toBe(5);
  });

  it('resolves wellness-secondary onto a regen primary as additive only', () => {
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withWellness = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['wellness'],
    });
    // Additive only: exactly +5 objectives, no patch injection on existing ones.
    expect(withWellness.objectives.length).toBe(base.objectives.length + 5);
  });

  it('wellness secondary refs do not collide with wellness primary refs', () => {
    const primaryRefs = new Set(WELLNESS_PRIMARY_OBJECTIVES.map((o) => o.ref));
    for (const o of WELLNESS_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('has globally unique checklist item ids when layered (toProgressMap invariant)', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['wellness'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

describe('catalogue conformance - silvopasture primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'silvopasture',
    secondaryTypeIds: [],
  });

  it('resolves to 45 objectives (19 universal + 26 primary)', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
    expect(SILVOPASTURE_PRIMARY_OBJECTIVES.length).toBe(26);
    expect(objectives.length).toBe(45);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every silvopasture primary ref is unique within the primary set', () => {
    const refs = SILVOPASTURE_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('catalogue conformance - livestock primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'livestock_operation',
    secondaryTypeIds: [],
  });

  it('resolves to 42 objectives (19 universal + 23 primary)', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
    expect(LIVESTOCK_PRIMARY_OBJECTIVES.length).toBe(23);
    expect(objectives.length).toBe(42);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every livestock primary ref is unique within the primary set', () => {
    const refs = LIVESTOCK_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('binds all six livestock/grazing formula ids across the catalogue', () => {
    const bound = new Set(
      LIVESTOCK_PRIMARY_OBJECTIVES.flatMap((o) =>
        o.checklist
          .map((i) => i.formulaBinding?.formulaId)
          .filter((id): id is NonNullable<typeof id> => Boolean(id)),
      ),
    );
    expect(bound).toEqual(
      new Set([
        'forage-carrying-capacity',
        'carrying-capacity-seasonal',
        'paddock-stocking-density',
        'stock-water-demand',
        'paddock-system-capacity',
        'enterprise-break-even',
      ]),
    );
  });

  it('carries the Amanah advance-sale flag on the marketing objective scopeNotes', () => {
    // feedback_csa_in_catalogues: meat/herd-share advance-subscription channels
    // must be surfaced AND flagged (bay` ma laysa `indak), never silently omitted.
    const marketing = LIVESTOCK_PRIMARY_OBJECTIVES.find(
      (o) => o.id === 'lvs-s7-marketing',
    );
    expect(marketing?.scopeNotes).toBeTruthy();
    expect(marketing?.scopeNotes).toContain('Scholar Council');
    const channels = marketing?.checklist.find(
      (i) => i.id === 'lvs-s7-marketing-c3',
    );
    expect(channels?.label.toLowerCase()).toContain('herd-share');
  });
});

describe('catalogue conformance - orchard primary resolution', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'orchard_food_forest',
    secondaryTypeIds: [],
  });

  it('resolves to 44 objectives (19 universal + 25 primary)', () => {
    // Universal resolves to 19 (20 authored − s4-direction excluded, 2026-06-17).
    expect(ORCHARD_PRIMARY_OBJECTIVES.length).toBe(25);
    expect(objectives.length).toBe(44);
  });

  it('has globally unique checklist item ids (toProgressMap invariant)', () => {
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('every orchard primary ref is unique within the primary set', () => {
    const refs = ORCHARD_PRIMARY_OBJECTIVES.map((o) => o.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('catalogue conformance - nursery secondary resolution', () => {
  it('contributes exactly 8 additive objectives and no patches', () => {
    expect(NURSERY_SECONDARY_OBJECTIVES.length).toBe(8);
  });

  it('resolves nursery onto a regen primary as additive only (+8)', () => {
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withNursery = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['nursery'],
    });
    expect(withNursery.objectives.length).toBe(base.objectives.length + 8);
  });

  it('applies no patches and records none as skipped', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['nursery'],
    });
    const injected = result.objectives.filter((o) =>
      o.checklist.some((c) => c.expandedBySecondaryId === 'nursery'),
    );
    expect(injected.length).toBe(0);
    expect(result.provenance.skippedPatches).toEqual([]);
  });

  it('nursery additive refs do not collide with the regen primary refs', () => {
    const primaryRefs = new Set(REGEN_FARM_PRIMARY_OBJECTIVES.map((o) => o.ref));
    for (const o of NURSERY_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('has globally unique checklist item ids when layered', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['nursery'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

describe('catalogue conformance - silvopasture secondary resolution', () => {
  it('contributes 9 additive objectives (one excluded from resolution) and 15 patches', () => {
    // SILV>RF-S1.4 targets the regen primary's enterprise-mix objective
    // (rf-s1-enterprise-mix), added by the 2026-06-16 Tier-0 restructure so
    // livestock integration is captured at declaration time. The 2026-06-16
    // Tier-2 (Stratum-3) restructure then added silv-sec-s3-stock-water (2.5, a
    // new additive) plus four S3 patches (hydrology/soil/nutrient/pest), and
    // flagged silv-sec-s3-forage-survey excludedFromResolution (definition kept,
    // deferred to a later pass). The 2026-06-16 Tier-1 (Stratum-2) Land-Reading
    // restructure then added four more patches - terrain/ecology/infrastructure
    // on the universal s2 surveys plus land-health on the regen primary survey.
    // The 2026-06-18 Tier-6 (Stratum-7) Launch Preparation restructure then added
    // three more - establishment-sequence / livestock-sourcing / risk on the
    // universal s7 launch objectives (s7-phase1, s7-resource-plan,
    // s7-risk-register) - with no new objectives, so the array still holds 9 (8
    // resolve) while the patch count rises 8 -> 12 -> 15.
    expect(SILVOPASTURE_SECONDARY_OBJECTIVES.length).toBe(9);
    expect(SILVOPASTURE_SECONDARY_PATCHES.length).toBe(15);
  });

  it('every silvopasture secondary patch ref matches the patch format', () => {
    for (const p of SILVOPASTURE_SECONDARY_PATCHES) {
      expect(p.ref, p.targetObjectiveId).toMatch(PATCH_REF);
    }
  });

  it('every silvopasture secondary patch parses via PatchRecordSchema', () => {
    for (const p of SILVOPASTURE_SECONDARY_PATCHES) {
      expect(() => PatchRecordSchema.parse(p), p.ref).not.toThrow();
    }
  });

  it('resolves silvopasture onto a regen primary as +8 additive (9 authored - 1 excluded)', () => {
    // Net resolved additive is unchanged at +8: the new silv-sec-s3-stock-water
    // (+1) is offset by silv-sec-s3-forage-survey being excludedFromResolution
    // (-1). The authored array is 9; only 8 reach the resolved spine.
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withSilv = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture'],
    });
    expect(withSilv.objectives.length).toBe(base.objectives.length + 8);
  });

  it('applies all 15 patches (universal + regen primary targets), none skipped', () => {
    // The 15 patches land on 15 distinct targets, all present under a regen
    // primary: SILV>RF-S1.4 (rf-s1-enterprise-mix), the three original S4-S6
    // universal patches, the four 2026-06-16 Tier-2 S3 patches on s3-hydrology,
    // s3-soil, rf-s3-nutrient-cycling, and rf-s3-pest-pressure, the four
    // 2026-06-16 Tier-1 S2 patches on s2-terrain, s2-ecology, s2-infrastructure,
    // and rf-s2-land-health, plus the three 2026-06-18 Tier-6 S7 patches on
    // s7-phase1, s7-resource-plan, and s7-risk-register.
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture'],
    });
    const patched = result.objectives.filter((o) =>
      o.checklist.some((c) => c.expandedBySecondaryId === 'silvopasture'),
    );
    expect(patched.length).toBe(15);
    expect(result.provenance.skippedPatches).toEqual([]);
  });

  it('concatenates patch gate amendments onto the target completion gate', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture'],
    });
    const water = findPlanStratumObjectiveIn(
      result.objectives,
      's4-water-strategy',
    );
    expect(water).toBeDefined();
    expect(water?.completionGate).toContain('drinking-water demand');
  });

  it('silvopasture secondary refs do not collide with silvopasture primary refs', () => {
    const primaryRefs = new Set(
      SILVOPASTURE_PRIMARY_OBJECTIVES.map((o) => o.ref),
    );
    for (const o of SILVOPASTURE_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('has globally unique checklist item ids when layered', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

// ---------------------------------------------------------------------------
// Decision Groups (Decision Groups Reference v1.0; OLOS spec 9.3-9.4).
// A decision group is a Plan-layer editorial grouping of an objective's
// Act-layer checklist items into 1-6 named decision scopes. Group labels /
// counts / observeFeeds are source-verbatim; item membership is authored under
// the 2026-05-31 operator override (R1), extended the same day to authoring
// full group taxonomy for objectives the doc does not cover.
// ---------------------------------------------------------------------------

/** Objectives whose checklist must be fully partitioned by their groups. */
const OBJECTIVES_WITH_GROUPS = ALL_AUTHORED.filter(
  (o) => o.decisionGroups.length > 0,
);

/**
 * Assert the full mutually-exclusive partition invariant for one objective:
 * 1-6 groups; every group has >=1 item; no item in two groups; the union of
 * all group itemIds equals the objective's checklist item-id set; every
 * group itemId resolves to a real checklist item.
 */
function expectFullPartition(o: PlanStratumObjective): void {
  expect(o.decisionGroups.length, `${o.id} group count`).toBeGreaterThanOrEqual(
    1,
  );
  expect(o.decisionGroups.length, `${o.id} group count`).toBeLessThanOrEqual(6);

  const checklistIds = new Set(o.checklist.map((i) => i.id));
  const seen = new Set<string>();
  for (const g of o.decisionGroups) {
    expect(g.itemIds.length, `${g.id} item count`).toBeGreaterThanOrEqual(1);
    for (const itemId of g.itemIds) {
      // resolves to a real checklist item
      expect(checklistIds.has(itemId), `${g.id} -> ${itemId} unknown`).toBe(
        true,
      );
      // mutually exclusive (no item in two groups)
      expect(seen.has(itemId), `${itemId} appears in two groups`).toBe(false);
      seen.add(itemId);
    }
  }
  // full partition: every checklist item is covered exactly once
  expect(seen.size, `${o.id} partition coverage`).toBe(checklistIds.size);
}

describe('catalogue conformance - decision group partition invariant', () => {
  it('every grouped objective is a full mutually-exclusive partition', () => {
    for (const o of OBJECTIVES_WITH_GROUPS) {
      expectFullPartition(o);
    }
  });

  it('observeFeeds entries are non-empty strings (R2: "-" encoded as [])', () => {
    for (const o of OBJECTIVES_WITH_GROUPS) {
      for (const g of o.decisionGroups) {
        for (const feed of g.observeFeeds) {
          expect(typeof feed, `${g.id} feed type`).toBe('string');
          expect(feed.trim().length, `${g.id} empty feed`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('authored decision-group ids are globally unique across catalogues', () => {
    const ids = ALL_AUTHORED.flatMap((o) =>
      o.decisionGroups.map((g) => g.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('authored base groups carry sourceSecondaryId=null', () => {
    // Patch-injected groups get their sourceSecondaryId stamped by the
    // resolver; statically-authored base groups must leave it null.
    for (const o of OBJECTIVES_WITH_GROUPS) {
      for (const g of o.decisionGroups) {
        expect(g.sourceSecondaryId, `${g.id}`).toBeNull();
      }
    }
  });
});

describe('catalogue conformance - decision group Phase 3a coverage', () => {
  it('all 20 universal objectives carry decision groups', () => {
    for (const o of UNIVERSAL_PLAN_OBJECTIVES) {
      expect(o.decisionGroups.length, o.id).toBeGreaterThan(0);
    }
  });

  it('all regen-farm primary objectives carry decision groups', () => {
    for (const o of REGEN_FARM_PRIMARY_OBJECTIVES) {
      expect(o.decisionGroups.length, o.id).toBeGreaterThan(0);
    }
  });

  it('all residential additive objectives carry decision groups', () => {
    for (const o of RESIDENTIAL_ADDITIVE_OBJECTIVES) {
      expect(o.decisionGroups.length, o.id).toBeGreaterThan(0);
    }
  });

  it('every residential patch injects a decision group bundling its items', () => {
    for (const p of RESIDENTIAL_PATCHES) {
      expect(p.injectedGroups.length, p.ref).toBeGreaterThan(0);
      const injectedItemIds = new Set(p.injectedItems.map((i) => i.id));
      const groupedItemIds = p.injectedGroups.flatMap((g) => g.itemIds);
      // injected groups partition exactly the injected items
      expect(new Set(groupedItemIds).size, `${p.ref} dup`).toBe(
        groupedItemIds.length,
      );
      for (const itemId of groupedItemIds) {
        expect(injectedItemIds.has(itemId), `${p.ref} -> ${itemId}`).toBe(true);
      }
      expect(groupedItemIds.length, `${p.ref} coverage`).toBe(
        injectedItemIds.size,
      );
    }
  });
});

describe('catalogue conformance - decision group resolution (regen+residential)', () => {
  const { objectives } = resolveProjectObjectives({
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential'],
  });

  it('every resolved grouped objective remains a full partition', () => {
    // Base groups partition base items; patch-injected groups partition
    // injected items; together they must cover the resolved checklist exactly.
    for (const o of objectives) {
      if (o.decisionGroups.length > 0) expectFullPartition(o);
    }
  });

  it('decision-group ids are globally unique in the resolved set', () => {
    const ids = objectives.flatMap((o) => o.decisionGroups.map((g) => g.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolver stamps sourceSecondaryId=residential on patch-injected groups only', () => {
    const injected = objectives.flatMap((o) =>
      o.decisionGroups.filter((g) => g.sourceSecondaryId !== null),
    );
    // Each residential patch injects one or more groups (the s3-hydrology
    // patch injects two: domestic supply & reliability + quality & potability),
    // so derive the expected stamped-group count from the patches themselves
    // rather than assuming one group per patch.
    const expectedInjectedGroups = RESIDENTIAL_PATCHES.reduce(
      (n, p) => n + (p.injectedGroups?.length ?? 0),
      0,
    );
    expect(injected.length).toBe(expectedInjectedGroups);
    for (const g of injected) {
      expect(g.sourceSecondaryId, g.id).toBe('residential');
    }
    // Every other group is an unstamped base group.
    const base = objectives.flatMap((o) =>
      o.decisionGroups.filter((g) => g.sourceSecondaryId === null),
    );
    for (const g of base) {
      expect(g.id.includes('-dgres'), g.id).toBe(false);
    }
  });

  it('does not mutate the shared universal catalogue decisionGroups', () => {
    // The resolver deep-copies; the shared constant for a patched universal
    // objective (e.g. s3-hydrology) must keep only its authored base groups.
    const sharedHydrology = UNIVERSAL_PLAN_OBJECTIVES.find(
      (o) => o.id === 's3-hydrology',
    );
    expect(
      sharedHydrology?.decisionGroups.every((g) => g.sourceSecondaryId === null),
    ).toBe(true);
    expect(
      sharedHydrology?.decisionGroups.some((g) => g.id.includes('-dgres')),
    ).toBe(false);
  });
});

describe('catalogue conformance - orchard secondary resolution', () => {
  it('contributes exactly 5 additive objectives and 4 patches', () => {
    expect(ORCHARD_SECONDARY_OBJECTIVES.length).toBe(5);
    expect(ORCHARD_SECONDARY_PATCHES.length).toBe(4);
  });

  it('every orchard secondary patch ref matches the patch format', () => {
    for (const p of ORCHARD_SECONDARY_PATCHES) {
      expect(p.ref, p.targetObjectiveId).toMatch(PATCH_REF);
    }
  });

  it('every orchard secondary patch parses via PatchRecordSchema', () => {
    for (const p of ORCHARD_SECONDARY_PATCHES) {
      expect(() => PatchRecordSchema.parse(p), p.ref).not.toThrow();
    }
  });

  it('resolves orchard onto a regen primary as +5 additive', () => {
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withOrch = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    expect(withOrch.objectives.length).toBe(base.objectives.length + 5);
  });

  it('applies all 4 patches to universal targets, none skipped', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    const patched = result.objectives.filter((o) =>
      o.checklist.some(
        (c) => c.expandedBySecondaryId === 'orchard_food_forest',
      ),
    );
    expect(patched.length).toBe(4);
    expect(result.provenance.skippedPatches).toEqual([]);
  });

  it('concatenates patch gate amendments onto the target completion gate', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    const ecology = findPlanStratumObjectiveIn(
      result.objectives,
      's2-ecology',
    );
    expect(ecology).toBeDefined();
    expect(ecology?.completionGate).toContain(
      'Pollinator and beneficial-insect habitat',
    );
  });

  it('orchard secondary refs do not collide with orchard primary refs', () => {
    const primaryRefs = new Set(ORCHARD_PRIMARY_OBJECTIVES.map((o) => o.ref));
    for (const o of ORCHARD_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('has globally unique checklist item ids when layered', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

describe('catalogue conformance - livestock secondary resolution', () => {
  it('contributes exactly 7 additive objectives and 3 patches', () => {
    expect(LIVESTOCK_SECONDARY_OBJECTIVES.length).toBe(7);
    expect(LIVESTOCK_SECONDARY_PATCHES.length).toBe(3);
  });

  it('every livestock secondary patch ref matches the patch format', () => {
    for (const p of LIVESTOCK_SECONDARY_PATCHES) {
      expect(p.ref, p.targetObjectiveId).toMatch(PATCH_REF);
    }
  });

  it('every livestock secondary patch parses via PatchRecordSchema', () => {
    for (const p of LIVESTOCK_SECONDARY_PATCHES) {
      expect(() => PatchRecordSchema.parse(p), p.ref).not.toThrow();
    }
  });

  it('resolves livestock onto a regen primary as +7 additive', () => {
    const base = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: [],
    });
    const withLvs = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['livestock_operation'],
    });
    expect(withLvs.objectives.length).toBe(base.objectives.length + 7);
  });

  it('applies all 3 patches to universal targets, none skipped', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['livestock_operation'],
    });
    const patched = result.objectives.filter((o) =>
      o.checklist.some(
        (c) => c.expandedBySecondaryId === 'livestock_operation',
      ),
    );
    expect(patched.length).toBe(3);
    expect(result.provenance.skippedPatches).toEqual([]);
  });

  it('concatenates patch gate amendments onto the target completion gate', () => {
    const result = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['livestock_operation'],
    });
    const water = findPlanStratumObjectiveIn(
      result.objectives,
      's4-water-strategy',
    );
    expect(water).toBeDefined();
    expect(water?.completionGate).toContain('Livestock water demand');
  });

  it('livestock secondary refs do not collide with livestock primary refs', () => {
    const primaryRefs = new Set(LIVESTOCK_PRIMARY_OBJECTIVES.map((o) => o.ref));
    for (const o of LIVESTOCK_SECONDARY_OBJECTIVES) {
      expect(primaryRefs.has(o.ref), o.ref).toBe(false);
    }
  });

  it('co-resolves with the silvopasture secondary on a third host without id collision', () => {
    // Both secondaries patch the same universal targets; namespaced item ids
    // (...-lvs-N vs ...-silv-N) must keep the resolved set globally unique.
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['silvopasture', 'livestock_operation'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });

  it('has globally unique checklist item ids when layered', () => {
    const { objectives } = resolveProjectObjectives({
      primaryTypeId: 'regenerative_farm',
      secondaryTypeIds: ['livestock_operation'],
    });
    const itemIds = objectives.flatMap((o) => o.checklist.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const objIds = objectives.map((o) => o.id);
    expect(new Set(objIds).size).toBe(objIds.length);
  });
});

describe('s1-boundaries 7-item mixed-mode surface', () => {
  const boundaries = UNIVERSAL_PLAN_OBJECTIVES.find(
    (o) => o.id === 's1-boundaries',
  );

  it('exists with the mixed-mode title and completion gate', () => {
    expect(boundaries).toBeDefined();
    expect(boundaries!.title).toBe(
      'Establish site boundaries & legal constraints',
    );
    expect(boundaries!.completionGate).toBe(
      'All legal constraints and boundary conditions are mapped, recorded, and reviewed. No design work proceeds into areas of legal ambiguity.',
    );
  });

  it('has 7 checklist items in mockup display order', () => {
    expect(boundaries!.checklist.map((c) => c.id)).toEqual([
      's1-boundaries-c2',
      's1-boundaries-c1',
      's1-boundaries-c3',
      's1-boundaries-c4',
      's1-boundaries-c5',
      's1-boundaries-c6',
      's1-boundaries-c7',
    ]);
  });

  it('carries the verbatim mockup labels', () => {
    const byId = new Map(boundaries!.checklist.map((c) => [c.id, c.label]));
    expect(byId.get('s1-boundaries-c2')).toBe(
      'Map property boundaries on base layer',
    );
    expect(byId.get('s1-boundaries-c1')).toBe(
      'Obtain and verify current title and deed documents',
    );
    expect(byId.get('s1-boundaries-c3')).toBe(
      'Identify all easements, rights of way, and encumbrances',
    );
    expect(byId.get('s1-boundaries-c4')).toBe(
      'Check zoning and permitted land uses',
    );
    expect(byId.get('s1-boundaries-c5')).toBe(
      'Identify water rights and entitlements',
    );
    expect(byId.get('s1-boundaries-c6')).toBe(
      'Record covenant, heritage, or conservation obligations',
    );
    expect(byId.get('s1-boundaries-c7')).toBe(
      'Note required permits for planned activities - building, earthworks, water harvesting',
    );
  });

  it('partitions into 2 decision groups matching the mockup', () => {
    expect(boundaries!.decisionGroups.map((g) => g.id)).toEqual([
      's1-boundaries-dg1',
      's1-boundaries-dg2',
    ]);
    const g1 = boundaries!.decisionGroups.find(
      (g) => g.id === 's1-boundaries-dg1',
    )!;
    const g2 = boundaries!.decisionGroups.find(
      (g) => g.id === 's1-boundaries-dg2',
    )!;
    expect(g1.label).toBe('Title & boundary');
    expect(g1.itemIds).toEqual(['s1-boundaries-c2', 's1-boundaries-c1']);
    expect(g2.label).toBe('Legal & permit obligations');
    expect(g2.itemIds).toEqual([
      's1-boundaries-c3',
      's1-boundaries-c4',
      's1-boundaries-c5',
      's1-boundaries-c6',
      's1-boundaries-c7',
    ]);
  });

  it('carries the per-row feed chips and in-panel feed notes from the mockup', () => {
    const byId = new Map(boundaries!.checklist.map((c) => [c.id, c]));
    expect(byId.get('s1-boundaries-c3')!.feedHint).toBe(
      'Feeds Plan: Land use constraint map',
    );
    expect(byId.get('s1-boundaries-c4')!.feedHint).toBe(
      'Feeds Plan: Risk / Compliance overlay',
    );
    expect(byId.get('s1-boundaries-c5')!.feedHint).toBe(
      'Feeds Stratum 3: Water strategy',
    );
    // The map item carries no feed caption.
    expect(byId.get('s1-boundaries-c2')!.feedHint).toBeUndefined();
    expect(byId.get('s1-boundaries-c2')!.feedNote).toBeUndefined();
    // Title + all legal/permit items carry an in-panel feed note.
    expect(byId.get('s1-boundaries-c1')!.feedNote).toContain(
      'Land Base & Legal Context',
    );
    expect(byId.get('s1-boundaries-c7')!.feedNote).toContain(
      'prerequisites on Act handoff packages',
    );
  });
});

describe('catalogue conformance - Tier-1+ decision mode badge', () => {
  it('the optional mode field accepts a label and is absent-safe', () => {
    // With a mode label.
    expect(() =>
      PlanDecisionChecklistItemSchema.parse({
        id: 'x',
        label: 'y',
        feedsInto: [],
        optional: false,
        mode: 'Crop commitments',
      }),
    ).not.toThrow();
    // Without mode (regression guard: every existing item omits it).
    expect(() =>
      PlanDecisionChecklistItemSchema.parse({
        id: 'x',
        label: 'y',
        feedsInto: [],
        optional: false,
      }),
    ).not.toThrow();
    // An empty mode string is rejected (min(1)).
    expect(() =>
      PlanDecisionChecklistItemSchema.parse({
        id: 'x',
        label: 'y',
        feedsInto: [],
        optional: false,
        mode: '',
      }),
    ).toThrow();
  });

  // Representative mode per prototyped ecovillage objective, transcribed verbatim
  // from the OLOS prototype badges. Guards against checklist re-ordering silently
  // mis-attributing a badge to the wrong decision.
  const EXPECTED_MODES: Record<string, string> = {
    'ev-s2-social-fabric-c1': 'Relationship map',
    'ev-s2-social-fabric-c6': 'External networks',
    'ev-s3-energy-potential-c1': 'Capacity calc',
    'ev-s3-energy-potential-c6': 'Strategic choice',
    'ev-s3-infra-condition-c1': 'Inventory',
    'ev-s3-infra-condition-c5': 'Strategic choice',
    'ev-s4-settlement-strategy-c1': 'Cohort definition',
    'ev-s4-settlement-strategy-c6': 'Go/no-go gates',
    'ev-s4-food-system-c2': 'Crop commitments',
    'ev-s4-food-system-c6': 'Food governance',
    'ev-s4-financial-model-c1': 'Buy-in',
    'ev-s4-financial-model-c6': 'Member agreement',
  };

  it('attaches the verbatim prototype mode to the expected ecovillage items', () => {
    const itemById = new Map(
      ECOVILLAGE_PRIMARY_OBJECTIVES.flatMap((o) =>
        o.checklist.map((c) => [c.id, c] as const),
      ),
    );
    for (const [itemId, expectedMode] of Object.entries(EXPECTED_MODES)) {
      expect(itemById.get(itemId), itemId).toBeDefined();
      expect(itemById.get(itemId)!.mode, itemId).toBe(expectedMode);
    }
  });
});
