import { z } from 'zod';

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
]);
export type ExportType = z.infer<typeof ExportType>;

// ─── Payload schemas (client-side data sent with request) ─────────────────────

const CostRange = z.object({ low: z.number(), mid: z.number(), high: z.number() });

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
