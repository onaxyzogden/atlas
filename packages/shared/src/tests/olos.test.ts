/**
 * OLOS foundation tests — round-trip parsing of every record schema,
 * structural invariants on the seeded catalogue, and helper coverage on
 * the stage-boundary verb table.
 */

import { describe, it, expect } from 'vitest';

import {
  Stage,
  STAGES,
  STAGE_LABELS,
  STAGE_CORE_QUESTION,
} from '../schemas/olos/stage.schema.js';
import {
  OverlayId,
  OverlaySchema,
} from '../schemas/olos/overlay.schema.js';
import {
  ObserveStatus,
  PlanApprovalStatus,
  ActTaskStatus,
  STATUS_BY_STAGE,
  APPROVED_PLAN_STATUSES,
  TERMINAL_ACT_STATUSES,
} from '../schemas/olos/status.schema.js';
import { GeoJSONGeometrySchema } from '../schemas/olos/geometry.schema.js';
import { ChecklistItemSchema } from '../schemas/olos/checklistItem.schema.js';
import { ObjectiveSchema } from '../schemas/olos/objective.schema.js';
import { ObservationRecordSchema } from '../schemas/olos/observationRecord.schema.js';
import { PlanDecisionRecordSchema } from '../schemas/olos/planDecisionRecord.schema.js';
import { ActHandoffPackageSchema } from '../schemas/olos/actHandoffPackage.schema.js';
import { ActTaskSchema } from '../schemas/olos/actTask.schema.js';
import { ProofRecordSchema } from '../schemas/olos/proofRecord.schema.js';
import { VerificationRecordSchema } from '../schemas/olos/verificationRecord.schema.js';
import { EscalationRecordSchema } from '../schemas/olos/escalationRecord.schema.js';
import { StewardshipRoutineSchema } from '../schemas/olos/stewardshipRoutine.schema.js';
import {
  UNIVERSAL_OVERLAY_IDS,
  UNIVERSAL_OVERLAYS,
} from '../constants/olos/overlays.js';
import {
  STAGE_ALLOWED_VERBS,
  STAGE_AVOIDED_VERBS,
  isVerbAllowedForStage,
  isVerbAvoidedForStage,
} from '../constants/olos/stageBoundaries.js';
import {
  UNIVERSAL_OBJECTIVES,
  UNIVERSAL_CHECKLIST_ITEMS,
  getObjective,
  getChecklistItemsForObjective,
} from '../constants/olos/objectives.js';
import { UNIVERSAL_DOMAINS } from '../constants/universalDomain.js';

// ─── Stage enum ──────────────────────────────────────────────────────────────

describe('OLOS Stage enum', () => {
  it('accepts the three canonical stages', () => {
    expect(Stage.parse('observe')).toBe('observe');
    expect(Stage.parse('plan')).toBe('plan');
    expect(Stage.parse('act')).toBe('act');
  });
  it('rejects unknown stages', () => {
    expect(Stage.safeParse('verify').success).toBe(false);
    expect(Stage.safeParse('').success).toBe(false);
  });
  it('STAGES, STAGE_LABELS, STAGE_CORE_QUESTION cover all stages', () => {
    expect(STAGES).toHaveLength(3);
    for (const s of STAGES) {
      expect(STAGE_LABELS[s]).toBeTruthy();
      expect(STAGE_CORE_QUESTION[s]).toBeTruthy();
    }
  });
});

// ─── Overlay catalogue ───────────────────────────────────────────────────────

describe('OLOS Overlay catalogue', () => {
  it('has exactly 15 overlays', () => {
    expect(UNIVERSAL_OVERLAY_IDS).toHaveLength(15);
  });
  it('every overlay id parses through OverlayId', () => {
    for (const id of UNIVERSAL_OVERLAY_IDS) {
      expect(OverlayId.parse(id)).toBe(id);
    }
  });
  it('every overlay row round-trips through OverlaySchema', () => {
    for (const id of UNIVERSAL_OVERLAY_IDS) {
      const parsed = OverlaySchema.parse(UNIVERSAL_OVERLAYS[id]);
      expect(parsed.id).toBe(id);
      expect(parsed.geometryType).toBeTruthy();
    }
  });
});

// ─── Status enums ────────────────────────────────────────────────────────────

describe('OLOS Status enums', () => {
  it('Observe status accepts and rejects', () => {
    expect(ObserveStatus.parse('clear')).toBe('clear');
    expect(ObserveStatus.safeParse('approved-for-act').success).toBe(false);
  });
  it('Plan approval status accepts and rejects', () => {
    expect(PlanApprovalStatus.parse('approved-for-act')).toBe('approved-for-act');
    expect(PlanApprovalStatus.safeParse('verified-complete').success).toBe(false);
  });
  it('Act task status accepts and rejects', () => {
    expect(ActTaskStatus.parse('in-progress')).toBe('in-progress');
    expect(ActTaskStatus.safeParse('clear').success).toBe(false);
  });
  it('STATUS_BY_STAGE has entries for all stages', () => {
    expect(STATUS_BY_STAGE.observe.length).toBeGreaterThan(0);
    expect(STATUS_BY_STAGE.plan.length).toBeGreaterThan(0);
    expect(STATUS_BY_STAGE.act.length).toBeGreaterThan(0);
  });
  it('APPROVED_PLAN_STATUSES and TERMINAL_ACT_STATUSES are non-empty', () => {
    expect(APPROVED_PLAN_STATUSES).toContain('approved-for-act');
    expect(TERMINAL_ACT_STATUSES).toContain('verified-complete');
  });
});

// ─── Stage boundaries ────────────────────────────────────────────────────────

describe('OLOS Stage boundary verbs', () => {
  it('Observe allows document, rejects decide', () => {
    expect(isVerbAllowedForStage('document', 'observe')).toBe(true);
    expect(isVerbAvoidedForStage('decide', 'observe')).toBe(true);
  });
  it('Plan allows decide, rejects install', () => {
    expect(isVerbAllowedForStage('decide', 'plan')).toBe(true);
    expect(isVerbAvoidedForStage('install', 'plan')).toBe(true);
  });
  it('Act allows install, rejects decide', () => {
    expect(isVerbAllowedForStage('install', 'act')).toBe(true);
    expect(isVerbAvoidedForStage('decide', 'act')).toBe(true);
  });
  it('every stage has non-empty allowed + avoided sets', () => {
    for (const s of STAGES) {
      expect(STAGE_ALLOWED_VERBS[s].length).toBeGreaterThan(0);
      expect(STAGE_AVOIDED_VERBS[s].length).toBeGreaterThan(0);
    }
  });
});

// ─── Objective + Checklist catalogue ─────────────────────────────────────────

describe('OLOS Objective catalogue', () => {
  it('contains exactly 48 objectives (16 domains × 3 stages)', () => {
    expect(UNIVERSAL_OBJECTIVES).toHaveLength(48);
  });
  it('every objective has a unique id', () => {
    const ids = new Set(UNIVERSAL_OBJECTIVES.map((o) => o.id));
    expect(ids.size).toBe(UNIVERSAL_OBJECTIVES.length);
  });
  it('every objective round-trips through ObjectiveSchema', () => {
    for (const o of UNIVERSAL_OBJECTIVES) {
      const parsed = ObjectiveSchema.parse(o);
      expect(parsed.id).toBe(o.id);
    }
  });
  it('every (stage, domain) pair has exactly one objective', () => {
    for (const stage of STAGES) {
      for (const domain of UNIVERSAL_DOMAINS) {
        const found = UNIVERSAL_OBJECTIVES.filter(
          (o) => o.stage === stage && o.domain === domain,
        );
        expect(found).toHaveLength(1);
      }
    }
  });
  it('getObjective resolves a known pair', () => {
    const o = getObjective('observe', 'hydrology');
    expect(o).toBeTruthy();
    expect(o!.stage).toBe('observe');
    expect(o!.domain).toBe('hydrology');
  });
  it('plan + act objectives declare required upstream inputs', () => {
    for (const o of UNIVERSAL_OBJECTIVES) {
      if (o.stage === 'observe') continue;
      expect(o.requiredInputs.length).toBeGreaterThan(0);
    }
  });
  it('every requiredInputs objectiveId resolves to a real upstream objective', () => {
    const objectiveIds = new Set(UNIVERSAL_OBJECTIVES.map((o) => o.id));
    const dangling: string[] = [];
    for (const o of UNIVERSAL_OBJECTIVES) {
      for (const input of o.requiredInputs) {
        if (input.objectiveId && !objectiveIds.has(input.objectiveId)) {
          dangling.push(`${o.id} -> ${input.objectiveId}`);
        }
      }
    }
    expect(dangling).toEqual([]);
  });
  it('every objective has a non-empty default overlay bundle and checklist', () => {
    for (const o of UNIVERSAL_OBJECTIVES) {
      expect(o.defaultOverlayBundle.length).toBeGreaterThan(0);
      expect(o.checklistItemIds.length).toBeGreaterThan(0);
    }
  });
});

describe('OLOS Checklist catalogue', () => {
  it('checklist items reference only known objective ids', () => {
    const objIds = new Set(UNIVERSAL_OBJECTIVES.map((o) => o.id));
    for (const item of UNIVERSAL_CHECKLIST_ITEMS) {
      expect(objIds.has(item.objectiveId)).toBe(true);
    }
  });
  it('every checklist item round-trips through ChecklistItemSchema', () => {
    for (const item of UNIVERSAL_CHECKLIST_ITEMS) {
      const parsed = ChecklistItemSchema.parse(item);
      expect(parsed.id).toBe(item.id);
    }
  });
  it('ordinals start at 1 and are contiguous per objective', () => {
    for (const o of UNIVERSAL_OBJECTIVES) {
      const items = getChecklistItemsForObjective(o.id);
      const ordinals = items.map((i) => i.ordinal).sort((a, b) => a - b);
      for (let i = 0; i < ordinals.length; i++) {
        expect(ordinals[i]).toBe(i + 1);
      }
    }
  });
});

// ─── Record round-trip ───────────────────────────────────────────────────────

describe('OLOS record schemas — round-trip', () => {
  const nowIso = '2026-05-26T10:00:00.000Z';

  it('GeoJSONGeometry parses a Point', () => {
    expect(
      GeoJSONGeometrySchema.parse({ type: 'Point', coordinates: [0, 0] }).type,
    ).toBe('Point');
  });

  it('ObservationRecord round-trips', () => {
    const r = ObservationRecordSchema.parse({
      id: 'obs-1',
      projectId: 'proj-1',
      objectiveId: 'hydrology--observe',
      status: 'major-constraint',
      summary: 'Spring fails in summer.',
      constraints: '',
      unknowns: '',
      flags: [],
      evidenceRefs: [],
      recordedAt: nowIso,
    });
    expect(r.id).toBe('obs-1');
  });

  it('PlanDecisionRecord round-trips', () => {
    const r = PlanDecisionRecordSchema.parse({
      id: 'plan-1',
      projectId: 'proj-1',
      objectiveId: 'hydrology--plan',
      selectedOption: { id: 'opt-a', label: 'Build swale + tank' },
      rejectedOptions: [],
      rationale: '',
      assumptions: [],
      constraints: [],
      dependencies: [],
      riskFlags: [],
      upstreamObservationRecordIds: ['obs-1'],
      approvalStatus: 'approved-for-act',
      decidedAt: nowIso,
    });
    expect(r.approvalStatus).toBe('approved-for-act');
  });

  it('ActHandoffPackage round-trips', () => {
    const h = ActHandoffPackageSchema.parse({
      id: 'hp-1',
      projectId: 'proj-1',
      planDecisionRecordId: 'plan-1',
      workScope: 'Install swale on contour A',
      createdAt: nowIso,
    });
    expect(h.id).toBe('hp-1');
  });

  it('ActTask round-trips', () => {
    const t = ActTaskSchema.parse({
      id: 'task-1',
      projectId: 'proj-1',
      objectiveId: 'hydrology--act',
      handoffPackageId: 'hp-1',
      title: 'Dig swale segment 1',
      description: '',
      status: 'ready',
      createdAt: nowIso,
    });
    expect(t.status).toBe('ready');
  });

  it('ProofRecord round-trips', () => {
    const p = ProofRecordSchema.parse({
      id: 'proof-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      proofType: 'photo',
      capturedAt: nowIso,
    });
    expect(p.verificationStatus).toBe('pending');
  });

  it('VerificationRecord round-trips', () => {
    const v = VerificationRecordSchema.parse({
      id: 'ver-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      outcome: 'pass',
      verifiedAt: nowIso,
    });
    expect(v.outcome).toBe('pass');
  });

  it('EscalationRecord round-trips', () => {
    const e = EscalationRecordSchema.parse({
      id: 'esc-1',
      projectId: 'proj-1',
      triggerKind: 'new-condition',
      routedToStage: 'observe',
      raisedAt: nowIso,
    });
    expect(e.status).toBe('open');
  });

  it('StewardshipRoutine round-trips', () => {
    const s = StewardshipRoutineSchema.parse({
      id: 'sr-1',
      projectId: 'proj-1',
      domainId: 'hydrology',
      title: 'Quarterly swale inspection',
      frequency: 'quarterly',
      createdAt: nowIso,
    });
    expect(s.frequency).toBe('quarterly');
  });
});
