// @vitest-environment happy-dom
/**
 * objectiveSummaryStore — stage-generic per-project per-module summary note.
 *
 * Covers: get default, set/get round-trip, stage isolation, project isolation,
 * module isolation, and reset (module-scoped and project-scoped).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useObjectiveSummaryStore } from '../objectiveSummaryStore.js';

function reset(): void {
  useObjectiveSummaryStore.setState({ byStage: {} });
}

describe('objectiveSummaryStore', () => {
  beforeEach(reset);

  it('returns an empty string when no summary is set', () => {
    expect(
      useObjectiveSummaryStore.getState().getSummary('plan', 'p1', 'water-management'),
    ).toBe('');
  });

  it('round-trips a summary by stage/project/module', () => {
    const { setSummary, getSummary } = useObjectiveSummaryStore.getState();
    setSummary('plan', 'p1', 'water-management', 'overflow targets confirmed');
    expect(
      useObjectiveSummaryStore.getState().getSummary('plan', 'p1', 'water-management'),
    ).toBe('overflow targets confirmed');
    // the bound getSummary action reads live state via get(), so it also sees it
    expect(getSummary('plan', 'p1', 'water-management')).toBe(
      'overflow targets confirmed',
    );
  });

  it('isolates summaries across stages', () => {
    const { setSummary } = useObjectiveSummaryStore.getState();
    setSummary('plan', 'p1', 'm', 'plan note');
    setSummary('observe', 'p1', 'm', 'observe note');
    const s = useObjectiveSummaryStore.getState();
    expect(s.getSummary('plan', 'p1', 'm')).toBe('plan note');
    expect(s.getSummary('observe', 'p1', 'm')).toBe('observe note');
  });

  it('isolates summaries across projects and modules', () => {
    const { setSummary } = useObjectiveSummaryStore.getState();
    setSummary('plan', 'p1', 'm1', 'a');
    setSummary('plan', 'p2', 'm1', 'b');
    setSummary('plan', 'p1', 'm2', 'c');
    const s = useObjectiveSummaryStore.getState();
    expect(s.getSummary('plan', 'p1', 'm1')).toBe('a');
    expect(s.getSummary('plan', 'p2', 'm1')).toBe('b');
    expect(s.getSummary('plan', 'p1', 'm2')).toBe('c');
  });

  it('overwrites an existing summary in place', () => {
    const { setSummary } = useObjectiveSummaryStore.getState();
    setSummary('plan', 'p1', 'm', 'first');
    setSummary('plan', 'p1', 'm', 'second');
    expect(useObjectiveSummaryStore.getState().getSummary('plan', 'p1', 'm')).toBe(
      'second',
    );
  });

  it('reset clears a single module without touching siblings', () => {
    const { setSummary, reset: resetSummary } = useObjectiveSummaryStore.getState();
    setSummary('plan', 'p1', 'm1', 'a');
    setSummary('plan', 'p1', 'm2', 'b');
    resetSummary('plan', 'p1', 'm1');
    const s = useObjectiveSummaryStore.getState();
    expect(s.getSummary('plan', 'p1', 'm1')).toBe('');
    expect(s.getSummary('plan', 'p1', 'm2')).toBe('b');
  });

  it('reset clears an entire project when no module is given', () => {
    const { setSummary, reset: resetSummary } = useObjectiveSummaryStore.getState();
    setSummary('plan', 'p1', 'm1', 'a');
    setSummary('plan', 'p1', 'm2', 'b');
    resetSummary('plan', 'p1');
    const s = useObjectiveSummaryStore.getState();
    expect(s.getSummary('plan', 'p1', 'm1')).toBe('');
    expect(s.getSummary('plan', 'p1', 'm2')).toBe('');
  });
});
