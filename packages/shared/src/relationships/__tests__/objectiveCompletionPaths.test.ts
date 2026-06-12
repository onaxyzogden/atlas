// objectiveCompletionPaths.test.ts
//
// Hermetic unit test for the item-level completion-path classifier. Fixtures
// are SYNTHETIC (made-up objective/tool ids) and tool resolution is injected
// via the `resolveTools` option, so this never moves when the real catalogues
// or the override map change. The real-data sweep lives in the app layer
// (apps/web .../completionPathAudit.ratchet.test.ts), which alone can import
// ACT_TOOL_CATALOG.

import { describe, expect, it } from 'vitest';
import type {
  PlanDecisionChecklistItem,
  PlanStratumObjective,
} from '../../schemas/plan/planStratumObjective.schema.js';
import {
  auditObjectiveCompletionPaths,
  classifyChecklistItem,
  type ActToolArmIndex,
  type ClassifyOptions,
} from '../objectiveCompletionPaths.js';

function item(
  id: string,
  extra: Partial<PlanDecisionChecklistItem> = {},
): PlanDecisionChecklistItem {
  return {
    id,
    label: `Label for ${id}`,
    feedsInto: [],
    optional: false,
    ...extra,
  };
}

function objective(
  id: string,
  checklist: PlanDecisionChecklistItem[],
): PlanStratumObjective {
  return {
    id,
    stratumId: 's4-foundation-decisions',
    title: `Title for ${id}`,
    focusedQuestion: 'Synthetic fixture?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist,
    outputKind: 'plan-decision-record',
    decisionGroups: [],
  };
}

const ARM_INDEX: ActToolArmIndex = {
  'tool.form.item-a': { kind: 'form', formId: 'item-a' },
  'tool.form.orphan': { kind: 'form', formId: 'item-that-does-not-exist' },
  'tool.map.paddock': { kind: 'map' },
  'tool.zone.trim': { kind: 'zone-action' },
  'tool.log.field': { kind: 'log' },
  'tool.flow.review': { kind: 'flow' },
};

function withTools(toolIds: readonly string[]): ClassifyOptions {
  return { resolveTools: () => toolIds };
}

describe('classifyChecklistItem', () => {
  const obj = objective('syn-obj', [item('item-a')]);

  it('answerSpec wins over everything (auto-answer)', () => {
    const it_ = item('item-a', {
      answerSpec: {
        fieldType: 'text',
        sourceField: 'visionProfile.notes',
        editRoute: { kind: 'wizard-step', step: 'vision' },
      },
    });
    expect(
      classifyChecklistItem(obj, it_, ARM_INDEX, withTools(['tool.form.item-a'])),
    ).toEqual({ classification: 'auto-answer' });
  });

  it('formulaBinding only auto-satisfies when satisfiesWhenComputed', () => {
    const satisfying = item('item-a', {
      formulaBinding: {
        formulaId: 'stock-water-demand',
        satisfiesWhenComputed: true,
      },
    });
    expect(
      classifyChecklistItem(obj, satisfying, ARM_INDEX, withTools([])),
    ).toEqual({ classification: 'auto-formula' });

    // Advisory-only binding does NOT complete the item: falls through.
    const advisory = item('item-a', {
      formulaBinding: { formulaId: 'stock-water-demand' },
    });
    expect(
      classifyChecklistItem(obj, advisory, ARM_INDEX, withTools([])),
    ).toEqual({ classification: 'no-path' });
  });

  it('form arm with formId === item id is per-item form-capture', () => {
    expect(
      classifyChecklistItem(
        obj,
        item('item-a'),
        ARM_INDEX,
        withTools(['tool.map.paddock', 'tool.form.item-a']),
      ),
    ).toEqual({ classification: 'form-capture', viaToolId: 'tool.form.item-a' });
  });

  it('a form arm for a DIFFERENT item does not capture this one', () => {
    expect(
      classifyChecklistItem(
        obj,
        item('item-b'),
        ARM_INDEX,
        withTools(['tool.form.item-a']),
      ),
    ).toEqual({ classification: 'no-path' });
  });

  it('objective-level fallbacks rank map (incl. zone-action) > log > flow', () => {
    const it_ = item('item-b');
    expect(
      classifyChecklistItem(
        obj,
        it_,
        ARM_INDEX,
        withTools(['tool.flow.review', 'tool.log.field', 'tool.map.paddock']),
      ),
    ).toEqual({ classification: 'objective-map', viaToolId: 'tool.map.paddock' });
    expect(
      classifyChecklistItem(obj, it_, ARM_INDEX, withTools(['tool.zone.trim'])),
    ).toEqual({ classification: 'objective-map', viaToolId: 'tool.zone.trim' });
    expect(
      classifyChecklistItem(
        obj,
        it_,
        ARM_INDEX,
        withTools(['tool.flow.review', 'tool.log.field']),
      ),
    ).toEqual({ classification: 'objective-log', viaToolId: 'tool.log.field' });
    expect(
      classifyChecklistItem(obj, it_, ARM_INDEX, withTools(['tool.flow.review'])),
    ).toEqual({ classification: 'objective-flow', viaToolId: 'tool.flow.review' });
  });

  it('empty rail and unknown tool ids classify as no-path', () => {
    expect(
      classifyChecklistItem(obj, item('item-b'), ARM_INDEX, withTools([])),
    ).toEqual({ classification: 'no-path' });
    // An id missing from the arm index is skipped, not crashed on (the
    // actToolCoverage conformance test owns unresolved-id reporting).
    expect(
      classifyChecklistItem(
        obj,
        item('item-b'),
        ARM_INDEX,
        withTools(['tool.not.in.catalog']),
      ),
    ).toEqual({ classification: 'no-path' });
  });
});

describe('auditObjectiveCompletionPaths', () => {
  it('classifies every item in checklist order and flags orphan form arms', () => {
    const obj = objective('syn-obj-2', [
      item('item-a'),
      item('item-b'),
      item('item-c', {
        answerSpec: {
          fieldType: 'single_select',
          optionSetId: 'projectPrimaryType',
          sourceField: 'projectTypeRecord.primaryTypeId',
          editRoute: { kind: 'plan-type' },
        },
      }),
    ]);
    const audit = auditObjectiveCompletionPaths(
      obj,
      ARM_INDEX,
      withTools(['tool.form.item-a', 'tool.form.orphan', 'tool.log.field']),
    );
    expect(audit.items.map((i) => [i.itemId, i.classification])).toEqual([
      ['item-a', 'form-capture'],
      ['item-b', 'objective-log'],
      ['item-c', 'auto-answer'],
    ]);
    expect(audit.unmatchedFormArms).toEqual([
      {
        objectiveId: 'syn-obj-2',
        toolId: 'tool.form.orphan',
        formId: 'item-that-does-not-exist',
      },
    ]);
  });
});
