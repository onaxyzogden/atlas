/**
 * Conformance guard for routeToDataPoint objective provenance.
 *
 * `routeToDataPoint` projects a Phase 3 `ObserveFeedEntry` into a virtual
 * `ObserveDataPoint`. The projection now carries `sourceObjectiveId` when the
 * entry's `feedKey` is a real Plan objective id (so Observe Domain Detail
 * renders the same provenance chip on field-log rows that direct Act recordings
 * carry). These invariants guard (a) objective-routed feedKeys become a
 * chip-resolvable `sourceObjectiveId`, (b) domain-routed / unknown feedKeys stay
 * `null` even when a resolver still maps them to a domain, and (c) the
 * divergence path is objective-scoped too.
 */

import { describe, expect, it } from 'vitest';
import { findObjectiveAcrossCatalogues } from '@ogden/shared';
import {
  routeToDataPoint,
  type ResolveDomainForObjective,
} from '../routeToDataPoint.js';
import type { ObserveFeedEntry } from '../../../../../store/observeFeedStore.js';

// A known universal objective id confirmed to resolve via findObjectiveAcrossCatalogues
// (same id used in observeDataPointObjectiveLink.test.ts; mirrors DomainObservationList
// chip guard invariant).
const REAL_OBJECTIVE_ID = 's2-terrain';
// Any valid UniversalDomain the resolver can return for the test.
const FIXED_DOMAIN = 'soil' as const;

// Resolver that always maps to a domain, regardless of whether the feedKey is a
// real objective id. This isolates the catalogue guard from the resolver: a
// surviving projection here proves `sourceObjectiveId` is gated on the catalogue,
// not on whether a domain was resolved.
const alwaysResolve: ResolveDomainForObjective = () => FIXED_DOMAIN;

function makeEntry(overrides: Partial<ObserveFeedEntry> = {}): ObserveFeedEntry {
  return {
    id: 'fe-1',
    projectId: 'proj-1',
    feedKey: REAL_OBJECTIVE_ID,
    sourceType: 'verified',
    sourceActionId: 'act-1',
    sourceActionTitle: 'Test action',
    proofItems: [],
    capturedAt: '2026-05-31T10:00:00.000Z',
    capturedBy: 'tester',
    ...overrides,
  };
}

describe('routeToDataPoint objective provenance', () => {
  it('uses the seeded objective id as a chip-resolvable fixture', () => {
    expect(findObjectiveAcrossCatalogues(REAL_OBJECTIVE_ID)?.title).toBeTruthy();
  });

  it('stamps sourceObjectiveId when feedKey is a real objective id', () => {
    const point = routeToDataPoint(makeEntry(), alwaysResolve);
    expect(point).not.toBeNull();
    expect(point?.domainId).toBe(FIXED_DOMAIN);
    expect(point?.sourceObjectiveId).toBe(REAL_OBJECTIVE_ID);
  });

  it('leaves sourceObjectiveId null for a domain-routed / unknown feedKey', () => {
    // observeFeedIds-routed verified actions carry a domain id, not an objective.
    const point = routeToDataPoint(
      makeEntry({ feedKey: 'soil-health' }),
      alwaysResolve,
    );
    expect(point).not.toBeNull();
    expect(point?.domainId).toBe(FIXED_DOMAIN);
    expect(point?.sourceObjectiveId).toBe(null);
  });

  it('objective-scopes diverged entries too', () => {
    const point = routeToDataPoint(
      makeEntry({ sourceType: 'diverged' }),
      alwaysResolve,
    );
    expect(point?.statusOutput).toBe('needs_investigation');
    expect(point?.sourceObjectiveId).toBe(REAL_OBJECTIVE_ID);
  });

  it('returns null (no projection) when the resolver yields no domain', () => {
    const point = routeToDataPoint(makeEntry(), () => null);
    expect(point).toBeNull();
  });
});
