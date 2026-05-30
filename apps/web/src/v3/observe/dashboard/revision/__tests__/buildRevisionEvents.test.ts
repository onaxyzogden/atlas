/**
 * buildRevisionEvents — Phase 4 Slice 4.4 substrate.
 *
 * The pure builder behind `useRevisionEvents`. These specs lock down the
 * dismissal-window filter, the divergence/observation classification,
 * superseded-point exclusion, the resolver fallthrough for stale feed
 * keys, and the impacted-id surfaces the banner CTA depends on.
 */

import { describe, it, expect } from 'vitest';
import { buildRevisionEvents } from '../buildRevisionEvents.js';
import type { UniversalDomain } from '@ogden/shared';

const SOIL: UniversalDomain = 'soil';
const HYDRO: UniversalDomain = 'hydrology';
const CLIMATE: UniversalDomain = 'climate';

const RESOLVE_FIXED = (objectiveId: string): UniversalDomain | null => {
  if (objectiveId === 's5-water-strategy') return HYDRO;
  if (objectiveId === 's2-land-baseline') return SOIL;
  return null;
};

describe('buildRevisionEvents', () => {
  it('classifies a divergent data point as a divergence event', () => {
    const { events } = buildRevisionEvents(
      [
        {
          domainId: SOIL,
          statusOutput: 'major_constraint',
          capturedAt: '2026-05-28T10:00:00.000Z',
        },
      ],
      [],
      null,
      RESOLVE_FIXED,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('divergence');
    expect(events[0]?.statusOutput).toBe('major_constraint');
    expect(events[0]?.domainId).toBe(SOIL);
  });

  it('classifies a clear-status data point as an observation event', () => {
    const { events } = buildRevisionEvents(
      [
        {
          domainId: HYDRO,
          statusOutput: 'clear',
          capturedAt: '2026-05-28T10:00:00.000Z',
        },
      ],
      [],
      null,
      RESOLVE_FIXED,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('observation');
  });

  it('excludes superseded data points', () => {
    const { events } = buildRevisionEvents(
      [
        {
          domainId: SOIL,
          statusOutput: 'major_constraint',
          capturedAt: '2026-05-28T10:00:00.000Z',
          isSuperseded: true,
        },
      ],
      [],
      null,
      RESOLVE_FIXED,
    );
    expect(events).toHaveLength(0);
  });

  it('filters out events older than (or equal to) the dismissal cursor', () => {
    const dismissedAt = '2026-05-28T12:00:00.000Z';
    const { events } = buildRevisionEvents(
      [
        {
          domainId: SOIL,
          statusOutput: 'major_constraint',
          capturedAt: '2026-05-28T10:00:00.000Z', // before dismissal
        },
        {
          domainId: HYDRO,
          statusOutput: 'major_constraint',
          capturedAt: '2026-05-28T14:00:00.000Z', // after dismissal
        },
      ],
      [],
      dismissedAt,
      RESOLVE_FIXED,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.domainId).toBe(HYDRO);
  });

  it('includes feed entries when the resolver returns a domain', () => {
    const { events, impactedObjectiveIds, impactedDomains } =
      buildRevisionEvents(
        [],
        [
          {
            feedKey: 's5-water-strategy',
            sourceType: 'diverged',
            capturedAt: '2026-05-28T10:00:00.000Z',
          },
        ],
        null,
        RESOLVE_FIXED,
      );
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('divergence');
    expect(events[0]?.domainId).toBe(HYDRO);
    expect(impactedObjectiveIds).toEqual(['s5-water-strategy']);
    expect(impactedDomains).toEqual([HYDRO]);
  });

  it('drops feed entries when the resolver returns null', () => {
    const { events, impactedObjectiveIds, impactedDomains } =
      buildRevisionEvents(
        [],
        [
          {
            feedKey: 'stale-deleted-objective',
            sourceType: 'diverged',
            capturedAt: '2026-05-28T10:00:00.000Z',
          },
        ],
        null,
        RESOLVE_FIXED,
      );
    expect(events).toHaveLength(0);
    expect(impactedObjectiveIds).toEqual([]);
    expect(impactedDomains).toEqual([]);
  });

  it('only tracks impactedObjectiveIds for divergent feed entries', () => {
    const { impactedObjectiveIds } = buildRevisionEvents(
      [],
      [
        {
          feedKey: 's5-water-strategy',
          sourceType: 'verified',
          capturedAt: '2026-05-28T10:00:00.000Z',
        },
      ],
      null,
      RESOLVE_FIXED,
    );
    expect(impactedObjectiveIds).toEqual([]);
  });

  it('collects impactedDomains across both data points and feed entries', () => {
    const { impactedDomains } = buildRevisionEvents(
      [
        {
          domainId: SOIL,
          statusOutput: 'major_constraint',
          capturedAt: '2026-05-28T10:00:00.000Z',
        },
      ],
      [
        {
          feedKey: 's5-water-strategy',
          sourceType: 'diverged',
          capturedAt: '2026-05-28T11:00:00.000Z',
        },
      ],
      null,
      RESOLVE_FIXED,
    );
    expect(new Set(impactedDomains)).toEqual(new Set([SOIL, HYDRO]));
  });

  it('treats parse-failed ISO timestamps as "after" so they are not silently dropped', () => {
    const { events } = buildRevisionEvents(
      [
        {
          domainId: CLIMATE,
          statusOutput: 'needs_investigation',
          capturedAt: 'not-an-iso',
        },
      ],
      [],
      '2026-05-28T12:00:00.000Z',
      RESOLVE_FIXED,
    );
    expect(events).toHaveLength(1);
  });
});
