import { describe, it, expect, beforeEach } from 'vitest';
import {
  useActMandateStore,
  EMPTY_ACT_MANDATE,
  selectPlanReadOnly,
  isObjectiveLocked,
} from '../actMandateStore';

const PID = 'project-1';
const OBJ = 's4-water-strategy';
const get = () => useActMandateStore.getState();
const record = (pid = PID) => get().byProject[pid] ?? EMPTY_ACT_MANDATE;

const TS = 1_700_000_000_000;

beforeEach(() => {
  useActMandateStore.setState({ byProject: {} });
});

describe('actMandateStore -- empty record', () => {
  it('defaults to the shared EMPTY record for an unknown project', () => {
    expect(record('unknown')).toBe(EMPTY_ACT_MANDATE);
    expect(record('unknown').planReadOnly).toBe(false);
    expect(record('unknown').objectiveOverrides).toEqual({});
    expect(record('unknown').mandatedAt).toBeUndefined();
  });

  it('an un-mandated objective is never locked', () => {
    expect(isObjectiveLocked(record('unknown'), OBJ)).toBe(false);
    expect(selectPlanReadOnly(record('unknown'))).toBe(false);
  });
});

describe('actMandateStore -- beginAct (idempotent)', () => {
  it('stamps mandatedAt and arms planReadOnly', () => {
    get().beginAct(PID, TS);
    expect(record().mandatedAt).toBe(TS);
    expect(record().planReadOnly).toBe(true);
    expect(selectPlanReadOnly(record())).toBe(true);
  });

  it('locks every objective once armed (none lifted yet)', () => {
    get().beginAct(PID, TS);
    expect(isObjectiveLocked(record(), OBJ)).toBe(true);
    expect(isObjectiveLocked(record(), 's5-access')).toBe(true);
  });

  it('is idempotent -- a second Begin Act keeps the original timestamp', () => {
    get().beginAct(PID, TS);
    get().beginAct(PID, TS + 9_999);
    expect(record().mandatedAt).toBe(TS);
    expect(record().planReadOnly).toBe(true);
  });

  it('defaults mandatedAt to a real timestamp when none is supplied', () => {
    get().beginAct(PID);
    const at = record().mandatedAt;
    expect(typeof at).toBe('number');
    expect(at).toBeGreaterThan(0);
    expect(record().planReadOnly).toBe(true);
  });
});

describe('actMandateStore -- liftLock / relock (governance lift window)', () => {
  it('liftLock unlocks one objective; others stay locked', () => {
    get().beginAct(PID, TS);
    get().liftLock(PID, OBJ, TS + 1_000);
    expect(record().objectiveOverrides[OBJ]).toBe(TS + 1_000);
    expect(isObjectiveLocked(record(), OBJ)).toBe(false);
    expect(isObjectiveLocked(record(), 's5-access')).toBe(true);
  });

  it('relock re-locks the lifted objective', () => {
    get().beginAct(PID, TS);
    get().liftLock(PID, OBJ, TS + 1_000);
    get().relock(PID, OBJ);
    expect(OBJ in record().objectiveOverrides).toBe(false);
    expect(isObjectiveLocked(record(), OBJ)).toBe(true);
  });

  it('liftLock is idempotent (keeps the first lift time)', () => {
    get().beginAct(PID, TS);
    get().liftLock(PID, OBJ, TS + 1_000);
    get().liftLock(PID, OBJ, TS + 5_000);
    expect(record().objectiveOverrides[OBJ]).toBe(TS + 1_000);
  });

  it('relock is a no-op when the objective was never lifted', () => {
    get().beginAct(PID, TS);
    get().relock(PID, OBJ);
    expect(record().objectiveOverrides).toEqual({});
  });

  it('liftLock defaults to a real timestamp when none is supplied', () => {
    get().beginAct(PID, TS);
    get().liftLock(PID, OBJ);
    const at = record().objectiveOverrides[OBJ];
    expect(typeof at).toBe('number');
    expect(at).toBeGreaterThan(0);
  });
});

describe('actMandateStore -- reset + project isolation', () => {
  it('reset drops only the named project', () => {
    get().beginAct(PID, TS);
    get().beginAct('project-2', TS);
    get().reset(PID);
    expect(PID in get().byProject).toBe(false);
    expect(record('project-2').planReadOnly).toBe(true);
  });

  it('reset is a no-op for an unknown project', () => {
    get().beginAct(PID, TS);
    get().reset('unknown');
    expect(record().mandatedAt).toBe(TS);
  });
});
