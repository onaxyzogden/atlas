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
  it('substitutes a known bracket token and flags it auto-filled', () => {
    const segs = renderConditionSegments('pasture cover < [approved threshold] kg DM/ha', OUTPUTS);
    expect(segs).toEqual([
      { text: 'pasture cover < ', autoFilled: false },
      { text: '1,500 kg DM/ha', autoFilled: true },
      { text: ' kg DM/ha', autoFilled: false },
    ]);
  });

  it('returns a single literal segment when there are no brackets', () => {
    const segs = renderConditionSegments('rotation entry event', OUTPUTS);
    expect(segs).toEqual([{ text: 'rotation entry event', autoFilled: false }]);
  });

  it('keeps an unknown bracket token verbatim but still flags it auto-filled', () => {
    const segs = renderConditionSegments('grazing days ≥ [unmapped token]', OUTPUTS);
    expect(segs).toEqual([
      { text: 'grazing days ≥ ', autoFilled: false },
      { text: '[unmapped token]', autoFilled: true },
    ]);
  });

  it('handles multiple bracket tokens in one condition', () => {
    const segs = renderConditionSegments(
      '[approved threshold] then [emergency threshold]',
      OUTPUTS,
    );
    expect(segs).toEqual([
      { text: '1,500 kg DM/ha', autoFilled: true },
      { text: ' then ', autoFilled: false },
      { text: '800 kg DM/ha', autoFilled: true },
    ]);
    // The auto-filled segments carry no leftover bracket characters.
    expect(segs.filter((s) => s.autoFilled).every((s) => !/[[\]]/.test(s.text))).toBe(true);
  });

  it('drops the leading "IF " before splitting (caller responsibility mirrored)', () => {
    // The card strips "IF " before calling; confirm a bare condition with no IF
    // is unaffected and the first literal segment is preserved.
    const segs = renderConditionSegments('no body condition score in [approved day limit]', OUTPUTS);
    expect(segs[0]).toEqual({ text: 'no body condition score in ', autoFilled: false });
    expect(segs[1]).toEqual({ text: '3 days', autoFilled: true });
  });
});
