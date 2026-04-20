/**
 * Water Rights Registry — Sprint BH Phase 2
 *
 * Static lookups covering:
 *   1. US state water-rights legal doctrines (riparian / prior-appropriation / hybrid)
 *   2. Per-state live ArcGIS/WFS endpoints for point-of-diversion registries
 *      (primarily Western states under prior-appropriation).
 *
 * For states without a public REST endpoint, the registry still provides the
 * governing doctrine as an informational fallback so the UI can surface
 * legal context even when live queries are unavailable.
 *
 * References:
 *   - National Water Rights Project (NAGLA 2019)
 *   - State Engineer / DWR public GIS portals
 *   - CA: Ontario Water Resources Act (PTTW) — no public REST endpoint for
 *     individual takings
 */

export type WaterDoctrine = 'riparian' | 'prior_appropriation' | 'hybrid';

/** 50-state doctrine lookup. */
export const US_WATER_DOCTRINE: Record<string, WaterDoctrine> = {
  // Pure prior-appropriation (Western)
  AK: 'prior_appropriation', AZ: 'prior_appropriation', CO: 'prior_appropriation',
  ID: 'prior_appropriation', MT: 'prior_appropriation', NV: 'prior_appropriation',
  NM: 'prior_appropriation', UT: 'prior_appropriation', WY: 'prior_appropriation',
  // Hybrid (dual doctrine) — mostly Plains + Pacific
  CA: 'hybrid', KS: 'hybrid', ND: 'hybrid', NE: 'hybrid', OK: 'hybrid',
  OR: 'hybrid', SD: 'hybrid', TX: 'hybrid', WA: 'hybrid',
  // Riparian (Eastern + Upper Midwest)
  AL: 'riparian', AR: 'riparian', CT: 'riparian', DE: 'riparian',
  FL: 'riparian', GA: 'riparian', HI: 'riparian', IA: 'riparian',
  IL: 'riparian', IN: 'riparian', KY: 'riparian', LA: 'riparian',
  MA: 'riparian', MD: 'riparian', ME: 'riparian', MI: 'riparian',
  MN: 'riparian', MO: 'riparian', MS: 'riparian', NC: 'riparian',
  NH: 'riparian', NJ: 'riparian', NY: 'riparian', OH: 'riparian',
  PA: 'riparian', RI: 'riparian', SC: 'riparian', TN: 'riparian',
  VA: 'riparian', VT: 'riparian', WI: 'riparian', WV: 'riparian',
};

export interface WaterRightsEndpoint {
  state: string;
  agency: string;
  /** ArcGIS Feature/MapServer query URL (with /query appended is expected) */
  endpoint: string;
  /** Broad feature geometry category */
  featureType: 'point_of_diversion' | 'water_right_polygon';
  /** Field-name mapping — defensive; accepts multiple candidates */
  fieldMap: {
    id: string[];
    priority_date: string[];
    use_type: string[];
    amount: string[];
  };
}

/**
 * Western US state water-rights registries with public ArcGIS endpoints.
 * Eastern riparian states generally do not publish per-right records in
 * REST form; see US_WATER_DOCTRINE for their legal framework.
 */
export const US_WATER_RIGHTS_ENDPOINTS: Record<string, WaterRightsEndpoint> = {
  CO: {
    state: 'CO',
    agency: 'Colorado Division of Water Resources',
    endpoint: 'https://dwr.state.co.us/arcgis/rest/services/DWR_Structures/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['STRUCTURE_ID', 'WDID', 'Structure_Number'],
      priority_date: ['APPRO_DATE', 'Appropriation_Date', 'PRIORITY_DATE'],
      use_type: ['STRUCTURE_TYPE', 'Use', 'USE_TYPE'],
      amount: ['DECREED_AMT', 'Decreed_Amount', 'AMOUNT'],
    },
  },
  WA: {
    state: 'WA',
    agency: 'Washington Department of Ecology',
    endpoint: 'https://fortress.wa.gov/ecy/gispublic/rest/services/Water/WRIA_WaterRights/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['DOCUMENT_ID', 'RIGHT_NUMBER', 'FILE_NUMBER'],
      priority_date: ['PRIORITY_DATE', 'FILING_DATE'],
      use_type: ['USE_DESC', 'PURPOSE', 'USE'],
      amount: ['QUANTITY', 'Qi_CFS', 'QUANTITY_Qi'],
    },
  },
  OR: {
    state: 'OR',
    agency: 'Oregon Water Resources Department',
    endpoint: 'https://gis.wrd.state.or.us/server/rest/services/wr_pod/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['POD_ID', 'snp_id', 'SNP_ID'],
      priority_date: ['priority_date', 'PRIORITY_DATE'],
      use_type: ['use_code_description', 'USE_CODE_DESCRIPTION', 'use'],
      amount: ['rate_cfs', 'RATE_CFS', 'duty'],
    },
  },
  WY: {
    state: 'WY',
    agency: 'Wyoming State Engineer',
    endpoint: 'https://gis.wyo.gov/arcgis/rest/services/Water/WaterRights/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['PERMIT_NO', 'PERMIT_NUMBER'],
      priority_date: ['PRIORITY_DATE', 'APPROPRIATION_DATE'],
      use_type: ['USE_TYPE', 'PURPOSE'],
      amount: ['CFS', 'QUANTITY'],
    },
  },
  NM: {
    state: 'NM',
    agency: 'New Mexico Office of the State Engineer',
    endpoint: 'https://maps.ose.state.nm.us/arcgis/rest/services/Water_Rights/POD_POU/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['POD_NUMBER', 'POD_NBR', 'FILE_NUMBER'],
      priority_date: ['PRIORITY_DATE'],
      use_type: ['USE_PURPOSE', 'USE_TYPE'],
      amount: ['DIVERSION_AMOUNT', 'AMOUNT'],
    },
  },
  ID: {
    state: 'ID',
    agency: 'Idaho Department of Water Resources',
    endpoint: 'https://gis.idwr.idaho.gov/arcgis/rest/services/WaterRights/POD/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['RIGHT_NO', 'BASIN'],
      priority_date: ['PRIORITY_DATE'],
      use_type: ['USE_CODE', 'USE_DESC'],
      amount: ['DIVERSION_RATE_CFS', 'RATE_CFS'],
    },
  },
  MT: {
    state: 'MT',
    agency: 'Montana DNRC',
    endpoint: 'https://gis.dnrc.mt.gov/arcgis/rest/services/WRD/WaterRights/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['WR_NUMBER', 'WATER_RIGHT'],
      priority_date: ['PRIORITY_DATE'],
      use_type: ['PURPOSE', 'USE'],
      amount: ['FLOW_RATE', 'CFS'],
    },
  },
  UT: {
    state: 'UT',
    agency: 'Utah Division of Water Rights',
    endpoint: 'https://waterrights.utah.gov/arcgis/rest/services/Public/WaterRights/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['WR_NUM', 'WATER_RIGHT_NUM'],
      priority_date: ['PRIORITY_DATE'],
      use_type: ['USE_TYPE'],
      amount: ['CFS'],
    },
  },
  NV: {
    state: 'NV',
    agency: 'Nevada Division of Water Resources',
    endpoint: 'https://gis.water.nv.gov/arcgis/rest/services/POD/MapServer/0/query',
    featureType: 'point_of_diversion',
    fieldMap: {
      id: ['APP', 'PERMIT'],
      priority_date: ['PRIORITY_DATE'],
      use_type: ['MANNER_OF_USE'],
      amount: ['DUTY', 'CFS'],
    },
  },
};

/** Informational metadata for states lacking a REST endpoint. */
export const US_WATER_RIGHTS_INFORMATIONAL: Record<string, { agency: string; note: string }> = {
  CA: {
    agency: 'California State Water Resources Control Board',
    note: 'CA uses a hybrid doctrine. Water-right records accessible via eWRIMS (not a public REST endpoint); contact SWRCB for site-specific appropriative rights.',
  },
  TX: {
    agency: 'Texas Commission on Environmental Quality',
    note: 'TX uses a hybrid doctrine. Surface-water rights administered by TCEQ; Water Availability Model (WAM) data available via request.',
  },
  AZ: {
    agency: 'Arizona Department of Water Resources',
    note: 'AZ uses prior-appropriation for surface water and reasonable-use for groundwater. Individual right records via ADWR Imaged Records.',
  },
};

/** Canadian-province informational lookup (no federal water-rights registry). */
export const CA_PROV_WATER_RIGHTS: Record<string, { agency: string; note: string }> = {
  ON: {
    agency: 'Ontario Ministry of the Environment, Conservation and Parks',
    note: 'Ontario requires a Permit to Take Water (PTTW) for any taking >50,000 L/day. No public point-of-taking REST endpoint — search Environmental Registry of Ontario.',
  },
  BC: {
    agency: 'BC Ministry of Forests — Water Management Branch',
    note: 'BC uses a "first-in-time, first-in-right" licensing regime under the Water Sustainability Act. Licensed points of diversion via BC Water Licences Online.',
  },
  AB: {
    agency: 'Alberta Environment and Protected Areas',
    note: 'Alberta uses prior-allocation under the Water Act. Registry accessible via the Alberta Water Wells Information Database and licence search.',
  },
  SK: {
    agency: 'Water Security Agency (Saskatchewan)',
    note: 'Saskatchewan administers water allocations via WSA. No public individual-licence REST endpoint.',
  },
  QC: {
    agency: 'Ministère de l\'Environnement du Québec',
    note: 'Quebec regulates withdrawals >75,000 L/day under the Water Withdrawal and Protection Regulation. No public REST endpoint.',
  },
};

export function getDoctrineSummary(doctrine: WaterDoctrine): string {
  switch (doctrine) {
    case 'riparian':
      return 'Riparian doctrine — landowners adjacent to a waterbody hold correlative rights to reasonable use. No quantified allocation; disputes resolved by "reasonable use" balancing.';
    case 'prior_appropriation':
      return 'Prior-appropriation doctrine ("first-in-time, first-in-right") — water rights quantified by priority date and use. Senior rights have absolute priority in shortage.';
    case 'hybrid':
      return 'Hybrid doctrine — riparian rights recognised pre-statehood or for domestic use; appropriative permits required for new or larger diversions.';
  }
}
