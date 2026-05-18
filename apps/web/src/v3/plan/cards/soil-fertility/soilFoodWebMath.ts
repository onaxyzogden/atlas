/**
 * soilFoodWebMath — Sub-project B2, soil food-web layer (pure).
 *
 * Design-time soil-biology audit over guild members:
 *   1. Mycorrhizal-network coherence — members forming a different
 *      (non-`none`) mycorrhiza type than the anchor cannot share a
 *      hyphal network with it. Heuristic warning, never error.
 *   2. Dominant-exudate rollup — one info finding per guild naming the
 *      dominant root-exudate class across profiled members.
 *   3. Unmatched — explicit info finding for members with no profile,
 *      so a coverage gap is reported, never a false all-clear.
 *
 * Pure: no React, no store import — takes Guild types only and reads the
 * static soilBiologyProfiles table + the plant catalog for labels.
 * Deterministic. Mirrors the B1 guildIntegrityMath precedent.
 */

import type { Guild, GuildMember } from '../../../../store/polycultureStore.js';
import { findEntry } from '../../../../data/plantCatalog.js';
import {
  SOIL_BIOLOGY_PROFILES,
  type ExudateClass,
  type SoilBiologyProfile,
} from './soilBiologyProfiles.js';

export type SoilWebFindingKind = 'mycorrhiza' | 'exudate' | 'unmatched';

export interface SoilWebFinding {
  guildId: string;
  guildName: string;
  kind: SoilWebFindingKind;
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

interface ResolvedProfile {
  matched: boolean;
  profile: SoilBiologyProfile | null;
}

/**
 * speciesId → soil-biology profile. Tries the direct speciesId key, then
 * the catalog commonName normalized to snake_case. Returns matched=false
 * when neither resolves (caller emits an explicit `unmatched` finding).
 */
export function resolveProfile(speciesId: string): ResolvedProfile {
  const direct = SOIL_BIOLOGY_PROFILES[speciesId];
  if (direct) return { matched: true, profile: direct };
  const entry = findEntry(speciesId);
  if (entry?.commonName) {
    const norm = entry.commonName.trim().toLowerCase().replace(/\s+/g, '_');
    const hit = SOIL_BIOLOGY_PROFILES[norm];
    if (hit) return { matched: true, profile: hit };
  }
  return { matched: false, profile: null };
}

interface MatchedMember {
  speciesId: string;
  profile: SoilBiologyProfile;
}

/** All checks for a single guild → flat findings (possibly empty). */
export function checkGuild(guild: Guild): SoilWebFinding[] {
  const findings: SoilWebFinding[] = [];
  const members = guild.members ?? [];
  if (members.length === 0) return [];
  const base = { guildId: guild.id, guildName: guild.name };

  const resolved = members.map((m) => ({
    speciesId: m.speciesId,
    ...resolveProfile(m.speciesId),
  }));

  // ── Unmatched info — never a false all-clear ────────────────────────────
  const unmatched = resolved.filter((r) => !r.matched);
  if (unmatched.length > 0) {
    const head = unmatched[0]!;
    const labels = unmatched.map((u) => labelFor(u.speciesId)).join(', ');
    findings.push({
      ...base,
      kind: 'unmatched',
      severity: 'info',
      speciesA: head.speciesId,
      labelA: labelFor(head.speciesId),
      rationale: `Soil-biology profile unavailable for ${labels}. Mycorrhizal/exudate coherence for this guild could not be fully verified — reported, never silently passed.`,
    });
  }

  const matched: MatchedMember[] = resolved
    .filter((r): r is { speciesId: string } & ResolvedProfile =>
      Boolean(r.matched && r.profile),
    )
    .map((r) => ({ speciesId: r.speciesId, profile: r.profile! }));

  // ── Mycorrhizal-network coherence vs the anchor ─────────────────────────
  const anchor = resolveProfile(guild.anchorSpeciesId);
  if (
    anchor.matched &&
    anchor.profile &&
    anchor.profile.mycorrhiza !== 'none'
  ) {
    const anchorType = anchor.profile.mycorrhiza;
    for (const r of matched) {
      if (r.speciesId === guild.anchorSpeciesId) continue;
      const t = r.profile.mycorrhiza;
      if (t !== 'none' && t !== anchorType) {
        findings.push({
          ...base,
          kind: 'mycorrhiza',
          severity: 'warning',
          speciesA: guild.anchorSpeciesId,
          speciesB: r.speciesId,
          labelA: labelFor(guild.anchorSpeciesId),
          labelB: labelFor(r.speciesId),
          rationale: `${labelFor(
            guild.anchorSpeciesId,
          )} forms ${anchorType} mycorrhizae while ${labelFor(
            r.speciesId,
          )} forms ${t} — no shared hyphal network, so mycorrhizal nutrient transfer between them is unlikely. Heuristic design hint, not a soil assay.`,
        });
      }
    }
  }

  // ── Dominant-exudate rollup (info) ──────────────────────────────────────
  if (matched.length > 0) {
    const counts = new Map<ExudateClass, number>();
    for (const r of matched) {
      counts.set(
        r.profile.exudateClass,
        (counts.get(r.profile.exudateClass) ?? 0) + 1,
      );
    }
    let dom: ExudateClass = matched[0]!.profile.exudateClass;
    let best = 0;
    for (const [k, n] of counts) {
      if (n > best) {
        best = n;
        dom = k;
      }
    }
    findings.push({
      ...base,
      kind: 'exudate',
      severity: 'info',
      speciesA: guild.anchorSpeciesId,
      labelA: labelFor(guild.anchorSpeciesId),
      rationale: `Dominant root-exudate character across ${matched.length} profiled member(s): ${dom} (${best}/${matched.length}). Signals the rhizosphere microbial bias this guild will tend to recruit.`,
    });
  }

  return findings;
}

/** Run `checkGuild` across many guilds → one flat finding list. */
export function checkGuilds(guilds: Guild[]): SoilWebFinding[] {
  return guilds.flatMap(checkGuild);
}

export type { GuildMember };
