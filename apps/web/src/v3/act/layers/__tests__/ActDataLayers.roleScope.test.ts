/**
 * ActDataLayers role-scope covenant.
 *
 * `inRoleScope` decides whether an execution-event marker keeps full opacity or
 * renders de-emphasized under the Operational Role Layer. The Act map NEVER
 * hides a marker; it only dims out-of-scope ones. These cases pin the covenant:
 *   - no scope (undefined / empty)  => everything in-scope (full opacity)
 *   - a mapped sourceKind in scope  => in-scope
 *   - a mapped sourceKind out       => out-of-scope (the only "dim" path)
 *   - an absent / unmapped sourceKind => ALWAYS in-scope (always-surface half of
 *     the covenant: we never dim what we cannot classify)
 */

import { describe, it, expect } from 'vitest';
import type { UniversalDomain } from '@ogden/shared';
import { inRoleScope } from '../ActDataLayers.js';

const scopeOf = (...domains: UniversalDomain[]): ReadonlySet<UniversalDomain> =>
  new Set<UniversalDomain>(domains);

describe('ActDataLayers inRoleScope (never-hide covenant)', () => {
  it('treats an absent scope as "everything in scope"', () => {
    expect(inRoleScope('crop', undefined)).toBe(true);
    expect(inRoleScope('livestock', undefined)).toBe(true);
    expect(inRoleScope(undefined, undefined)).toBe(true);
  });

  it('treats an empty scope as "everything in scope"', () => {
    const empty = scopeOf();
    expect(inRoleScope('crop', empty)).toBe(true);
    expect(inRoleScope('earthwork', empty)).toBe(true);
  });

  it('keeps a feature whose source domain is in scope', () => {
    expect(inRoleScope('crop', scopeOf('plants-food'))).toBe(true);
    expect(inRoleScope('livestock', scopeOf('animals-livestock'))).toBe(true);
    // Built-infrastructure collapses earthwork/storage/structure.
    const infra = scopeOf('built-infrastructure');
    expect(inRoleScope('earthwork', infra)).toBe(true);
    expect(inRoleScope('storage', infra)).toBe(true);
    expect(inRoleScope('structure', infra)).toBe(true);
  });

  it('marks a feature out-of-scope only when its domain is mapped AND absent', () => {
    // Crop event, scope is livestock-only => out of scope (the dim path).
    expect(inRoleScope('crop', scopeOf('animals-livestock'))).toBe(false);
    expect(inRoleScope('livestock', scopeOf('plants-food'))).toBe(false);
    expect(inRoleScope('earthwork', scopeOf('plants-food'))).toBe(false);
  });

  it('always surfaces an absent or unmapped sourceKind (never dim the unclassifiable)', () => {
    const scope = scopeOf('plants-food');
    expect(inRoleScope(undefined, scope)).toBe(true);
    expect(inRoleScope('', scope)).toBe(true);
    expect(inRoleScope('mystery-kind', scope)).toBe(true);
  });

  it('honours a multi-domain scope', () => {
    const scope = scopeOf('plants-food', 'animals-livestock');
    expect(inRoleScope('crop', scope)).toBe(true);
    expect(inRoleScope('livestock', scope)).toBe(true);
    expect(inRoleScope('earthwork', scope)).toBe(false); // built-infra not in scope
  });
});
