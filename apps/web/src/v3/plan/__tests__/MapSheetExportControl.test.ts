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
import { buildMapSheetPayload } from "../MapSheetExportControl.js";
import type { LandZone } from "../../../store/zoneStore.js";

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
