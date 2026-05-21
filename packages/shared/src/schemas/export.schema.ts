import { z } from 'zod';
import { CostRangeSchema } from './costRange.schema.js';

// ─── Export type enum ─────────────────────────────────────────────────────────

export const ExportType = z.enum([
  'site_assessment',
  'design_brief',
  'feature_schedule',
  'field_notes',
  'capital_partner_summary',
  'scenario_comparison',
  'educational_booklet',
  'swot_journal',
  'swot_diagnosis_report',
  'swot_synthesis',
  'topography_report',
  'earth_water_ecology_report',
  'macroclimate_report',
  'sectors_zones_report',
  'built_environment_report',
  'human_context_report',
]);
export type ExportType = z.infer<typeof ExportType>;

// ─── Payload schemas (client-side data sent with request) ─────────────────────

const CostRange = CostRangeSchema;

export const FieldNotesPayload = z.object({
  entries: z.array(z.object({
    id: z.string(),
    type: z.string(),
    location: z.tuple([z.number(), z.number()]),
    timestamp: z.string(),
    data: z.record(z.unknown()).optional(),
    notes: z.string(),
    photos: z.array(z.string()),
    noteType: z.string().optional(),
  })),
  walkRoutes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
    distanceM: z.number(),
    durationMs: z.number(),
    startedAt: z.string(),
    completedAt: z.string().nullable(),
    annotations: z.array(z.object({ index: z.number(), text: z.string() })),
  })).optional(),
  punchList: z.array(z.object({
    featureType: z.string(),
    featureName: z.string(),
    status: z.string(),
    notes: z.string(),
  })).optional(),
});
export type FieldNotesPayload = z.infer<typeof FieldNotesPayload>;

export const FinancialPayload = z.object({
  region: z.string(),
  totalInvestment: CostRange,
  annualRevenueAtMaturity: CostRange,
  costLineItems: z.array(z.object({
    name: z.string(),
    category: z.string(),
    phase: z.string(),
    cost: CostRange,
  })),
  revenueStreams: z.array(z.object({
    name: z.string(),
    enterprise: z.string(),
    annualRevenue: CostRange,
    startYear: z.number().optional(),
  })),
  cashflow: z.array(z.object({
    year: z.number(),
    capitalCosts: CostRange,
    operatingCosts: CostRange.optional(),
    revenue: CostRange,
    netCashflow: CostRange,
    cumulativeCashflow: CostRange,
  })),
  breakEven: z.object({
    breakEvenYear: z.object({
      low: z.number().nullable(),
      mid: z.number().nullable(),
      high: z.number().nullable(),
    }),
    tenYearROI: CostRange,
    peakNegativeCashflow: CostRange.optional(),
  }),
  enterprises: z.array(z.string()),
  missionScore: z.object({
    overall: z.number(),
    financial: z.number(),
    ecological: z.number(),
    spiritual: z.number(),
    community: z.number(),
  }),
  assumptions: z.array(z.string()),
  /**
   * Natural-capital appreciation — annualized ecosystem-services valuation of
   * the stewarded land. Covenant framing: this is informational appreciation
   * of stewardship value, NOT a financial yield to capital partners.
   * Derived from `computeEcosystemValuation()` on the web client.
   */
  naturalCapital: z.object({
    totalUsdHaYr: z.number(),
    totalUsdYr: z.number().nullable(),
    dominantService: z.string(),
    narrative: z.string(),
  }).optional(),
  /**
   * §D.7 J-curve payload — the Apricot-Lane Phase 3 bridge from
   * regeneration spend to natural-capital appreciation. Mirrors the
   * D.1 `TransitionYear[]` shape (subset of fields needed by the PDF
   * renderer) plus the D.3 cumulative natural-capital appreciation
   * by year and the precomputed trough / breakeven markers from
   * `jCurveTrough(...)`.
   *
   * `chartSvg` is an optional pre-rendered inline SVG markup string —
   * the web client produces it from the same `<JCurveChart>` component
   * shown in-app, serialised via `renderToStaticMarkup`. When absent,
   * the PDF template falls back to a server-side ASCII sparkline so
   * the section still anchors the narrative.
   *
   * Covenant: appreciation of stewarded land value, not investor
   * yield. See [[fiqh-csra-erased-2026-05-04]].
   */
  jCurve: z.object({
    transitionYears: z.array(z.object({
      year: z.number(),
      phase: z.enum(['establishment', 'build-up', 'maturation']),
      capex: z.number(),
      opex: z.number(),
      revenue: z.number(),
      netCashflow: z.number(),
      cumulativeNetCashflow: z.number(),
    })),
    naturalCapitalAppreciationByYear: z.record(z.number()).optional(),
    troughYear: z.number().nullable(),
    troughValue: z.number(),
    breakevenYear: z.number().nullable(),
    chartSvg: z.string().optional(),
  }).optional(),
});
export type FinancialPayload = z.infer<typeof FinancialPayload>;

export const ScenarioPayload = z.array(z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isBaseline: z.boolean(),
  variantConfig: z.record(z.unknown()),
  zoneCount: z.number(),
  structureCount: z.number(),
  paddockCount: z.number().optional(),
  cropCount: z.number().optional(),
  zoneCategories: z.record(z.number()),
  structureTypes: z.record(z.number()),
  enterprises: z.array(z.string()),
  totalCapitalMid: z.number(),
  breakEvenYear: z.number().nullable(),
  year5Cashflow: z.number(),
  year10Cashflow: z.number(),
  tenYearROI: z.number(),
  annualRevenueMid: z.number(),
  missionScore: z.object({
    overall: z.number(),
    financial: z.number(),
    ecological: z.number(),
    spiritual: z.number(),
    community: z.number(),
  }),
}));
export type ScenarioPayload = z.infer<typeof ScenarioPayload>;

export const SwotPayload = z.object({
  entries: z.array(z.object({
    id: z.string(),
    projectId: z.string(),
    bucket: z.enum(['S', 'W', 'O', 'T']),
    title: z.string(),
    body: z.string().optional(),
    tags: z.array(z.string()).optional(),
    position: z.tuple([z.number(), z.number()]).optional(),
    createdAt: z.string(),
  })),
});
export type SwotPayload = z.infer<typeof SwotPayload>;

export const TopographyPayload = z.object({
  /** Sampled elevation summary from the DEM layer (matches getElevationLayer().summary). */
  elevationSummary: z.object({
    min_elevation_m: z.number().nullable().optional(),
    max_elevation_m: z.number().nullable().optional(),
    mean_slope_deg: z.number().nullable().optional(),
    max_slope_deg: z.number().nullable().optional(),
    predominant_aspect: z.string().nullable().optional(),
  }).nullable().optional(),
  contours: z.array(z.object({
    id: z.string(),
    elevationM: z.number().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  highPoints: z.array(z.object({
    id: z.string(),
    position: z.tuple([z.number(), z.number()]),
    kind: z.enum(['high', 'low']),
    elevationM: z.number().optional(),
    label: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  drainageLines: z.array(z.object({
    id: z.string(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  transects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    pointA: z.tuple([z.number(), z.number()]),
    pointB: z.tuple([z.number(), z.number()]),
    sampledAt: z.string().optional(),
    sourceApi: z.string().nullable().optional(),
    confidence: z.enum(['high', 'medium', 'low']).optional(),
    totalDistanceM: z.number().optional(),
    notes: z.string().optional(),
  })),
});
export type TopographyPayload = z.infer<typeof TopographyPayload>;

export const EarthWaterEcologyPayload = z.object({
  soilSamples: z.array(z.object({
    id: z.string(),
    sampleDate: z.string(),
    label: z.string(),
    depth: z.string(),
    ph: z.number().optional(),
    organicMatterPct: z.number().optional(),
    texture: z.string().optional(),
    cecMeq100g: z.number().optional(),
    ecDsM: z.number().optional(),
    bulkDensityGCm3: z.number().optional(),
    biologicalActivity: z.string().optional(),
    percolationInPerHr: z.number().optional(),
    depthToBedrockM: z.number().optional(),
    hasJarTest: z.boolean().optional(),
    hasRoofCatchment: z.boolean().optional(),
    notes: z.string().optional(),
    lab: z.string().optional(),
    location: z.tuple([z.number(), z.number()]).optional(),
  })),
  waterSystems: z.object({
    earthworks: z.array(z.object({
      id: z.string(),
      type: z.string(),
      lengthM: z.number().optional(),
      notes: z.string().optional(),
      createdAt: z.string(),
    })),
    storageInfra: z.array(z.object({
      id: z.string(),
      type: z.string(),
      center: z.tuple([z.number(), z.number()]),
      capacityL: z.number().optional(),
      notes: z.string().optional(),
      createdAt: z.string(),
    })),
    watercourses: z.array(z.object({
      id: z.string(),
      kind: z.string(),
      perennial: z.boolean().optional(),
      notes: z.string().optional(),
      createdAt: z.string(),
    })),
  }),
  ecology: z.object({
    observations: z.array(z.object({
      id: z.string(),
      species: z.string(),
      trophicLevel: z.string().optional(),
      notes: z.string().optional(),
      observedAt: z.string(),
      location: z.tuple([z.number(), z.number()]).optional(),
    })),
    zones: z.array(z.object({
      id: z.string(),
      dominantStage: z.string(),
      label: z.string().optional(),
      notes: z.string().optional(),
      createdAt: z.string(),
    })),
    successionStage: z.string().optional(),
  }),
  siteLayers: z.object({
    watershed: z.record(z.unknown()).optional(),
    wetlandsPresent: z.boolean().optional(),
    criticalHabitatPresent: z.boolean().optional(),
    soilsSummary: z.record(z.unknown()).optional(),
  }).optional(),
});
export type EarthWaterEcologyPayload = z.infer<typeof EarthWaterEcologyPayload>;

export const MacroclimatePayload = z.object({
  /** Opaque climate-layer summary blob (hardiness_zone, annual_precip_mm, etc.). */
  climateSummary: z.record(z.unknown()).optional(),
  monthlyNormals: z.array(z.object({
    month: z.string(),
    precipMm: z.number().optional(),
    meanMaxC: z.number().optional(),
    meanMinC: z.number().optional(),
  })).optional(),
  solarOpportunities: z.array(z.tuple([z.string(), z.string()])).optional(),
  hazards: z.array(z.object({
    id: z.string(),
    kind: z.string(),
    label: z.string(),
    risk: z.enum(['low', 'moderate', 'high']),
    trend: z.enum(['up', 'flat', 'down']),
    status: z.enum(['monitoring', 'planned', 'in_progress', 'mitigated']),
    mitigationPct: z.number(),
    window: z.string().optional(),
    notes: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
  })),
  hazardCounts: z.object({
    total: z.number(),
    active: z.number(),
    mitigated: z.number(),
    monitoring: z.number(),
    in_progress: z.number(),
    planned: z.number(),
    highRisk: z.number(),
    moderateRisk: z.number(),
    lowRisk: z.number(),
    averageMitigationPct: z.number(),
  }),
});
export type MacroclimatePayload = z.infer<typeof MacroclimatePayload>;

export const SectorsZonesPayload = z.object({
  sectors: z.array(z.object({
    id: z.string(),
    type: z.string(),
    bearingDeg: z.number(),
    arcDeg: z.number(),
    intensity: z.enum(['low', 'med', 'high']).optional(),
    notes: z.string().optional(),
  })),
  zones: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    primaryUse: z.string().optional(),
    secondaryUse: z.string().optional(),
    notes: z.string().optional(),
    areaM2: z.number(),
    invasivePressure: z.string().optional(),
    successionStage: z.string().optional(),
    seasonality: z.string().optional(),
    permacultureZone: z.number().optional(),
  })),
  sectorCounts: z.object({
    total: z.number(),
    wind: z.number(),
    sun: z.number(),
    fire: z.number(),
    noise: z.number(),
    wildlife: z.number(),
    view: z.number(),
  }),
  zoneCounts: z.object({
    total: z.number(),
    byCategory: z.record(z.number()),
    totalAreaM2: z.number(),
  }),
  prevailingWind: z.string().optional(),
});
export type SectorsZonesPayload = z.infer<typeof SectorsZonesPayload>;

export const BuiltEnvironmentPayload = z.object({
  buildings: z.array(z.object({
    id: z.string(),
    subtype: z.enum(['residence', 'outbuilding', 'agricultural', 'other']),
    label: z.string().optional(),
    notes: z.string().optional(),
    areaM2: z.number().optional(),
    createdAt: z.string(),
  })),
  wells: z.array(z.object({
    id: z.string(),
    kind: z.enum(['drinking', 'irrigation', 'unknown']),
    position: z.tuple([z.number(), z.number()]),
    depthM: z.number().optional(),
    flowLpm: z.number().optional(),
    label: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  septics: z.array(z.object({
    id: z.string(),
    kind: z.enum(['tank', 'leach_field', 'cesspool', 'other']),
    label: z.string().optional(),
    notes: z.string().optional(),
    areaM2: z.number().optional(),
    createdAt: z.string(),
  })),
  powerLines: z.array(z.object({
    id: z.string(),
    placement: z.enum(['overhead', 'buried']),
    lengthM: z.number(),
    label: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  buriedUtilities: z.array(z.object({
    id: z.string(),
    kind: z.enum(['water_main', 'gas', 'fibre', 'sewer', 'other']),
    lengthM: z.number(),
    label: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  fences: z.array(z.object({
    id: z.string(),
    kind: z.enum(['barbed', 'page_wire', 'electric', 'privacy', 'other']),
    lengthM: z.number(),
    label: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  gates: z.array(z.object({
    id: z.string(),
    position: z.tuple([z.number(), z.number()]),
    label: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  existingDriveways: z.array(z.object({
    id: z.string(),
    surface: z.enum(['gravel', 'paved', 'dirt', 'other']),
    lengthM: z.number(),
    label: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
  })),
  counts: z.object({
    total: z.number(),
    buildings: z.number(),
    wells: z.number(),
    septics: z.number(),
    powerLines: z.number(),
    buriedUtilities: z.number(),
    fences: z.number(),
    gates: z.number(),
    existingDriveways: z.number(),
  }),
  totals: z.object({
    buildingAreaM2: z.number(),
    septicAreaM2: z.number(),
    powerLineLengthM: z.number(),
    buriedUtilityLengthM: z.number(),
    fenceLengthM: z.number(),
    drivewayLengthM: z.number(),
    meanWellDepthM: z.number().nullable(),
    overheadPowerCount: z.number(),
  }),
  healthPct: z.number(),
});
export type BuiltEnvironmentPayload = z.infer<typeof BuiltEnvironmentPayload>;

export const HumanContextPayload = z.object({
  steward: z.object({
    name: z.string().optional(),
    age: z.number().optional(),
    occupation: z.string().optional(),
    lifestyle: z.enum(['active', 'sedentary']).optional(),
    maintenanceHrsInitial: z.number().optional(),
    maintenanceHrsOngoing: z.number().optional(),
    budget: z.string().optional(),
    skills: z.array(z.string()).optional(),
    vision: z.string().optional(),
    coreFunctions: z.array(z.string()).optional(),
    experienceGoals: z.array(z.string()).optional(),
    successMetrics: z.array(z.string()).optional(),
    principles: z.array(z.string()).optional(),
    guidingValues: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    moodboardImageCount: z.number().optional(),
  }),
  regional: z.object({
    indigenousNames: z.array(z.string()).optional(),
    culturalChallenges: z.array(z.string()).optional(),
    culturalStrengths: z.array(z.string()).optional(),
    localNetwork: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      contact: z.string().optional(),
    })).optional(),
  }),
  phaseNotes: z.array(z.object({
    phaseKey: z.string(),
    label: z.string(),
    notes: z.string(),
  })),
  milestones: z.array(z.object({
    id: z.string(),
    phaseId: z.string(),
    note: z.string(),
    targetDate: z.string().nullable(),
  })),
  archetype: z.object({
    name: z.string(),
    blurb: z.string(),
  }),
  totals: z.object({
    overallPct: z.number(),
    stewardPct: z.number(),
    regionalPct: z.number(),
    visionPct: z.number(),
    totalHoursPerWeek: z.number(),
    milestonesDefined: z.number(),
    moodboardImageCount: z.number(),
  }),
});
export type HumanContextPayload = z.infer<typeof HumanContextPayload>;

// ─── Request / Response ───────────────────────────────────────────────────────

export const CreateExportInput = z.object({
  exportType: ExportType,
  scenarioId: z.string().uuid().optional(),
  payload: z.object({
    fieldNotes: FieldNotesPayload.optional(),
    financial: FinancialPayload.optional(),
    scenarios: ScenarioPayload.optional(),
    swot: SwotPayload.optional(),
    topography: TopographyPayload.optional(),
    earthWaterEcology: EarthWaterEcologyPayload.optional(),
    macroclimate: MacroclimatePayload.optional(),
    sectorsZones: SectorsZonesPayload.optional(),
    builtEnvironment: BuiltEnvironmentPayload.optional(),
    humanContext: HumanContextPayload.optional(),
  }).optional(),
});
export type CreateExportInput = z.infer<typeof CreateExportInput>;

export const ExportRecord = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  exportType: ExportType,
  storageUrl: z.string(),
  generatedAt: z.string(),
});
export type ExportRecord = z.infer<typeof ExportRecord>;
