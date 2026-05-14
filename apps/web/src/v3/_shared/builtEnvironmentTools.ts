/**
 * builtEnvironmentTools — single source of truth for the Built Environment
 * left-rail tool list shared by Observe (`ObserveTools`) and Plan
 * (`PlanTools`). Both rails surface the same kinds in the same order with
 * the same labels + icons; only the `toolId` prefix differs per stage.
 *
 * The list is derived from the canonical `BUILT_ENVIRONMENT_KINDS` registry
 * in `@ogden/shared`. Adding a kind to the registry surfaces it in both
 * rails automatically.
 */

import {
  AlertTriangle,
  BookOpen,
  Box,
  Cable,
  DoorOpen,
  Droplet,
  Droplets,
  Eye,
  Fence,
  Flame,
  Fuel,
  Home,
  Leaf,
  Minus,
  Mountain,
  Recycle,
  Route,
  Sparkles,
  Sprout,
  Square,
  Sun,
  Tent,
  TreeDeciduous,
  TreePine,
  Trees,
  Truck,
  Warehouse,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  BUILT_ENVIRONMENT_KINDS,
  type BuiltEnvironmentCategory,
} from '@ogden/shared';
import type { GuidanceCardData } from './components/GuidanceCard.js';

/** Resolves a registry `icon` string to its Lucide component.
 *  Unknown names fall back to a neutral square. */
export const BE_ICON_MAP: Readonly<Record<string, LucideIcon>> = {
  Home,
  Tent,
  Sparkles,
  BookOpen,
  Droplets,
  Mountain,
  Wrench,
  Eye,
  Warehouse,
  Sprout,
  Box,
  Leaf,
  Droplet,
  Sun,
  Zap,
  Cable,
  Minus,
  DoorOpen,
  Route,
  Truck,
  Fuel,
  Flame,
  Square,
  Recycle,
  TreeDeciduous,
  TreePine,
  Trees,
  Wheat,
  Fence,
  AlertTriangle,
};

export interface BeToolItem {
  kind: string;
  label: string;
  Icon: LucideIcon;
}

/** Ordered Built Environment tool items. Registry order is preserved.
 *  Both Observe (`existing` state) and Plan (`proposed` state) want the
 *  full set of authoring affordances, so no state-based filter is applied:
 *  every kind in the registry surfaces in both rails. */
export const BE_TOOL_ITEMS: ReadonlyArray<BeToolItem> = Object.values(
  BUILT_ENVIRONMENT_KINDS,
)
  // `custom-glb` is armed via the floating CustomModelPalette (which stashes
  // the active model id) — never via a bare rail button, since placement
  // requires a selected uploaded model.
  .filter((spec) => spec.kind !== 'custom-glb')
  .map((spec) => ({
    kind: spec.kind,
    label: spec.label,
    Icon: BE_ICON_MAP[spec.icon] ?? Home,
  }));

/** Display labels for each `BuiltEnvironmentCategory`. Used by rail sub-
 *  groupings in `ObserveTools` and `PlanTools` to keep 31 kinds scannable. */
export const BE_CATEGORY_LABEL: Readonly<
  Record<BuiltEnvironmentCategory, string>
> = {
  building: 'Buildings',
  agricultural: 'Agricultural',
  utility: 'Utilities',
  infrastructure: 'Infrastructure',
  machinery: 'Machinery',
  amenity: 'Amenities',
  vegetation: 'Vegetation',
  earthworks: 'Earthworks',
  'zone-marker': 'Zone markers',
};

/** Category sub-grouping derived from the registry. Categories appear in
 *  the order they first surface in `BUILT_ENVIRONMENT_KINDS`, and items
 *  within each category preserve registry order — same precedent as the
 *  flat `BE_TOOL_ITEMS`. Consumed by both Observe and Plan rails so adding
 *  a kind to the registry auto-lands in its category sub-card. */
export interface BeToolGroup {
  category: BuiltEnvironmentCategory;
  label: string;
  items: BeToolItem[];
}

/**
 * Scholar-grounded WHY/HOW/Pitfall copy for each BE category. Surfaced as
 * top-level guidance cards in the Observe / Plan right-rail asides after
 * the BE module was flattened into per-category sections (2026-05-14).
 *
 * Tone mirrors `MODULE_GUIDANCE` in `ObserveChecklistAside.tsx` — Holmgren
 * principles, Mollison Designer's Manual, OSU PDC. Each entry is intended
 * to read independently of the (now-hidden) parent BE module card.
 */
export const BE_CATEGORY_GUIDANCE: Readonly<
  Record<BuiltEnvironmentCategory, GuidanceCardData>
> = {
  building: {
    why: 'Habitable and assembly buildings are Yeomans rank 5 — placed only after climate, landform, water, and access are settled (Mollison ch.13). Locking dwellings before water lines and roads forces expensive retrofits.',
    how: [
      'Trace the footprint of each existing dwelling, pavilion, or assembly building.',
      'Tag state (existing / proposed) and height so 3D + permit views match reality.',
      'Group dwellings near the Zone-0 anchor — they are the seat of activity.',
    ],
    pitfall:
      'Don’t place new dwellings before water and access are designed — they are the most expensive layer to move.',
  },
  agricultural: {
    why: 'Barns, greenhouses, sheds, animal shelters, and compost stations are working buildings that mediate between the homestead and the productive landscape (Mollison ch.10). Site them where Zone 1–2 traffic already runs.',
    how: [
      'Place agricultural buildings adjacent to the paddocks, beds, or guilds they serve.',
      'Confirm road / track access is wide enough for the largest expected vehicle.',
      'For compost, site within a daily-visit radius of the kitchen and animal yards.',
    ],
    pitfall:
      'Don’t isolate working buildings from their work — a barn far from its paddocks burns labor every day.',
  },
  utility: {
    why: 'Wells, septic, tanks, pumps, and solar arrays are the subsystems that make a site habitable (Yeomans rank 6). Their placement is constrained by hydrology, sun angle, and setback rules — design them against the topography, not against the dwellings.',
    how: [
      'Drop the well first; tank and pump house follow gravity and head pressure.',
      'Site septic / leach fields below dwellings, away from wells and watercourses.',
      'Orient solar arrays to true-south aspect with winter sun angle unobstructed.',
    ],
    pitfall:
      'Don’t bury utilities under future structure footprints — the easement will cost more than the line.',
  },
  infrastructure: {
    why: 'Linear infrastructure — power lines, buried utilities, fences, gates, driveways — binds the design more than visible structures. A buried gas line vetoes earthworks across it; a fence line decides livestock subdivision options for decades.',
    how: [
      'Trace existing power, water, gas, and data lines (above and below grade).',
      'Walk fence lines and drop gates at every actual pass-through point.',
      'Sketch driveways and access tracks with their real curve radii.',
    ],
    pitfall:
      'Don’t skip "invisible" assets — buried lines and utility easements bind the design more than visible structures.',
  },
  machinery: {
    why: 'Machinery sheds, fuel stations, and equipment yards are sized by what the project will actually run (Yeomans rank 4 — Access). Turning radii, harvester widths, and trailer reach dictate where these can sit and how access tracks connect to them.',
    how: [
      'Site machinery shed adjacent to the primary access track with hard-standing approach.',
      'Place fuel station with bunded containment, downwind of dwellings.',
      'Size the equipment yard for the largest implement plus a safe maneuvering arc.',
    ],
    pitfall:
      'Don’t size machinery housing for today’s fleet — design for the implement you’ll need at full production.',
  },
  amenity: {
    why: 'Fire circles, lookouts, and parking are social and circulation nodes — the points where people gather, pause, or arrive. Site them where Zone 1–2 paths intersect, with sun, view, and shelter from prevailing wind.',
    how: [
      'Place the fire circle on a wind-sheltered, view-favoring node.',
      'Drop parking at the property edge so vehicles don’t cross Zone 1.',
      'Site lookouts on a high point with a clear view sector.',
    ],
    pitfall:
      'Don’t bury the fire circle in Zone 3 — if it’s not on a daily-visit path, it won’t get used.',
  },
  vegetation: {
    why: 'Trees, shrubs, and hedgerows are the slowest-to-mature layer in the design (Yeomans rank "trees"). Place anchor trees against existing water flow and prevailing wind before designing the planting beneath them — a 30-year canopy decides what grows below it.',
    how: [
      'Plot existing mature trees first; treat them as fixed anchors.',
      'Place proposed canopy along water-flow lines and on contour with windbreak intent.',
      'Step through the succession scenarios (Year 1 / 5 / 10 / 20 / 30+) to verify light access.',
    ],
    pitfall:
      'Don’t plant the canopy before deciding the understory — a 30-year shadow rewrites every guild beneath it.',
  },
  earthworks: {
    why: 'Berms, terraces, and raised beds shape the soil profile and water flow (Yeomans rank "landshape"). They are the second-most-permanent layer after climate — once moved, the earth rarely moves back.',
    how: [
      'Place earthworks on contour, with the berm downhill of the bed it shelters.',
      'Confirm the drainage line your earthwork crosses or interrupts.',
      'Size raised beds to a reach width (1.2–1.5 m) so they don’t need stepping on.',
    ],
    pitfall:
      'Don’t cut earthworks before water is mapped — a misplaced berm can flood a downhill neighbour.',
  },
  'zone-marker': {
    why: 'Permaculture Zones 0–5 are a frequency-of-visit ladder (Mollison ch.3), not land-use categories. Marking zone boundaries on the plan makes maintenance frequency visible — daily for Z1, weekly for Z2, etc. — so element placement can be audited against it.',
    how: [
      'Drop a Zone-0 marker at the dwelling — the seat of daily activity.',
      'Place Zone-1 markers at the boundary of the daily-visit perimeter.',
      'Continue outward through Zones 2–5, snapping to natural breaks in use frequency.',
    ],
    pitfall:
      'Don’t treat Zones as land-use — Zone 3 isn’t "pasture," it’s "visited weekly." Tag by frequency, not function.',
  },
};

export const BE_TOOL_GROUPS: ReadonlyArray<BeToolGroup> = (() => {
  const byCategory = new Map<BuiltEnvironmentCategory, BeToolItem[]>();
  for (const spec of Object.values(BUILT_ENVIRONMENT_KINDS)) {
    if (spec.kind === 'custom-glb') continue;
    const item: BeToolItem = {
      kind: spec.kind,
      label: spec.label,
      Icon: BE_ICON_MAP[spec.icon] ?? Home,
    };
    const bucket = byCategory.get(spec.category);
    if (bucket) {
      bucket.push(item);
    } else {
      byCategory.set(spec.category, [item]);
    }
  }
  return Array.from(byCategory.entries()).map(([category, items]) => ({
    category,
    label: BE_CATEGORY_LABEL[category],
    items,
  }));
})();
