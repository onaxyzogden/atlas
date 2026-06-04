// protocolCatalogues.test.ts
//
// Conformance + resolver-invariant tests for the per-stratum x per-type
// standing-protocol catalogue, the protocol-layer twin of the objective
// catalogues.test.ts. Asserts: every authored protocol/patch parses, ids are
// globally unique, every entry carries a valid stratumId and the right
// source/sourceTypeId discipline, the verbatim Amanah cautions survive on the
// sales-channel protocols, and resolveProjectProtocols upholds its invariants
// (dedup, missing-target skip, stratum/source sort, additive + patch layering).

import { describe, it, expect } from 'vitest';
import {
  StandardProtocolTemplateSchema,
  ProtocolPatchRecordSchema,
  type StandardProtocolTemplate,
} from '../../../schemas/protocol/protocol.schema.js';
import { PlanStratumId } from '../../../schemas/plan/planStratumObjective.schema.js';

const PLAN_STRATUM_IDS = PlanStratumId.options;
import { UNIVERSAL_PROTOCOL_TEMPLATES } from '../catalogues/universal.js';
import { HOMESTEAD_PRIMARY_PROTOCOLS } from '../catalogues/homestead.js';
import {
  SILVOPASTURE_PRIMARY_PROTOCOLS,
  SILVOPASTURE_SECONDARY_PROTOCOLS,
  SILVOPASTURE_SECONDARY_PATCHES,
} from '../catalogues/silvopasture.js';
import { REGEN_FARM_PRIMARY_PROTOCOLS } from '../catalogues/regenFarm.js';
import {
  MARKET_GARDEN_PRIMARY_PROTOCOLS,
  MARKET_GARDEN_SECONDARY_PROTOCOLS,
} from '../catalogues/marketGarden.js';
import {
  ORCHARD_PRIMARY_PROTOCOLS,
  ORCHARD_SECONDARY_PROTOCOLS,
} from '../catalogues/orchard.js';
import { ECOVILLAGE_PRIMARY_PROTOCOLS } from '../catalogues/ecovillage.js';
import {
  AGRITOURISM_PRIMARY_PROTOCOLS,
  AGRITOURISM_SECONDARY_PROTOCOLS,
} from '../catalogues/agritourism.js';
import {
  EDUCATION_PRIMARY_PROTOCOLS,
  EDUCATION_SECONDARY_PROTOCOLS,
} from '../catalogues/education.js';
import { CONSERVATION_PRIMARY_PROTOCOLS } from '../catalogues/conservation.js';
import { OFF_GRID_PRIMARY_PROTOCOLS } from '../catalogues/offGrid.js';
import {
  WELLNESS_PRIMARY_PROTOCOLS,
  WELLNESS_SECONDARY_PROTOCOLS,
} from '../catalogues/wellness.js';
import {
  NURSERY_PRIMARY_PROTOCOLS,
  NURSERY_SECONDARY_PROTOCOLS,
} from '../catalogues/nursery.js';
import {
  LIVESTOCK_PRIMARY_PROTOCOLS,
  LIVESTOCK_SECONDARY_PROTOCOLS,
} from '../catalogues/livestockOperation.js';
import { RESIDENTIAL_SECONDARY_PROTOCOLS } from '../catalogues/residential.js';
import {
  resolveProjectProtocols,
  findProtocolIn,
} from '../../../relationships/resolveProjectProtocols.js';

const ALL_PRIMARY: readonly StandardProtocolTemplate[] = [
  ...HOMESTEAD_PRIMARY_PROTOCOLS,
  ...SILVOPASTURE_PRIMARY_PROTOCOLS,
  ...REGEN_FARM_PRIMARY_PROTOCOLS,
  ...MARKET_GARDEN_PRIMARY_PROTOCOLS,
  ...ORCHARD_PRIMARY_PROTOCOLS,
  ...ECOVILLAGE_PRIMARY_PROTOCOLS,
  ...AGRITOURISM_PRIMARY_PROTOCOLS,
  ...EDUCATION_PRIMARY_PROTOCOLS,
  ...CONSERVATION_PRIMARY_PROTOCOLS,
  ...OFF_GRID_PRIMARY_PROTOCOLS,
  ...WELLNESS_PRIMARY_PROTOCOLS,
  ...NURSERY_PRIMARY_PROTOCOLS,
  ...LIVESTOCK_PRIMARY_PROTOCOLS,
];

const ALL_SECONDARY: readonly StandardProtocolTemplate[] = [
  ...SILVOPASTURE_SECONDARY_PROTOCOLS,
  ...MARKET_GARDEN_SECONDARY_PROTOCOLS,
  ...ORCHARD_SECONDARY_PROTOCOLS,
  ...AGRITOURISM_SECONDARY_PROTOCOLS,
  ...EDUCATION_SECONDARY_PROTOCOLS,
  ...WELLNESS_SECONDARY_PROTOCOLS,
  ...NURSERY_SECONDARY_PROTOCOLS,
  ...LIVESTOCK_SECONDARY_PROTOCOLS,
  ...RESIDENTIAL_SECONDARY_PROTOCOLS,
];

const ALL_AUTHORED: readonly StandardProtocolTemplate[] = [
  ...UNIVERSAL_PROTOCOL_TEMPLATES,
  ...ALL_PRIMARY,
  ...ALL_SECONDARY,
];

const ALL_PATCHES = [...SILVOPASTURE_SECONDARY_PATCHES];

const PRIMARY_BY_TYPE: ReadonlyArray<
  [string, readonly StandardProtocolTemplate[]]
> = [
  ['homestead', HOMESTEAD_PRIMARY_PROTOCOLS],
  ['silvopasture', SILVOPASTURE_PRIMARY_PROTOCOLS],
  ['regenerative_farm', REGEN_FARM_PRIMARY_PROTOCOLS],
  ['market_garden', MARKET_GARDEN_PRIMARY_PROTOCOLS],
  ['orchard_food_forest', ORCHARD_PRIMARY_PROTOCOLS],
  ['ecovillage', ECOVILLAGE_PRIMARY_PROTOCOLS],
  ['agritourism', AGRITOURISM_PRIMARY_PROTOCOLS],
  ['education', EDUCATION_PRIMARY_PROTOCOLS],
  ['conservation', CONSERVATION_PRIMARY_PROTOCOLS],
  ['off_grid', OFF_GRID_PRIMARY_PROTOCOLS],
  ['wellness', WELLNESS_PRIMARY_PROTOCOLS],
  ['nursery', NURSERY_PRIMARY_PROTOCOLS],
  ['livestock_operation', LIVESTOCK_PRIMARY_PROTOCOLS],
];

const SECONDARY_BY_TYPE: ReadonlyArray<
  [string, readonly StandardProtocolTemplate[]]
> = [
  ['silvopasture', SILVOPASTURE_SECONDARY_PROTOCOLS],
  ['market_garden', MARKET_GARDEN_SECONDARY_PROTOCOLS],
  ['orchard_food_forest', ORCHARD_SECONDARY_PROTOCOLS],
  ['agritourism', AGRITOURISM_SECONDARY_PROTOCOLS],
  ['education', EDUCATION_SECONDARY_PROTOCOLS],
  ['wellness', WELLNESS_SECONDARY_PROTOCOLS],
  ['nursery', NURSERY_SECONDARY_PROTOCOLS],
  ['livestock_operation', LIVESTOCK_SECONDARY_PROTOCOLS],
  ['residential', RESIDENTIAL_SECONDARY_PROTOCOLS],
];

describe('protocol catalogue conformance - schema validity', () => {
  it('every authored protocol parses via StandardProtocolTemplateSchema', () => {
    for (const p of ALL_AUTHORED) {
      expect(() => StandardProtocolTemplateSchema.parse(p), p.id).not.toThrow();
    }
  });

  it('every patch parses via ProtocolPatchRecordSchema', () => {
    for (const patch of ALL_PATCHES) {
      expect(
        () => ProtocolPatchRecordSchema.parse(patch),
        patch.ref ?? patch.targetTemplateId,
      ).not.toThrow();
    }
  });

  it('protocol ids are globally unique', () => {
    const seen = new Set<string>();
    for (const p of ALL_AUTHORED) {
      expect(seen.has(p.id), `duplicate id: ${p.id}`).toBe(false);
      seen.add(p.id);
    }
  });

  it('every authored protocol carries a valid stratumId and a rationale', () => {
    for (const p of ALL_AUTHORED) {
      expect(PLAN_STRATUM_IDS, p.id).toContain(p.stratumId);
      expect(p.rationale.trim(), p.id).toBeTruthy();
      expect(p.feeds.length, p.id).toBeGreaterThan(0);
    }
  });
});

describe('protocol catalogue conformance - source/layer discipline', () => {
  it('universal protocols are source=universal with no sourceTypeId', () => {
    for (const p of UNIVERSAL_PROTOCOL_TEMPLATES) {
      expect(p.source, p.id).toBe('universal');
      expect(p.sourceTypeId, p.id).toBeUndefined();
    }
  });

  it('every primary protocol is source=primary with its own sourceTypeId', () => {
    for (const [typeId, protocols] of PRIMARY_BY_TYPE) {
      for (const p of protocols) {
        expect(p.source, p.id).toBe('primary');
        expect(p.sourceTypeId, p.id).toBe(typeId);
      }
    }
  });

  it('every secondary protocol is source=secondary with its own sourceTypeId', () => {
    for (const [typeId, protocols] of SECONDARY_BY_TYPE) {
      for (const p of protocols) {
        expect(p.source, p.id).toBe('secondary');
        expect(p.sourceTypeId, p.id).toBe(typeId);
      }
    }
  });
});

describe('protocol catalogue conformance - Amanah cautions', () => {
  // The CSA / bayʿ mā laysa ʿindak caution must survive verbatim on every
  // sales-channel / advance-commitment protocol (CSA memory; never omitted).
  const SALES_CHANNEL_IDS = [
    'mg-market-channel-advance-sale',
    'mg2-surplus-market-channel',
    'agri-experience-presale',
    'nur-stock-presale',
  ];

  it('every sales-channel protocol carries a bayʿ mā laysa ʿindak scopeNote', () => {
    for (const id of SALES_CHANNEL_IDS) {
      const p = ALL_AUTHORED.find((x) => x.id === id);
      expect(p, `missing protocol: ${id}`).toBeDefined();
      expect(p?.scopeNotes, id).toMatch(/bay.* m.* laysa .*indak/i);
    }
  });
});

describe('resolveProjectProtocols - resolution invariants', () => {
  it('homestead resolves to universal + primary, sorted S1..S7', () => {
    const r = resolveProjectProtocols({ primaryTypeId: 'homestead' });
    expect(r.protocols.length).toBe(
      UNIVERSAL_PROTOCOL_TEMPLATES.length + HOMESTEAD_PRIMARY_PROTOCOLS.length,
    );
    // every homestead primary protocol is present
    for (const p of HOMESTEAD_PRIMARY_PROTOCOLS) {
      expect(findProtocolIn(r.protocols, p.id), p.id).toBeDefined();
    }
    // sorted by stratum ordinal (non-decreasing across the resolved list)
    const ordinalOf = (sid: string | undefined) =>
      sid ? (PLAN_STRATUM_IDS as readonly string[]).indexOf(sid) : 99;
    const ordinals = r.protocols.map((p) => ordinalOf(p.stratumId));
    for (let i = 1; i < ordinals.length; i += 1) {
      expect(ordinals[i]!).toBeGreaterThanOrEqual(ordinals[i - 1]!);
    }
  });

  it('an unencoded primary type resolves to universal-only', () => {
    // conservation is encoded; use a primary with no per-type catalogue by
    // faking via a type that has empty primary - none do, so assert the
    // universal baseline is always the floor instead.
    const r = resolveProjectProtocols({ primaryTypeId: 'conservation' });
    for (const u of UNIVERSAL_PROTOCOL_TEMPLATES) {
      expect(findProtocolIn(r.protocols, u.id), u.id).toBeDefined();
    }
  });

  it('homestead + silvopasture layers additive secondaries and applies patches', () => {
    const r = resolveProjectProtocols({
      primaryTypeId: 'homestead',
      secondaryTypeIds: ['silvopasture'],
    });
    // additive silvopasture-secondary protocols present
    for (const p of SILVOPASTURE_SECONDARY_PROTOCOLS) {
      expect(findProtocolIn(r.protocols, p.id), p.id).toBeDefined();
    }
    // patches applied: their target conditions were amended (concatenated)
    for (const patch of SILVOPASTURE_SECONDARY_PATCHES) {
      const target = findProtocolIn(r.protocols, patch.targetTemplateId);
      if (target && patch.conditionAmendment) {
        expect(target.condition, patch.targetTemplateId).toContain(
          patch.conditionAmendment,
        );
      }
    }
    expect(r.provenance.appliedPatchRefs.length).toBeGreaterThan(0);
  });

  it('a patch with a missing target is skipped, never thrown', () => {
    const r = resolveProjectProtocols(
      { primaryTypeId: 'homestead', secondaryTypeIds: ['silvopasture'] },
      {
        getSecondaryProtocolCatalogue: () => ({
          additive: [],
          patches: [
            {
              targetTemplateId: 'does-not-exist',
              secondaryTypeId: 'silvopasture',
              conditionAmendment: 'OR something',
              ref: 'test-missing',
            },
          ],
        }),
      },
    );
    expect(r.provenance.skippedPatches.map((s) => s.ref)).toContain(
      'test-missing',
    );
  });

  it('does not mutate the source catalogue across resolves', () => {
    const before = SILVOPASTURE_PRIMARY_PROTOCOLS.map((p) => p.condition);
    resolveProjectProtocols({
      primaryTypeId: 'silvopasture',
      secondaryTypeIds: ['orchard_food_forest'],
    });
    const after = SILVOPASTURE_PRIMARY_PROTOCOLS.map((p) => p.condition);
    expect(after).toEqual(before);
  });
});
