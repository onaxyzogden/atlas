/**
 * CrewMember — the resourcing-layer crew model (Sub-project D2).
 *
 * Net-new and deliberately distinct from `ProjectMemberRecord` (ACL
 * identity) and `NetworkContact` (external CRM). A crew member is an
 * operational labour resource: someone work can be assigned to, with a
 * skill level and a *soft* weekly-hours capacity used only to derive
 * render-only over-capacity badges (never written to `WorkItem.status`,
 * never a cost — D2 is operational resourcing only; cost is D3).
 *
 * `networkContactId` is an optional, non-coupling link to an external CRM
 * contact; D2 does not read or depend on it.
 *
 * Client-first: projectId-tagged Zustand+persist store, no DB migration.
 * `.passthrough()` mirrors the A-series registry discipline.
 */

import { z } from 'zod';

export const CrewSkillLevel = z.enum([
  'lead',
  'skilled',
  'general',
  'apprentice',
]);
export type CrewSkillLevel = z.infer<typeof CrewSkillLevel>;

export const CrewMemberSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    name: z.string().min(1),
    skillLevel: CrewSkillLevel,
    /** Soft weekly-hours capacity; only drives render-only workload badges. */
    weeklyHoursCap: z.number().nonnegative(),
    /** Optional, non-coupling link to an external CRM contact. */
    networkContactId: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type CrewMember = z.infer<typeof CrewMemberSchema>;
