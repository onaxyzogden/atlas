/**
 * Drilldown-surface user-facing strings — colocated constants module.
 *
 * Mirrors the Slice N pattern (`tooltipStrings.ts`): every English
 * string the Slice M drilldown surfaces (context menu + drilldown
 * card) emits lives here, leaving a clean seam for a future i18n
 * bootstrap. See `tooltipStrings.ts` for the path-(1)-vs-(2)
 * justification — same reasoning applies.
 *
 * Slice M of the B4 tooltip remaining-deferrals roadmap, 2026-05-30.
 */

export const drilldownStrings = {
  /** Context-menu item text. */
  openDetail: 'Open detail',
  /** Drilldown card → audit slide-up routing link. */
  openFullAudit: 'Open full audit →',
  /** Drilldown card close button accessible label. */
  closeLabel: 'Close',
  /** Drilldown card empty-state when a host has no canopy-bearing
   *  members yet. */
  emptyMembers: 'No canopy-bearing members on this host yet.',
  /** Card section header above the member list. */
  membersHeader: 'Canopy-bearing members',
} as const;
