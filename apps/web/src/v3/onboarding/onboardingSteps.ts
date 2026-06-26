/**
 * onboardingSteps -- the declarative crosswalk for the offline-demo onboarding
 * tour (FEATURE_DEMO_OFFLINE only). Each step is data: an optional route to land
 * on, an optional CSS selector to spotlight, and the callout copy. The
 * controller (OnboardingTourController) walks this list; nothing here touches
 * the DOM or the router, so the whole sequence is unit-testable in isolation.
 *
 * Targets are deliberately always-present chrome -- the global stage spine
 * (`[data-stage]`, owned by StageSpine), the portfolio list, and the per-stage
 * tier-shell surfaces a cold visitor sees on landing: the Observe land-state
 * header, Plan's Design-tools rail, Act's Objective-tools rail. We never target
 * the WebGL map interior, and never lazy content behind a click we have not
 * triggered (e.g. the Regeneration Monitor lives behind the Plan ecology lens,
 * so its step degrades to a centred concept card). A step whose target never
 * appears degrades to a centred callout (see waitForTarget), so a missing
 * anchor never wedges the tour.
 *
 * The walk is fixed to the Homestead sample, a fully-worked demo builtin cloned
 * client-side at boot (maybeCloneBuiltinsForDemo), so its portfolio row and all
 * three stage routes are reliably present in the offline build.
 */

import { HOMESTEAD_SAMPLE_PROJECT_ID } from '@ogden/shared';

/** The project the tour walks. Re-exported so the controller stays decoupled. */
export const SAMPLE_PROJECT_ID = HOMESTEAD_SAMPLE_PROJECT_ID;

/**
 * Where a step wants the app to be before it resolves. The controller maps each
 * to a typed router navigation (portfolio -> /v3/portfolio; the three stages ->
 * /v3/project/<sample>/<stage>). Kept as a tiny enum rather than raw paths so
 * the step list carries no route literals and stays trivially testable.
 */
export type TourRoute = 'portfolio' | 'observe' | 'plan' | 'act';

/** Which side of the target the callout prefers (clamped to viewport at runtime). */
export type StepPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  /** Stable id (used as React key + analytics-free debugging handle). */
  id: string;
  /** Navigate here before resolving the target. Omit to stay put. */
  route?: TourRoute;
  /** CSS selector to spotlight. Omit on modal steps / pure centred callouts. */
  target?: string;
  /** Heading shown in the callout / modal. */
  title: string;
  /** Body copy. Honest about what the demo does; never overpromises. */
  body: string;
  /** Preferred callout side. Defaults to 'bottom' for spotlight steps. */
  placement?: StepPlacement;
  /**
   * Override waitForTarget's budget (ms) for this step. Note the controller
   * clears the spotlight the instant the step changes, so a known-absent anchor
   * already centres on the next render -- this does NOT fix a visible pause. It
   * simply avoids spinning waitForTarget's full multi-second background poll for
   * an anchor we know will not appear (e.g. regen-monitor, gated behind the Plan
   * ecology lens), and marks that absence as intentional. Omit to inherit 4s.
   */
  timeoutMs?: number;
  /** Render as a centred modal card (welcome / finish) rather than a spotlight. */
  isModalStep?: boolean;
}

// Unicode escapes keep this source pure-ASCII (avoids cp1252/UTF-8 round-trip
// damage on Windows): ’ right-quote, — em-dash, → right-arrow,
// “/” curly double-quotes.
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    route: 'portfolio',
    isModalStep: true,
    title: 'Welcome to OLOS',
    body:
      'OLOS helps you map, design, and steward regenerative land. You work in one ' +
      'repeating loop — Observe, Plan, Act. This short tour walks the loop on a ' +
      'sample project. Nothing leaves your browser; this demo saves locally only.',
  },
  {
    id: 'portfolio-list',
    route: 'portfolio',
    target: '[data-tour="portfolio-list"]',
    placement: 'right',
    title: 'Your projects',
    body:
      'Every project you map lives here. This demo comes pre-loaded with worked ' +
      'samples you can open and explore.',
  },
  {
    id: 'open-sample',
    route: 'portfolio',
    target: '[data-tour="portfolio-sample-row"]',
    placement: 'right',
    title: 'A worked sample',
    body:
      'The Homestead is a fully worked sample — its Observe, Plan, and Act stages ' +
      'are all filled in. Let’s open it and walk the loop.',
  },
  {
    id: 'observe-switch',
    route: 'observe',
    target: '[data-stage="observe"]',
    placement: 'bottom',
    title: 'Observe — read the land',
    body:
      'Observe is where you record what the land already tells you: water, soil, ' +
      'slope, climate, and the life already there. Good design starts from honest ' +
      'observation.',
  },
  {
    id: 'observe-tools',
    route: 'observe',
    target: '[data-tour="observe-surface"]',
    placement: 'bottom',
    title: 'The land at a glance',
    body:
      'Observe rolls your readings up into a living land-state picture — patterns, ' +
      'co-occurrences, and how the site is trending. This is the synthesis the Plan ' +
      'stage designs against.',
  },
  {
    id: 'plan-switch',
    route: 'plan',
    target: '[data-stage="plan"]',
    placement: 'bottom',
    title: 'Plan — design the land',
    body:
      'Plan is where you lay out water, zones, plantings, and structures — then ' +
      'phase the build in ecological sequence.',
  },
  {
    id: 'plan-tools',
    route: 'plan',
    target: '[data-tour="plan-tools"]',
    placement: 'right',
    title: 'Design tools',
    body:
      'This rail is your design kit — water catchments, zones, guilds, structures ' +
      'and phasing. Arm a tool, then draw it straight onto the map to turn ' +
      'observations into a buildable plan.',
  },
  {
    id: 'regen-monitor',
    route: 'plan',
    target: '[data-tour="regen-monitor"]',
    // The anchor lives behind the Plan ecology lens, so it is absent on the
    // default Plan view. The card already centres immediately (the controller
    // clears the spotlight on step change); this short budget just avoids a
    // pointless ~4s background poll for an anchor we know will not appear. If a
    // future view mounts the monitor within 400ms, the spotlight still lands.
    timeoutMs: 400,
    placement: 'top',
    title: 'Close the loop',
    body:
      'The Regeneration Monitor charts soil, water, and biology over time against ' +
      'your goals — so the loop returns to observation as the land changes.',
  },
  {
    id: 'act-switch',
    route: 'act',
    target: '[data-stage="act"]',
    placement: 'bottom',
    title: 'Act — work the land',
    body:
      'Act is the field view: execute the plan, log what you actually did, and feed ' +
      'real outcomes back into the next cycle.',
  },
  {
    id: 'act-tools',
    route: 'act',
    target: '[data-tour="act-tools"]',
    placement: 'left',
    title: 'Tools for the work',
    body:
      'Act is objective-driven: pick a planned objective and its field tools appear ' +
      'here. Arm one, place it on the map, and log what you actually did — real ' +
      'outcomes that feed the next cycle.',
  },
  {
    id: 'finish',
    isModalStep: true,
    title: 'That’s the loop',
    body:
      'Observe → Plan → Act, then back to Observe as the land responds. Explore ' +
      'the sample freely, or start your own project. You can replay this tour ' +
      'anytime from “Take the tour”.',
  },
];

/** Spotlight (non-modal) steps, in order -- drives the "N of M" callout counter. */
export const SPOTLIGHT_STEPS: readonly TourStep[] = TOUR_STEPS.filter(
  (s) => !s.isModalStep,
);
