// urgencyChips.ts
//
// Shared pure helper that turns a ProjectUrgencyResult into the chip list
// surfaced by both Portfolio Home (one chip row per card) and Per-Project
// Home (vertical Attention Rail). Keeping the mapping in one place prevents
// the two surfaces from drifting in copy or tone assignment as the urgency
// breakdown shape evolves.
//
// The chip list does NOT include `draftWizard` — both surfaces render that
// as a separate badge, not a chip, because the affordance it offers ("Finish
// setup" -> wizard resume) is structurally different from the per-channel
// chips ("3 critical divergences" etc. -> open the project).

import type { ProjectUrgencyResult } from '@ogden/shared';

export type UrgencyChipTone =
  | 'critical'
  | 'high'
  | 'foundation'
  | 'cadence'
  | 'info';

export interface UrgencyChip {
  key: string;
  label: string;
  tone: UrgencyChipTone;
}

export function buildUrgencyChips(
  urgency: ProjectUrgencyResult | undefined,
): UrgencyChip[] {
  if (!urgency) return [];
  const b = urgency.breakdown;
  const chips: UrgencyChip[] = [];

  if (b.divergencesCritical > 0) {
    chips.push({
      key: 'divergencesCritical',
      label: `${b.divergencesCritical} critical divergence${b.divergencesCritical === 1 ? '' : 's'}`,
      tone: 'critical',
    });
  }
  if (b.divergencesHigh > 0) {
    chips.push({
      key: 'divergencesHigh',
      label: `${b.divergencesHigh} high divergence${b.divergencesHigh === 1 ? '' : 's'}`,
      tone: 'high',
    });
  }
  if (b.staleFoundationDomains > 0) {
    chips.push({
      key: 'staleFoundationDomains',
      label: `${b.staleFoundationDomains} stale foundation domain${b.staleFoundationDomains === 1 ? '' : 's'}`,
      tone: 'foundation',
    });
  }
  if (b.ageingFoundationDomains > 0) {
    chips.push({
      key: 'ageingFoundationDomains',
      label: `${b.ageingFoundationDomains} ageing foundation domain${b.ageingFoundationDomains === 1 ? '' : 's'}`,
      tone: 'cadence',
    });
  }
  if (b.cyclicalReviewsDue > 0) {
    chips.push({
      key: 'cyclicalReviewsDue',
      label: `${b.cyclicalReviewsDue} cyclical review${b.cyclicalReviewsDue === 1 ? '' : 's'} due`,
      tone: 'cadence',
    });
  }
  if (b.blockedFieldActions > 0) {
    chips.push({
      key: 'blockedFieldActions',
      label: `${b.blockedFieldActions} blocked field action${b.blockedFieldActions === 1 ? '' : 's'}`,
      tone: 'high',
    });
  }
  if (b.pendingVerifications > 0) {
    chips.push({
      key: 'pendingVerifications',
      label: `${b.pendingVerifications} pending verification${b.pendingVerifications === 1 ? '' : 's'}`,
      tone: 'info',
    });
  }
  if (b.inactivityDays > 0) {
    chips.push({
      key: 'inactivityDays',
      label:
        b.inactivityDays === 1
          ? '1 day inactive'
          : `${b.inactivityDays}${b.inactivityDays >= 14 ? '+' : ''} days inactive`,
      tone: 'info',
    });
  }

  return chips;
}
