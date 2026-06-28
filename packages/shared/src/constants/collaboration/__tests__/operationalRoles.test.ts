import { describe, it, expect } from 'vitest';
import {
  OPERATIONAL_ROLES,
  OPERATIONAL_ROLE_DEFS,
  OPERATIONAL_ROLE_DOMAINS,
  PRIMARY_STEWARD_ONLY_DOMAINS,
  scopeForRoles,
  roleForDomain,
  isSoloProject,
  operationalRolesApplyTo,
  resolveOperationalRoleDefs,
  resolveOperationalRoleDomains,
  OperationalRoleDefsOverride,
  SetOperationalRoleDefsInput,
} from '../operationalRoles.js';
import {
  ProjectMemberRecord,
  type OperationalRole,
  type ProjectRole,
} from '../../../schemas/collaboration.schema.js';
import { UniversalDomain } from '../../../schemas/universalDomain.schema.js';
import { toCamelCase } from '../../../lib/caseTransform.js';

const ALL_DOMAINS = new Set<string>(UniversalDomain.options);

describe('operational role taxonomy', () => {
  it('ships exactly the six built-in roles in canonical order', () => {
    expect(OPERATIONAL_ROLES).toEqual([
      'ecology_soils',
      'food_production',
      'livestock',
      'infrastructure',
      'community_governance',
      'finance_legal',
    ]);
  });

  it('has a def for every role whose slug matches its key', () => {
    for (const role of OPERATIONAL_ROLES) {
      expect(OPERATIONAL_ROLE_DEFS[role].slug).toBe(role);
      expect(OPERATIONAL_ROLE_DEFS[role].label.length).toBeGreaterThan(0);
      expect(OPERATIONAL_ROLE_DEFS[role].description.length).toBeGreaterThan(0);
    }
  });

  it('maps every role to >=1 valid UniversalDomain', () => {
    for (const role of OPERATIONAL_ROLES) {
      const domains = OPERATIONAL_ROLE_DOMAINS[role];
      expect(domains.size).toBeGreaterThan(0);
      for (const domain of domains) expect(ALL_DOMAINS.has(domain)).toBe(true);
    }
  });

  it('never assigns a steward-only domain to a role', () => {
    for (const role of OPERATIONAL_ROLES) {
      for (const reserved of PRIMARY_STEWARD_ONLY_DOMAINS) {
        expect(OPERATIONAL_ROLE_DOMAINS[role].has(reserved)).toBe(false);
      }
    }
  });
});

describe('scopeForRoles (stacking)', () => {
  it('union of all roles === every domain except the steward-only ones', () => {
    const full = scopeForRoles(OPERATIONAL_ROLES);
    const expected = new Set(
      UniversalDomain.options.filter((d) => !PRIMARY_STEWARD_ONLY_DOMAINS.has(d)),
    );
    expect(full).toEqual(expected);
    expect(full.has('vision-intent')).toBe(false);
    expect(full.size).toBe(
      UniversalDomain.options.length - PRIMARY_STEWARD_ONLY_DOMAINS.size,
    );
  });

  it('dedups hydrology shared by ecology_soils and infrastructure', () => {
    expect(OPERATIONAL_ROLE_DOMAINS.ecology_soils.has('hydrology')).toBe(true);
    expect(OPERATIONAL_ROLE_DOMAINS.infrastructure.has('hydrology')).toBe(true);
    const scope = scopeForRoles(['ecology_soils', 'infrastructure']);
    const naiveSum =
      OPERATIONAL_ROLE_DOMAINS.ecology_soils.size +
      OPERATIONAL_ROLE_DOMAINS.infrastructure.size;
    expect(scope.size).toBeLessThan(naiveSum); // hydrology counted once
    expect(scope.has('hydrology')).toBe(true);
  });

  it('returns an empty scope for no roles and tolerates stale slugs', () => {
    expect(scopeForRoles([]).size).toBe(0);
    expect(scopeForRoles(['nope' as OperationalRole]).size).toBe(0);
  });
});

describe('roleForDomain (inverse)', () => {
  it('returns owning roles in canonical order', () => {
    expect(roleForDomain('hydrology')).toEqual([
      'ecology_soils',
      'infrastructure',
    ]);
    expect(roleForDomain('plants-food')).toEqual(['food_production']);
  });

  it('returns [] for a steward-only domain', () => {
    expect(roleForDomain('vision-intent')).toEqual([]);
  });
});

describe('isSoloProject', () => {
  const cases: Array<[number, ProjectRole | null, boolean]> = [
    [1, 'primary_steward', true],
    [1, 'owner', true],
    [1, 'team_member', false],
    [2, 'primary_steward', false],
    [0, 'primary_steward', false],
    [1, null, false],
  ];
  it.each(cases)('count=%i role=%s => %s', (count, role, expected) => {
    expect(isSoloProject(count, role)).toBe(expected);
  });
});

describe('operationalRolesApplyTo', () => {
  const cases: Array<[ProjectRole | null, boolean]> = [
    ['primary_steward', true],
    ['team_member', true],
    ['owner', true],
    ['designer', true],
    ['contractor', false],
    ['landowner', false],
    ['reviewer', false],
    ['viewer', false],
    [null, false],
  ];
  it.each(cases)('role=%s => %s', (role, expected) => {
    expect(operationalRolesApplyTo(role)).toBe(expected);
  });
});

describe('resolveOperationalRoleDefs (Option-C, project-aware)', () => {
  it('returns the six built-in defs when no overrides are given', () => {
    const defs = resolveOperationalRoleDefs();
    expect(defs.map((d) => d.slug)).toEqual(OPERATIONAL_ROLES);
    for (const role of OPERATIONAL_ROLES) {
      const def = defs.find((d) => d.slug === role)!;
      expect(def.label).toBe(OPERATIONAL_ROLE_DEFS[role].label);
      expect(def.description).toBe(OPERATIONAL_ROLE_DEFS[role].description);
    }
  });

  it('merges a per-project label/description override over the built-in', () => {
    const overrides = OperationalRoleDefsOverride.parse([
      { slug: 'food_production', label: 'Grower', description: 'Runs the market garden.' },
    ]);
    const defs = resolveOperationalRoleDefs(overrides);
    const grower = defs.find((d) => d.slug === 'food_production')!;
    expect(grower.label).toBe('Grower');
    expect(grower.description).toBe('Runs the market garden.');
    // untouched roles keep their built-in label
    expect(defs.find((d) => d.slug === 'livestock')!.label).toBe(
      OPERATIONAL_ROLE_DEFS.livestock.label,
    );
  });

  it('keeps the built-in label when only domains are overridden', () => {
    const overrides = OperationalRoleDefsOverride.parse([
      { slug: 'food_production', domains: ['plants-food', 'soil'] },
    ]);
    const grower = resolveOperationalRoleDefs(overrides).find(
      (d) => d.slug === 'food_production',
    )!;
    expect(grower.label).toBe(OPERATIONAL_ROLE_DEFS.food_production.label);
  });
});

describe('resolveOperationalRoleDomains + project-aware scope', () => {
  it('returns the built-in map when no overrides are given', () => {
    const map = resolveOperationalRoleDomains();
    for (const role of OPERATIONAL_ROLES) {
      expect([...map[role]].sort()).toEqual([...OPERATIONAL_ROLE_DOMAINS[role]].sort());
    }
  });

  it('a domains override drives scopeForRoles and roleForDomain', () => {
    const overrides = OperationalRoleDefsOverride.parse([
      { slug: 'food_production', domains: ['plants-food', 'soil'] },
    ]);
    const map = resolveOperationalRoleDomains(overrides);
    expect(map.food_production.has('soil')).toBe(true);
    // scopeForRoles reads the supplied project map
    const scope = scopeForRoles(['food_production'], map);
    expect(scope.has('soil')).toBe(true);
    expect(scope.has('plants-food')).toBe(true);
    // roleForDomain reflects the re-scope: soil now owned by food_production too
    expect(roleForDomain('soil', map)).toContain('food_production');
  });

  it('defaults (no map arg) keep the built-in behavior', () => {
    expect(scopeForRoles(['food_production']).has('soil')).toBe(false);
    expect(roleForDomain('plants-food')).toEqual(['food_production']);
  });
});

describe('OperationalRoleDefsOverride schema', () => {
  it('rejects a vision-intent domain (primary-steward-only)', () => {
    expect(() =>
      OperationalRoleDefsOverride.parse([
        { slug: 'food_production', domains: ['vision-intent'] },
      ]),
    ).toThrow();
  });

  it('rejects an unknown role slug', () => {
    expect(() =>
      OperationalRoleDefsOverride.parse([{ slug: 'nope', label: 'x' }]),
    ).toThrow();
  });

  it('rejects an unknown field on a role override (strict)', () => {
    expect(() =>
      OperationalRoleDefsOverride.parse([
        { slug: 'food_production', colour: 'green' },
      ]),
    ).toThrow();
  });

  it('rejects a duplicate slug', () => {
    expect(() =>
      OperationalRoleDefsOverride.parse([
        { slug: 'livestock', label: 'A' },
        { slug: 'livestock', label: 'B' },
      ]),
    ).toThrow();
  });

  it('accepts a partial override (only some roles present)', () => {
    const parsed = OperationalRoleDefsOverride.parse([
      { slug: 'livestock', label: 'Shepherd' },
    ]);
    expect(parsed.find((d) => d.slug === 'livestock')?.label).toBe('Shepherd');
    expect(parsed.find((d) => d.slug === 'food_production')).toBeUndefined();
  });

  it('survives the API toCamelCase round-trip (slug is a value, not a key)', () => {
    const stored = OperationalRoleDefsOverride.parse([
      { slug: 'food_production', label: 'Grower', domains: ['plants-food'] },
    ]);
    // GET /projects/:id runs metadata through toCamelCase; a slug-KEYED map
    // would be mangled (food_production -> foodProduction). The array shape
    // keeps the slug as a string value, so it round-trips intact and re-parses.
    const roundTripped = toCamelCase<typeof stored>(stored);
    expect(roundTripped[0]!.slug).toBe('food_production');
    expect(() => OperationalRoleDefsOverride.parse(roundTripped)).not.toThrow();
  });
});

describe('SetOperationalRoleDefsInput (route DTO)', () => {
  it('wraps the override array under operationalRoleDefs', () => {
    const parsed = SetOperationalRoleDefsInput.parse({
      operationalRoleDefs: [{ slug: 'food_production', label: 'Grower' }],
    });
    expect(parsed.operationalRoleDefs[0]!.slug).toBe('food_production');
  });

  it('accepts an empty array (reset to built-ins)', () => {
    const parsed = SetOperationalRoleDefsInput.parse({ operationalRoleDefs: [] });
    expect(parsed.operationalRoleDefs).toEqual([]);
  });
});

describe('ProjectMemberRecord.operationalRoles', () => {
  const base = {
    userId: '00000000-0000-0000-0000-000000000000',
    email: 'a@b.co',
    displayName: null,
    role: 'team_member' as const,
    joinedAt: '2026-06-24T00:00:00.000Z',
  };

  it('defaults to [] when absent (back-compat with pre-existing members)', () => {
    const parsed = ProjectMemberRecord.parse(base);
    expect(parsed.operationalRoles).toEqual([]);
  });

  it('accepts valid operational role slugs', () => {
    const parsed = ProjectMemberRecord.parse({
      ...base,
      operationalRoles: ['food_production', 'livestock'],
    });
    expect(parsed.operationalRoles).toEqual(['food_production', 'livestock']);
  });

  it('rejects an unknown operational role slug', () => {
    expect(() =>
      ProjectMemberRecord.parse({ ...base, operationalRoles: ['nope'] }),
    ).toThrow();
  });
});
