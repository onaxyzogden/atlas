import { describe, it, expect, vi } from 'vitest';
import { buildSnapshot } from '../snapshot-three-streams';

describe('buildSnapshot', () => {
  it('shapes the JSON with required top-level keys', async () => {
    const fakeQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Three Streams Farm' }] })       // project
      .mockResolvedValueOnce({ rows: [{ layer_type: 'soils' }] })                         // layers
      .mockResolvedValueOnce({ rows: [{ id: 'f1', feature_type: 'zone' }] })              // features
      .mockResolvedValueOnce({ rows: [{ id: 'e1', event_date: '2024-04-12' }] })          // events
      .mockResolvedValueOnce({ rows: [{ id: 's1' }] })                                    // spiritual
      .mockResolvedValueOnce({ rows: [{ from_output: 'manure' }] });                      // relationships

    const snap = await buildSnapshot({ query: fakeQuery } as any, 'three-streams-id');
    expect(Object.keys(snap).sort()).toEqual([
      'designFeatures', 'layers', 'project', 'regenerationEvents', 'relationships', 'spiritualZones',
    ]);
    expect(snap.regenerationEvents).toHaveLength(1);
  });
});
