/**
 * resolveOperationalRolesFromMetadata -- the pure core of the
 * useResolvedOperationalRoles hook (Option C, ADR 2026-06-24). The hook is a
 * thin React-Query adapter around this function; the merge logic itself lives
 * in @ogden/shared and is exhaustively tested there. These tests pin the
 * adapter's three load-bearing behaviors at the metadata boundary:
 *   1. null / empty metadata  => built-in defs + domains (byte-identical today).
 *   2. a valid array override => rename + re-scope flow through every accessor.
 *   3. malformed metadata     => safe degradation to built-ins, never a throw.
 */

import { describe, it, expect } from 'vitest';
import { OPERATIONAL_ROLE_DEFS, OPERATIONAL_ROLE_DOMAINS } from '@ogden/shared';
import { resolveOperationalRolesFromMetadata } from '../useResolvedOperationalRoles.js';

describe('resolveOperationalRolesFromMetadata', () => {
  it('returns built-in defs + domains when there is no override', () => {
    for (const meta of [null, undefined, {}, { operationalRoleDefs: [] }]) {
      const r = resolveOperationalRolesFromMetadata(meta);
      expect(r.hasOverrides).toBe(false);
      expect(r.labelFor('food_production')).toBe(
        OPERATIONAL_ROLE_DEFS.food_production.label,
      );
      expect(r.descriptionFor('livestock')).toBe(
        OPERATIONAL_ROLE_DEFS.livestock.description,
      );
      expect([...r.domainsMap.food_production].sort()).toEqual(
        [...OPERATIONAL_ROLE_DOMAINS.food_production].sort(),
      );
      // defs preserve canonical order + all six slugs
      expect(r.defs.map((d) => d.slug)).toEqual(
        Object.keys(OPERATIONAL_ROLE_DEFS),
      );
    }
  });

  it('merges a valid array override (rename + re-scope) through every accessor', () => {
    const r = resolveOperationalRolesFromMetadata({
      operationalRoleDefs: [
        { slug: 'food_production', label: 'Grower', domains: ['plants-food', 'soil'] },
      ],
    });
    expect(r.hasOverrides).toBe(true);
    expect(r.labelFor('food_production')).toBe('Grower');
    // re-scope reaches domainsMap, scopeFor, and roleForDomain
    expect(r.domainsMap.food_production.has('soil')).toBe(true);
    expect(r.scopeFor(['food_production']).has('soil')).toBe(true);
    expect(r.roleForDomain('soil')).toContain('food_production');
    // an untouched role keeps its built-in label + scope
    expect(r.labelFor('livestock')).toBe(OPERATIONAL_ROLE_DEFS.livestock.label);
    expect(r.scopeFor(['livestock']).has('animals-livestock')).toBe(true);
  });

  it('degrades to built-ins on malformed metadata (never throws)', () => {
    const malformed: unknown[] = [
      { operationalRoleDefs: { food_production: { label: 'X' } } }, // legacy / toCamelCase-mangled object shape
      { operationalRoleDefs: [{ slug: 'bogus', label: 'X' }] }, // unknown slug
      { operationalRoleDefs: [{ slug: 'food_production', domains: ['vision-intent'] }] }, // steward-only domain
      { operationalRoleDefs: 'nope' }, // wrong type entirely
    ];
    for (const meta of malformed) {
      const r = resolveOperationalRolesFromMetadata(meta);
      expect(r.hasOverrides).toBe(false);
      expect(r.labelFor('food_production')).toBe(
        OPERATIONAL_ROLE_DEFS.food_production.label,
      );
      expect(r.domainsMap.food_production.has('soil')).toBe(false);
    }
  });
});
