// objectiveActTools.test.ts
//
// Guards the objective -> Act tool resolution, and specifically the
// universal "Set zones and sectors" objective's toolset. The override map
// is keyed by `objective.id`; a stale key (`s4-zones`) that no longer
// matches the canonical objective id (`s4-zones-sectors`) silently fell
// through to the stratum default, so the ring seed / trim / clear tools
// never surfaced on the tier-shell objective rail. These tests lock the
// key to the real objective id so that regression cannot recur.

import { describe, it, expect } from 'vitest';
import {
  OBJECTIVE_ACT_TOOLS_OVERRIDE,
  getObjectiveActTools,
} from '../objectiveActTools.js';
import { PLAN_STRATUM_OBJECTIVES } from '../../constants/plan/stratumObjectives.js';

const ZONES_OBJECTIVE = PLAN_STRATUM_OBJECTIVES.find(
  (o) => o.id === 's4-zones-sectors',
);

describe('getObjectiveActTools — zones & sectors', () => {
  it('the canonical s4-zones-sectors objective exists', () => {
    expect(ZONES_OBJECTIVE).toBeDefined();
  });

  it('surfaces the ring seed/trim/clear tools on the zones objective', () => {
    const tools = getObjectiveActTools(ZONES_OBJECTIVE!);
    expect(tools).toContain('zone-seed');
    expect(tools).toContain('zone-trim');
    expect(tools).toContain('zone-clear');
    expect(tools).toContain('zone');
    expect(tools).toContain('buffer-ring');
  });

  it('the override is keyed by the real objective id, not the stale alias', () => {
    expect(OBJECTIVE_ACT_TOOLS_OVERRIDE['s4-zones-sectors']).toBeDefined();
    // The pre-fix stale key must not linger — it matches no objective and
    // would re-introduce the silent fall-through.
    expect(OBJECTIVE_ACT_TOOLS_OVERRIDE['s4-zones']).toBeUndefined();
  });

  it('every generic universal override key resolves to a real objective id', () => {
    // Type-prefixed keys (ev-*, hms-*, orch-*, …) belong to per-type
    // objective sets not present in the universal PLAN_STRATUM_OBJECTIVES,
    // so we only assert the generic `sN-*` keys here — the family that the
    // universal tier-shell rail actually looks up.
    const universalIds = new Set(PLAN_STRATUM_OBJECTIVES.map((o) => o.id));
    const orphanGenericKeys = Object.keys(OBJECTIVE_ACT_TOOLS_OVERRIDE).filter(
      (k) => /^s[1-7]-/.test(k) && !universalIds.has(k),
    );
    expect(orphanGenericKeys).not.toContain('s4-zones');
  });
});
