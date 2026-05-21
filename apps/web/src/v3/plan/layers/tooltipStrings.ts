/**
 * Tooltip-surface user-facing strings — colocated constants module.
 *
 * Slice N of the B4 tooltip remaining-deferrals roadmap extracts every
 * English string the HostCanopyUnionTooltip surfaces into this single
 * module, leaving a clean seam for a future i18n bootstrap. The
 * roadmap considered two paths:
 *
 *   (1) Stand up project-wide i18next now (resources file,
 *       I18nextProvider near app root, default 'en' namespace, stub
 *       'ar' resource) and convert this tooltip as the pilot consumer.
 *   (2) Extract strings into a constants module with a marked seam,
 *       defer the bootstrap until a second locale is confirmed needed.
 *
 * Path (2) shipped. Justification: `react-i18next` + `i18next` are in
 * `apps/web/package.json` dependencies but no init/bootstrap exists
 * anywhere in `apps/web/src` — the tooltip would be the first
 * `useTranslation` call site in the entire web app, turning a "tooltip
 * slice" into a project-wide infrastructure decision. Path (1) is
 * appropriate the moment the user signals a second locale is coming.
 *
 * To migrate to path (1) in the future:
 *
 *   1. Add an `apps/web/src/i18n/index.ts` bootstrap (i18next init,
 *      default 'en' namespace, resource files).
 *   2. Wrap `<App />` in `<I18nextProvider i18n={i18n}>`.
 *   3. Replace `tooltipStrings.unionFootprint` etc with
 *      `t('tooltip.unionFootprint')` call sites at usage points.
 *   4. Move the values below into `apps/web/src/i18n/locales/en/
 *      tooltip.json` (and translate stubs into other locales).
 *   5. Delete this file once every consumer has migrated.
 *
 * Until then this module is the single source of truth for tooltip
 * copy and the only place a translator (or stakeholder editing wording)
 * needs to touch.
 *
 * Pluralization helpers below use a simple English n===1 binary form.
 * A real i18n library will replace these with CLDR plural-rule lookups
 * per locale (e.g. Arabic has six plural forms: zero, one, two, few,
 * many, other). The function signature stays narrow so call sites can
 * be ported one-for-one when that happens.
 */

export const tooltipStrings = {
  /** Row label: union of all guild canopy disks for this host. */
  unionFootprint: 'Union footprint',
  /** Row label: raw sum of π·r² per disk (pre-union, double-counts overlap). */
  rawDiskSum: 'Raw π·r² sum',
  /** Row label: saved overlap = rawSumM2 − unionAreaM2. */
  savedOverlap: 'Saved overlap',
} as const;

/**
 * Format a square-metre value: rounds to the nearest integer and
 * appends the " m²" suffix. Extracted from inline `formatM2` so the
 * unit symbol lives next to the other tooltip strings — a translator
 * who needs to swap to ft² or m² (with a different decimal separator)
 * touches one module.
 */
export function formatAreaM2(n: number): string {
  return `${Math.round(n)} m²`;
}

/**
 * Format the per-host counts row, e.g.:
 *   "3 guilds · 7 canopy-bearing members"
 *   "1 guild · 1 canopy-bearing member"
 *
 * English n===1 binary pluralization. See module header for the i18n
 * migration note about CLDR plural rules in non-Germanic locales.
 */
export function formatHostCounts(
  guildCount: number,
  memberCount: number,
): string {
  const guildWord = guildCount === 1 ? 'guild' : 'guilds';
  const memberWord = memberCount === 1 ? 'member' : 'members';
  return `${guildCount} ${guildWord} · ${memberCount} canopy-bearing ${memberWord}`;
}
