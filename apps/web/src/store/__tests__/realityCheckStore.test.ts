import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRealityCheckStore,
  EMPTY_REALITY_CHECK,
} from '../realityCheckStore';

const PID = 'project-1';
const get = () => useRealityCheckStore.getState();
const record = (pid = PID) => get().byProject[pid] ?? EMPTY_REALITY_CHECK;

beforeEach(() => {
  useRealityCheckStore.setState({ byProject: {} });
});

describe('realityCheckStore -- phase 1', () => {
  it('defaults to an empty record for an unknown project', () => {
    expect(record('unknown')).toBe(EMPTY_REALITY_CHECK);
    expect(record('unknown').phase1Ready).toBe(false);
  });

  it('setPhase1Ready toggles the gate', () => {
    get().setPhase1Ready(PID, true);
    expect(record().phase1Ready).toBe(true);
    get().setPhase1Ready(PID, false);
    expect(record().phase1Ready).toBe(false);
  });
});

describe('realityCheckStore -- strand findings', () => {
  it('records a stance/note then clears on an empty finding', () => {
    get().setStrandFinding(PID, 'water', { stance: 'mixed', note: 'seasonal creek' });
    expect(record().strandFindings.water).toEqual({
      stance: 'mixed',
      note: 'seasonal creek',
    });

    // Empty finding removes the key (keeps the map sparse).
    get().setStrandFinding(PID, 'water', { note: '   ' });
    expect('water' in record().strandFindings).toBe(false);
  });
});

describe('realityCheckStore -- classifications', () => {
  it('classifyElement sets status and preserves annotations', () => {
    get().classifyElement(PID, 'ie-cm-1', 'conditional');
    get().annotateClassification(PID, 'ie-cm-1', { condition: 'water first' });
    expect(record().classifications['ie-cm-1']).toEqual({
      status: 'conditional',
      condition: 'water first',
    });

    // Re-classifying keeps the existing condition (only status changes).
    get().classifyElement(PID, 'ie-cm-1', 'feasible');
    expect(record().classifications['ie-cm-1']).toEqual({
      status: 'feasible',
      condition: 'water first',
    });
  });

  it('annotateClassification is a no-op when the element has no status yet', () => {
    get().annotateClassification(PID, 'ie-cm-2', { note: 'orphan' });
    expect(record().classifications['ie-cm-2']).toBeUndefined();
  });

  it('clearClassification removes one element', () => {
    get().classifyElement(PID, 'ie-cm-1', 'feasible');
    get().classifyElement(PID, 'ie-cm-2', 'deferred');
    get().clearClassification(PID, 'ie-cm-1');
    expect(record().classifications['ie-cm-1']).toBeUndefined();
    expect(record().classifications['ie-cm-2']).toEqual({ status: 'deferred' });
  });
});

describe('realityCheckStore -- planning direction + approval', () => {
  it('sets the planning direction text', () => {
    get().setPlanningDirectionText(PID, 'Hillside Farm will proceed...');
    expect(record().planningDirectionText).toBe('Hillside Farm will proceed...');
  });

  it('approve stamps a timestamp; resetApproval clears it but keeps the rest', () => {
    get().setPlanningDirectionText(PID, 'statement');
    get().classifyElement(PID, 'ie-cm-1', 'feasible');

    get().approve(PID, 1_700_000_000_000);
    expect(record().approvedAt).toBe(1_700_000_000_000);

    get().resetApproval(PID);
    expect(record().approvedAt).toBeUndefined();
    // Other fields survive the re-open.
    expect(record().planningDirectionText).toBe('statement');
    expect(record().classifications['ie-cm-1']).toEqual({ status: 'feasible' });
  });

  it('approve defaults to a real timestamp when none is supplied', () => {
    get().approve(PID);
    expect(typeof record().approvedAt).toBe('number');
    expect(record().approvedAt).toBeGreaterThan(0);
  });
});

describe('realityCheckStore -- reset + project isolation', () => {
  it('reset drops only the named project', () => {
    get().setPhase1Ready(PID, true);
    get().setPhase1Ready('project-2', true);
    get().reset(PID);
    expect(PID in get().byProject).toBe(false);
    expect(record('project-2').phase1Ready).toBe(true);
  });
});
