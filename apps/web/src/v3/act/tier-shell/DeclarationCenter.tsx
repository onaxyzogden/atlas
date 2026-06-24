/**
 * DeclarationCenter -- the Plan-stage Tier-0 / Declaration header that sits ABOVE
 * the existing 2-pane workbench grid (DecisionList + DecisionWorkingPanel). It
 * renders the mode header for the Declaration phase:
 *
 *   Mode header -- "Mode 1 -- Declaration" eyebrow + Tier-0 + serif title +
 *                  framing paragraph.
 *
 * The two tier-level orientation widgets that previously sat here -- the
 * canonical-object cards (Intent + Team) and the objective-sequencing diagram --
 * were relocated to the right-rail DeclarationOrientationRail (2026-06-22) so the
 * center band stays short and the canvas is dominated by the decision list +
 * working panel.
 *
 * Plan-only: it is mounted by ActTierZeroWorkbench solely when `mode ===
 * "declaration"` is passed (the Act surface never sets it). All derivations come
 * from the pure declarationModel; this file owns presentation only.
 *
 * Theming: uses the project --color-* tokens (NOT the mockup's raw dark hex) so
 * it stays visually coherent with its sibling DecisionList / ActTierSpine, which
 * is the whole point of "evolve the existing workbench". The mockup governs
 * layout, structure, and copy; the token theme is shared with the workbench.
 * ASCII-only: every glyph is a lucide icon.
 */

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { DECLARATION_MODE } from './declarationModel.js';
import css from './DeclarationCenter.module.css';

export interface DeclarationCenterProps {
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  /** Currently active objective id (kept for prop-contract parity; unused here). */
  activeObjectiveId?: string;
  /**
   * OPTIONAL. Kept for prop-contract parity with the orientation rail that now
   * owns the interactive sequencing nodes; unused by this header.
   */
  onSelectObjective?: (objectiveId: string) => void;
}

export default function DeclarationCenter(
  _props: DeclarationCenterProps,
): JSX.Element {
  return (
    <div className={css.root} data-testid="declaration-center">
      {/* ---------- Mode header ---------- */}
      <div className={css.modeHd}>
        <div className={css.modeEyebrow}>
          <span className={css.modePill}>{DECLARATION_MODE.pill}</span>
          <span className={css.modeTier}>{DECLARATION_MODE.tier}</span>
        </div>
        <div className={css.modeTitle}>
          {DECLARATION_MODE.titleLead}
          <em className={css.modeTitleEm}>{DECLARATION_MODE.titleEm}</em>
          {DECLARATION_MODE.titleTail}
        </div>
        <div className={css.modeDesc}>{DECLARATION_MODE.desc}</div>
      </div>
    </div>
  );
}
