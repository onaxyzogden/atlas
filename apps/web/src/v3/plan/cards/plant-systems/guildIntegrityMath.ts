/**
 * guildIntegrityMath — Sub-project B1, plant-system design integrity (pure).
 *
 * Companion-planting constraint checker over guild members:
 *   1. Antagonism / allelopathy — companion MATRIX antagonists + rationale
 *      text (allelopathy lives in rationale prose), with a *mandatory*
 *      catalog `incompatible` fallback so perennials absent from the
 *      annual-crop matrix (e.g. black_walnut → juglone) are still caught.
 *   2. Spacing — per-layer occupancy heuristic (documented; no real
 *      per-member geometry exists — GuildRingsCanvas derives angles from
 *      array index at render).
 *   3. Maturity-sync — daysToMaturity spread within a guild.
 *
 * The speciesId↔crop-name bridge is the primary risk: guild members carry
 * a plantCatalog `speciesId`, the companion MATRIX is keyed by crop-name.
 * `resolveCompanion` routes through the exported `findCompanions()` so it
 * inherits that module's private `normalize()` rather than forking it.
 * When a pair cannot be verified either way an explicit `unmatched` info
 * finding is emitted — never a false "all clear".
 *
 * Pure: no React, no store import — takes Guild/GuildMember types only and
 * reads the static catalog/matrix. Deterministic. Mirrors the in-codebase
 * pure-module precedent (`temporalCoherenceMath.ts`).
 */

import type { Guild, GuildMember } from '../../../../store/polycultureStore.js';
import { findEntry } from '../../../../data/plantCatalog.js';
import {
  findCompanions,
  type CompanionEntry,
} from '../../../../lib/companionPlanting.js';

export type GuildFindingKind =
  | 'antagonism'
  | 'spacing'
  | 'maturity'
  | 'unmatched';

export interface GuildFinding {
  guildId: string;
  guildName: string;
  kind: GuildFindingKind;
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

interface ResolvedCompanion {
  matched: boolean;
  /** The matrix entry, when matched. */
  companion: CompanionEntry | null;
  /** The matrix key that resolved (for antagonist lookups). */
  key: string | null;
}

/**
 * speciesId → companion-MATRIX entry. Tries, in order: the catalog
 * commonName, the first word of the commonName, then the speciesId with
 * underscores turned to spaces. Each probe goes through `findCompanions`
 * so it inherits the matrix module's private `normalize()`.
 */
export function resolveCompanion(speciesId: string): ResolvedCompanion {
  const entry = findEntry(speciesId);
  const probes: string[] = [];
  if (entry?.commonName) {
    probes.push(entry.commonName);
    const firstWord = entry.commonName.trim().split(/\s+/)[0];
    if (firstWord && firstWord !== entry.commonName) probes.push(firstWord);
  }
  probes.push(speciesId.replace(/_/g, ' '));

  for (const p of probes) {
    const hit = findCompanions(p);
    if (hit) {
      return { matched: true, companion: hit, key: p };
    }
  }
  return { matched: false, companion: null, key: null };
}

const DEFAULT_FOOTPRINT_M = 1.5;
const DEFAULT_GUILD_RADIUS_M = 6;
/** Spread (days) beyond which fast/slow members are flagged out of sync. */
const MATURITY_SPREAD_DAYS = 365 * 3;

function footprintRadiusM(speciesId: string): number {
  const e = findEntry(speciesId);
  if (e?.spacingM?.inRow) return e.spacingM.inRow / 2;
  if (e?.matureWidthM) return e.matureWidthM / 2;
  return DEFAULT_FOOTPRINT_M / 2;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}

/** All three checks for a single guild → flat findings (possibly empty). */
export function checkGuild(guild: Guild): GuildFinding[] {
  const findings: GuildFinding[] = [];
  const members = guild.members ?? [];
  const base = { guildId: guild.id, guildName: guild.name };

  // ── 1. Antagonism / allelopathy (+ mandatory catalog fallback) ──────────
  const seenPairs = new Set<string>();
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const mi = members[i];
      const mj = members[j];
      if (!mi || !mj) continue;
      const a = mi.speciesId;
      const b = mj.speciesId;
      if (a === b) continue;
      const pk = pairKey(a, b);
      if (seenPairs.has(pk)) continue;
      seenPairs.add(pk);

      const labelA = labelFor(a);
      const labelB = labelFor(b);
      const entryA = findEntry(a);
      const entryB = findEntry(b);

      // Catalog incompatible is keyed by speciesId — always available when
      // the catalog resolves, and covers perennials the matrix omits.
      const catalogHit =
        entryA?.incompatible?.includes(entryB?.id ?? b) ||
        entryB?.incompatible?.includes(entryA?.id ?? a);
      if (catalogHit) {
        findings.push({
          ...base,
          kind: 'antagonism',
          severity: 'error',
          speciesA: a,
          speciesB: b,
          labelA,
          labelB,
          rationale: `${labelA} and ${labelB} are listed as incompatible in the plant catalog (e.g. allelopathy / root antagonism).`,
        });
        continue;
      }

      const ra = resolveCompanion(a);
      const rb = resolveCompanion(b);

      let matrixAntagonist = false;
      let rationale = '';
      if (ra.matched && rb.matched && ra.key && rb.key) {
        if (ra.companion!.antagonists.includes(rb.key)) {
          matrixAntagonist = true;
          rationale = ra.companion!.rationale[rb.key] ?? '';
        } else if (rb.companion!.antagonists.includes(ra.key)) {
          matrixAntagonist = true;
          rationale = rb.companion!.rationale[ra.key] ?? '';
        }
      }

      if (matrixAntagonist) {
        findings.push({
          ...base,
          kind: 'antagonism',
          severity: 'error',
          speciesA: a,
          speciesB: b,
          labelA,
          labelB,
          rationale:
            rationale ||
            `${labelA} and ${labelB} are antagonistic in the companion matrix.`,
        });
        continue;
      }

      // Could not verify either way → explicit info, never a false clear.
      if (!ra.matched || !rb.matched) {
        const unverified = [
          !ra.matched ? labelA : null,
          !rb.matched ? labelB : null,
        ]
          .filter(Boolean)
          .join(' & ');
        findings.push({
          ...base,
          kind: 'unmatched',
          severity: 'info',
          speciesA: a,
          speciesB: b,
          labelA,
          labelB,
          rationale: `Companion compatibility for ${labelA} ↔ ${labelB} could not be verified (${unverified} absent from the companion matrix; catalog shows no incompatibility).`,
        });
      }
    }
  }

  // ── 2. Spacing — per-layer occupancy heuristic (no real geometry) ───────
  const anchorWidth = findEntry(guild.anchorSpeciesId)?.matureWidthM;
  const guildRadiusM = Math.max(anchorWidth ?? 0, DEFAULT_GUILD_RADIUS_M);
  const guildAreaM2 = Math.PI * guildRadiusM * guildRadiusM;

  const areaByLayer = new Map<string, number>();
  for (const m of members) {
    const r = footprintRadiusM(m.speciesId);
    const prev = areaByLayer.get(m.layer) ?? 0;
    areaByLayer.set(m.layer, prev + Math.PI * r * r);
  }
  for (const [layer, area] of areaByLayer) {
    if (area > guildAreaM2) {
      findings.push({
        ...base,
        kind: 'spacing',
        severity: 'warning',
        speciesA: layer,
        labelA: layer,
        rationale: `Heuristic: the ${layer} layer's combined mature footprint (~${Math.round(
          area,
        )} m²) exceeds the guild's nominal ground plane (~${Math.round(
          guildAreaM2,
        )} m²). No per-member geometry exists — treat as a crowding hint, not a measurement.`,
      });
    }
  }

  // ── 3. Maturity-sync — daysToMaturity spread ────────────────────────────
  const matur = members
    .map((m) => ({
      speciesId: m.speciesId,
      days: findEntry(m.speciesId)?.daysToMaturity,
    }))
    .filter((x): x is { speciesId: string; days: number } => x.days != null);
  if (matur.length >= 2) {
    let fast = matur[0]!;
    let slow = matur[0]!;
    for (const x of matur) {
      if (x.days < fast.days) fast = x;
      if (x.days > slow.days) slow = x;
    }
    if (slow.days - fast.days > MATURITY_SPREAD_DAYS) {
      findings.push({
        ...base,
        kind: 'maturity',
        severity: 'warning',
        speciesA: fast.speciesId,
        speciesB: slow.speciesId,
        labelA: labelFor(fast.speciesId),
        labelB: labelFor(slow.speciesId),
        rationale: `Maturity spread is wide: ${labelFor(
          fast.speciesId,
        )} matures in ~${fast.days} d while ${labelFor(
          slow.speciesId,
        )} takes ~${slow.days} d — mixed harvest/management cadence within one guild.`,
      });
    }
  }

  return findings;
}

/** Run `checkGuild` across many guilds → one flat finding list. */
export function checkGuilds(guilds: Guild[]): GuildFinding[] {
  return guilds.flatMap(checkGuild);
}

export type { GuildMember };
