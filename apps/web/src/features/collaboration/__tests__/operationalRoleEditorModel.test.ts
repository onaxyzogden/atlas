/**
 * operationalRoleEditorModel -- pure model behind the OperationalRoleEditor
 * (ADR 2026-06-24 Operational Role Layer, Option C). The editor lets an owner /
 * primary-steward rename + re-scope the six built-in operational roles; this
 * module turns the editable draft into the minimal `operationalRoleDefs`
 * override (only fields that differ from the built-in) and flags domains that
 * end up owned by no role (orphans -> warn, never block).
 *
 * No React: the diff/orphan logic is unit-tested without mounting the editor.
 */

import { describe, it, expect } from 'vitest';
import {
  OPERATIONAL_ROLES,
  OPERATIONAL_ROLE_DEFS,
  OPERATIONAL_ROLE_DOMAINS,
  OperationalRoleDefsOverride,
  resolveOperationalRoleDefs,
  resolveOperationalRoleDomains,
  type OperationalRole,
  type UniversalDomain,
} from '@ogden/shared';
import {
  seedRoleDrafts,
  buildOverridePayload,
  orphanDomains,
  SELECTABLE_DOMAINS,
  type RoleDraft,
} from '../operationalRoleEditorModel.js';

/** The built-in baseline draft -- no project overrides. */
function builtinDrafts(): RoleDraft[] {
  return seedRoleDrafts(
    resolveOperationalRoleDefs(),
    resolveOperationalRoleDomains(),
  );
}

function find(drafts: RoleDraft[], slug: OperationalRole): RoleDraft {
  const d = drafts.find((x) => x.slug === slug);
  if (!d) throw new Error(`no draft for ${slug}`);
  return d;
}

/** Replace one slug's draft with a patched copy, leaving the rest built-in. */
function patch(
  drafts: RoleDraft[],
  slug: OperationalRole,
  over: Partial<RoleDraft>,
): RoleDraft[] {
  return drafts.map((d) => (d.slug === slug ? { ...d, ...over } : d));
}

describe('operationalRoleEditorModel -- SELECTABLE_DOMAINS', () => {
  it('is the 16 universal domains minus the steward-only vision-intent', () => {
    expect(SELECTABLE_DOMAINS).toHaveLength(15);
    expect(SELECTABLE_DOMAINS).not.toContain('vision-intent');
    expect(SELECTABLE_DOMAINS).toContain('plants-food');
  });
});

describe('operationalRoleEditorModel -- seedRoleDrafts', () => {
  it('returns one draft per built-in role, in canonical order', () => {
    const drafts = builtinDrafts();
    expect(drafts.map((d) => d.slug)).toEqual([...OPERATIONAL_ROLES]);
  });

  it('seeds each draft from the resolved def + domains', () => {
    const drafts = builtinDrafts();
    const food = find(drafts, 'food_production');
    expect(food.label).toBe(OPERATIONAL_ROLE_DEFS.food_production.label);
    expect(food.description).toBe(
      OPERATIONAL_ROLE_DEFS.food_production.description,
    );
    expect([...food.domains].sort()).toEqual(
      [...OPERATIONAL_ROLE_DOMAINS.food_production].sort(),
    );
  });
});

describe('operationalRoleEditorModel -- buildOverridePayload', () => {
  it('emits an empty payload when nothing differs from the built-in', () => {
    expect(buildOverridePayload(builtinDrafts())).toEqual([]);
  });

  it('emits a label-only entry for a renamed role', () => {
    const drafts = patch(builtinDrafts(), 'food_production', {
      label: 'Grower',
    });
    expect(buildOverridePayload(drafts)).toEqual([
      { slug: 'food_production', label: 'Grower' },
    ]);
  });

  it('emits a description-only entry for a re-described role', () => {
    const drafts = patch(builtinDrafts(), 'livestock', {
      description: 'Tends the herd.',
    });
    expect(buildOverridePayload(drafts)).toEqual([
      { slug: 'livestock', description: 'Tends the herd.' },
    ]);
  });

  it('emits a domains-only entry (canonical order) for a re-scoped role', () => {
    const drafts = patch(builtinDrafts(), 'food_production', {
      domains: new Set<UniversalDomain>(['plants-food', 'soil']),
    });
    // Canonical UNIVERSAL_DOMAINS order: soil (idx 5) precedes plants-food (idx 7).
    expect(buildOverridePayload(drafts)).toEqual([
      { slug: 'food_production', domains: ['soil', 'plants-food'] },
    ]);
  });

  it('combines label + description + domains when all differ', () => {
    const drafts = patch(builtinDrafts(), 'food_production', {
      label: 'Grower',
      description: 'Runs the market garden.',
      domains: new Set<UniversalDomain>(['plants-food', 'soil']),
    });
    expect(buildOverridePayload(drafts)).toEqual([
      {
        slug: 'food_production',
        label: 'Grower',
        description: 'Runs the market garden.',
        domains: ['soil', 'plants-food'],
      },
    ]);
  });

  it('treats a blank label as no override (falls back to the built-in)', () => {
    const drafts = patch(builtinDrafts(), 'food_production', { label: '   ' });
    expect(buildOverridePayload(drafts)).toEqual([]);
  });

  it('produces a payload that satisfies the OperationalRoleDefsOverride schema', () => {
    const drafts = patch(builtinDrafts(), 'food_production', {
      label: 'Grower',
      domains: new Set<UniversalDomain>(['plants-food', 'soil']),
    });
    const parsed = OperationalRoleDefsOverride.safeParse(
      buildOverridePayload(drafts),
    );
    expect(parsed.success).toBe(true);
  });
});

describe('operationalRoleEditorModel -- orphanDomains', () => {
  it('reports no orphans for the built-in mapping (every selectable domain owned)', () => {
    expect(orphanDomains(builtinDrafts())).toEqual([]);
  });

  it('flags a domain that no role scopes after a re-scope', () => {
    // Drop plants-food from its only owner; nothing else picks it up.
    const drafts = patch(builtinDrafts(), 'food_production', {
      domains: new Set<UniversalDomain>([]),
    });
    expect(orphanDomains(drafts)).toEqual(['plants-food']);
  });

  it('returns orphans in canonical universal-domain order', () => {
    const drafts = patch(
      patch(builtinDrafts(), 'food_production', {
        domains: new Set<UniversalDomain>([]),
      }),
      'livestock',
      { domains: new Set<UniversalDomain>([]) },
    );
    // plants-food precedes animals-livestock in UNIVERSAL_DOMAINS.
    expect(orphanDomains(drafts)).toEqual(['plants-food', 'animals-livestock']);
  });
});
