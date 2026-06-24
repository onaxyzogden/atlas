/**
 * ScopePreview -- read-only summary of the domain scope a set of operational
 * roles produces (ADR 2026-06-24 Operational Role Layer). Pure and presentational:
 * given the selected roles it renders "N roles -> M of 16 domains in focus", the
 * read-only domain chip list, and an advisory near-full warning when stacking
 * has widened the scope until it barely focuses anything.
 *
 * `emptyMeans` distinguishes the two zero-role surfaces:
 *   - 'full'  (self / member assignment): no roles == the full unfiltered view.
 *   - 'none'  (a not-yet-assigned member): no roles == nothing in focus yet.
 *
 * View-scoping only -- a role scope never implies a capability, and out-of-scope
 * domains are de-emphasized elsewhere, never hidden. ASCII-only copy.
 */

import {
  scopeForRoles,
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  type OperationalRole,
  type UniversalDomain,
} from '@ogden/shared';
import css from './ScopePreview.module.css';

/** Total universal domains -- the denominator shown to the user. */
const TOTAL_DOMAINS = UNIVERSAL_DOMAINS.length; // 16

/**
 * At or above this many in-focus domains the layer is barely narrowing the view
 * (the six-role union tops out at 15 domains), so we nudge the assigner. Advisory
 * only -- it never blocks a selection.
 */
const NEAR_FULL_THRESHOLD = 13;

export interface ScopePreviewProps {
  roles: readonly OperationalRole[];
  /** What an empty role set means on this surface. */
  emptyMeans: 'none' | 'full';
}

export default function ScopePreview({
  roles,
  emptyMeans,
}: ScopePreviewProps): JSX.Element {
  const scope = scopeForRoles(roles);
  const inFocus: UniversalDomain[] = UNIVERSAL_DOMAINS.filter((d) =>
    scope.has(d),
  );
  const count = inFocus.length;

  if (roles.length === 0) {
    return (
      <div className={css.root} data-testid="scope-preview" data-empty="true">
        <p className={css.summary} data-testid="scope-preview-summary">
          {emptyMeans === 'full'
            ? 'No operational roles -- full view (all domains in focus).'
            : 'No operational roles assigned yet.'}
        </p>
      </div>
    );
  }

  const nearFull = count >= NEAR_FULL_THRESHOLD;

  return (
    <div className={css.root} data-testid="scope-preview">
      <p className={css.summary} data-testid="scope-preview-summary">
        {roles.length} {roles.length === 1 ? 'role' : 'roles'}
        {' -> '}
        <strong className={css.count}>
          {count} of {TOTAL_DOMAINS}
        </strong>{' '}
        domains in focus
      </p>
      {nearFull ? (
        <p className={css.warn} data-testid="scope-preview-warning">
          Near-full scope -- this combination barely narrows the view. Fewer
          roles keep the focus sharper.
        </p>
      ) : null}
      <ul className={css.chips} aria-label="Domains in focus">
        {inFocus.map((d) => (
          <li key={d} className={css.chip} data-testid={`scope-chip-${d}`}>
            {UNIVERSAL_DOMAIN_LABELS[d]}
          </li>
        ))}
      </ul>
    </div>
  );
}
