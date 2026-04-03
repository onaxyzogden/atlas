/**
 * Assessment rule registry — declarative rules that derive opportunities
 * and risks from environmental layer data.
 *
 * Each rule has a condition function (evaluated against layer data) and a
 * message function that interpolates actual numeric values into the text.
 * Rules only fire when the data warrants them — no padding, no always-push.
 */

import type { RuleContext } from './ruleEngine.js';

export interface AssessmentRule {
  id: string;
  type: 'risk' | 'opportunity';
  category: 'agriculture' | 'conservation' | 'development' | 'regulatory' | 'climate';
  severity: 'info' | 'warning' | 'critical';
  priority: number;
  country: 'US' | 'CA' | 'all';
  condition: (ctx: RuleContext) => boolean;
  message: (ctx: RuleContext) => string;
  layerSource: string;
  needsSiteVisit?: boolean;
}

/* ================================================================== */
/*  OPPORTUNITY RULES                                                  */
/* ================================================================== */

const opportunityRules: AssessmentRule[] = [
  {
    id: 'prime-farmland',
    type: 'opportunity',
    category: 'agriculture',
    severity: 'info',
    priority: 10,
    country: 'all',
    layerSource: 'Soils',
    condition: (ctx) => {
      const fc = ctx.str(ctx.soils, 'farmland_class').toLowerCase();
      return fc.includes('prime') || fc.includes('class 1') || fc.includes('class 2');
    },
    message: (ctx) => {
      const fc = ctx.str(ctx.soils, 'farmland_class');
      return `${fc} soils support diverse crop potential and conservation program eligibility`;
    },
  },
  {
    id: 'wetland-restoration',
    type: 'opportunity',
    category: 'conservation',
    severity: 'info',
    priority: 20,
    country: 'all',
    layerSource: 'Wetlands',
    condition: (ctx) => ctx.num(ctx.wetlands, 'wetland_pct') > 0,
    message: (ctx) => {
      const pct = ctx.num(ctx.wetlands, 'wetland_pct').toFixed(1);
      return `${pct}% wetland coverage — eligible for conservation stewardship funding and restoration grants`;
    },
  },
  {
    id: 'forest-carbon-credits',
    type: 'opportunity',
    category: 'conservation',
    severity: 'info',
    priority: 15,
    country: 'all',
    layerSource: 'Land Cover',
    condition: (ctx) => ctx.num(ctx.landCover, 'tree_canopy_pct') > 20,
    message: (ctx) => {
      const pct = ctx.num(ctx.landCover, 'tree_canopy_pct');
      return `${pct}% tree canopy provides carbon credit and habitat corridor opportunities`;
    },
  },
  {
    id: 'extended-growing-season',
    type: 'opportunity',
    category: 'agriculture',
    severity: 'info',
    priority: 25,
    country: 'all',
    layerSource: 'Climate',
    condition: (ctx) => ctx.num(ctx.climate, 'growing_season_days') > 150,
    message: (ctx) => {
      const days = ctx.num(ctx.climate, 'growing_season_days');
      return `${days}-day growing season supports season-extension and succession planting`;
    },
  },
  {
    id: 'high-organic-matter',
    type: 'opportunity',
    category: 'agriculture',
    severity: 'info',
    priority: 30,
    country: 'all',
    layerSource: 'Soils',
    condition: (ctx) => ctx.num(ctx.soils, 'organic_matter_pct') > 4,
    message: (ctx) => {
      const om = ctx.num(ctx.soils, 'organic_matter_pct').toFixed(1);
      return `High organic matter (${om}%) indicates strong soil biology and water-holding capacity`;
    },
  },
  {
    id: 'good-drainage',
    type: 'opportunity',
    category: 'agriculture',
    severity: 'info',
    priority: 35,
    country: 'all',
    layerSource: 'Soils',
    condition: (ctx) => {
      const d = ctx.str(ctx.soils, 'drainage_class').toLowerCase();
      return d.includes('well drained') || d.includes('moderately well');
    },
    message: (ctx) => {
      const d = ctx.str(ctx.soils, 'drainage_class');
      return `${d} soils support a wide range of crop and building foundation options`;
    },
  },
  {
    id: 'deep-soil-profile',
    type: 'opportunity',
    category: 'development',
    severity: 'info',
    priority: 40,
    country: 'all',
    layerSource: 'Soils',
    condition: (ctx) => ctx.num(ctx.soils, 'depth_to_bedrock_m') > 2,
    message: (ctx) => {
      const depth = ctx.num(ctx.soils, 'depth_to_bedrock_m').toFixed(1);
      return `Deep soil profile (${depth}m to bedrock) favours foundations, septic, and root development`;
    },
  },
  {
    id: 'high-precipitation',
    type: 'opportunity',
    category: 'climate',
    severity: 'info',
    priority: 35,
    country: 'all',
    layerSource: 'Climate',
    condition: (ctx) => ctx.num(ctx.climate, 'annual_precip_mm') > 800,
    message: (ctx) => {
      const mm = Math.round(ctx.num(ctx.climate, 'annual_precip_mm'));
      return `Ample annual precipitation (${mm} mm) reduces irrigation dependency`;
    },
  },
  {
    id: 'land-use-diversity',
    type: 'opportunity',
    category: 'conservation',
    severity: 'info',
    priority: 45,
    country: 'all',
    layerSource: 'Land Cover',
    condition: (ctx) => ctx.landClassCount > 4,
    message: (ctx) =>
      `${ctx.landClassCount} distinct land cover classes indicate ecological diversity and habitat mosaic`,
  },
  {
    id: 'low-impervious-greenfield',
    type: 'opportunity',
    category: 'development',
    severity: 'info',
    priority: 50,
    country: 'all',
    layerSource: 'Land Cover',
    condition: (ctx) => ctx.num(ctx.landCover, 'impervious_pct') < 5,
    message: (ctx) => {
      const pct = ctx.num(ctx.landCover, 'impervious_pct');
      return `Low impervious cover (${pct}%) — greenfield conditions with minimal stormwater burden`;
    },
  },
  {
    id: 'riparian-restoration-potential',
    type: 'opportunity',
    category: 'conservation',
    severity: 'info',
    priority: 45,
    country: 'all',
    layerSource: 'Wetlands',
    condition: (ctx) => {
      const buffer = ctx.num(ctx.wetlands, 'riparian_buffer_m');
      const wetPct = ctx.num(ctx.wetlands, 'wetland_pct');
      return buffer < 30 && wetPct > 0;
    },
    message: () =>
      'Riparian buffer under 30 m — restoration planting eligible for stewardship funding',
  },
  // Country-specific: conditional, not always-push
  {
    id: 'usda-program-eligibility',
    type: 'opportunity',
    category: 'regulatory',
    severity: 'info',
    priority: 55,
    country: 'US',
    layerSource: 'Soils',
    condition: (ctx) => {
      const fc = ctx.str(ctx.soils, 'farmland_class').toLowerCase();
      return fc.includes('prime') || fc.includes('farmland') || fc.includes('class');
    },
    message: () => 'USDA EQIP and CSP program eligibility for conservation and soil health practices',
  },
  {
    id: 'ca-conservation-partnership',
    type: 'opportunity',
    category: 'regulatory',
    severity: 'info',
    priority: 55,
    country: 'CA',
    layerSource: 'Wetlands',
    condition: (ctx) => {
      const reg = ctx.num(ctx.wetlands, 'regulated_area_pct');
      const wet = ctx.num(ctx.wetlands, 'wetland_pct');
      return reg > 0 || wet > 0;
    },
    message: () =>
      'Conservation Authority partnerships available for buffer planting and stewardship',
  },
];

/* ================================================================== */
/*  RISK RULES                                                         */
/* ================================================================== */

const riskRules: AssessmentRule[] = [
  // Steep terrain — severity tiers
  {
    id: 'steep-terrain-critical',
    type: 'risk',
    category: 'development',
    severity: 'critical',
    priority: 5,
    country: 'all',
    layerSource: 'Elevation',
    needsSiteVisit: true,
    condition: (ctx) => ctx.num(ctx.elevation, 'mean_slope_deg') > 20,
    message: (ctx) => {
      const slope = ctx.num(ctx.elevation, 'mean_slope_deg').toFixed(1);
      return `Mean slope ${slope}° — severe erosion risk, limited equipment access, site visit required`;
    },
  },
  {
    id: 'steep-terrain-warning',
    type: 'risk',
    category: 'development',
    severity: 'warning',
    priority: 10,
    country: 'all',
    layerSource: 'Elevation',
    condition: (ctx) => {
      const slope = ctx.num(ctx.elevation, 'mean_slope_deg');
      return slope > 10 && slope <= 20;
    },
    message: (ctx) => {
      const slope = ctx.num(ctx.elevation, 'mean_slope_deg').toFixed(1);
      return `Mean slope ${slope}° — erosion management needed, limits heavy equipment access`;
    },
  },
  {
    id: 'moderate-slope',
    type: 'risk',
    category: 'development',
    severity: 'info',
    priority: 40,
    country: 'all',
    layerSource: 'Elevation',
    condition: (ctx) => {
      const slope = ctx.num(ctx.elevation, 'mean_slope_deg');
      return slope > 5 && slope <= 10;
    },
    message: (ctx) => {
      const slope = ctx.num(ctx.elevation, 'mean_slope_deg').toFixed(1);
      return `Moderate slope (${slope}°) may require grading plans for construction`;
    },
  },
  {
    id: 'flood-zone-restriction',
    type: 'risk',
    category: 'regulatory',
    severity: 'critical',
    priority: 5,
    country: 'all',
    layerSource: 'Wetlands / Flood',
    needsSiteVisit: true,
    condition: (ctx) => {
      const fz = ctx.str(ctx.wetlands, 'flood_zone').toLowerCase();
      return fz.length > 0 && !fz.includes('minimal risk') && !fz.includes('not regulated');
    },
    message: (ctx) => {
      const fz = ctx.str(ctx.wetlands, 'flood_zone');
      return `${fz} — restricts development, verify with local authority`;
    },
  },
  {
    id: 'regulated-area-constraint',
    type: 'risk',
    category: 'regulatory',
    severity: 'warning',
    priority: 15,
    country: 'all',
    layerSource: 'Wetlands / Flood',
    condition: (ctx) => ctx.num(ctx.wetlands, 'regulated_area_pct') > 15,
    message: (ctx) => {
      const pct = ctx.num(ctx.wetlands, 'regulated_area_pct').toFixed(1);
      return `${pct}% regulated conservation area — limits development footprint`;
    },
  },
  {
    id: 'wetland-buffer-constraint',
    type: 'risk',
    category: 'conservation',
    severity: 'warning',
    priority: 20,
    country: 'all',
    layerSource: 'Wetlands / Flood',
    condition: (ctx) => ctx.num(ctx.wetlands, 'wetland_pct') > 5,
    message: (ctx) => {
      const pct = ctx.num(ctx.wetlands, 'wetland_pct').toFixed(1);
      return `${pct}% wetland coverage — buffers constrain buildable area`;
    },
  },
  {
    id: 'impervious-stormwater',
    type: 'risk',
    category: 'development',
    severity: 'warning',
    priority: 25,
    country: 'all',
    layerSource: 'Land Cover',
    condition: (ctx) => ctx.num(ctx.landCover, 'impervious_pct') > 15,
    message: (ctx) => {
      const pct = ctx.num(ctx.landCover, 'impervious_pct');
      return `${pct}% impervious cover — stormwater management likely required`;
    },
  },
  {
    id: 'poor-drainage',
    type: 'risk',
    category: 'agriculture',
    severity: 'warning',
    priority: 20,
    country: 'all',
    layerSource: 'Soils',
    condition: (ctx) => {
      const d = ctx.str(ctx.soils, 'drainage_class').toLowerCase();
      return d.includes('poor') || d.includes('very poor');
    },
    message: (ctx) => {
      const d = ctx.str(ctx.soils, 'drainage_class');
      return `${d} — limits crop options and may require tile drainage for construction`;
    },
  },
  {
    id: 'shallow-bedrock',
    type: 'risk',
    category: 'development',
    severity: 'warning',
    priority: 25,
    country: 'all',
    layerSource: 'Soils',
    needsSiteVisit: true,
    condition: (ctx) => ctx.num(ctx.soils, 'depth_to_bedrock_m') > 0 && ctx.num(ctx.soils, 'depth_to_bedrock_m') < 1,
    message: (ctx) => {
      const depth = ctx.num(ctx.soils, 'depth_to_bedrock_m').toFixed(1);
      return `Shallow bedrock at ${depth}m — foundation and septic limitations, site visit recommended`;
    },
  },
  {
    id: 'low-organic-matter',
    type: 'risk',
    category: 'agriculture',
    severity: 'info',
    priority: 35,
    country: 'all',
    layerSource: 'Soils',
    condition: (ctx) => {
      const om = ctx.num(ctx.soils, 'organic_matter_pct');
      return om > 0 && om < 2;
    },
    message: (ctx) => {
      const om = ctx.num(ctx.soils, 'organic_matter_pct').toFixed(1);
      return `Low organic matter (${om}%) — soil health investment needed for productive agriculture`;
    },
  },
  {
    id: 'short-growing-season',
    type: 'risk',
    category: 'climate',
    severity: 'warning',
    priority: 30,
    country: 'all',
    layerSource: 'Climate',
    condition: (ctx) => {
      const days = ctx.num(ctx.climate, 'growing_season_days');
      return days > 0 && days < 120;
    },
    message: (ctx) => {
      const days = ctx.num(ctx.climate, 'growing_season_days');
      return `Short growing season (${days} frost-free days) — limits crop selection`;
    },
  },
  {
    id: 'low-precipitation-drought',
    type: 'risk',
    category: 'climate',
    severity: 'warning',
    priority: 30,
    country: 'all',
    layerSource: 'Climate',
    condition: (ctx) => {
      const mm = ctx.num(ctx.climate, 'annual_precip_mm');
      return mm > 0 && mm < 500;
    },
    message: (ctx) => {
      const mm = Math.round(ctx.num(ctx.climate, 'annual_precip_mm'));
      return `Low annual precipitation (${mm} mm) — drought risk, irrigation likely required`;
    },
  },
  // Country-specific: conditional, not always-push
  {
    id: 'ca-conservation-permit',
    type: 'risk',
    category: 'regulatory',
    severity: 'warning',
    priority: 30,
    country: 'CA',
    layerSource: 'Wetlands / Flood',
    condition: (ctx) => ctx.num(ctx.wetlands, 'regulated_area_pct') > 0,
    message: () => 'Conservation Authority permits required for regulated area work',
  },
  {
    id: 'us-environmental-review',
    type: 'risk',
    category: 'regulatory',
    severity: 'info',
    priority: 35,
    country: 'US',
    layerSource: 'Wetlands / Flood',
    condition: (ctx) => {
      const wet = ctx.num(ctx.wetlands, 'wetland_pct');
      const fz = ctx.str(ctx.wetlands, 'flood_zone').toLowerCase();
      const hasFloodZone = fz.length > 0 && !fz.includes('minimal risk');
      return wet > 2 || hasFloodZone;
    },
    message: () => 'Environmental review may be required for wetland-adjacent development',
  },
];

/* ================================================================== */
/*  EXPORT                                                             */
/* ================================================================== */

export const ASSESSMENT_RULES: AssessmentRule[] = [
  ...opportunityRules,
  ...riskRules,
];
