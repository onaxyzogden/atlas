/**
 * DeclarationOrientationRail -- the Plan-stage Stratum-1 / Declaration
 * orientation surface, hosted in the right rail of PlanTierShell. It carries the
 * two Stratum-1 widgets relocated out of the DeclarationCenter header band (so
 * the center canvas is dominated by the decision list + working panel):
 *
 *   1. Canonical-object cards -- the Intent Object + Steward/Team Object, status
 *      driven (Established / In Progress / Not started), STACKED vertically for
 *      the narrow rail.
 *   2. Objective sequencing -- the shared StratumSequencingRail stepper, here for
 *      Stratum 1 ("1.1 -> [1.2 | 1.3 | 1.4] -> [1.5 | 1.6] -> Land Reading"). The
 *      identical stepper renders standalone on Strata 2-7; this rail only adds the
 *      Stratum-1 canonical cards above it.
 *
 * Plan-only orientation: mounted by PlanTierShell across every Stratum-1
 * Project-Foundation objective -- both the non-spatial Declaration workbench
 * objectives AND the spatial/map ones (the orientation is stratum-level, so it
 * stays put as the steward moves between foundation objectives). The Act surface
 * and Reception (Stratum 3) never mount it. All derivations come from the pure
 * declarationModel; this file owns presentation only. Same data-testids as the
 * former DeclarationCenter regions (canonical-*, seq-node-*) so the behavior
 * contract is unchanged.
 *
 * ASCII-only: every glyph is a lucide icon.
 */

import { Check } from 'lucide-react';
import {
  PLAN_STRATA,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { deriveCanonicalObjects } from './declarationModel.js';
import StratumSequencingRail from './StratumSequencingRail.js';
import css from './DeclarationOrientationRail.module.css';

export interface DeclarationOrientationRailProps {
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  /** Currently active objective id (marks the matching sequencing node). */
  activeObjectiveId?: string;
  /**
   * OPTIONAL. When provided, a non-locked sequencing node becomes a button that
   * selects its objective. Absent -> nodes render as static (no interaction).
   */
  onSelectObjective?: (objectiveId: string) => void;
}

/** Stratum 1 (Project Foundation) -- the stratum whose stepper this rail hosts. */
const FOUNDATION_STRATUM = PLAN_STRATA[0];

export default function DeclarationOrientationRail({
  objectives,
  objectiveStatuses,
  activeObjectiveId,
  onSelectObjective,
}: DeclarationOrientationRailProps): JSX.Element {
  const cards = deriveCanonicalObjects(objectives, objectiveStatuses);

  return (
    <div className={css.root} data-testid="declaration-orientation-rail">
      <div className={css.railLabel}>Stratum 1 -- Orientation</div>

      {/* ---------- Canonical-object cards ---------- */}
      {cards.length > 0 ? (
        <div className={css.coRow}>
          {cards.map((card) => (
            <div
              key={card.kind}
              className={`${css.coCard} ${
                card.tag === 'done'
                  ? css.coDone
                  : card.tag === 'wip'
                    ? css.coWip
                    : ''
              }`}
              data-testid={`canonical-${card.kind}`}
              data-tag={card.tag}
            >
              <div className={css.coEyebrow}>
                <span
                  className={`${css.coTag} ${
                    card.tag === 'done'
                      ? css.coTagDone
                      : card.tag === 'wip'
                        ? css.coTagWip
                        : css.coTagIdle
                  }`}
                >
                  {card.tag === 'done' ? (
                    <Check size={9} className={css.coTagIcon} aria-hidden="true" />
                  ) : null}
                  {card.tagLabel}
                </span>
              </div>
              <div className={css.coName}>{card.name}</div>
              <div className={css.coDesc}>{card.desc}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ---------- Objective sequencing (shared stepper) ---------- */}
      {FOUNDATION_STRATUM ? (
        <StratumSequencingRail
          stratum={FOUNDATION_STRATUM}
          objectives={objectives}
          objectiveStatuses={objectiveStatuses}
          activeObjectiveId={activeObjectiveId}
          onSelectObjective={onSelectObjective}
        />
      ) : null}
    </div>
  );
}
