/**
 * computeVisionDrawArmed — the Vision-canvas crosshair predicate. MapCursorHost
 * paints the crosshair `!important` only while this returns true; the old
 * `activeKind || beKind` predicate missed the dedicated-store `plan.*` tools,
 * every `observe.*` tool, and the survey takeovers, so the cursor was stomped
 * back to grab/pointer for those families. This pins the broadened predicate.
 */

import { describe, it, expect } from 'vitest';
import { computeVisionDrawArmed } from '../useToolIdToElementKind.js';

const NO_SURVEY = { surveyActive: false, slopeActive: false } as const;

describe('computeVisionDrawArmed', () => {
  it('elementCatalog kind tool → true', () => {
    expect(
      computeVisionDrawArmed({ activeTool: 'plan.plant-systems.orchard', ...NO_SURVEY }),
    ).toBe(true);
  });

  it('dedicated-store plan.* tool (no elementCatalog kind) → true', () => {
    expect(
      computeVisionDrawArmed({ activeTool: 'plan.zone-circulation.fence-line', ...NO_SURVEY }),
    ).toBe(true);
  });

  it('plan BE registry tool → true', () => {
    expect(
      computeVisionDrawArmed({
        activeTool: 'plan.structures-subsystems.be.barn',
        ...NO_SURVEY,
      }),
    ).toBe(true);
  });

  it('observe.* draw tool → true', () => {
    expect(
      computeVisionDrawArmed({ activeTool: 'observe.topography.contour-line', ...NO_SURVEY }),
    ).toBe(true);
  });

  it('slope-survey takeover (no tool id) → true', () => {
    expect(
      computeVisionDrawArmed({ activeTool: null, surveyActive: false, slopeActive: true }),
    ).toBe(true);
  });

  it('vegetation-survey takeover (no tool id) → true', () => {
    expect(
      computeVisionDrawArmed({ activeTool: null, surveyActive: true, slopeActive: false }),
    ).toBe(true);
  });

  it('nothing armed → false', () => {
    expect(computeVisionDrawArmed({ activeTool: null, ...NO_SURVEY })).toBe(false);
  });

  it('a non-draw act.* tool with no survey flag → false (the takeover flag is the signal)', () => {
    expect(
      computeVisionDrawArmed({ activeTool: 'act.terrain.slope-flat', ...NO_SURVEY }),
    ).toBe(false);
  });
});
