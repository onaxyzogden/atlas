/**
 * dropDefaults — translate a v3 toolbox click + map click into a default
 * record for an existing v2 store.
 *
 * Phase 5.1 PR3. Per the scoping ADR (§2 "Persistence — read v2 stores,
 * write through them") v3 placements write into the same Zustand stores
 * that v2 surfaces consume, so a paddock dropped from the v3 Design
 * canvas appears in v2 surfaces and in scoring immediately.
 *
 * Each toolbox item maps to either:
 *   - { kind: "structure", record }  → useStructureStore.addStructure
 *   - { kind: "paddock", record }    → useLivestockStore.addPaddock
 *   - null                           → caller falls back to toast
 *
 * Click-to-drop only produces a *point* — paddocks/structures need
 * polygon geometry. We auto-buffer the click into a default-sized
 * footprint (per `STRUCTURE_TEMPLATES`) or a default 50 m square
 * (paddocks). The steward refines geometry in v3.2 (see ADR "Out of
 * scope" — editing).
 */

import type { Paddock } from "../../store/livestockStore.js";
import type { Structure, StructureType } from "../../store/structureStore.js";
import {
  STRUCTURE_TEMPLATES,
  createFootprintPolygon,
} from "../../features/structures/footprints.js";

type LngLat = [number, number];

export type DropResult =
  | { kind: "structure"; record: Structure }
  | { kind: "paddock"; record: Paddock }
  | null;

/**
 * Toolbox-item-id → Structure-store-type. Items not in this table may
 * still resolve via `PADDOCK_ITEMS` or fall through to null.
 */
const STRUCTURE_BY_TOOL: Record<string, StructureType> = {
  barn: "barn",
  yurt: "yurt",
  shelter: "pavilion",        // "Teaching Shelter" → pavilion footprint
  shed: "storage",
  musalla: "prayer_space",
  tank: "water_tank",
};

const PADDOCK_ITEMS = new Set<string>(["paddock", "rotation"]);

const DEFAULT_PADDOCK_SIDE_M = 50;

function squarePolygon(center: LngLat, sideM: number): GeoJSON.Polygon {
  // Reuse the structure footprint helper so paddocks share the same
  // metres-per-degree approximation as structures (consistent geometry).
  return createFootprintPolygon(center, sideM, sideM, 0);
}

function polygonAreaM2(geom: GeoJSON.Polygon): number {
  // Quick planar approximation. Good enough for PR3's auto-buffer
  // default; replaced by a Turf-based recompute when the steward edits
  // the polygon in v3.2.
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 3) return 0;
  const lat0 = ring[0]?.[1] ?? 0;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const ax = a[0]! * mPerDegLng;
    const ay = a[1]! * mPerDegLat;
    const bx = b[0]! * mPerDegLng;
    const by = b[1]! * mPerDegLat;
    area += ax * by - bx * ay;
  }
  return Math.abs(area) / 2;
}

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface DropContext {
  projectId: string;
  toolItemId: string;
  toolGroupId: string;
  toolLabel: string;
  position: LngLat;
}

export function buildDrop(ctx: DropContext): DropResult {
  const now = new Date().toISOString();

  const structureType = STRUCTURE_BY_TOOL[ctx.toolItemId];
  if (structureType) {
    const tmpl = STRUCTURE_TEMPLATES[structureType];
    const geometry = createFootprintPolygon(ctx.position, tmpl.widthM, tmpl.depthM, 0);
    const record: Structure = {
      id: id("v3struct"),
      projectId: ctx.projectId,
      name: tmpl.label,
      type: structureType,
      center: ctx.position,
      geometry,
      rotationDeg: 0,
      widthM: tmpl.widthM,
      depthM: tmpl.depthM,
      phase: "1",
      costEstimate: tmpl.costRange[0],
      infrastructureReqs: [...tmpl.infrastructureReqs],
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    return { kind: "structure", record };
  }

  if (PADDOCK_ITEMS.has(ctx.toolItemId)) {
    const geometry = squarePolygon(ctx.position, DEFAULT_PADDOCK_SIDE_M);
    const record: Paddock = {
      id: id("v3paddock"),
      projectId: ctx.projectId,
      name: ctx.toolItemId === "rotation" ? "Rotation Block" : "Paddock",
      color: "#7da37e",
      geometry,
      areaM2: polygonAreaM2(geometry),
      grazingCellGroup: null,
      species: [],
      stockingDensity: null,
      fencing: "post_wire",
      guestSafeBuffer: false,
      waterPointNote: "",
      shelterNote: "",
      phase: "1",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    return { kind: "paddock", record };
  }

  return null;
}
