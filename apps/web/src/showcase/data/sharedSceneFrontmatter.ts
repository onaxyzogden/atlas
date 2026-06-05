/**
 * Single source of truth for shared-scene map states.
 *
 * Sourced directly from each MDX module's `frontmatter` named export
 * (populated by remark-mdx-frontmatter — see apps/web/vite.config.ts).
 * The capture route (showcase._capture.tsx) and any other consumer must
 * read map state from here rather than declaring a parallel literal.
 *
 * NOTE: This module imports .mdx files and therefore must only be
 * consumed in a browser/Vite context. The Node-side snapshot script
 * (scripts/snapshot-scene-images.ts) keeps importing SCENE IDS from
 * sceneManifest.ts (which is pure TS) and drives the browser through
 * the dev-only capture route — the route resolves mapState from this
 * module, so Node never has to parse MDX.
 */
import type { SceneId } from './sceneManifest';
import { frontmatter as heroFm } from '../scenes/_shared/hero.mdx';
import { frontmatter as y0Fm } from '../scenes/_shared/y0-baseline.mdx';
import { frontmatter as y1Fm } from '../scenes/_shared/y1-water-cover.mdx';
import { frontmatter as y2Fm } from '../scenes/_shared/y2-current.mdx';
import { frontmatter as y5Fm } from '../scenes/_shared/y5-projected.mdx';
import { frontmatter as y8Fm } from '../scenes/_shared/y8-projected.mdx';
import { frontmatter as methodologyFm } from '../scenes/_shared/methodology.mdx';
import { frontmatter as ctaFm } from '../scenes/_shared/cta.mdx';

export type MapState = {
  activeLayers: string[];
  view: { center: [number, number]; zoom: number };
  // All 8 shared scenes declare features: [] in frontmatter today; the
  // type is held loose (unknown[]) so future designed-feature additions
  // don't need a coordinated change here.
  features: unknown[];
};

type SharedSceneId = Extract<
  SceneId,
  'hero' | 'y0-baseline' | 'y1-water-cover' | 'y2-current' | 'y5-projected' | 'y8-projected' | 'methodology' | 'cta'
>;

// Keyed-by-SceneId map of frontmatter blocks. Each entry is the raw
// frontmatter object exported by remark-mdx-frontmatter — `mapState`
// lives at `frontmatter.mapState`.
const SHARED_SCENE_FRONTMATTER: Record<SharedSceneId, Record<string, any>> = {
  hero: heroFm,
  'y0-baseline': y0Fm,
  'y1-water-cover': y1Fm,
  'y2-current': y2Fm,
  'y5-projected': y5Fm,
  'y8-projected': y8Fm,
  methodology: methodologyFm,
  cta: ctaFm,
};

// Derived view: just the `mapState` sub-object per scene. This is the
// shape the capture route consumes.
export const SHARED_SCENE_MAP_STATES: Record<SharedSceneId, MapState> = Object.fromEntries(
  Object.entries(SHARED_SCENE_FRONTMATTER).map(([id, fm]) => [id, fm.mapState as MapState]),
) as Record<SharedSceneId, MapState>;

export function getSharedSceneMapState(id: SceneId): MapState | undefined {
  return (SHARED_SCENE_MAP_STATES as Record<string, MapState>)[id];
}

export { SHARED_SCENE_FRONTMATTER };
