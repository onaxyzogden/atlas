import type { SiteProfile, SiteRequirement } from '../../data/goalCompassTypes.js';

export function passesRequirement(
  profile: SiteProfile,
  req: SiteRequirement,
): boolean {
  switch (req.kind) {
    case 'slopeMaxPct': {
      const v = profile.avgSlopePct.value;
      if (v === null) return true;
      return v <= req.value;
    }
    case 'slopeMinPct': {
      const v = profile.avgSlopePct.value;
      if (v === null) return true;
      return v >= req.value;
    }
    case 'minAcres': {
      const v = profile.acres.value;
      if (v === null) return true;
      return v >= req.value;
    }
    case 'soilCompaction': {
      const v = profile.soilCompaction.value;
      if (v === null) return true;
      return req.values.includes(v);
    }
    case 'waterPosture': {
      const v = profile.waterPosture.value;
      if (v === null) return true;
      return req.values.includes(v);
    }
    case 'climateZone': {
      const v = profile.climateZone.value;
      if (v === null) return true;
      return req.values.includes(v);
    }
    case 'landform': {
      const v = profile.primaryLandform.value;
      if (v === null) return true;
      return req.values.includes(v);
    }
    default:
      return true;
  }
}

export function passesAllRequirements(
  profile: SiteProfile,
  requirements: SiteRequirement[],
): boolean {
  return requirements.every((r) => passesRequirement(profile, r));
}
