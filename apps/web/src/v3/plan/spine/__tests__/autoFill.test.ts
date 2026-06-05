// autoFill.test.ts
//
// Unit coverage for the §4.1 AUTO-FILLED bracket substitution used by the
// protocol confirmation card stack. The helper is pure string work (no eval),
// so it is verified directly here rather than through the (dead-API-flaky)
// preview surface.

import { describe, it, expect } from 'vitest';
import { renderConditionSegments } from '../autoFill.js';

const OUTPUTS = {
  'approved threshold': '1,500 kg DM/ha',
  'approved day limit': '3 days',
  'emergency threshold': '800 kg DM/ha',
};

describe('renderConditionSegments', () => {
  it('substitutes a known bracket token and flags it auto-filled with its token name', () => {
    const segs = renderConditionSegments('pasture cover < [approved threshold] kg DM/ha', OUTPUTS);
    expect(segs).toEqual([
      { text: 'pasture cover < ', autoFilled: false },
      { text: '1,500 kg DM/ha', autoFilled: true, token: 'approved threshold' },
      { text: ' kg DM/ha', autoFilled: false },
    ]);
  });

  it('returns a single literal segment (no token) when there are no brackets', () => {
    const segs = renderConditionSegments('rotation entry event', OUTPUTS);
    expect(segs).toEqual([{ text: 'rotation entry event', autoFilled: false }]);
  });

  it('keeps an unknown bracket token verbatim, flags it auto-filled, and still records the token', () => {
    const segs = renderConditionSegments('grazing days ≥ [unmapped token]', OUTPUTS);
    expect(segs).toEqual([
      { text: 'grazing days ≥ ', autoFilled: false },
      { text: '[unmapped token]', autoFilled: true, token: 'unmapped token' },
    ]);
  });

  it('handles multiple bracket tokens, recording each token name', () => {
    const segs = renderConditionSegments(
      '[approved threshold] then [emergency threshold]',
      OUTPUTS,
    );
    expect(segs).toEqual([
      { text: '1,500 kg DM/ha', autoFilled: true, token: 'approved threshold' },
      { text: ' then ', autoFilled: false },
      { text: '800 kg DM/ha', autoFilled: true, token: 'emergency threshold' },
    ]);
    expect(segs.filter((s) => s.autoFilled).every((s) => !/[[\]]/.test(s.text))).toBe(true);
  });

  it('records the token on a mid-string substitution', () => {
    const segs = renderConditionSegments('no body condition score in [approved day limit]', OUTPUTS);
    expect(segs[0]).toEqual({ text: 'no body condition score in ', autoFilled: false });
    expect(segs[1]).toEqual({ text: '3 days', autoFilled: true, token: 'approved day limit' });
  });

  it('does not set a token on literal segments', () => {
    const segs = renderConditionSegments('cover < [approved threshold] now', OUTPUTS);
    expect(segs[0]).not.toHaveProperty('token');
    expect(segs[2]).not.toHaveProperty('token');
  });
});
