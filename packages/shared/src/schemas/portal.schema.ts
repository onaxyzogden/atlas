import { z } from 'zod';

// ─── Portal enums ────────────────────────────────────────────────────────────

export const PortalSection = z.enum([
  'hero',
  'mission',
  'map',
  'stageReveal',
  'beforeAfter',
  'guidedTour',
  'narrative',
  'support',
  'education',
]);
export type PortalSection = z.infer<typeof PortalSection>;

export const DataMaskingLevel = z.enum(['full', 'curated', 'minimal']);
export type DataMaskingLevel = z.infer<typeof DataMaskingLevel>;

// ─── Nested types ────────────────────────────────────────────────────────────

export const StoryScene = z.object({
  id: z.string(),
  title: z.string(),
  narrative: z.string(),
  mapCenter: z.tuple([z.number(), z.number()]),
  mapZoom: z.number(),
  mapStyle: z.enum(['satellite', 'terrain', 'street']),
  phaseFilter: z.string().nullable(),
  highlightZones: z.array(z.string()),
});
export type StoryScene = z.infer<typeof StoryScene>;

export const BeforeAfterPair = z.object({
  id: z.string(),
  caption: z.string(),
  beforeUrl: z.string(),
  afterUrl: z.string(),
});
export type BeforeAfterPair = z.infer<typeof BeforeAfterPair>;

// ─── Request / Response ──────────────────────────────────────────────────────

export const CreatePortalInput = z.object({
  slug: z.string().min(1),
  isPublished: z.boolean(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  missionStatement: z.string(),
  sections: z.array(PortalSection),
  donationUrl: z.string().nullable(),
  inquiryEmail: z.string().nullable(),
  dataMaskingLevel: DataMaskingLevel,
  curatedHotspots: z.array(z.string()),
  brandColor: z.string(),
  beforeAfterPairs: z.array(BeforeAfterPair),
  storyScenes: z.array(StoryScene),
});
export type CreatePortalInput = z.infer<typeof CreatePortalInput>;

export const PortalRecord = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  shareToken: z.string().uuid(),
  isPublished: z.boolean(),
  config: CreatePortalInput,
  dataMaskingLevel: DataMaskingLevel,
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PortalRecord = z.infer<typeof PortalRecord>;
