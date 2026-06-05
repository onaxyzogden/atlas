import { describe, it, expect } from 'vitest';
import {
  computeRevisionPriority,
  FOUNDATION_DOMAINS_FOR_REVISION,
  type RevisionEvent,
} from '../revisionPriority.js';

function ev(overrides: Partial<RevisionEvent>): RevisionEvent {
  return {
    kind: 'observation',
    domainId: 'soil',
    statusOutput: null,
    freshness: null,
    occurredAt: '2026-05-28T12:00:00.000Z',
    ...overrides,
  };
}

describe('FOUNDATION_DOMAINS_FOR_REVISION', () => {
  it('matches Dashboard Spec §4.2 — hydrology, soil, risk-compliance', () => {
    expect(FOUNDATION_DOMAINS_FOR_REVISION).toEqual([
      'hydrology',
      'soil',
      'risk-compliance',
    ]);
  });
});

describe('computeRevisionPriority', () => {
  it('returns null for an empty event list', () => {
    expect(computeRevisionPriority([])).toBeNull();
  });

  it('escalates divergence + major_constraint to critical', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'divergence', statusOutput: 'major_constraint' }),
      ]),
    ).toBe('critical');
  });

  it('escalates divergence + potential_disqualifier to critical', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'divergence', statusOutput: 'potential_disqualifier' }),
      ]),
    ).toBe('critical');
  });

  it('escalates divergence + needs_investigation to high', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'divergence', statusOutput: 'needs_investigation' }),
      ]),
    ).toBe('high');
  });

  it('treats divergence with clear/unknown statusOutput as informational', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'divergence', statusOutput: 'clear' }),
      ]),
    ).toBe('informational');
  });

  it('escalates freshness_change + stale on a foundation domain to high', () => {
    for (const domainId of FOUNDATION_DOMAINS_FOR_REVISION) {
      expect(
        computeRevisionPriority([
          ev({ kind: 'freshness_change', domainId, freshness: 'stale' }),
        ]),
      ).toBe('high');
    }
  });

  it('does NOT escalate freshness_change + stale on a non-foundation domain', () => {
    expect(
      computeRevisionPriority([
        ev({
          kind: 'freshness_change',
          domainId: 'climate',
          freshness: 'stale',
        }),
      ]),
    ).toBe('informational');
  });

  it('does NOT escalate freshness_change + ageing on a foundation domain', () => {
    expect(
      computeRevisionPriority([
        ev({
          kind: 'freshness_change',
          domainId: 'soil',
          freshness: 'ageing',
        }),
      ]),
    ).toBe('informational');
  });

  it('classifies plain observation as informational', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'observation', domainId: 'soil' }),
      ]),
    ).toBe('informational');
  });

  it('returns highest-ranked event across a mixed feed', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'observation' }),
        ev({ kind: 'divergence', statusOutput: 'needs_investigation' }),
        ev({ kind: 'observation' }),
      ]),
    ).toBe('high');
  });

  it('short-circuits on critical even when later events are informational', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'divergence', statusOutput: 'major_constraint' }),
        ev({ kind: 'observation' }),
        ev({ kind: 'observation' }),
      ]),
    ).toBe('critical');
  });

  it('upgrades informational → critical when critical appears later in the feed', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'observation' }),
        ev({ kind: 'divergence', statusOutput: 'major_constraint' }),
      ]),
    ).toBe('critical');
  });

  it('returns informational when feed has only observations', () => {
    expect(
      computeRevisionPriority([
        ev({ kind: 'observation', domainId: 'soil' }),
        ev({ kind: 'observation', domainId: 'hydrology' }),
      ]),
    ).toBe('informational');
  });
});
