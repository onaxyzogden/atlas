/**
 * Mode4DesignChrome -- the Plan-only design chrome for a Mode-4 (Strata 4-7)
 * objective detail. Surfaces, in spec order, the four display-only affordances
 * the Tier-3 / Tier-4 (Strategic Decisions / System Design) restructure adds to
 * an objective:
 *
 *   1. "Builds on" -- the Tier lineage line (`buildsOnDisplay`).
 *   2. Planning Direction mandate -- the amber line saying how this objective
 *      carries the approved direction (`planningDirectionMandate`), e.g. the
 *      Silvopasture water conditional being raised at Tier 3 or closed at Tier 4.
 *   3. Monitoring stream -- the green Key-Indicators / Response-Triggers / Feeds
 *      panel (`monitoringProtocol`), the design input to the Observe stage.
 *   4. Act handoff -- the design package this objective hands to Act
 *      (`actHandoff`).
 *
 * The whole chrome renders nothing unless the objective carries at least one
 * genuinely Mode-4 display field (monitoringProtocol / buildsOnDisplay /
 * planningDirectionMandate) -- so legacy / non-Design objectives are untouched.
 * `actHandoff` alone never arms the chrome (it predates the restructure and
 * appears on many non-Design objectives); it only shows as a chip once the
 * chrome is already armed by another field.
 *
 * ALL FIELDS ARE DISPLAY-ONLY and never gate. Plan-only by construction:
 * ObjectiveDetailPanel (its only mount) is rendered solely by PlanTierShell /
 * PlanStratumShell, so the Act stage is byte-identical.
 */

import type { PlanStratumObjective } from '@ogden/shared';
import { ArrowRight, Flag, Target } from 'lucide-react';
import MonitoringStreamPanel from './MonitoringStreamPanel.js';
import css from './Mode4DesignChrome.module.css';

export interface Mode4DesignChromeProps {
  objective: PlanStratumObjective;
}

export default function Mode4DesignChrome({ objective }: Mode4DesignChromeProps) {
  const { buildsOnDisplay, planningDirectionMandate, monitoringProtocol, actHandoff } =
    objective;

  // Arm only on a genuinely Mode-4 display field. actHandoff is intentionally
  // excluded from this test (it predates the restructure and appears on many
  // non-Design objectives).
  const armed =
    buildsOnDisplay != null ||
    planningDirectionMandate != null ||
    monitoringProtocol != null;
  if (!armed) return null;

  return (
    <section
      className={css.chrome}
      data-testid="mode4-design-chrome"
      aria-label="Mode 4 design detail"
    >
      <div className={css.eyebrow}>
        <Target size={13} aria-hidden="true" className={css.eyebrowIcon} />
        <span>Mode 4 -- Design</span>
      </div>

      {buildsOnDisplay != null && (
        <p className={css.buildsOn} data-testid="mode4-builds-on">
          {buildsOnDisplay}
        </p>
      )}

      {planningDirectionMandate != null && (
        <p className={css.mandate} data-testid="mode4-mandate">
          <Flag size={13} aria-hidden="true" className={css.mandateIcon} />
          <span>{planningDirectionMandate}</span>
        </p>
      )}

      {monitoringProtocol != null && (
        <MonitoringStreamPanel
          indicators={monitoringProtocol.indicators}
          triggers={monitoringProtocol.triggers}
          feeds={monitoringProtocol.feeds}
        />
      )}

      {actHandoff != null && (
        <p className={css.handoff} data-testid="mode4-act-handoff">
          <ArrowRight size={13} aria-hidden="true" className={css.handoffIcon} />
          <span className={css.handoffLabel}>Act handoff</span>
          <span className={css.handoffValue}>{actHandoff}</span>
        </p>
      )}
    </section>
  );
}
