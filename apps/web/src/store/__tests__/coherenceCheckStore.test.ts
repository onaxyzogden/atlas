import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCoherenceCheckStore,
  EMPTY_COHERENCE_CHECK,
} from '../coherenceCheckStore';

const PID = 'project-1';
const get = () => useCoherenceCheckStore.getState();
const record = (pid = PID) => get().byProject[pid] ?? EMPTY_COHERENCE_CHECK;

const TS = 1_700_000_000_000;

beforeEach(() => {
  useCoherenceCheckStore.setState({ byProject: {} });
});

describe('coherenceCheckStore -- empty record', () => {
  it('defaults to the shared EMPTY record for an unknown project', () => {
    expect(record('unknown')).toBe(EMPTY_COHERENCE_CHECK);
    expect(record('unknown').itemResolutions).toEqual({});
    expect(record('unknown').amendments).toEqual([]);
    expect(record('unknown').sealedAt).toBeUndefined();
  });
});

describe('coherenceCheckStore -- resolveItem (append-only)', () => {
  it('records a resolution and pushes a matching amendment', () => {
    get().resolveItem(PID, 'B3', 'Add a compost bay between kitchen and garden.', TS);
    expect(record().itemResolutions['B3']).toEqual({
      resolvedAt: TS,
      amendmentText: 'Add a compost bay between kitchen and garden.',
    });
    expect(record().amendments).toEqual([
      {
        itemId: 'B3',
        amendmentText: 'Add a compost bay between kitchen and garden.',
        resolvedAt: TS,
      },
    ]);
  });

  it('trims the amendment text before storing', () => {
    get().resolveItem(PID, 'B3', '   route greywater to the swale   ', TS);
    expect(record().itemResolutions['B3']!.amendmentText).toBe(
      'route greywater to the swale',
    );
    expect(record().amendments[0]!.amendmentText).toBe(
      'route greywater to the swale',
    );
  });

  it('is a no-op for empty / whitespace-only text', () => {
    get().resolveItem(PID, 'B3', '    ', TS);
    expect(PID in get().byProject).toBe(false);
    expect(record().amendments).toEqual([]);
  });

  it('never overwrites an existing amendment (cannot be edited after submission)', () => {
    get().resolveItem(PID, 'B3', 'first answer', TS);
    // A second attempt on the same item must not change anything.
    get().resolveItem(PID, 'B3', 'a different, later answer', TS + 5_000);
    expect(record().itemResolutions['B3']).toEqual({
      resolvedAt: TS,
      amendmentText: 'first answer',
    });
    // The log only ever grows by genuinely new items -- no duplicate entry.
    expect(record().amendments).toHaveLength(1);
    expect(record().amendments[0]!.amendmentText).toBe('first answer');
  });

  it('appends amendments for distinct items in submission order', () => {
    get().resolveItem(PID, 'B3', 'compost bay', TS);
    get().resolveItem(PID, 'c-res-s5-living-infrastructure', 'metering plan', TS + 1_000);
    expect(record().amendments).toHaveLength(2);
    expect(record().amendments.map((a) => a.itemId)).toEqual([
      'B3',
      'c-res-s5-living-infrastructure',
    ]);
  });

  it('defaults resolvedAt to a real timestamp when none is supplied', () => {
    get().resolveItem(PID, 'B3', 'compost bay');
    const at = record().itemResolutions['B3']!.resolvedAt;
    expect(typeof at).toBe('number');
    expect(at).toBeGreaterThan(0);
    expect(record().amendments[0]!.resolvedAt).toBe(at);
  });
});

describe('coherenceCheckStore -- Amanah refuse-to-store', () => {
  it('refuses to persist amendment text that trips the CSA / advance-sale guard', () => {
    get().resolveItem(PID, 'B3', 'Fund the compost bay via a CSA subscription presale.', TS);
    expect(PID in get().byProject).toBe(false);
    expect(record().amendments).toEqual([]);
  });

  it('still stores a clean amendment on the same item afterwards', () => {
    get().resolveItem(PID, 'B3', 'yield-share advance-sale to members', TS); // refused
    get().resolveItem(PID, 'B3', 'in-kind contributions cover the bay', TS + 1_000);
    expect(record().itemResolutions['B3']!.amendmentText).toBe(
      'in-kind contributions cover the bay',
    );
    expect(record().amendments).toHaveLength(1);
  });
});

describe('coherenceCheckStore -- seal / unseal', () => {
  it('seal stamps a timestamp; a re-seal is idempotent', () => {
    get().seal(PID, TS);
    expect(record().sealedAt).toBe(TS);
    // Re-sealing must keep the ORIGINAL timestamp.
    get().seal(PID, TS + 9_999);
    expect(record().sealedAt).toBe(TS);
  });

  it('seal defaults to a real timestamp when none is supplied', () => {
    get().seal(PID);
    expect(typeof record().sealedAt).toBe('number');
    expect(record().sealedAt).toBeGreaterThan(0);
  });

  it('unseal clears the seal but keeps resolutions + amendments', () => {
    get().resolveItem(PID, 'B3', 'compost bay', TS);
    get().seal(PID, TS + 1_000);
    expect(record().sealedAt).toBe(TS + 1_000);

    get().unseal(PID);
    expect(record().sealedAt).toBeUndefined();
    // The audit history survives a re-open.
    expect(record().itemResolutions['B3']).toEqual({
      resolvedAt: TS,
      amendmentText: 'compost bay',
    });
    expect(record().amendments).toHaveLength(1);
  });

  it('unseal is a no-op on an unsealed project', () => {
    get().resolveItem(PID, 'B3', 'compost bay', TS);
    get().unseal(PID);
    expect(record().sealedAt).toBeUndefined();
    expect(record().amendments).toHaveLength(1);
  });
});

describe('coherenceCheckStore -- reset + project isolation', () => {
  it('reset drops only the named project', () => {
    get().seal(PID, TS);
    get().resolveItem('project-2', 'B3', 'compost bay', TS);
    get().reset(PID);
    expect(PID in get().byProject).toBe(false);
    expect(record('project-2').amendments).toHaveLength(1);
  });

  it('reset is a no-op for an unknown project', () => {
    get().seal(PID, TS);
    get().reset('unknown');
    expect(record().sealedAt).toBe(TS);
  });
});
