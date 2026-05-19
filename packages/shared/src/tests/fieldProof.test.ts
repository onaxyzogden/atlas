/**
 * fieldProof — pure D4 engine unit tests. Operational field-proof only:
 * proof-state classification, source→typed-store routing (harvest excluded),
 * render-only window suggestions. Never reads or writes WorkItem.status.
 * Covenant: no financing/capital framing.
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '../schemas/workItem.schema.js';
import {
  routeProofTarget,
  classifyProof,
  suggestProofMatches,
  analyzeFieldProof,
  type DomainEvent,
} from '../lib/fieldProof.js';

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    createdAt: 'c',
    updatedAt: 'u',
    title: p.id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...p,
  } as WorkItem;
}

describe('fieldProof — pure D4 engine', () => {
  it('routeProofTarget maps typed sources; everything else is generic', () => {
    expect(routeProofTarget('maintenance')).toBe('maintenance');
    expect(routeProofTarget('scheduled-livestock-move')).toBe('livestock-move');
    expect(routeProofTarget('nursery-batch')).toBe('nursery');
    // goal-compass / field-task / manual have no typed proof class.
    expect(routeProofTarget('goal-compass')).toBe('generic');
    expect(routeProofTarget('field-task')).toBe('generic');
    expect(routeProofTarget('manual')).toBe('generic');
  });

  it('classifyProof: done+event=proven, done+none=claimed, not-done=open', () => {
    expect(classifyProof(wi({ id: 'a', status: 'done' }), ['e1'])).toBe('proven');
    expect(classifyProof(wi({ id: 'b', status: 'done' }), [])).toBe('claimed');
    expect(classifyProof(wi({ id: 'c', status: 'todo' }), ['e1'])).toBe('open');
    expect(classifyProof(wi({ id: 'd', status: 'in-progress' }), [])).toBe('open');
  });

  it('suggestProofMatches: in-window typed event for a not-done item; out-of-window skipped; render-only', () => {
    const items = [
      wi({
        id: 'm1',
        source: 'maintenance',
        status: 'todo',
        scheduledStart: '2026-05-10',
        scheduledEnd: '2026-05-10',
      }),
      wi({ id: 'm2', source: 'maintenance', status: 'todo' }), // no schedule → skipped
      wi({
        id: 'm3',
        source: 'maintenance',
        status: 'done', // already done → not suggested
        scheduledStart: '2026-05-10',
      }),
    ];
    const events: DomainEvent[] = [
      { id: 'ev-near', store: 'maintenance', projectId: 'p1', date: '2026-05-12' },
      { id: 'ev-far', store: 'maintenance', projectId: 'p1', date: '2026-07-01' },
      { id: 'ev-other', store: 'nursery', projectId: 'p1', date: '2026-05-10' },
    ];
    const before = JSON.parse(JSON.stringify({ items, events }));

    const s = suggestProofMatches(items, events, 7);

    expect(s).toEqual([
      { itemId: 'm1', eventId: 'ev-near', store: 'maintenance', daysApart: 2 },
    ]);
    // pure: inputs untouched
    expect({ items, events }).toEqual(before);
  });

  it('analyzeFieldProof: per-item state + counts rollup', () => {
    const items = [
      wi({ id: 'i1', status: 'done' }),
      wi({ id: 'i2', status: 'done' }),
      wi({ id: 'i3', status: 'todo' }),
    ];
    const linked = new Map<string, string[]>([
      ['i1', ['proof-1']],
      ['i2', []],
    ]);
    const a = analyzeFieldProof(items, linked, [], 7);
    expect(a.byItemId.get('i1')).toBe('proven');
    expect(a.byItemId.get('i2')).toBe('claimed');
    expect(a.byItemId.get('i3')).toBe('open');
    expect(a.counts).toEqual({ proven: 1, claimed: 1, open: 1 });
  });

  it('never reads or writes WorkItem.status (derived-only spine discipline)', () => {
    const items = [wi({ id: 's1', status: 'todo' })];
    const before = JSON.parse(JSON.stringify(items));
    const a = analyzeFieldProof(items, new Map(), [], 7);
    expect(items).toEqual(before);
    expect(items[0]!.status).toBe('todo');
    // result carries no raw status field anywhere
    expect(JSON.stringify({
      byItemId: [...a.byItemId.entries()],
      suggestions: a.suggestions,
      counts: a.counts,
    })).not.toMatch(/status/i);
  });

  it('covenant: no financing/capital/investor semantics in the engine surface', () => {
    const items = [wi({ id: 'x', status: 'done' })];
    const a = analyzeFieldProof(items, new Map([['x', ['p']]]), [], 7);
    const json = JSON.stringify({
      byItemId: [...a.byItemId.entries()],
      suggestions: a.suggestions,
      counts: a.counts,
    });
    expect(json).not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i,
    );
  });
});
