import type { ComponentType } from 'react';
import type { SceneId } from './sceneManifest';

import Hero from '../scenes/_shared/hero.mdx';
import Y0Baseline from '../scenes/_shared/y0-baseline.mdx';
import Y1WaterCover from '../scenes/_shared/y1-water-cover.mdx';
import Y2Current from '../scenes/_shared/y2-current.mdx';
import Y5Projected from '../scenes/_shared/y5-projected.mdx';
import Y8Projected from '../scenes/_shared/y8-projected.mdx';
import Methodology from '../scenes/_shared/methodology.mdx';
import Cta from '../scenes/_shared/cta.mdx';

import DreamingVision from '../scenes/dreaming/vision.mdx';
import DreamingFirstSteps from '../scenes/dreaming/first-steps.mdx';
import TransitioningConversion from '../scenes/transitioning/conversion-mechanics.mdx';
import TransitioningWaterCover from '../scenes/transitioning/water-and-cover.mdx';
import StewardingMonitoring from '../scenes/stewarding/monitoring-instrumentation.mdx';
import StewardingAdaptive from '../scenes/stewarding/adaptive-stewardship.mdx';

// Static map keyed on SceneId. No dynamic imports — all 14 MDX scene modules
// are resolved at build time so the scrollytelling page renders without an
// async boundary inside the render path. Scene components receive optional
// `snapshot` + `tier` props; typed loosely (ComponentType<any>) because MDX's
// prop surface is permissive.
export const SCENE_COMPONENTS: Record<SceneId, ComponentType<any>> = {
  hero: Hero,
  'y0-baseline': Y0Baseline,
  'y1-water-cover': Y1WaterCover,
  'y2-current': Y2Current,
  'y5-projected': Y5Projected,
  'y8-projected': Y8Projected,
  methodology: Methodology,
  cta: Cta,
  'dreaming/vision': DreamingVision,
  'dreaming/first-steps': DreamingFirstSteps,
  'transitioning/conversion-mechanics': TransitioningConversion,
  'transitioning/water-and-cover': TransitioningWaterCover,
  'stewarding/monitoring-instrumentation': StewardingMonitoring,
  'stewarding/adaptive-stewardship': StewardingAdaptive,
};
