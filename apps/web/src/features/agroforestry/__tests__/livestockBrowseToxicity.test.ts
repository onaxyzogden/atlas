/**
 * livestockBrowseToxicity.test — verifies the cited catalog and the
 * exact-id matcher.
 *
 *   - every entry's speciesId resolves in PLANT_CATALOG
 *   - every entry's affects[] member is a real LivestockSpecies
 *   - every entry carries a non-empty citation + rationale
 *   - toxicityForGuild matches by exact id only (no partial-name false positives)
 *   - toxicityForGuild narrows by herd: entries for absent livestock filtered
 *   - empty guild / empty herd → empty result
 *   - covenant lock: no riba/gharar/csra/salam/investor/financing/cost-of-capital
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  LIVESTOCK_BROWSE_TOXICITY,
  toxicityForGuild,
} from '../livestockBrowseToxicity.js';
import { PLANT_CATALOG } from '../../../data/plantCatalog.js';
import { LIVESTOCK_SPECIES } from '../../livestock/speciesData.js';
import type { GuildMember } from '../../../store/polycultureStore.js';
import type { LivestockSpecies } from '../../../store/livestockStore.js';

const CATALOG_IDS = new Set(PLANT_CATALOG.map((p) => p.id));
const SPECIES_IDS = new Set(Object.keys(LIVESTOCK_SPECIES) as LivestockSpecies[]);

function member(speciesId: string): GuildMember {
  return { speciesId, layer: 'canopy' };
}

describe('LIVESTOCK_BROWSE_TOXICITY catalog', () => {
  it('is non-empty', () => {
    expect(LIVESTOCK_BROWSE_TOXICITY.length).toBeGreaterThan(0);
  });

  it('every speciesId resolves in PLANT_CATALOG', () => {
    for (const entry of LIVESTOCK_BROWSE_TOXICITY) {
      expect(CATALOG_IDS.has(entry.speciesId)).toBe(true);
    }
  });

  it('every affects[] member is a real LivestockSpecies', () => {
    for (const entry of LIVESTOCK_BROWSE_TOXICITY) {
      expect(entry.affects.length).toBeGreaterThan(0);
      for (const a of entry.affects) {
        expect(SPECIES_IDS.has(a)).toBe(true);
      }
    }
  });

  it('every entry has a non-empty rationale and citation', () => {
    for (const entry of LIVESTOCK_BROWSE_TOXICITY) {
      expect(entry.rationale.trim().length).toBeGreaterThan(10);
      expect(entry.citation.trim().length).toBeGreaterThan(5);
    }
  });

  it('every tier is "avoid" or "caution"', () => {
    for (const entry of LIVESTOCK_BROWSE_TOXICITY) {
      expect(['avoid', 'caution']).toContain(entry.tier);
    }
  });

  it('has no duplicate (speciesId, affects-set) pairs', () => {
    const seen = new Set<string>();
    for (const entry of LIVESTOCK_BROWSE_TOXICITY) {
      const key = `${entry.speciesId}|${[...entry.affects].sort().join(',')}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe('toxicityForGuild', () => {
  it('returns [] when guild is empty', () => {
    expect(toxicityForGuild([], ['horses'])).toEqual([]);
  });

  it('returns [] when herd is empty', () => {
    expect(toxicityForGuild([member('black_walnut')], [])).toEqual([]);
  });

  it('matches black_walnut → horses', () => {
    const hits = toxicityForGuild([member('black_walnut')], ['horses']);
    expect(hits.length).toBe(1);
    expect(hits[0]!.speciesId).toBe('black_walnut');
  });

  it('filters out entries whose affects do not include the herd', () => {
    // black_walnut only affects horses; a cattle-only herd must not flag it.
    const hits = toxicityForGuild([member('black_walnut')], ['cattle']);
    expect(hits).toEqual([]);
  });

  it('matches by exact id only — no partial-name false positives', () => {
    // "walnut" alone is not a catalog id; should never resolve.
    const hits = toxicityForGuild([member('walnut')], ['horses']);
    expect(hits).toEqual([]);
  });

  it('returns multiple entries when multiple guild members match', () => {
    const hits = toxicityForGuild(
      [member('cherry'), member('peach')],
      ['cattle'],
    );
    const ids = hits.map((h) => h.speciesId).sort();
    expect(ids).toEqual(['cherry', 'peach']);
  });

  it('narrows correctly when herd is mixed', () => {
    // cherry affects cattle,sheep,goats,horses; black_walnut affects horses only.
    const hits = toxicityForGuild(
      [member('cherry'), member('black_walnut')],
      ['cattle'],
    );
    expect(hits.map((h) => h.speciesId)).toEqual(['cherry']);
  });

  it('ignores guild members with no toxicity entry', () => {
    const hits = toxicityForGuild([member('clover')], ['cattle']);
    expect(hits).toEqual([]);
  });
});

describe('covenant lock', () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const moduleText = readFileSync(
    resolve(__dirname, '../livestockBrowseToxicity.ts'),
    'utf-8',
  );

  it('contains no riba/gharar/csra/salam/investor/financing/cost-of-capital framing', () => {
    // Strip the doc-comment negative declaration before scanning.
    const stripped = moduleText.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(
      /\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i,
    );
  });
});
