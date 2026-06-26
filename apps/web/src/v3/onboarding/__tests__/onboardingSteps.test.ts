/**
 * onboardingSteps -- schema invariants for the declarative tour crosswalk. These
 * guard the contract the controller relies on: every spotlight step has a target
 * selector, ids are unique, routes are well-formed, and the modal bookends sit at
 * the ends. Pure data assertions; no DOM, no router.
 */

import { describe, it, expect } from 'vitest';
import { HOMESTEAD_SAMPLE_PROJECT_ID } from '@ogden/shared';
import {
  TOUR_STEPS,
  SPOTLIGHT_STEPS,
  SAMPLE_PROJECT_ID,
  type TourRoute,
} from '../onboardingSteps.js';

const ROUTES: ReadonlySet<TourRoute> = new Set(['portfolio', 'observe', 'plan', 'act']);

describe('onboardingSteps schema', () => {
  it('walks the worked Homestead sample', () => {
    expect(SAMPLE_PROJECT_ID).toBe(HOMESTEAD_SAMPLE_PROJECT_ID);
  });

  it('every step has a non-empty id, title, and body', () => {
    for (const step of TOUR_STEPS) {
      expect(step.id, JSON.stringify(step)).toBeTruthy();
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('step ids are unique', () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every non-modal (spotlight) step carries a target selector', () => {
    for (const step of TOUR_STEPS.filter((s) => !s.isModalStep)) {
      expect(step.target, `spotlight step "${step.id}" must have a target`).toBeTruthy();
    }
  });

  it('every declared route is one of the four known routes', () => {
    for (const step of TOUR_STEPS) {
      if (step.route) expect(ROUTES.has(step.route)).toBe(true);
    }
  });

  it('opens with the welcome modal and closes with the finish modal', () => {
    const first = TOUR_STEPS[0];
    const last = TOUR_STEPS[TOUR_STEPS.length - 1];
    // Optional chaining keeps these honest under noUncheckedIndexedAccess: if the
    // array were ever empty, `first?.id` is undefined and the assertion still fails.
    expect(first?.id).toBe('welcome');
    expect(first?.isModalStep).toBe(true);
    expect(last?.id).toBe('finish');
    expect(last?.isModalStep).toBe(true);
  });

  it('SPOTLIGHT_STEPS excludes the modal steps and preserves order', () => {
    expect(SPOTLIGHT_STEPS.every((s) => !s.isModalStep)).toBe(true);
    expect(SPOTLIGHT_STEPS.length).toBe(TOUR_STEPS.filter((s) => !s.isModalStep).length);
    // Same relative order as the master list.
    const masterOrder = TOUR_STEPS.filter((s) => !s.isModalStep).map((s) => s.id);
    expect(SPOTLIGHT_STEPS.map((s) => s.id)).toEqual(masterOrder);
  });

  it('regen-monitor carries a short timeout: its anchor is lens-gated and absent on the default view', () => {
    const regen = TOUR_STEPS.find((s) => s.id === 'regen-monitor');
    expect(regen, 'regen-monitor step must exist').toBeTruthy();
    // Its target lives behind the Plan ecology lens (absent on the default view),
    // so it overrides the 4s default to avoid a pointless multi-second background
    // poll for an anchor we know will not appear.
    expect(regen?.timeoutMs).toBeTypeOf('number');
    expect(regen?.timeoutMs).toBeGreaterThan(0);
    expect(regen?.timeoutMs).toBeLessThan(1000);
  });

  it('any step that sets timeoutMs uses a positive finite budget', () => {
    for (const step of TOUR_STEPS) {
      if (step.timeoutMs !== undefined) {
        expect(Number.isFinite(step.timeoutMs)).toBe(true);
        expect(step.timeoutMs).toBeGreaterThan(0);
      }
    }
  });

  it('the crosswalk visits Observe, Plan, and Act in order', () => {
    const stageRoutes = TOUR_STEPS.map((s) => s.route).filter(
      (r): r is TourRoute => r === 'observe' || r === 'plan' || r === 'act',
    );
    expect(stageRoutes.indexOf('observe')).toBeLessThan(stageRoutes.indexOf('plan'));
    expect(stageRoutes.indexOf('plan')).toBeLessThan(stageRoutes.lastIndexOf('act'));
  });
});
