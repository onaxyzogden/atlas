/**
 * RulesEngine.ts — comprehensive tests for all 15 siting rule checks.
 * Tests evaluateRules() with various ProjectState configurations.
 *
 * 6 feature-vs-feature rules + 9 environmental rules.
 */

import { describe, it, expect } from 'vitest';
import { evaluateRules, type ProjectState } from '../features/rules/RulesEngine.js';

// ── Geometry helpers ──

/** Simple polygon at a given center */
function makePolygon(lng: number, lat: number, sizeM: number = 50): GeoJSON.Polygon {
  const delta = sizeM / 111320;
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - delta, lat - delta],
      [lng + delta, lat - delta],
      [lng + delta, lat + delta],
      [lng - delta, lat + delta],
      [lng - delta, lat - delta],
    ]],
  };
}

function makeLine(points: [number, number][]): GeoJSON.LineString {
  return { type: 'LineString', coordinates: points };
}

// ── State builders ──

function emptyState(): ProjectState {
  return {
    hasBoundary: true,
    structures: [],
    zones: [],
    paddocks: [],
    crops: [],
    paths: [],
    utilities: [],
    siteData: null,
    projectCenter: [-79.5, 43.5],
    projectType: null,
  };
}

function makeStructure(overrides: Record<string, unknown> = {}) {
  const type = (overrides.type as string) ?? 'cabin';
  const lng = (overrides.lng as number) ?? -79.5;
  const lat = (overrides.lat as number) ?? 43.5;
  return {
    id: overrides.id ?? 's1',
    projectId: 'p1',
    name: overrides.name ?? 'Cabin',
    type,
    position: [lng, lat] as [number, number],
    center: [lng, lat] as [number, number],
    rotation: overrides.rotation ?? 0,
    rotationDeg: (overrides.rotationDeg as number) ?? 0,
    phase: overrides.phase ?? 'Phase 1',
    geometry: makePolygon(lng, lat),
    ...(overrides.extra ? overrides.extra as object : {}),
  } as any;
}

function makePaddock(overrides: Record<string, unknown> = {}) {
  const lng = (overrides.lng as number) ?? -79.5;
  const lat = (overrides.lat as number) ?? 43.5;
  return {
    id: overrides.id ?? 'pd1',
    projectId: 'p1',
    name: overrides.name ?? 'Paddock A',
    species: overrides.species ?? ['cattle'],
    geometry: makePolygon(lng, lat, (overrides.sizeM as number) ?? 100),
    areaM2: 10000,
    fencing: 'electric',
    phase: 'Phase 1',
    guestSafeBuffer: overrides.guestSafeBuffer ?? false,
  } as any;
}

function makeZone(overrides: Record<string, unknown> = {}) {
  const lng = (overrides.lng as number) ?? -79.5;
  const lat = (overrides.lat as number) ?? 43.5;
  return {
    id: overrides.id ?? 'z1',
    projectId: 'p1',
    name: overrides.name ?? 'Zone A',
    category: overrides.category ?? 'general',
    color: '#000',
    primaryUse: '',
    secondaryUse: '',
    notes: '',
    geometry: makePolygon(lng, lat, (overrides.sizeM as number) ?? 100),
    areaM2: 10000,
    createdAt: '',
    updatedAt: '',
  } as any;
}

function makePath(overrides: Record<string, unknown> = {}) {
  const lng = (overrides.lng as number) ?? -79.5;
  const lat = (overrides.lat as number) ?? 43.5;
  return {
    id: overrides.id ?? 'path1',
    projectId: 'p1',
    name: overrides.name ?? 'Main Road',
    type: overrides.type ?? 'main_road',
    geometry: (overrides.geometry as GeoJSON.LineString) ??
      makeLine([[lng - 0.01, lat - 0.01], [lng + 0.01, lat + 0.01]]),
    lengthM: 500,
    phase: 'Phase 1',
  } as any;
}

function makeUtility(overrides: Record<string, unknown> = {}) {
  const lng = (overrides.lng as number) ?? -79.5;
  const lat = (overrides.lat as number) ?? 43.5;
  return {
    id: overrides.id ?? 'u1',
    projectId: 'p1',
    name: overrides.name ?? 'Well',
    type: overrides.type ?? 'well_pump',
    center: [lng, lat] as [number, number],
    phase: 'Phase 1',
  } as any;
}

function makeCrop(overrides: Record<string, unknown> = {}) {
  const lng = (overrides.lng as number) ?? -79.5;
  const lat = (overrides.lat as number) ?? 43.5;
  return {
    id: overrides.id ?? 'c1',
    projectId: 'p1',
    name: overrides.name ?? 'Orchard',
    type: overrides.type ?? 'orchard',
    geometry: makePolygon(lng, lat, 100),
    areaM2: 5000,
    phase: 'Phase 1',
  } as any;
}

function baseSiteData(layerOverrides: Record<string, Record<string, unknown>> = {}) {
  return {
    layers: [
      {
        layer_type: 'elevation',
        fetch_status: 'complete',
        confidence: 'high',
        data_date: '2026-01-01',
        source_api: 'USGS 3DEP',
        attribution: 'USGS',
        summary: {
          mean_slope_deg: 5,
          max_slope_deg: 12,
          predominant_aspect: 'S',
          ...layerOverrides.elevation,
        },
      },
      {
        layer_type: 'soils',
        fetch_status: 'complete',
        confidence: 'high',
        data_date: '2026-01-01',
        source_api: 'SSURGO',
        attribution: 'USDA',
        summary: {
          drainage_class: 'Well drained',
          hydrologic_group: 'B',
          ...layerOverrides.soils,
        },
      },
      {
        layer_type: 'wetlands_flood',
        fetch_status: 'complete',
        confidence: 'medium',
        data_date: '2026-01-01',
        source_api: 'FEMA',
        attribution: 'FEMA',
        summary: {
          flood_zone: 'Zone X (minimal risk)',
          riparian_buffer_m: 30,
          ...layerOverrides.wetlands_flood,
        },
      },
      {
        layer_type: 'climate',
        fetch_status: 'complete',
        confidence: 'high',
        data_date: '2026-01-01',
        source_api: 'NOAA',
        attribution: 'NOAA',
        summary: {
          frost_free_days: 180,
          last_spring_frost: 'April 15',
          first_fall_frost: 'October 15',
          prevailing_wind: 'W',
          ...layerOverrides.climate,
        },
      },
      {
        layer_type: 'terrain_analysis',
        fetch_status: 'complete',
        confidence: 'medium',
        data_date: '2026-01-01',
        source_api: 'Derived',
        attribution: 'OGDEN',
        summary: {
          coldAirDrainage: { riskRating: 'low', poolingAreas: [] },
          ...layerOverrides.terrain_analysis,
        },
      },
      {
        layer_type: 'microclimate',
        fetch_status: 'complete',
        confidence: 'medium',
        data_date: '2026-01-01',
        source_api: 'Derived',
        attribution: 'OGDEN',
        summary: {
          windShelter: { shelteredAreaPct: 40 },
          ...layerOverrides.microclimate,
        },
      },
      {
        layer_type: 'watershed_derived',
        fetch_status: 'complete',
        confidence: 'medium',
        data_date: '2026-01-01',
        source_api: 'Derived',
        attribution: 'OGDEN',
        summary: {
          runoff: { meanAccumulation: 25 },
          ...layerOverrides.watershed_derived,
        },
      },
    ],
    isLive: false,
    liveCount: 0,
    fetchedAt: Date.now(),
    status: 'complete' as const,
  } as any;
}

// ── Tests ──

describe('evaluateRules', () => {
  // ═══════════════════════════════════════════
  //  Guards & edge cases
  // ═══════════════════════════════════════════

  describe('guards', () => {
    it('returns empty violations for empty state', () => {
      expect(evaluateRules(emptyState())).toEqual([]);
    });

    it('returns empty when hasBoundary is false', () => {
      const state = { ...emptyState(), hasBoundary: false };
      expect(evaluateRules(state)).toEqual([]);
    });

    it('sorts violations: error first, then warning, then info', () => {
      const state = emptyState();
      // Cabin without water/septic/power → warning + warning + info
      state.structures = [makeStructure({ type: 'cabin' })];
      const violations = evaluateRules(state);
      const severities = violations.map((v) => v.severity);
      for (let i = 1; i < severities.length; i++) {
        const order = { error: 0, warning: 1, info: 2 };
        expect(order[severities[i]!]).toBeGreaterThanOrEqual(order[severities[i - 1]!]);
      }
    });

    it('every violation has required properties', () => {
      const state = emptyState();
      state.structures = [makeStructure()];
      const violations = evaluateRules(state);
      for (const v of violations) {
        expect(v).toHaveProperty('ruleId');
        expect(v).toHaveProperty('severity');
        expect(v).toHaveProperty('category');
        expect(v).toHaveProperty('title');
        expect(v).toHaveProperty('description');
        expect(v).toHaveProperty('suggestion');
        expect(v).toHaveProperty('affectedElementId');
        expect(v).toHaveProperty('ruleWeightCategory');
        expect(v).toHaveProperty('dataSource');
        expect(['error', 'warning', 'info']).toContain(v.severity);
      }
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 1: Boundary setbacks / access to dwelling
  // ═══════════════════════════════════════════

  describe('checkBoundarySetbacks — access to dwelling', () => {
    it('warns when dwelling has no access road', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin', phase: 'Phase 1' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'access-to-dwelling');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
      expect(v!.category).toBe('access');
    });

    it('no violation when main_road exists', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin', phase: 'Phase 1' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'access-to-dwelling')).toBeUndefined();
    });

    it('no violation when secondary_road exists', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin', phase: 'Phase 1' })];
      state.paths = [makePath({ type: 'secondary_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'access-to-dwelling')).toBeUndefined();
    });

    it('skips non-dwelling structures', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'barn', phase: 'Phase 1' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'access-to-dwelling')).toBeUndefined();
    });

    it('skips dwellings not in Phase 1', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin', phase: 'Phase 2' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'access-to-dwelling')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 2: Livestock–spiritual buffers
  // ═══════════════════════════════════════════

  describe('checkLivestockSpiritualBuffers', () => {
    it('flags paddock near spiritual zone', () => {
      const state = emptyState();
      state.paddocks = [makePaddock()];
      state.zones = [makeZone({ category: 'spiritual', name: 'Prayer Garden' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'livestock-spiritual-buffer');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('info');
      expect(v!.category).toBe('buffer');
    });

    it('no spiritual buffer violation without spiritual zones', () => {
      const state = emptyState();
      state.paddocks = [makePaddock()];
      state.zones = [makeZone({ category: 'agricultural' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'livestock-spiritual-buffer')).toBeUndefined();
    });

    it('warns when paddock without guestSafeBuffer near retreat zone', () => {
      const state = emptyState();
      state.paddocks = [makePaddock({ guestSafeBuffer: false })];
      state.zones = [makeZone({ category: 'retreat' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'guest-safe-livestock');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
    });

    it('no guest-safe warning when paddock has guestSafeBuffer', () => {
      const state = emptyState();
      state.paddocks = [makePaddock({ guestSafeBuffer: true })];
      state.zones = [makeZone({ category: 'retreat' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'guest-safe-livestock')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 3: Water proximity
  // ═══════════════════════════════════════════

  describe('checkWaterProximity', () => {
    it('errors when livestock paddock has no water source', () => {
      const state = emptyState();
      state.paddocks = [makePaddock({ species: ['cattle'] })];
      // No utilities
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'livestock-water-source');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('error');
      expect(v!.category).toBe('water');
    });

    it('no error when water tank exists', () => {
      const state = emptyState();
      state.paddocks = [makePaddock({ species: ['cattle'] })];
      state.utilities = [makeUtility({ type: 'water_tank' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'livestock-water-source')).toBeUndefined();
    });

    it('no error when paddock has empty species array', () => {
      const state = emptyState();
      state.paddocks = [makePaddock({ species: [] })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'livestock-water-source')).toBeUndefined();
    });

    it('errors when well and septic are too close', () => {
      const state = emptyState();
      // Place well and septic only ~11m apart (< 30m minimum)
      state.utilities = [
        makeUtility({ id: 'well1', type: 'well_pump', lng: -79.5, lat: 43.5 }),
        makeUtility({ id: 'sep1', type: 'septic', lng: -79.5001, lat: 43.5 }),
      ];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'well-septic-distance');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('error');
    });

    it('no well-septic violation when distance is sufficient', () => {
      const state = emptyState();
      // ~111m apart (> 30m minimum)
      state.utilities = [
        makeUtility({ id: 'well1', type: 'well_pump', lng: -79.5, lat: 43.5 }),
        makeUtility({ id: 'sep1', type: 'septic', lng: -79.501, lat: 43.5 }),
      ];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'well-septic-distance')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 4: Infrastructure dependencies
  // ═══════════════════════════════════════════

  describe('checkInfrastructureDependencies', () => {
    it('warns dwelling needs water when no well/tank', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin' })];
      // Cabin requires water, septic, power
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-water')).toBeDefined();
    });

    it('warns dwelling needs septic when no septic', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-septic')).toBeDefined();
    });

    it('info: dwelling needs power when no solar/generator', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'dwelling-needs-power');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('info');
    });

    it('no infra violations when all utilities present', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin' })];
      state.paths = [makePath({ type: 'main_road' })]; // avoid access violations
      state.utilities = [
        makeUtility({ id: 'w1', type: 'well_pump' }),
        makeUtility({ id: 's1', type: 'septic', lng: -79.505, lat: 43.505 }),
        makeUtility({ id: 'p1', type: 'solar_panel', lng: -79.502, lat: 43.502 }),
      ];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-water')).toBeUndefined();
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-septic')).toBeUndefined();
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-power')).toBeUndefined();
    });

    it('earthship only requires water and septic, not power', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'earthship' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-water')).toBeDefined();
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-septic')).toBeDefined();
      // earthship has no 'power' requirement
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-power')).toBeUndefined();
    });

    it('yurt only requires power', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'yurt' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-power')).toBeDefined();
      // yurt has no 'water' or 'septic' requirement
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-water')).toBeUndefined();
      expect(violations.find((v) => v.ruleId === 'dwelling-needs-septic')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 5: Access requirements
  // ═══════════════════════════════════════════

  describe('checkAccessRequirements', () => {
    it('warns when structures exist but no paths', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'barn' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'no-access-paths');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
    });

    it('no violation when paths exist', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'barn' })];
      state.paths = [makePath({ type: 'pedestrian_path' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'no-access-paths')).toBeUndefined();
    });

    it('flags missing emergency access when >3 structures', () => {
      const state = emptyState();
      state.structures = [
        makeStructure({ id: 's1', type: 'barn' }),
        makeStructure({ id: 's2', type: 'workshop', lng: -79.501 }),
        makeStructure({ id: 's3', type: 'storage', lng: -79.502 }),
        makeStructure({ id: 's4', type: 'greenhouse', lng: -79.503 }),
      ];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'no-emergency-access');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('info');
    });

    it('no emergency access violation when emergency_access path exists', () => {
      const state = emptyState();
      state.structures = [
        makeStructure({ id: 's1' }),
        makeStructure({ id: 's2', lng: -79.501 }),
        makeStructure({ id: 's3', lng: -79.502 }),
        makeStructure({ id: 's4', lng: -79.503 }),
      ];
      state.paths = [
        makePath({ type: 'main_road' }),
        makePath({ id: 'p2', type: 'emergency_access' }),
      ];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'no-emergency-access')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 6: Guest privacy
  // ═══════════════════════════════════════════

  describe('checkGuestPrivacy', () => {
    it('flags guest accommodation too close to dwelling', () => {
      const state = emptyState();
      // tent_glamping and cabin at nearly the same location (< 25m)
      state.structures = [
        makeStructure({ id: 's1', type: 'tent_glamping', lng: -79.5, lat: 43.5 }),
        makeStructure({ id: 's2', type: 'cabin', lng: -79.5001, lat: 43.5 }),
      ];
      state.paths = [makePath({ type: 'main_road' })]; // avoid access violations
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'guest-privacy-buffer');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('info');
      expect(v!.category).toBe('privacy');
    });

    it('flags yurt too close to earthship', () => {
      const state = emptyState();
      state.structures = [
        makeStructure({ id: 's1', type: 'yurt', lng: -79.5, lat: 43.5 }),
        makeStructure({ id: 's2', type: 'earthship', lng: -79.5001, lat: 43.5 }),
      ];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'guest-privacy-buffer')).toBeDefined();
    });

    it('no privacy violation when structures are far apart', () => {
      const state = emptyState();
      // ~111m apart (> 25m)
      state.structures = [
        makeStructure({ id: 's1', type: 'tent_glamping', lng: -79.5, lat: 43.5 }),
        makeStructure({ id: 's2', type: 'cabin', lng: -79.501, lat: 43.5 }),
      ];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'guest-privacy-buffer')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 7: Slope violations
  // ═══════════════════════════════════════════

  describe('checkSlopeViolations', () => {
    it('skips when siteData is null', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'barn' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.category === 'slope')).toBeUndefined();
    });

    it('error when structure on slope > 25°', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { mean_slope_deg: 30 } });
      state.structures = [makeStructure({ type: 'barn' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'slope-structure' && v.severity === 'error');
      expect(v).toBeDefined();
    });

    it('warning when structure on slope 15°–25°', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { mean_slope_deg: 20 } });
      state.structures = [makeStructure({ type: 'barn' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'slope-structure' && v.severity === 'warning');
      expect(v).toBeDefined();
    });

    it('no slope violation when slope is gentle (< 15°)', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { mean_slope_deg: 8 } });
      state.structures = [makeStructure({ type: 'barn' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'slope-structure')).toBeUndefined();
    });

    it('error when road on slope > 15°', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { mean_slope_deg: 20 } });
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'slope-road' && v.severity === 'error');
      expect(v).toBeDefined();
    });

    it('warning when road on slope 10°–15°', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { mean_slope_deg: 12 } });
      state.paths = [makePath({ type: 'secondary_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'slope-road' && v.severity === 'warning');
      expect(v).toBeDefined();
    });

    it('warning when paddock on slope > 15°', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { mean_slope_deg: 18 } });
      state.paddocks = [makePaddock()];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'slope-grazing' && v.severity === 'warning');
      expect(v).toBeDefined();
    });

    it('info when paddock on moderate slope 10°–15°', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { mean_slope_deg: 12 } });
      state.paddocks = [makePaddock()];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'slope-grazing' && v.severity === 'info');
      expect(v).toBeDefined();
    });

    it('no slope violation when slope is 0', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { mean_slope_deg: 0 } });
      state.structures = [makeStructure({ type: 'barn' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.category === 'slope')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 8: Flood zone violations
  // ═══════════════════════════════════════════

  describe('checkFloodZoneViolations', () => {
    it('skips when no siteData', () => {
      const state = emptyState();
      state.structures = [makeStructure({ type: 'cabin' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.category === 'flood')).toBeUndefined();
    });

    it('errors for structure in Zone A flood zone', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ wetlands_flood: { flood_zone: 'Zone A (high risk)' } });
      state.structures = [makeStructure({ type: 'cabin' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'flood-zone');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('error');
    });

    it('errors for structure in 100-year flood zone', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ wetlands_flood: { flood_zone: '100-year floodplain' } });
      state.structures = [makeStructure({ type: 'cabin' })]; // cabin is restricted type
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'flood-zone')).toBeDefined();
    });

    it('no flood violation for Zone X (minimal risk)', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ wetlands_flood: { flood_zone: 'Zone X (minimal risk)' } });
      state.structures = [makeStructure({ type: 'cabin' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'flood-zone')).toBeUndefined();
    });

    it('does not flag non-restricted structure types', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ wetlands_flood: { flood_zone: 'Zone A (high risk)' } });
      // fire_circle is not in FLOOD_SETBACK_RULES.restricted_types
      state.structures = [makeStructure({ type: 'fire_circle' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'flood-zone')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 9: Frost pocket violations
  // ═══════════════════════════════════════════

  describe('checkFrostPocketViolations', () => {
    it('warns for frost-sensitive crop in high-risk area', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        terrain_analysis: { coldAirDrainage: { riskRating: 'high', poolingAreas: [] } },
      });
      state.crops = [makeCrop({ type: 'orchard', name: 'Apple Orchard' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'frost-pocket');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
    });

    it('flags food_forest and vineyard as frost-sensitive', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        terrain_analysis: { coldAirDrainage: { riskRating: 'high', poolingAreas: [] } },
      });
      state.crops = [
        makeCrop({ id: 'c1', type: 'food_forest' }),
        makeCrop({ id: 'c2', type: 'vineyard', lng: -79.501 }),
        makeCrop({ id: 'c3', type: 'nursery', lng: -79.502 }),
      ];
      const violations = evaluateRules(state);
      const frostViolations = violations.filter((v) => v.ruleId === 'frost-pocket');
      expect(frostViolations).toHaveLength(3);
    });

    it('no frost violation for low-risk area', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        terrain_analysis: { coldAirDrainage: { riskRating: 'low' } },
      });
      state.crops = [makeCrop({ type: 'orchard' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'frost-pocket')).toBeUndefined();
    });

    it('no frost violation for non-sensitive crop types', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        terrain_analysis: { coldAirDrainage: { riskRating: 'high' } },
      });
      state.crops = [makeCrop({ type: 'annual_garden' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'frost-pocket')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 10: Solar orientation + Qibla
  // ═══════════════════════════════════════════

  describe('checkSolarOrientationViolations', () => {
    it('flags dwelling on non-optimal aspect (N)', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { predominant_aspect: 'N' } });
      state.structures = [makeStructure({ type: 'cabin' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'solar-orientation');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('info');
      expect(v!.category).toBe('solar');
    });

    it('no solar violation for S aspect', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { predominant_aspect: 'S' } });
      state.structures = [makeStructure({ type: 'cabin' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'solar-orientation')).toBeUndefined();
    });

    it('no solar violation for SE aspect', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { predominant_aspect: 'SE' } });
      state.structures = [makeStructure({ type: 'cabin' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'solar-orientation')).toBeUndefined();
    });

    it('flags greenhouse on non-optimal aspect', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { predominant_aspect: 'NW' } });
      state.structures = [makeStructure({ type: 'greenhouse' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'solar-orientation')).toBeDefined();
    });

    it('does not flag barn on non-optimal aspect (non-dwelling type)', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ elevation: { predominant_aspect: 'N' } });
      state.structures = [makeStructure({ type: 'barn' })]; // barn is not in SOLAR_RULES.dwelling_types
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'solar-orientation')).toBeUndefined();
    });

    it('flags prayer space misaligned from Qibla', () => {
      const state = emptyState();
      state.projectCenter = [-79.5, 43.5];
      // Prayer space rotated to 0° — Qibla from Ontario is ~55°, well over 15° off
      state.structures = [makeStructure({ type: 'prayer_space', rotationDeg: 0 })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'prayer-qibla-alignment');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('info');
      expect(v!.category).toBe('spiritual');
    });

    it('no Qibla violation when prayer space aligned correctly', () => {
      const state = emptyState();
      state.projectCenter = [-79.5, 43.5];
      // Qibla from Ontario ~55°, set rotation to match
      state.structures = [makeStructure({ type: 'prayer_space', rotationDeg: 55 })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'prayer-qibla-alignment')).toBeUndefined();
    });

    it('skips Qibla check when projectCenter is null', () => {
      const state = emptyState();
      state.projectCenter = null;
      state.structures = [makeStructure({ type: 'prayer_space', rotationDeg: 0 })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'prayer-qibla-alignment')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 11: Wind shelter
  // ═══════════════════════════════════════════

  describe('checkWindShelterViolations', () => {
    it('warns for dwelling in wind-exposed area (< 20% shelter)', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        microclimate: { windShelter: { shelteredAreaPct: 10 } },
      });
      state.structures = [makeStructure({ type: 'cabin' })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'wind-shelter');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
      expect(v!.category).toBe('wind');
    });

    it('flags tent_glamping in exposed area', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        microclimate: { windShelter: { shelteredAreaPct: 5 } },
      });
      state.structures = [makeStructure({ type: 'tent_glamping' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'wind-shelter')).toBeDefined();
    });

    it('no violation when shelter is adequate (>= 20%)', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        microclimate: { windShelter: { shelteredAreaPct: 40 } },
      });
      state.structures = [makeStructure({ type: 'cabin' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'wind-shelter')).toBeUndefined();
    });

    it('skips when microclimate data absent', () => {
      const state = emptyState();
      // Remove microclimate layer
      state.siteData = {
        ...baseSiteData(),
        layers: baseSiteData().layers.filter((l: any) => l.layer_type !== 'microclimate'),
      };
      state.structures = [makeStructure({ type: 'cabin' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'wind-shelter')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 12: Drainage
  // ═══════════════════════════════════════════

  describe('checkDrainageViolations', () => {
    it('warns for orchard in poorly drained soil', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ soils: { drainage_class: 'Poorly drained' } });
      state.crops = [makeCrop({ type: 'orchard' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'drainage-orchard');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
      expect(v!.category).toBe('drainage');
    });

    it('warns for food_forest in very poorly drained soil', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ soils: { drainage_class: 'Very poorly drained' } });
      state.crops = [makeCrop({ type: 'food_forest' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'drainage-orchard')).toBeDefined();
    });

    it('no drainage violation for well drained soil', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ soils: { drainage_class: 'Well drained' } });
      state.crops = [makeCrop({ type: 'orchard' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'drainage-orchard')).toBeUndefined();
    });

    it('no drainage violation for non-sensitive crop types', () => {
      const state = emptyState();
      state.siteData = baseSiteData({ soils: { drainage_class: 'Poorly drained' } });
      state.crops = [makeCrop({ type: 'annual_garden' })]; // not in sensitive_types
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'drainage-orchard')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 13: Flow accumulation
  // ═══════════════════════════════════════════

  describe('checkFlowAccumulationViolations', () => {
    it('flags water zone with low flow accumulation', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        watershed_derived: { runoff: { meanAccumulation: 8 } },
      });
      state.zones = [makeZone({ category: 'water_retention', name: 'Pond' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'flow-accumulation');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('info');
    });

    it('no flow violation when accumulation is adequate', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        watershed_derived: { runoff: { meanAccumulation: 25 } },
      });
      state.zones = [makeZone({ category: 'water_retention' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'flow-accumulation')).toBeUndefined();
    });

    it('warns structure too close to water zone (spillway clearance)', () => {
      const state = emptyState();
      state.siteData = baseSiteData({
        watershed_derived: { runoff: { meanAccumulation: 5 } },
      });
      // Water zone and structure at same location (< 30m)
      state.zones = [makeZone({ category: 'water_retention', lng: -79.5, lat: 43.5 })];
      state.structures = [makeStructure({ type: 'barn', lng: -79.5001, lat: 43.5 })];
      state.paths = [makePath({ type: 'main_road' })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'water-structure-clearance');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
    });

    it('skips when watershed_derived layer absent', () => {
      const state = emptyState();
      state.siteData = {
        ...baseSiteData(),
        layers: baseSiteData().layers.filter((l: any) => l.layer_type !== 'watershed_derived'),
      };
      state.zones = [makeZone({ category: 'water_retention' })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'flow-accumulation')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 14: Sacred zone buffers
  // ═══════════════════════════════════════════

  describe('checkSacredZoneBuffers', () => {
    it('warns spiritual zone too close to road', () => {
      const state = emptyState();
      // Spiritual zone and road start at ~same location (< 80m)
      state.zones = [makeZone({ category: 'spiritual', name: 'Prayer Garden', lng: -79.5, lat: 43.5 })];
      state.paths = [makePath({
        type: 'main_road',
        geometry: makeLine([[-79.5002, 43.5], [-79.499, 43.5]]),
      })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'sacred-noise-road');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
      expect(v!.category).toBe('spiritual');
    });

    it('no road buffer violation when road is far away', () => {
      const state = emptyState();
      state.zones = [makeZone({ category: 'spiritual', lng: -79.5, lat: 43.5 })];
      // Road ~1km away
      state.paths = [makePath({
        type: 'main_road',
        geometry: makeLine([[-79.51, 43.51], [-79.52, 43.52]]),
      })];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'sacred-noise-road')).toBeUndefined();
    });

    it('warns spiritual zone too close to livestock', () => {
      const state = emptyState();
      // Same location (< 50m buffer)
      state.zones = [makeZone({ category: 'spiritual', lng: -79.5, lat: 43.5 })];
      state.paddocks = [makePaddock({ lng: -79.5001, lat: 43.5 })];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'sacred-noise-livestock');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
    });

    it('flags spiritual zone close to infrastructure zone', () => {
      const state = emptyState();
      // Same location (< 40m buffer)
      state.zones = [
        makeZone({ id: 'z1', category: 'spiritual', lng: -79.5, lat: 43.5 }),
        makeZone({ id: 'z2', category: 'infrastructure', lng: -79.5001, lat: 43.5 }),
      ];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'sacred-noise-infrastructure');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('info');
    });

    it('no violations when no spiritual zones', () => {
      const state = emptyState();
      state.zones = [makeZone({ category: 'agricultural' })];
      state.paths = [makePath({ type: 'main_road' })];
      state.paddocks = [makePaddock()];
      const violations = evaluateRules(state);
      const sacredViolations = violations.filter((v) => v.ruleId?.startsWith('sacred-'));
      expect(sacredViolations).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════
  //  RULE 15: Guest circulation
  // ═══════════════════════════════════════════

  describe('checkGuestCirculationViolations', () => {
    it('skips for non-applicable project types', () => {
      const state = emptyState();
      state.projectType = 'regenerative_farm';
      state.paths = [
        makePath({ id: 'p1', type: 'arrival_sequence', geometry: makeLine([[-79.5, 43.5], [-79.499, 43.5]]) }),
        makePath({ id: 'p2', type: 'service_road', geometry: makeLine([[-79.5, 43.5], [-79.499, 43.5]]) }),
      ];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'guest-circulation-conflict')).toBeUndefined();
    });

    it('skips when projectType is null', () => {
      const state = emptyState();
      state.projectType = null;
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'guest-circulation-conflict')).toBeUndefined();
    });

    it('warns when guest path crosses service path in retreat_center', () => {
      const state = emptyState();
      state.projectType = 'retreat_center';
      // Paths that share coordinate points within 5m — use same midpoint
      state.paths = [
        makePath({
          id: 'p1',
          type: 'arrival_sequence',
          name: 'Guest Arrival',
          geometry: makeLine([[-79.5, 43.5], [-79.4995, 43.5005], [-79.499, 43.501]]),
        }),
        makePath({
          id: 'p2',
          type: 'service_road',
          name: 'Farm Service',
          geometry: makeLine([[-79.5, 43.501], [-79.4995, 43.5005], [-79.499, 43.5]]),
        }),
      ];
      const violations = evaluateRules(state);
      const v = violations.find((v) => v.ruleId === 'guest-circulation-conflict');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('warning');
      expect(v!.category).toBe('circulation');
    });

    it('applies to moontrance project type too', () => {
      const state = emptyState();
      state.projectType = 'moontrance';
      // Crossing paths — share a coordinate point
      state.paths = [
        makePath({
          id: 'p1',
          type: 'pedestrian_path',
          geometry: makeLine([[-79.5, 43.5], [-79.4995, 43.5005], [-79.499, 43.501]]),
        }),
        makePath({
          id: 'p2',
          type: 'farm_lane',
          geometry: makeLine([[-79.5, 43.501], [-79.4995, 43.5005], [-79.499, 43.5]]),
        }),
      ];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'guest-circulation-conflict')).toBeDefined();
    });

    it('no circulation violation when paths do not cross', () => {
      const state = emptyState();
      state.projectType = 'retreat_center';
      // Paths that are far apart
      state.paths = [
        makePath({
          id: 'p1',
          type: 'arrival_sequence',
          geometry: makeLine([[-79.5, 43.5], [-79.499, 43.5]]),
        }),
        makePath({
          id: 'p2',
          type: 'service_road',
          geometry: makeLine([[-79.51, 43.51], [-79.52, 43.52]]),
        }),
      ];
      const violations = evaluateRules(state);
      expect(violations.find((v) => v.ruleId === 'guest-circulation-conflict')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  //  Integration: complex state
  // ═══════════════════════════════════════════

  describe('complex state integration', () => {
    it('returns multiple violation types for a realistic state', () => {
      const state = emptyState();
      state.projectType = 'retreat_center';
      state.siteData = baseSiteData({
        elevation: { mean_slope_deg: 20, predominant_aspect: 'N' },
        soils: { drainage_class: 'Poorly drained' },
        wetlands_flood: { flood_zone: 'Zone A (high risk)' },
      });
      state.structures = [
        makeStructure({ id: 's1', type: 'cabin' }),
        makeStructure({ id: 's2', type: 'prayer_space', rotationDeg: 0, lng: -79.501 }),
      ];
      state.paddocks = [makePaddock({ species: ['goats'], lng: -79.5001, lat: 43.5 })];
      state.zones = [
        makeZone({ id: 'z1', category: 'spiritual', lng: -79.5, lat: 43.5 }),
        makeZone({ id: 'z2', category: 'retreat', lng: -79.502 }),
      ];
      state.crops = [makeCrop({ type: 'orchard', lng: -79.503 })];

      const violations = evaluateRules(state);
      expect(violations.length).toBeGreaterThan(5);

      // Should have violations from multiple categories
      const categories = new Set(violations.map((v) => v.category));
      expect(categories.size).toBeGreaterThan(3);
    });
  });
});
