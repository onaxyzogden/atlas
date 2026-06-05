// @vitest-environment happy-dom
/**
 * normalizeProjectType — the CLIENT mirror of migration 046
 * (apps/api/src/db/migrations/046_project_type_taxonomy.sql). The OLOS v1.2
 * taxonomy rename dropped educational_farm / multi_enterprise / retreat_center
 * from the ProjectType enum. This sanitizer runs on every canonical projectType
 * write (createProject) and on rehydrate (persist migrate v6) so a project that
 * still holds a dropped value — persisted before the rename, or produced by the
 * legacy archetype / vision-builder vocabulary — is forwarded to its nearest
 * surviving type instead of failing the server enum parse with a 422 on sync.
 */

import { describe, expect, it } from 'vitest';
import { ProjectType } from '@ogden/shared';
import { normalizeProjectType } from '../projectStore';

describe('normalizeProjectType — v1.2 legacy backfill (migration 046 mirror)', () => {
  it('passes valid v1.2 enum values through unchanged', () => {
    for (const t of [
      'homestead',
      'agritourism',
      'regenerative_farm',
      'education',
      'residential',
    ]) {
      expect(normalizeProjectType(t)).toBe(t);
    }
  });

  it('forwards the three dropped legacy enum values to their 046 homes', () => {
    expect(normalizeProjectType('educational_farm')).toBe('education');
    expect(normalizeProjectType('multi_enterprise')).toBe('regenerative_farm');
    expect(normalizeProjectType('retreat_center')).toBe('agritourism');
  });

  it('every backfill target is itself a valid ProjectType (no 422 on sync)', () => {
    for (const legacy of ['educational_farm', 'multi_enterprise', 'retreat_center']) {
      expect(ProjectType.safeParse(normalizeProjectType(legacy)).success).toBe(true);
    }
  });

  it('maps kebab archetypes to the enum, forwarding any that land on a dropped legacy', () => {
    // archetypes whose enum home survived the rename
    expect(normalizeProjectType('regenerative-farm')).toBe('regenerative_farm');
    expect(normalizeProjectType('homestead')).toBe('homestead');
    expect(normalizeProjectType('conservation')).toBe('conservation');
    // archetypes whose enum home was dropped -> forwarded to the 046 target
    expect(normalizeProjectType('retreat')).toBe('agritourism');
    expect(normalizeProjectType('multi-enterprise')).toBe('regenerative_farm');
  });

  it('returns null for empty / unknown values rather than an unsyncable type', () => {
    expect(normalizeProjectType(null)).toBeNull();
    expect(normalizeProjectType(undefined)).toBeNull();
    expect(normalizeProjectType('')).toBeNull();
    expect(normalizeProjectType('banana')).toBeNull();
  });
});
