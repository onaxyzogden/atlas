import { describe, it, expect } from 'vitest';
import type { WorkItem, WorkItemSource } from '@ogden/shared';
import { actWorkItemModule } from './actWorkItemModule.js';

/**
 * The mapping only reads `item.source`, so a minimal partial cast keeps each
 * case focused on the one field under test (the full WorkItem shape is exercised
 * by the schema tests, not here).
 */
const itemWith = (source: WorkItemSource): WorkItem =>
  ({ source }) as unknown as WorkItem;

describe('actWorkItemModule', () => {
  it('maps maintenance → built-infrastructure', () => {
    expect(actWorkItemModule(itemWith('maintenance'))).toBe(
      'built-infrastructure',
    );
  });

  it('maps livestock-movement sources → animals-livestock', () => {
    expect(actWorkItemModule(itemWith('scheduled-livestock-move'))).toBe(
      'animals-livestock',
    );
    expect(actWorkItemModule(itemWith('rotation-sequence'))).toBe(
      'animals-livestock',
    );
  });

  it('maps planting / habitat sources → built-infrastructure', () => {
    expect(actWorkItemModule(itemWith('nursery-batch'))).toBe(
      'built-infrastructure',
    );
    expect(actWorkItemModule(itemWith('cover-crop'))).toBe(
      'built-infrastructure',
    );
    expect(actWorkItemModule(itemWith('tree-planting'))).toBe(
      'built-infrastructure',
    );
    expect(actWorkItemModule(itemWith('agroforestry'))).toBe(
      'built-infrastructure',
    );
    expect(actWorkItemModule(itemWith('habitat-feature'))).toBe(
      'built-infrastructure',
    );
  });

  it('maps the execution-spine sources → monitoring-records', () => {
    expect(actWorkItemModule(itemWith('goal-compass'))).toBe(
      'monitoring-records',
    );
    expect(actWorkItemModule(itemWith('field-task'))).toBe('monitoring-records');
    expect(actWorkItemModule(itemWith('manual'))).toBe('monitoring-records');
  });

  it('defaults an unknown source → monitoring-records', () => {
    expect(actWorkItemModule(itemWith('something-new' as WorkItemSource))).toBe(
      'monitoring-records',
    );
  });
});
