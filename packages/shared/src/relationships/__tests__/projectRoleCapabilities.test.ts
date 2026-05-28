import { describe, it, expect } from 'vitest';
import {
  hasCapability,
  roleSatisfies,
  PROJECT_ROLE_CAPABILITIES,
  type ProjectRoleCapability,
} from '../projectRoleCapabilities.js';
import type { ProjectRole } from '../../schemas/collaboration.schema.js';

describe('PROJECT_ROLE_CAPABILITIES', () => {
  it('includes every role in the ProjectRole enum', () => {
    const roles: ProjectRole[] = [
      'owner',
      'designer',
      'reviewer',
      'viewer',
      'primary_steward',
      'team_member',
      'contractor',
      'landowner',
    ];
    for (const role of roles) {
      expect(PROJECT_ROLE_CAPABILITIES[role]).toBeDefined();
    }
  });

  it('grants every role at least `read`', () => {
    for (const role of Object.keys(PROJECT_ROLE_CAPABILITIES) as ProjectRole[]) {
      expect(PROJECT_ROLE_CAPABILITIES[role].has('read')).toBe(true);
    }
  });

  it('restricts manage_members + delete_project to admin-tier roles', () => {
    const adminTier: ProjectRole[] = ['owner', 'primary_steward'];
    for (const role of Object.keys(PROJECT_ROLE_CAPABILITIES) as ProjectRole[]) {
      const hasAdmin =
        PROJECT_ROLE_CAPABILITIES[role].has('manage_members') ||
        PROJECT_ROLE_CAPABILITIES[role].has('delete_project');
      expect(hasAdmin).toBe(adminTier.includes(role));
    }
  });

  it('restricts suggest_edits to the reviewer role', () => {
    for (const role of Object.keys(PROJECT_ROLE_CAPABILITIES) as ProjectRole[]) {
      const hasSuggest = PROJECT_ROLE_CAPABILITIES[role].has('suggest_edits');
      expect(hasSuggest).toBe(role === 'reviewer');
    }
  });
});

describe('hasCapability', () => {
  const cases: Array<[ProjectRole, ProjectRoleCapability, boolean]> = [
    // owner — full
    ['owner', 'read', true],
    ['owner', 'comment', true],
    ['owner', 'edit', true],
    ['owner', 'manage_members', true],
    ['owner', 'delete_project', true],
    ['owner', 'suggest_edits', false],
    // designer — read/comment/edit
    ['designer', 'read', true],
    ['designer', 'comment', true],
    ['designer', 'edit', true],
    ['designer', 'manage_members', false],
    ['designer', 'delete_project', false],
    ['designer', 'suggest_edits', false],
    // reviewer — read/comment/suggest_edits
    ['reviewer', 'read', true],
    ['reviewer', 'comment', true],
    ['reviewer', 'suggest_edits', true],
    ['reviewer', 'edit', false],
    ['reviewer', 'manage_members', false],
    ['reviewer', 'delete_project', false],
    // viewer — read only
    ['viewer', 'read', true],
    ['viewer', 'comment', false],
    ['viewer', 'edit', false],
    // primary_steward — admin like owner
    ['primary_steward', 'read', true],
    ['primary_steward', 'edit', true],
    ['primary_steward', 'manage_members', true],
    ['primary_steward', 'delete_project', true],
    ['primary_steward', 'suggest_edits', false],
    // team_member — contributor like designer
    ['team_member', 'read', true],
    ['team_member', 'comment', true],
    ['team_member', 'edit', true],
    ['team_member', 'manage_members', false],
    ['team_member', 'delete_project', false],
    // contractor — contributor like designer
    ['contractor', 'read', true],
    ['contractor', 'comment', true],
    ['contractor', 'edit', true],
    ['contractor', 'manage_members', false],
    ['contractor', 'delete_project', false],
    // landowner — read + comment only
    ['landowner', 'read', true],
    ['landowner', 'comment', true],
    ['landowner', 'edit', false],
    ['landowner', 'suggest_edits', false],
    ['landowner', 'manage_members', false],
    ['landowner', 'delete_project', false],
  ];

  for (const [role, cap, expected] of cases) {
    it(`hasCapability(${role}, ${cap}) = ${expected}`, () => {
      expect(hasCapability(role, cap)).toBe(expected);
    });
  }
});

describe('roleSatisfies — legacy gate compatibility', () => {
  it('returns true for literal-match on every legacy role', () => {
    const legacy: ProjectRole[] = ['owner', 'designer', 'reviewer', 'viewer'];
    for (const role of legacy) {
      expect(roleSatisfies(role, role)).toBe(true);
    }
  });

  it('returns true for literal-match on every spec role', () => {
    const spec: ProjectRole[] = [
      'primary_steward',
      'team_member',
      'contractor',
      'landowner',
    ];
    for (const role of spec) {
      expect(roleSatisfies(role, role)).toBe(true);
    }
  });

  it('does NOT cross-satisfy legacy roles (owner is not a designer)', () => {
    // Preserves the original membership-style semantics of `requireRole`.
    expect(roleSatisfies('owner', 'designer')).toBe(false);
    expect(roleSatisfies('owner', 'reviewer')).toBe(false);
    expect(roleSatisfies('designer', 'owner')).toBe(false);
    expect(roleSatisfies('designer', 'reviewer')).toBe(false);
    expect(roleSatisfies('reviewer', 'owner')).toBe(false);
    expect(roleSatisfies('reviewer', 'designer')).toBe(false);
    expect(roleSatisfies('viewer', 'reviewer')).toBe(false);
  });
});

describe('roleSatisfies — spec role aliasing', () => {
  it('primary_steward satisfies owner gates', () => {
    expect(roleSatisfies('primary_steward', 'owner')).toBe(true);
  });

  it('primary_steward does NOT satisfy other legacy gates (alias is single)', () => {
    expect(roleSatisfies('primary_steward', 'designer')).toBe(false);
    expect(roleSatisfies('primary_steward', 'reviewer')).toBe(false);
    expect(roleSatisfies('primary_steward', 'viewer')).toBe(false);
  });

  it('team_member satisfies designer gates', () => {
    expect(roleSatisfies('team_member', 'designer')).toBe(true);
  });

  it('team_member does NOT satisfy owner gates', () => {
    expect(roleSatisfies('team_member', 'owner')).toBe(false);
  });

  it('contractor satisfies designer gates', () => {
    expect(roleSatisfies('contractor', 'designer')).toBe(true);
  });

  it('contractor does NOT satisfy owner gates', () => {
    expect(roleSatisfies('contractor', 'owner')).toBe(false);
  });

  it('landowner satisfies viewer gates', () => {
    expect(roleSatisfies('landowner', 'viewer')).toBe(true);
  });

  it('landowner does NOT satisfy designer/reviewer/owner gates', () => {
    // Comment routes explicitly add `'landowner'` to the allow list per
    // Slice 5.1, so this is intentional — landowner is not aliased into
    // the reviewer slot.
    expect(roleSatisfies('landowner', 'owner')).toBe(false);
    expect(roleSatisfies('landowner', 'designer')).toBe(false);
    expect(roleSatisfies('landowner', 'reviewer')).toBe(false);
  });
});

describe('roleSatisfies — practical requireRole scenarios', () => {
  // Mimics what the rbac plugin will do: `allowed.some(r => roleSatisfies(granted, r))`
  function satisfiesAny(granted: ProjectRole, allowed: ProjectRole[]): boolean {
    return allowed.some((req) => roleSatisfies(granted, req));
  }

  it('write gates (owner | designer) accept admin + contributor tier', () => {
    const allowed: ProjectRole[] = ['owner', 'designer'];
    expect(satisfiesAny('owner', allowed)).toBe(true);
    expect(satisfiesAny('designer', allowed)).toBe(true);
    expect(satisfiesAny('primary_steward', allowed)).toBe(true);
    expect(satisfiesAny('team_member', allowed)).toBe(true);
    expect(satisfiesAny('contractor', allowed)).toBe(true);
    expect(satisfiesAny('reviewer', allowed)).toBe(false);
    expect(satisfiesAny('viewer', allowed)).toBe(false);
    expect(satisfiesAny('landowner', allowed)).toBe(false);
  });

  it('admin gates (owner) accept admin tier only', () => {
    const allowed: ProjectRole[] = ['owner'];
    expect(satisfiesAny('owner', allowed)).toBe(true);
    expect(satisfiesAny('primary_steward', allowed)).toBe(true);
    expect(satisfiesAny('designer', allowed)).toBe(false);
    expect(satisfiesAny('team_member', allowed)).toBe(false);
    expect(satisfiesAny('contractor', allowed)).toBe(false);
    expect(satisfiesAny('reviewer', allowed)).toBe(false);
    expect(satisfiesAny('landowner', allowed)).toBe(false);
    expect(satisfiesAny('viewer', allowed)).toBe(false);
  });

  it('read gates (owner | designer | reviewer | viewer) accept every role', () => {
    const allowed: ProjectRole[] = [
      'owner',
      'designer',
      'reviewer',
      'viewer',
    ];
    expect(satisfiesAny('owner', allowed)).toBe(true);
    expect(satisfiesAny('designer', allowed)).toBe(true);
    expect(satisfiesAny('reviewer', allowed)).toBe(true);
    expect(satisfiesAny('viewer', allowed)).toBe(true);
    expect(satisfiesAny('primary_steward', allowed)).toBe(true);
    expect(satisfiesAny('team_member', allowed)).toBe(true);
    expect(satisfiesAny('contractor', allowed)).toBe(true);
    expect(satisfiesAny('landowner', allowed)).toBe(true);
  });

  it('reviewer-only gates (reviewer) accept reviewer + literal self only', () => {
    const allowed: ProjectRole[] = ['reviewer'];
    expect(satisfiesAny('reviewer', allowed)).toBe(true);
    expect(satisfiesAny('owner', allowed)).toBe(false);
    expect(satisfiesAny('designer', allowed)).toBe(false);
    expect(satisfiesAny('viewer', allowed)).toBe(false);
    expect(satisfiesAny('primary_steward', allowed)).toBe(false);
    expect(satisfiesAny('team_member', allowed)).toBe(false);
    expect(satisfiesAny('contractor', allowed)).toBe(false);
    expect(satisfiesAny('landowner', allowed)).toBe(false);
  });

  it('comment gates extended with landowner accept every comment-capable role', () => {
    // The Slice 5.1 edit to comments/index.ts will use:
    //   requireRole('owner', 'designer', 'reviewer', 'landowner')
    const allowed: ProjectRole[] = [
      'owner',
      'designer',
      'reviewer',
      'landowner',
    ];
    expect(satisfiesAny('owner', allowed)).toBe(true);
    expect(satisfiesAny('designer', allowed)).toBe(true);
    expect(satisfiesAny('reviewer', allowed)).toBe(true);
    expect(satisfiesAny('landowner', allowed)).toBe(true);
    expect(satisfiesAny('primary_steward', allowed)).toBe(true);
    expect(satisfiesAny('team_member', allowed)).toBe(true);
    expect(satisfiesAny('contractor', allowed)).toBe(true);
    expect(satisfiesAny('viewer', allowed)).toBe(false);
  });
});
