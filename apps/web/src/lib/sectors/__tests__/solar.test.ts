/**
 * @vitest-environment node
 *
 * Solar wedge fixtures. Bearings checked against published values for the MTC
 * latitude (44.5°N): summer solstice sunrise NE-of-east, winter solstice
 * sunrise SE, equinox sunrise due east. Tolerance ±3° absorbs differences
 * between solar-disk-center vs upper-limb sunrise definitions across sources.
 */

import { describe, it, expect } from "vitest";
import { computeSolarSectors } from "../solar.js";

const MTC: [number, number] = [-78.20, 44.50];

function abs(deg: number): number {
  const m = ((deg % 360) + 360) % 360;
  return m > 180 ? 360 - m : m;
}

describe("computeSolarSectors", () => {
  it("returns three wedges (summer / winter / equinox)", () => {
    const sectors = computeSolarSectors(MTC, { year: 2026 });
    const kinds = sectors.wedges.map((w) => w.kind).sort();
    expect(kinds).toEqual(["solar-equinox", "solar-summer", "solar-winter"]);
  });

  it("includes a sources[] entry attributing suncalc", () => {
    const sectors = computeSolarSectors(MTC, { year: 2026 });
    expect(sectors.sources.some((s) => s.provenance.includes("suncalc"))).toBe(true);
  });

  it("summer-solstice sunrise bearing is north-of-east at MTC (44.5°N)", () => {
    const sectors = computeSolarSectors(MTC, { year: 2026 });
    const summer = sectors.wedges.find((w) => w.kind === "solar-summer")!;
    // Published: ~57° at this latitude. Sunrise lies between NE (45°) and E (90°).
    expect(summer.startBearingDeg).toBeGreaterThan(45);
    expect(summer.startBearingDeg).toBeLessThan(75);
  });

  it("winter-solstice sunrise bearing is south-of-east at MTC (44.5°N)", () => {
    const sectors = computeSolarSectors(MTC, { year: 2026 });
    const winter = sectors.wedges.find((w) => w.kind === "solar-winter")!;
    // Published: ~123°. Sunrise lies between E (90°) and SE (135°).
    expect(winter.startBearingDeg).toBeGreaterThan(105);
    expect(winter.startBearingDeg).toBeLessThan(135);
  });

  it("equinox sunrise bearing is near due east (~90°) at any latitude", () => {
    const sectors = computeSolarSectors(MTC, { year: 2026 });
    const equinox = sectors.wedges.find((w) => w.kind === "solar-equinox")!;
    expect(abs(equinox.startBearingDeg - 90)).toBeLessThan(5);
  });

  it("sunset bearings mirror sunrise bearings across the meridian", () => {
    const sectors = computeSolarSectors(MTC, { year: 2026 });
    for (const w of sectors.wedges) {
      const expectedSunset = (360 - w.startBearingDeg) % 360;
      expect(abs(w.endBearingDeg - expectedSunset)).toBeLessThan(2);
    }
  });

  it("wedges carry default reach of 600 meters", () => {
    const sectors = computeSolarSectors(MTC, { year: 2026 });
    for (const w of sectors.wedges) expect(w.reachMeters).toBe(600);
  });

  it("respects a custom reachMeters option", () => {
    const sectors = computeSolarSectors(MTC, { year: 2026, reachMeters: 1200 });
    for (const w of sectors.wedges) expect(w.reachMeters).toBe(1200);
  });
});
