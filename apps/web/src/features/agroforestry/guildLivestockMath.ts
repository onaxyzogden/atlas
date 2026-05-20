/**
 * guildLivestockMath — pure tri-axis silvopasture integration math.
 *
 * Per host (silvopasture polygon) the steward gets:
 *   - fodder matches: distinct plantCatalog ids tagged `fodder` across all
 *     member guilds, intersected with what the host actually carries.
 *   - toxicity findings: `LIVESTOCK_BROWSE_TOXICITY` entries narrowed to
 *     the herd species actually paddocked at this host (so a Taxus + cattle
 *     herd never flags a horse-only entry).
 *   - canopy coverage %: sum of member-guild canopy footprints
 *     (π·(canopySpreadM/2)²·count) ÷ total host paddock area (m²),
 *     capped at 100.
 *   - composite integrationScore 0..100: fodder band + canopy band −
 *     toxicity penalty.
 *
 * "Integration" here is strictly ecological (fodder × canopy × toxicity).
 * Never a financial or yield-as-return notion.
 */

import * as turf from '@turf/turf';
import {
  resolveSilvopastureHosts,
  resolveMembers,
  type SilvopastureHost,
} from './silvopastureHosts.js';
import {
  LIVESTOCK_BROWSE_TOXICITY,
  type BrowseToxicityEntry,
  toxicityForGuild,
} from './livestockBrowseToxicity.js';
import { PLANT_CATALOG } from '../../data/plantCatalog.js';
import type { CropArea } from '../../store/cropStore.js';
import type { DesignElement } from '../../store/designElementsStore.js';
import type { Paddock, LivestockSpecies } from '../../store/livestockStore.js';
import type { Guild, GuildMember } from '../../store/polycultureStore.js';

export interface HostIntegrationRow {
  hostId: string;
  hostName: string;
  paddockCount: number;
  guildCount: number;
  /** Distinct fodder-tagged speciesIds across all member guilds. */
  fodderMatches: { speciesId: string; commonName: string }[];
  /** Toxicity hits, narrowed to the herd species actually paddocked here. */
  toxicityFindings: BrowseToxicityEntry[];
  /** Sum of member-guild canopy footprint ÷ total host paddock area, ×100.
   *  The numerator is clipped at the host polygon's own envelope area
   *  before division — see `canopyClampedM2`. */
  canopyCoveragePct: number;
  /** Host polygon area in m² (turf.area). 0 when geometry is unmeasurable. */
  hostAreaM2: number;
  /** Raw canopy-footprint sum minus what survived the host-envelope clip,
   *  in m². > 0 indicates two or more guilds claimed canopy that physically
   *  cannot fit inside the host polygon (overlap dedup discount). */
  canopyClampedM2: number;
  /** Composite 0..100: fodder band + canopy band − toxicity penalty. */
  integrationScore: number;
}

export interface SilvopastureIntegrationReport {
  rows: HostIntegrationRow[];
  /** Mean integrationScore across non-empty hosts (0 when none). */
  overallPct: number;
}

export interface ComputeArgs {
  projectId: string;
  cropAreas: CropArea[];
  designElements: DesignElement[];
  paddocks: Paddock[];
  guilds: Guild[];
}

const PLANT_BY_ID = new Map(PLANT_CATALOG.map((p) => [p.id, p]));

function isFodder(speciesId: string): boolean {
  const entry = PLANT_BY_ID.get(speciesId);
  return !!entry?.ecologicalFunction?.includes('fodder');
}

function commonName(speciesId: string): string {
  return PLANT_BY_ID.get(speciesId)?.commonName ?? speciesId;
}

/** Host polygon area in m² via turf.area. Returns 0 when geometry cannot
 *  be measured (degenerate polygon, etc.) so callers fall back gracefully. */
function hostPolygonAreaM2(host: SilvopastureHost): number {
  try {
    return turf.area(turf.feature(host.geometry));
  } catch {
    return 0;
  }
}

/** Sum of π·(spread/2)²·n across guild members, in m². Members missing
 *  `canopySpreadM` are skipped (not zeroed). */
function guildCanopyFootprintM2(members: GuildMember[]): number {
  let total = 0;
  for (const m of members) {
    const spread = PLANT_BY_ID.get(m.speciesId)?.canopySpreadM;
    if (typeof spread !== 'number' || spread <= 0) continue;
    const r = spread / 2;
    total += Math.PI * r * r;
  }
  return total;
}

function scoreFodder(matchCount: number): number {
  // Monotone, caps at 5+ species → 60.
  return Math.min(60, matchCount * 12);
}

function scoreCanopy(pct: number): number {
  // Linear 0..40 over 0..100% coverage.
  return Math.min(40, Math.max(0, pct) * 0.4);
}

function toxicityPenalty(findings: BrowseToxicityEntry[]): number {
  let p = 0;
  for (const f of findings) p += f.tier === 'avoid' ? 15 : 5;
  return p;
}

function clamp01_100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export function computeSilvopastureIntegration(
  args: ComputeArgs,
): SilvopastureIntegrationReport {
  const { projectId, cropAreas, designElements, paddocks, guilds } = args;
  const scopedPaddocks = paddocks.filter((p) => p.projectId === projectId);
  const scopedGuilds = guilds.filter((g) => g.projectId === projectId);
  const hosts = resolveSilvopastureHosts(projectId, cropAreas, designElements);

  const rows: HostIntegrationRow[] = [];
  for (const host of hosts) {
    const members = resolveMembers(
      host,
      {
        cropAreas,
        designElements,
        paddocks: scopedPaddocks,
        guilds: scopedGuilds,
      },
      hosts,
    );

    const guildEntities = members.guilds.map((m) => m.entity);
    const paddockEntities = members.paddocks.map((m) => m.entity);

    // Distinct fodder species across member guilds.
    const fodderSet = new Map<string, string>();
    for (const g of guildEntities) {
      for (const m of g.members) {
        if (isFodder(m.speciesId) && !fodderSet.has(m.speciesId)) {
          fodderSet.set(m.speciesId, commonName(m.speciesId));
        }
      }
    }
    const fodderMatches = Array.from(fodderSet, ([speciesId, cn]) => ({
      speciesId,
      commonName: cn,
    }));

    // Herd actually paddocked at this host.
    const herdSet = new Set<LivestockSpecies>();
    for (const p of paddockEntities) {
      for (const s of p.species) herdSet.add(s);
    }
    const herd = Array.from(herdSet);

    // Toxicity narrowed to (guild members ∩ catalog) × (herd actually here).
    const allGuildMembers: GuildMember[] = guildEntities.flatMap(
      (g) => g.members,
    );
    const toxicityFindings = toxicityForGuild(allGuildMembers, herd);

    // Canopy coverage %. Numerator is the raw π·r² sum across guild members,
    // clipped at the host polygon's own envelope area (physical upper bound
    // — canopy cannot exceed the silvopasture footprint). Denominator
    // remains total paddock area (we care about shade over the grazed area,
    // not the whole silvopasture polygon). The clip prevents two or more
    // guilds from claiming canopy that physically cannot fit; the discount
    // surfaces on the card via `canopyClampedM2`.
    const totalPaddockAreaM2 = paddockEntities.reduce(
      (a, p) => a + (Number.isFinite(p.areaM2) ? p.areaM2 : 0),
      0,
    );
    const hostAreaM2 = hostPolygonAreaM2(host);
    const rawCanopyM2 = guildEntities.reduce(
      (a, g) => a + guildCanopyFootprintM2(g.members),
      0,
    );
    const clippedCanopyM2 =
      hostAreaM2 > 0 ? Math.min(rawCanopyM2, hostAreaM2) : rawCanopyM2;
    const canopyClampedM2 = rawCanopyM2 - clippedCanopyM2;
    const canopyCoveragePct =
      totalPaddockAreaM2 > 0
        ? Math.min(100, (clippedCanopyM2 / totalPaddockAreaM2) * 100)
        : 0;

    const integrationScore = clamp01_100(
      scoreFodder(fodderMatches.length) +
        scoreCanopy(canopyCoveragePct) -
        toxicityPenalty(toxicityFindings),
    );

    rows.push({
      hostId: host.id,
      hostName: host.name,
      paddockCount: paddockEntities.length,
      guildCount: guildEntities.length,
      fodderMatches,
      toxicityFindings,
      canopyCoveragePct,
      hostAreaM2,
      canopyClampedM2,
      integrationScore,
    });
  }

  // overallPct: mean across hosts that actually carry at least one paddock
  // or one guild (so zero-member hosts don't drag the parcel mean down).
  const nonEmpty = rows.filter((r) => r.paddockCount > 0 || r.guildCount > 0);
  const overallPct =
    nonEmpty.length === 0
      ? 0
      : nonEmpty.reduce((a, r) => a + r.integrationScore, 0) / nonEmpty.length;

  return { rows, overallPct };
}

/** Goal-tree criterion derivation — thin wrapper returning overallPct. */
export function computeSilvopastureIntegrationPct(args: ComputeArgs): number {
  return computeSilvopastureIntegration(args).overallPct;
}

// Re-export so the criterion wiring + card can pull the catalog from one place.
export { LIVESTOCK_BROWSE_TOXICITY };
