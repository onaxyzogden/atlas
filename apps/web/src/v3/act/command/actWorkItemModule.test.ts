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
  it('maps maintenance → maintain', () => {
    expect(actWorkItemModule(itemWith('maintenance'))).toBe('maintain');
  });

  it('maps livestock-movement sources → livestock', () => {
    expect(actWorkItemModule(itemWith('scheduled-livestock-move'))).toBe(
      'livestock',
    );
    expect(actWorkItemModule(itemWith('rotation-sequence'))).toBe('livestock');
  });

  it('maps planting / habitat sources → build', () => {
    expect(actWorkItemModule(itemWith('nursery-batch'))).toBe('build');
    expect(actWorkItemModule(itemWith('cover-crop'))).toBe('build');
    expect(actWorkItemModule(itemWith('tree-planting'))).toBe('build');
    expect(actWorkItemModule(itemWith('agroforestry'))).toBe('build');
    expect(actWorkItemModule(itemWith('habitat-feature'))).toBe('build');
  });

  it('maps the execution-spine sources → tracker', () => {
    expect(actWorkItemModule(itemWith('goal-compass'))).toBe('tracker');
    expect(actWorkItemModule(itemWith('field-task'))).toBe('tracker');
    expect(actWorkItemModule(itemWith('manual'))).toBe('tracker');
  });

  it('defaults an unknown source → tracker', () => {
    expect(actWorkItemModule(itemWith('something-new' as WorkItemSource))).toBe(
      'tracker',
    );
  });
});
