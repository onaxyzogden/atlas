export type Tier = 'dreaming' | 'transitioning' | 'stewarding';
export type SceneId =
  | 'hero' | 'y0-baseline' | 'y1-water-cover' | 'y2-current'
  | 'y5-projected' | 'y8-projected' | 'methodology' | 'cta'
  | 'dreaming/vision' | 'dreaming/first-steps'
  | 'transitioning/conversion-mechanics' | 'transitioning/water-and-cover'
  | 'stewarding/monitoring-instrumentation' | 'stewarding/adaptive-stewardship';

export const SHARED_SCENES: SceneId[] = [
  'hero','y0-baseline','y1-water-cover','y2-current','y5-projected','y8-projected','methodology','cta',
];

export function scenesForTier(tier: Tier): SceneId[] {
  const tierScenes: Record<Tier, SceneId[]> = {
    dreaming: ['dreaming/vision','dreaming/first-steps'],
    transitioning: ['transitioning/conversion-mechanics','transitioning/water-and-cover'],
    stewarding: ['stewarding/monitoring-instrumentation','stewarding/adaptive-stewardship'],
  };
  // Insert tier-specific scenes after y2-current and before y5-projected.
  const out: SceneId[] = [];
  for (const s of SHARED_SCENES) {
    out.push(s);
    if (s === 'y2-current') out.push(...tierScenes[tier]);
  }
  return out;
}
