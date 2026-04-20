/**
 * Regulatory Intelligence — Sprint BC Phase 4
 *
 * Pure frontend computation. Flags likely Environmental Assessment / permit
 * triggers based on site characteristics. No new API calls — reads layer
 * summaries that are already fetched elsewhere.
 *
 * Reference frameworks:
 *   - US: NEPA (federal), CEQA (CA state), state SEPA equivalents. Federal
 *     permits under CWA §404 (wetlands), ESA §7 (critical habitat), FEMA
 *     floodplain permits.
 *   - CA: CEAA/IAA 2019 for federal undertakings; Ontario EA Act for
 *     provincial projects ≥ thresholds. Conservation Authority permits for
 *     regulated areas.
 */

export type RegulatoryBurden = 'Low' | 'Moderate' | 'High' | 'Extreme';

export interface EIATriggerResult {
  regulatoryBurden: RegulatoryBurden;
  likelyTriggers: string[];
  notes: string[];
}

export interface EIAInputs {
  areaHa?: number | null;
  wetlandsPresent?: boolean | null;
  regulatedAreaPct?: number | null;
  floodZone?: string | null;
  criticalHabitatPresent?: boolean | null;
  slopeDeg?: number | null;
  landCoverPrimaryClass?: string | null;
  protectedAreasNearbyKm?: number | null;
  heritageSitePresent?: boolean | null;
  conservationEasementPresent?: boolean | null;
}

/**
 * Flags likely Environmental Assessment / permit triggers based on site context.
 * Each trigger contributes 1 point to burden; totals mapped to Low/Moderate/High/Extreme.
 */
export function computeEIATriggers(inputs: EIAInputs): EIATriggerResult {
  const triggers: string[] = [];
  const notes: string[] = [];

  const area = inputs.areaHa ?? 0;
  const wet = inputs.wetlandsPresent === true;
  const regPct = inputs.regulatedAreaPct ?? 0;
  const flood = (inputs.floodZone ?? '').toLowerCase();
  const ch = inputs.criticalHabitatPresent === true;
  const slope = inputs.slopeDeg ?? 0;
  const cover = (inputs.landCoverPrimaryClass ?? '').toLowerCase();
  const paKm = inputs.protectedAreasNearbyKm ?? Infinity;
  const heritage = inputs.heritageSitePresent === true;
  const easement = inputs.conservationEasementPresent === true;

  // 1. Wetland disturbance — US CWA §404, CA Fisheries Act / Conservation Authority
  if (wet || regPct > 5) {
    triggers.push('Wetland / regulated-area permit likely required (US CWA §404 or CA Conservation Authority permit)');
  }

  // 2. Floodplain development — FEMA Special Flood Hazard Area triggers federal permit if federal funds involved
  if ((flood.includes('ae') || (flood.includes('zone a') && !flood.includes('minimal'))) && !flood.includes('shaded')) {
    triggers.push('FEMA SFHA floodplain development review (federal permit if federally-funded; local floodplain ordinance always)');
  }

  // 3. ESA §7 consultation trigger — critical habitat present
  if (ch) {
    triggers.push('ESA §7 consultation trigger (USFWS critical habitat overlap)');
  }

  // 4. Slope + forest conversion — erosion & sediment control permit
  if (slope >= 15 && (cover.includes('forest') || cover.includes('tree'))) {
    triggers.push('Erosion & sediment control permit likely (slope ≥15% + forest conversion)');
  } else if (slope >= 15) {
    notes.push('Steep-slope ordinance review recommended (slope ≥15°).');
  }

  // 5. Agricultural conversion ≥5 ha — often provincial/state EA threshold
  if (area >= 5 && (cover.includes('forest') || cover.includes('wetland'))) {
    triggers.push('Large-scale land conversion threshold reached (≥5 ha from natural cover — may trigger provincial/state EA)');
  }

  // 6. Protected area adjacency — buffer review
  if (paKm < 1) {
    triggers.push('Protected-area buffer zone review (<1 km to designated protected area)');
  }

  // 7. Heritage / archaeological — Section 106 (US) / Ontario Heritage Act
  if (heritage) {
    triggers.push('Heritage / archaeological review required (US NHPA §106 or CA Ontario Heritage Act)');
  }

  // 8. Conservation easement — may restrict development entirely
  if (easement) {
    triggers.push('Conservation easement restrictions — review easement terms before any improvements');
  }

  const count = triggers.length;
  let burden: RegulatoryBurden;
  if (count === 0) burden = 'Low';
  else if (count <= 2) burden = 'Moderate';
  else if (count <= 4) burden = 'High';
  else burden = 'Extreme';

  if (count === 0) {
    notes.push('No categorical federal/provincial EA triggers detected from available layer data. Local zoning + building permits still apply.');
  }

  return { regulatoryBurden: burden, likelyTriggers: triggers, notes };
}

/* ------------------------------------------------------------------ */
/*  Typical setbacks — Sprint BF                                       */
/* ------------------------------------------------------------------ */

export type ZoningBroadClass = 'agricultural' | 'rural_residential' | 'residential' | 'commercial' | 'industrial' | 'unknown';

export interface SetbackInputs {
  zoningClass?: string | null;
  ruralClass?: string | null;
  nearestStreamM?: number | null;
  wetlandsPresent?: boolean;
  country?: string;
}

export interface SetbackResult {
  broad_class: ZoningBroadClass;
  front_setback_m: number;
  side_setback_m: number;
  rear_setback_m: number;
  waterbody_buffer_m: number | null;
  wetland_buffer_m: number | null;
  regulatory_note: string;
}

function classifyZoning(zoning: string | null | undefined, rural: string | null | undefined): ZoningBroadClass {
  const z = (zoning ?? '').toLowerCase();
  const r = (rural ?? '').toLowerCase();
  if (z.includes('agric') || r.includes('agric') || z.startsWith('a') && z.length <= 3) return 'agricultural';
  if (z.includes('rural')) return 'rural_residential';
  if (z.includes('resid') || z.startsWith('r')) return 'residential';
  if (z.includes('commer')) return 'commercial';
  if (z.includes('indust')) return 'industrial';
  return 'unknown';
}

/**
 * Return typical default setbacks for a broad zoning class. Sources:
 *   - ICLEI model zoning bylaws
 *   - Ontario Provincial Policy Statement (for CA)
 *   - Typical US municipal zoning ordinance defaults
 * Explicitly labelled as "typical" — must be verified against local bylaw.
 */
export function estimateTypicalSetbacks(inputs: SetbackInputs): SetbackResult {
  const broad = classifyZoning(inputs.zoningClass ?? null, inputs.ruralClass ?? null);
  const isCa = (inputs.country ?? '').toUpperCase() === 'CA';

  let front = 6, side = 3, rear = 7.5;
  switch (broad) {
    case 'agricultural':
    case 'rural_residential':
      front = isCa ? 30 : 25; side = 15; rear = 15; break;
    case 'residential':
      front = 6; side = 1.5; rear = 7.5; break;
    case 'commercial':
      front = 7.5; side = 3; rear = 7.5; break;
    case 'industrial':
      front = 15; side = 7.5; rear = 7.5; break;
    default:
      front = 7.5; side = 3; rear = 7.5;
  }

  // Waterbody buffer: only set if a stream is nearby (<200 m) or wetlands are present.
  let waterbodyBuffer: number | null = null;
  if (inputs.nearestStreamM != null && inputs.nearestStreamM < 200) {
    waterbodyBuffer = isCa ? 30 : 15;
  }
  const wetlandBuffer: number | null = inputs.wetlandsPresent
    ? (isCa ? 120 : 30)
    : null;

  return {
    broad_class: broad,
    front_setback_m: front,
    side_setback_m: side,
    rear_setback_m: rear,
    waterbody_buffer_m: waterbodyBuffer,
    wetland_buffer_m: wetlandBuffer,
    regulatory_note: `Typical defaults for ${broad.replace('_', ' ')} zoning in ${isCa ? 'Ontario' : 'US'}. Verify with local zoning bylaw / ordinance before design.`,
  };
}

/* ------------------------------------------------------------------ */
/*  Agricultural Use-Value Assessment — Sprint BH Phase 4              */
/* ------------------------------------------------------------------ */

export interface AgUseValueProgram {
  state: string;
  program_name: string;
  min_acreage: number | null;
  min_annual_income_usd: number | null;
  typical_tax_reduction_pct: [number, number];
  use_types_allowed: string[];
  regulatory_note: string;
  statute_reference: string;
}

/**
 * US state-level agricultural use-value (current-use / differential assessment)
 * programs. These programs tax farmland on its productivity value rather than
 * highest-and-best-use market value, yielding significant tax reductions.
 * Rollback taxes and minimum-use periods apply almost universally — see each
 * program's statute for specifics.
 */
export const US_AG_USE_VALUE_PROGRAMS: Record<string, AgUseValueProgram> = {
  CA: {
    state: 'CA',
    program_name: 'Williamson Act / California Land Conservation Act',
    min_acreage: 10,
    min_annual_income_usd: 2000,
    typical_tax_reduction_pct: [20, 75],
    use_types_allowed: ['cropland', 'pasture', 'orchard', 'vineyard', 'rangeland'],
    regulatory_note: '10-year renewable contract; early cancellation triggers 12.5% market-value penalty.',
    statute_reference: 'California Government Code §§51200-51297',
  },
  VA: {
    state: 'VA',
    program_name: 'Virginia Land Use Assessment',
    min_acreage: 5,
    min_annual_income_usd: 1000,
    typical_tax_reduction_pct: [30, 70],
    use_types_allowed: ['cropland', 'pasture', 'forest', 'horticulture', 'open_space'],
    regulatory_note: '5-year rollback tax on change of use.',
    statute_reference: 'Va. Code §§ 58.1-3230 to 58.1-3244',
  },
  MD: {
    state: 'MD',
    program_name: 'Maryland Agricultural Use Assessment',
    min_acreage: 3,
    min_annual_income_usd: 2500,
    typical_tax_reduction_pct: [40, 80],
    use_types_allowed: ['cropland', 'pasture', 'orchard', 'timber'],
    regulatory_note: 'Agricultural Transfer Tax applies on sale to non-agricultural use.',
    statute_reference: 'Md. Tax-Property Code § 8-209',
  },
  NC: {
    state: 'NC',
    program_name: 'NC Present Use Value (PUV)',
    min_acreage: 10, // agricultural — 5 horticulture, 20 forestry
    min_annual_income_usd: 1000,
    typical_tax_reduction_pct: [30, 70],
    use_types_allowed: ['cropland', 'horticulture', 'forestry'],
    regulatory_note: '3 years of income history required; 3-year rollback deferred taxes on disqualification.',
    statute_reference: 'N.C. Gen. Stat. §§ 105-277.2 to 105-277.7',
  },
  FL: {
    state: 'FL',
    program_name: 'FL Greenbelt / Agricultural Classification',
    min_acreage: null,
    min_annual_income_usd: null,
    typical_tax_reduction_pct: [40, 85],
    use_types_allowed: ['cropland', 'pasture', 'grove', 'timber', 'aquaculture', 'poultry'],
    regulatory_note: 'Good-faith commercial agricultural use required; annual application by March 1.',
    statute_reference: 'Fla. Stat. § 193.461',
  },
  PA: {
    state: 'PA',
    program_name: 'PA Clean & Green (Act 319)',
    min_acreage: 10,
    min_annual_income_usd: 2000,
    typical_tax_reduction_pct: [30, 80],
    use_types_allowed: ['cropland', 'pasture', 'forest', 'open_space'],
    regulatory_note: '7-year rollback taxes + 6% interest on change of use.',
    statute_reference: '72 P.S. §§ 5490.1-5490.13',
  },
  OH: { state: 'OH', program_name: 'Ohio Current Agricultural Use Value (CAUV)', min_acreage: 10, min_annual_income_usd: 2500,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture', 'timber', 'horticulture'],
    regulatory_note: '3-year recoupment on conversion.', statute_reference: 'Ohio R.C. § 5713.30' },
  IN: { state: 'IN', program_name: 'Indiana Agricultural Use Assessment', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture', 'timber'],
    regulatory_note: 'Base rate set annually by state; no rollback.', statute_reference: 'Ind. Code § 6-1.1-4-13' },
  IL: { state: 'IL', program_name: 'Illinois Farmland Assessment', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [40, 85], use_types_allowed: ['cropland', 'pasture', 'orchard'],
    regulatory_note: 'Productivity index based on soil type.', statute_reference: '35 ILCS 200/10-110' },
  IA: { state: 'IA', program_name: 'Iowa Agricultural Assessment', min_acreage: 10, min_annual_income_usd: null,
    typical_tax_reduction_pct: [30, 75], use_types_allowed: ['cropland', 'pasture'],
    regulatory_note: 'Productivity formula; biennial reassessment.', statute_reference: 'Iowa Code § 441.21' },
  MN: { state: 'MN', program_name: 'MN Green Acres / Ag Preserve', min_acreage: 10, min_annual_income_usd: 300,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture', 'nursery'],
    regulatory_note: '3-year rollback on conversion; separate Rural Preserve for smaller parcels.', statute_reference: 'Minn. Stat. § 273.111' },
  WI: { state: 'WI', program_name: 'WI Use Value Assessment', min_acreage: null, min_annual_income_usd: 6000,
    typical_tax_reduction_pct: [40, 85], use_types_allowed: ['cropland', 'pasture'],
    regulatory_note: 'Conversion charge on change of use.', statute_reference: 'Wis. Stat. § 70.32(2r)' },
  NY: { state: 'NY', program_name: 'NY Agricultural Assessment', min_acreage: 7, min_annual_income_usd: 10000,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture', 'orchard', 'vineyard'],
    regulatory_note: '8-year rollback payment on conversion.', statute_reference: 'NY Agriculture & Markets Law § 305' },
  NJ: { state: 'NJ', program_name: 'NJ Farmland Assessment Act', min_acreage: 5, min_annual_income_usd: 1000,
    typical_tax_reduction_pct: [40, 85], use_types_allowed: ['cropland', 'pasture', 'horticulture'],
    regulatory_note: '2 years of prior use + rollback taxes on conversion.', statute_reference: 'N.J.S.A. 54:4-23.1 et seq.' },
  GA: { state: 'GA', program_name: 'GA Conservation Use Valuation (CUVA)', min_acreage: 10, min_annual_income_usd: null,
    typical_tax_reduction_pct: [30, 75], use_types_allowed: ['cropland', 'pasture', 'timber'],
    regulatory_note: '10-year covenant; breach penalty = 2x taxes saved.', statute_reference: 'O.C.G.A. § 48-5-7.4' },
  TX: { state: 'TX', program_name: 'TX Agricultural Use / 1-d-1 Appraisal', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [50, 90], use_types_allowed: ['cropland', 'pasture', 'wildlife', 'timber'],
    regulatory_note: '5-year use history required; rollback taxes for 5 years.', statute_reference: 'Tex. Tax Code §§ 23.51-23.60' },
  OK: { state: 'OK', program_name: 'OK Agricultural Use Assessment', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture', 'timber'],
    regulatory_note: 'Based on 5-year net income capitalization.', statute_reference: 'Okla. Stat. tit. 68 § 2817' },
  CO: { state: 'CO', program_name: 'CO Agricultural Land Classification', min_acreage: null, min_annual_income_usd: 1000,
    typical_tax_reduction_pct: [40, 85], use_types_allowed: ['cropland', 'pasture', 'grazing'],
    regulatory_note: 'Reclassification possible if agricultural use ceases.', statute_reference: 'Colo. Rev. Stat. § 39-1-102(1.6)' },
  KS: { state: 'KS', program_name: 'KS Agricultural Use Value', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [50, 90], use_types_allowed: ['cropland', 'pasture'],
    regulatory_note: '8-year average net income capitalization.', statute_reference: 'Kan. Stat. § 79-1476' },
  NE: { state: 'NE', program_name: 'NE Agricultural Land Assessment', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [25, 30], use_types_allowed: ['cropland', 'pasture'],
    regulatory_note: 'Assessed at 75% of market value (vs. 100% for other property).', statute_reference: 'Neb. Rev. Stat. § 77-1359' },
  SD: { state: 'SD', program_name: 'SD Agricultural Land Productivity Value', min_acreage: 40, min_annual_income_usd: null,
    typical_tax_reduction_pct: [40, 80], use_types_allowed: ['cropland', 'pasture'],
    regulatory_note: 'Soil-rating and capitalized-income formula.', statute_reference: 'S.D. Codified Laws § 10-6-33.1' },
  ND: { state: 'ND', program_name: 'ND Agricultural Property Assessment', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [40, 80], use_types_allowed: ['cropland', 'pasture'],
    regulatory_note: 'Productivity value formula.', statute_reference: 'N.D. Cent. Code § 57-02-27.2' },
  MT: { state: 'MT', program_name: 'MT Agricultural Property Tax Classification', min_acreage: 20, min_annual_income_usd: 1500,
    typical_tax_reduction_pct: [40, 85], use_types_allowed: ['cropland', 'pasture', 'grazing'],
    regulatory_note: 'Non-qualifying land assessed at market value.', statute_reference: 'Mont. Code Ann. § 15-7-202' },
  WA: { state: 'WA', program_name: 'WA Open Space Taxation Act / Current Use', min_acreage: null, min_annual_income_usd: 1500,
    typical_tax_reduction_pct: [30, 75], use_types_allowed: ['cropland', 'pasture', 'timber', 'open_space'],
    regulatory_note: 'Rollback = difference × 7 years + 1% interest.', statute_reference: 'RCW 84.34' },
  OR: { state: 'OR', program_name: 'OR Special Assessment for Farmland', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [40, 85], use_types_allowed: ['cropland', 'pasture', 'orchard'],
    regulatory_note: 'EFU (Exclusive Farm Use) zone or farm-use gross-income test.', statute_reference: 'ORS 308A.050-308A.128' },
  TN: { state: 'TN', program_name: 'TN Greenbelt / Agricultural, Forest & Open Space', min_acreage: 15, min_annual_income_usd: 1500,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture', 'forest'],
    regulatory_note: '3-year rollback on conversion.', statute_reference: 'Tenn. Code Ann. § 67-5-1001 et seq.' },
  KY: { state: 'KY', program_name: 'KY Agricultural / Horticultural Value Assessment', min_acreage: 10, min_annual_income_usd: null,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture', 'horticulture'],
    regulatory_note: 'Must be used for agriculture for 5 of last 10 years.', statute_reference: 'Ky. Rev. Stat. § 132.450' },
  SC: { state: 'SC', program_name: 'SC Agricultural Use Assessment', min_acreage: 5, min_annual_income_usd: 1000,
    typical_tax_reduction_pct: [50, 85], use_types_allowed: ['cropland', 'pasture', 'timber'],
    regulatory_note: 'Rollback taxes = 3x difference on change of use.', statute_reference: 'S.C. Code § 12-43-220(d)' },
  AL: { state: 'AL', program_name: 'AL Current Use Valuation', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [30, 75], use_types_allowed: ['cropland', 'pasture', 'timber'],
    regulatory_note: 'Classification III assessed at 10% of current-use value.', statute_reference: 'Ala. Code § 40-7-25.1' },
  MS: { state: 'MS', program_name: 'MS Agricultural Use Assessment', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture'],
    regulatory_note: 'Class II property assessed at 15% of use value.', statute_reference: 'Miss. Code § 27-35-50' },
  AR: { state: 'AR', program_name: 'AR Agricultural Land Assessment', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [50, 90], use_types_allowed: ['cropland', 'pasture', 'timber'],
    regulatory_note: 'Productivity value formula set by Assessment Coordination Department.', statute_reference: 'Ark. Code § 26-26-407' },
  MI: { state: 'MI', program_name: 'MI Qualified Agricultural Property Exemption', min_acreage: null, min_annual_income_usd: null,
    typical_tax_reduction_pct: [15, 30], use_types_allowed: ['cropland', 'pasture', 'horticulture'],
    regulatory_note: 'Exempts from 18-mill school operating tax.', statute_reference: 'Mich. Comp. Laws § 211.7ee' },
  MA: { state: 'MA', program_name: 'MA Chapter 61A Agricultural Valuation', min_acreage: 5, min_annual_income_usd: 500,
    typical_tax_reduction_pct: [30, 70], use_types_allowed: ['cropland', 'pasture', 'horticulture'],
    regulatory_note: 'Conveyance tax + rollback on withdrawal.', statute_reference: 'Mass. Gen. Laws ch. 61A' },
};

export interface CaProvFarmClassProgram {
  province: string;
  program_name: string;
  min_gross_income_cad: number | null;
  typical_tax_reduction_pct: [number, number];
  regulatory_note: string;
  statute_reference: string;
}

export const CA_PROV_FARM_CLASS_PROGRAMS: Record<string, CaProvFarmClassProgram> = {
  ON: {
    province: 'ON',
    program_name: 'Ontario Farm Property Class Tax Rate Programme',
    min_gross_income_cad: 7000,
    typical_tax_reduction_pct: [60, 75],
    regulatory_note: 'Farmland taxed at 25% of residential municipal rate; annual eligibility via Agricorp.',
    statute_reference: 'Ontario Assessment Act, O. Reg. 282/98',
  },
  BC: {
    province: 'BC',
    program_name: 'BC Farm Classification (Class 9)',
    min_gross_income_cad: 10000,
    typical_tax_reduction_pct: [40, 85],
    regulatory_note: 'Gross income thresholds scale with acreage; ALR status does not automatically confer farm class.',
    statute_reference: 'BC Assessment Act, Classification of Land as a Farm Regulation',
  },
  AB: {
    province: 'AB',
    program_name: 'Alberta Farm Land Assessment',
    min_gross_income_cad: null,
    typical_tax_reduction_pct: [50, 90],
    regulatory_note: 'Farmland assessed on productivity value per Matters Relating to Assessment and Taxation Regulation.',
    statute_reference: 'Alta. Reg. 203/2017',
  },
  SK: {
    province: 'SK',
    program_name: 'Saskatchewan Agricultural Land Classification',
    min_gross_income_cad: null,
    typical_tax_reduction_pct: [55, 85],
    regulatory_note: 'Assessed at productivity value; municipal mill rate factor applies.',
    statute_reference: 'Sask. Municipalities Act',
  },
  MB: {
    province: 'MB',
    program_name: 'Manitoba Farm Property Assessment',
    min_gross_income_cad: null,
    typical_tax_reduction_pct: [40, 80],
    regulatory_note: 'Productivity assessment; farm-residence carves out non-farm portion.',
    statute_reference: 'Manitoba Municipal Assessment Act',
  },
  QC: {
    province: 'QC',
    program_name: 'Québec Programme de crédit de taxes foncières agricoles (PCTFA)',
    min_gross_income_cad: 5000,
    typical_tax_reduction_pct: [60, 85],
    regulatory_note: 'Administered by MAPAQ; annual registration required.',
    statute_reference: 'Loi sur le ministère de l\u2019Agriculture (chapitre M-14)',
  },
};

export interface AgUseValueResult {
  program_available: boolean;
  program_name: string | null;
  eligibility: 'Eligible' | 'Likely Eligible' | 'Below Threshold' | 'Verify';
  estimated_tax_reduction_range_pct: [number, number] | null;
  regulatory_note: string;
  statute_reference: string | null;
  jurisdiction: string | null;
}

export function classifyAgUseValue(inputs: {
  stateCode: string | null;
  country?: string | null;
  province?: string | null;
  acreage: number | null;
  primaryLandCoverClass: string | null;
}): AgUseValueResult {
  const cover = (inputs.primaryLandCoverClass ?? '').toLowerCase();
  const isAgCover = cover.includes('crop') || cover.includes('pasture') || cover.includes('ag') ||
                    cover.includes('grass') || cover.includes('herbac') || cover.includes('orchard') ||
                    cover.includes('tree') || cover.includes('forest');
  const country = (inputs.country ?? '').toUpperCase();

  if (country === 'CA') {
    const prov = (inputs.province ?? 'ON').toUpperCase();
    const p = CA_PROV_FARM_CLASS_PROGRAMS[prov];
    if (!p) {
      return {
        program_available: false, program_name: null,
        eligibility: 'Verify', estimated_tax_reduction_range_pct: null,
        regulatory_note: `No farm-class program registered for ${prov}. Contact provincial assessment authority.`,
        statute_reference: null, jurisdiction: prov,
      };
    }
    const eligibility: AgUseValueResult['eligibility'] = !isAgCover
      ? 'Verify'
      : p.min_gross_income_cad == null ? 'Likely Eligible' : 'Verify';
    return {
      program_available: true, program_name: p.program_name,
      eligibility, estimated_tax_reduction_range_pct: p.typical_tax_reduction_pct,
      regulatory_note: `${p.regulatory_note} Minimum gross income${p.min_gross_income_cad ? `: CAD $${p.min_gross_income_cad.toLocaleString()}/yr` : ': none specified'}.`,
      statute_reference: p.statute_reference, jurisdiction: prov,
    };
  }

  // US branch
  const code = (inputs.stateCode ?? '').toUpperCase();
  const p = US_AG_USE_VALUE_PROGRAMS[code];
  if (!p) {
    return {
      program_available: false, program_name: null,
      eligibility: 'Verify', estimated_tax_reduction_range_pct: null,
      regulatory_note: code
        ? `No use-value program catalogued for ${code} in Atlas; contact the ${code} state tax assessor. Most US states offer some form of current-use farmland assessment.`
        : 'Could not resolve state; verify eligibility with local tax assessor.',
      statute_reference: null, jurisdiction: code || null,
    };
  }

  let eligibility: AgUseValueResult['eligibility'] = 'Verify';
  if (!isAgCover) {
    eligibility = 'Verify';
  } else if (p.min_acreage != null && inputs.acreage != null) {
    if (inputs.acreage < p.min_acreage) eligibility = 'Below Threshold';
    else if (inputs.acreage >= p.min_acreage * 1.5) eligibility = 'Eligible';
    else eligibility = 'Likely Eligible';
  } else if (p.min_acreage == null) {
    eligibility = 'Likely Eligible';
  }

  const acreageNote = p.min_acreage != null ? `Minimum acreage: ${p.min_acreage}. ` : 'No minimum acreage. ';
  const incomeNote = p.min_annual_income_usd != null ? `Minimum annual ag income: $${p.min_annual_income_usd.toLocaleString()}. ` : '';
  return {
    program_available: true, program_name: p.program_name,
    eligibility, estimated_tax_reduction_range_pct: p.typical_tax_reduction_pct,
    regulatory_note: `${acreageNote}${incomeNote}${p.regulatory_note} Verify final eligibility with county tax assessor.`,
    statute_reference: p.statute_reference, jurisdiction: code,
  };
}
