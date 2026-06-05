/**
 * @vitest-environment happy-dom
 *
 * MapSheetExportControl — A5 payload-shaping tests.
 *
 * Covers the pure `buildMapSheetPayload` branching per export type:
 *   - master_plan    → image + legend + full zone roster
 *   - zone_map_sheet → image + legend, NO zones[] (thin template ignores it)
 *   - base_map_sheet → image only, NO legend, NO zones[]
 *   - caption carries the right sheet label; exactly one map image
 *   - legend dedupes by category
 */

import { describe, expect, it } from "vitest";
import {
  buildMapSheetPayload,
  buildPlantingSchedule,
  buildPlantingPlanPayload,
} from "../MapSheetExportControl.js";
import type { LandZone } from "../../../store/zoneStore.js";
import type { Guild } from "../../../store/polycultureStore.js";
import type { CropArea } from "../../../store/cropStore.js";

const captured = {
  dataUrl: "data:image/png;base64,AAAA",
  widthPx: 1200,
  heightPx: 800,
};

function makeZone(overrides: Partial<LandZone>): LandZone {
  return {
    id: "z1",
    projectId: "p1",
    name: "Orchard",
    category: "food_production",
    color: "#6ba47a",
    primaryUse: "Fruit trees",
    secondaryUse: "",
    notes: "",
    geometry: { type: "Polygon", coordinates: [] },
    areaM2: 1000,
    permacultureZone: 2,
    phase: "phase-1",
    ...overrides,
  } as LandZone;
}

const zones = [
  makeZone({ id: "z1", category: "food_production", color: "#6ba47a" }),
  makeZone({ id: "z2", category: "habitation", color: "#c4a35a", name: "Homestead" }),
  // duplicate category → should collapse to a single legend entry
  makeZone({ id: "z3", category: "food_production", color: "#6ba47a", name: "Berry patch" }),
];

describe("buildMapSheetPayload", () => {
  it("master_plan: image + legend + full zone roster", () => {
    const { mapSheet } = buildMapSheetPayload("master_plan", captured, zones);
    expect(mapSheet.mapImages).toHaveLength(1);
    expect(mapSheet.legend).toBeDefined();
    expect(mapSheet.zones).toHaveLength(3);
    expect(mapSheet.zones?.[0]).toMatchObject({
      id: "z1",
      category: "food_production",
      permacultureZone: 2,
      phaseTag: "phase-1",
    });
  });

  it("zone_map_sheet: image + legend, but NO zone roster", () => {
    const { mapSheet } = buildMapSheetPayload("zone_map_sheet", captured, zones);
    expect(mapSheet.mapImages).toHaveLength(1);
    expect(mapSheet.legend).toBeDefined();
    expect("zones" in mapSheet).toBe(false);
  });

  it("base_map_sheet: image only, NO legend, NO zone roster", () => {
    const { mapSheet } = buildMapSheetPayload("base_map_sheet", captured, zones);
    expect(mapSheet.mapImages).toHaveLength(1);
    expect("legend" in mapSheet).toBe(false);
    expect("zones" in mapSheet).toBe(false);
  });

  it("legend dedupes by category", () => {
    const { mapSheet } = buildMapSheetPayload("zone_map_sheet", captured, zones);
    expect(mapSheet.legend).toHaveLength(2);
    expect(mapSheet.legend?.map((l) => l.label).sort()).toEqual([
      "Food Production",
      "Habitation",
    ]);
  });

  it("caption carries the sheet label + the single captured image", () => {
    const base = buildMapSheetPayload("base_map_sheet", captured, zones).mapSheet.mapImages[0]!;
    expect(base.caption).toContain("Base Map");
    expect(base.dataUrl).toBe(captured.dataUrl);

    const master = buildMapSheetPayload("master_plan", captured, zones).mapSheet.mapImages[0]!;
    expect(master.caption).toContain("Master Plan");

    const zone = buildMapSheetPayload("zone_map_sheet", captured, zones).mapSheet.mapImages[0]!;
    expect(zone.caption).toContain("Zone Map");
  });
});

function makeGuild(overrides: Partial<Guild>): Guild {
  return {
    id: "g1",
    projectId: "p1",
    name: "Apple guild",
    anchorSpeciesId: "black_walnut",
    members: [],
    createdAt: "2026-05-22T00:00:00.000Z",
    ...overrides,
  };
}

function makeCropArea(overrides: Partial<CropArea>): CropArea {
  return {
    id: "c1",
    projectId: "p1",
    name: "North orchard",
    color: "#6ba47a",
    type: "orchard",
    geometry: { type: "Polygon", coordinates: [] },
    areaM2: 2500,
    species: [],
    treeSpacingM: 6,
    rowSpacingM: 8,
    waterDemand: "medium",
    irrigationType: "drip",
    phase: "phase-1",
    notes: "",
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildPlantingSchedule", () => {
  it("resolves a known catalog id to common + latin name + spacing (guild anchor)", () => {
    const rows = buildPlantingSchedule([makeGuild({})], []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      species: "Black walnut",
      latinName: "Juglans nigra",
      layer: "canopy",
      source: "Apple guild",
      sourceKind: "guild",
      count: 1,
      spacingM: 12,
    });
  });

  it("dedupes guild members by species and counts them", () => {
    const guild = makeGuild({
      anchorSpeciesId: "black_walnut",
      members: [
        { speciesId: "black_walnut", layer: "canopy" },
        { speciesId: "comfrey_xyz", layer: "herbaceous" },
      ],
    });
    const rows = buildPlantingSchedule([guild], []);
    const walnut = rows.find((r) => r.species === "Black walnut")!;
    // anchor + one member of the same species → count 2
    expect(walnut.count).toBe(2);
    expect(rows).toHaveLength(2);
  });

  it("crop-area species: derives layer from crop type, carries area, passes raw text through", () => {
    const crop = makeCropArea({
      type: "row_crop",
      name: "Veg beds",
      species: ["some_unlisted_crop"],
      areaM2: 400,
      treeSpacingM: null,
    });
    const rows = buildPlantingSchedule([], [crop]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      species: "some_unlisted_crop",
      layer: "herbaceous",
      source: "Veg beds",
      sourceKind: "crop_area",
      areaM2: 400,
    });
    expect(rows[0]!.spacingM).toBeUndefined();
  });

  it("merges both sources into one schedule", () => {
    const rows = buildPlantingSchedule(
      [makeGuild({})],
      [makeCropArea({ species: ["apple"] })],
    );
    expect(rows.filter((r) => r.sourceKind === "guild")).toHaveLength(1);
    expect(rows.filter((r) => r.sourceKind === "crop_area")).toHaveLength(1);
  });
});

describe("buildPlantingPlanPayload", () => {
  it("returns plantingPlan (not mapSheet) with legend + schedule + one image", () => {
    const schedule = buildPlantingSchedule([makeGuild({})], []);
    const out = buildPlantingPlanPayload(captured, zones, schedule);
    expect("plantingPlan" in out).toBe(true);
    expect(out.plantingPlan.mapImages).toHaveLength(1);
    expect(out.plantingPlan.legend).toBeDefined();
    expect(out.plantingPlan.schedule).toHaveLength(1);
    expect(out.plantingPlan.mapImages[0]!.caption).toContain("Planting Plan");
  });
});
