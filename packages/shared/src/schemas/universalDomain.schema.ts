// universalDomain.schema.ts
//
// The 16 universal domains that every land-based OLOS project is understood
// through. The domain stays fixed across the project lifecycle; only the
// stage verb changes (Observe = document, Plan = decide, Act = execute +
// verify). See ADR 2026-05-25-atlas-universal-domains and the concept page
// olos-universal-domains for the canonical framing.
//
// This module is the source of truth for the domain id strings. Labels,
// ordering, and core-purpose text live in ../constants/universalDomain.ts.
// The legacy moduleId -> domainId mapping lives in
// ../lib/moduleDomainMap.ts.
//
// Slice 1 of the refactor: additive only. Nothing in apps/web or apps/api
// imports this yet; the cutover that retires the stage-local ObserveModule
// / PlanModule / ActModule enums is a separately-approved later slice.

import { z } from 'zod';

export const UniversalDomain = z.enum([
  'vision-intent',
  'land-base',
  'climate',
  'topography',
  'hydrology',
  'soil',
  'ecology',
  'plants-food',
  'animals-livestock',
  'built-infrastructure',
  'access-circulation',
  'energy-resources',
  'people-governance',
  'economics-capacity',
  'risk-compliance',
  'monitoring-records',
]);

export type UniversalDomain = z.infer<typeof UniversalDomain>;
