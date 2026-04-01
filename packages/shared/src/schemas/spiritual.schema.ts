import { z } from 'zod';

export const SpiritualZoneType = z.enum([
  'prayer_space',
  'quiet_zone',
  'qibla_axis',
  'dawn_viewpoint',
  'dusk_viewpoint',
  'contemplative_path',
  'water_worship_integration',
  'scenic_overlook',
  'gathering_circle',
]);
export type SpiritualZoneType = z.infer<typeof SpiritualZoneType>;

export const CreateSpiritualZoneInput = z.object({
  projectId: z.string().uuid(),
  zoneType: SpiritualZoneType,
  geometry: z.unknown(), // GeoJSON geometry
  name: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateSpiritualZoneInput = z.infer<typeof CreateSpiritualZoneInput>;

export const SpiritualZoneSummary = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  zoneType: SpiritualZoneType,
  name: z.string().nullable(),
  notes: z.string().nullable(),
  qiblaBearing: z.number().nullable(), // degrees from north, null if not applicable
  solarEvents: z
    .object({
      sunriseTime: z.string().nullable(),
      sunsetTime: z.string().nullable(),
      goldenHourMorning: z.string().nullable(),
      goldenHourEvening: z.string().nullable(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
});
export type SpiritualZoneSummary = z.infer<typeof SpiritualZoneSummary>;

export const QiblaResult = z.object({
  bearing: z.number(), // degrees clockwise from north
  distanceKm: z.number(),
  fromLat: z.number(),
  fromLng: z.number(),
});
export type QiblaResult = z.infer<typeof QiblaResult>;
