import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 26 — Administration, Governance & Data Integrity
//
// Roll-up of governance signals: collaborator counts, audit-log
// activity, and integrity-check status.

export const AdminGovernanceSummary = z.object({
  memberCount: z.number().int().nonnegative(),
  auditEventCount: z.number().int().nonnegative(),
  integrityStatus: z.enum(['ok', 'warning', 'failed']),
  lastCheckedAt: z.string().datetime().nullable(),
});
export type AdminGovernanceSummary = z.infer<typeof AdminGovernanceSummary>;

export const AdminGovernanceResponse = sectionResponse(AdminGovernanceSummary);
export type AdminGovernanceResponse = z.infer<typeof AdminGovernanceResponse>;
