/**
 * CapacityBridgePanel -- the Plan-only "Stratum 1 Capacity Bridge" on the
 * `s7-resource-plan` objective. It puts the steward team's declared SUPPLY
 * (rolled up from Stratum 1 / Objective 1.2 via `stewardSupplyBaseline` +
 * `useStewardRoster`) side-by-side with the Phase-1 DEMAND the resource plan now
 * captures (the structured c1 labour + c4 capital captures, rolled up via
 * `phase1DemandBaseline`). It reads existing data only -- it never re-asks the
 * steward and never writes.
 *
 * It arms ONLY on `s7-resource-plan` (the single objective that owns the demand
 * capture). When no demand has been captured yet it shows an honest "not yet
 * captured" reading rather than fabricating numbers; the derived hours balance is
 * shown only once a real demand figure exists.
 *
 * Amanah: the capital demand's funding channels are constrained to the permitted
 * `CAPITAL_CHANNEL_LIST` enum at capture time (foreign -> ''), so the channel
 * labels rendered here are covenant-clean by construction; this panel renders
 * them as-is and authors no channel string of its own.
 *
 * DISPLAY-ONLY -- it never gates. Plan-only by construction: ObjectiveDetailPanel
 * (its only mount) is rendered solely by PlanTierShell / PlanStratumShell, so the
 * Act stage is byte-identical. (It imports the pure `phase1DemandBaseline`
 * read-model from the Act tier-shell, but that is a one-way data read -- the Act
 * shell never imports this panel.)
 */

import type { PlanStratumObjective } from '@ogden/shared';
import { ClipboardList, Scale, Users, Wallet } from 'lucide-react';
import { useStewardRoster } from '../../observe/modules/human-context/roster.js';
import { stewardSupplyBaseline } from '../../observe/modules/human-context/derivations.js';
import { useVisionStore, type StewardTeam } from '../../../store/visionStore.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import type { FormValue } from '../../act/tier-shell/actToolCatalog.js';
import { phase1DemandBaseline } from '../../act/tier-shell/DemandCapture.js';
import css from './CapacityBridgePanel.module.css';

const RESOURCE_PLAN_ID = 's7-resource-plan';
const LABOUR_DEMAND_FORM = 's7-resource-plan-c1';
const CAPITAL_DEMAND_FORM = 's7-resource-plan-c4';

// Stable empty references so the Zustand selectors never churn the render.
const EMPTY_FORM: FormValue = {};
const EMPTY_TEAM: StewardTeam = {};

export interface CapacityBridgePanelProps {
  objective: PlanStratumObjective;
  projectId: string;
}

export default function CapacityBridgePanel({ objective, projectId }: CapacityBridgePanelProps) {
  // Hooks must run unconditionally (rules of hooks) -- read first, gate after.
  const roster = useStewardRoster(projectId);
  const team = useVisionStore(
    (s) => s.getVisionData(projectId)?.stewardTeam ?? EMPTY_TEAM,
  );
  const labourValue = useActEvidenceStore(
    (s) => s.visionFormData[projectId]?.[LABOUR_DEMAND_FORM] ?? EMPTY_FORM,
  );
  const capitalValue = useActEvidenceStore(
    (s) => s.visionFormData[projectId]?.[CAPITAL_DEMAND_FORM] ?? EMPTY_FORM,
  );

  // The bridge has a single home: the canonical resource-plan objective.
  if (objective.id !== RESOURCE_PLAN_ID) return null;

  const supply = stewardSupplyBaseline(
    roster.map((e) => e.profile),
    team,
  );
  const demand = phase1DemandBaseline(labourValue, capitalValue);

  // The derived bridge reading: real supply hours minus real demand hours. Only
  // shown once demand exists, so we never compare against a fabricated zero.
  const hoursBalance = supply.weeklyHours - demand.labour.weeklyHours;

  return (
    <section
      className={css.bridge}
      data-testid="capacity-bridge"
      aria-label="Capacity bridge: steward supply against Phase-1 demand"
    >
      <div className={css.eyebrow}>
        <Scale size={13} aria-hidden="true" className={css.eyebrowIcon} />
        <span>Capacity Bridge</span>
      </div>
      <p className={css.lede}>
        Steward supply declared in Stratum 1 (Objective 1.2), read against the Phase-1
        demand captured in this resource plan. Display-only -- never a gate.
      </p>

      <div className={css.columns}>
        <div className={`${css.col} ${css.colSupply}`}>
          <div className={css.colHead}>
            <Users size={13} aria-hidden="true" className={css.colIcon} />
            <span>Supply -- Stratum 1</span>
          </div>
          <dl className={css.stats}>
            <div className={css.stat}>
              <dt className={css.statLabel}>Stewards</dt>
              <dd className={css.statValue}>{supply.rosterSize}</dd>
            </div>
            <div className={css.stat}>
              <dt className={css.statLabel}>Weekly hours</dt>
              <dd className={css.statValue}>{supply.weeklyHours}</dd>
            </div>
            <div className={css.stat}>
              <dt className={css.statLabel}>Domains covered</dt>
              <dd className={css.statValue}>{supply.domainCoverageCount}</dd>
            </div>
            <div className={css.stat}>
              <dt className={css.statLabel}>Funding sources</dt>
              <dd className={css.statValue}>{supply.fundingSources}</dd>
            </div>
          </dl>
        </div>

        <div className={`${css.col} ${css.colDemand}`}>
          <div className={css.colHead}>
            <ClipboardList size={13} aria-hidden="true" className={css.colIcon} />
            <span>Demand -- Phase 1</span>
          </div>
          {demand.captured ? (
            <>
              <dl className={css.stats}>
                <div className={css.stat}>
                  <dt className={css.statLabel}>Labour lines</dt>
                  <dd className={css.statValue}>{demand.labour.lineCount}</dd>
                </div>
                <div className={css.stat}>
                  <dt className={css.statLabel}>Weekly hours</dt>
                  <dd className={css.statValue}>{demand.labour.weeklyHours}</dd>
                </div>
                <div className={css.stat}>
                  <dt className={css.statLabel}>Headcount</dt>
                  <dd className={css.statValue}>{demand.labour.headcount}</dd>
                </div>
                <div className={css.stat}>
                  <dt className={css.statLabel}>Capital lines</dt>
                  <dd className={css.statValue}>{demand.capital.lineCount}</dd>
                </div>
                <div className={css.stat}>
                  <dt className={css.statLabel}>Capital total</dt>
                  <dd className={css.statValue}>{demand.capital.total}</dd>
                </div>
              </dl>

              {demand.capital.byChannel.length > 0 && (
                <div className={css.channels}>
                  <p className={css.channelsLabel}>
                    <Wallet size={12} aria-hidden="true" className={css.colIcon} />
                    <span>Funding channels</span>
                  </p>
                  <ul className={css.channelList}>
                    {demand.capital.byChannel.map(({ channel, amount }) => (
                      <li key={channel} className={css.channel}>
                        <span className={css.channelName}>{channel}</span>
                        <span className={css.channelAmount}>{amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className={css.empty} data-testid="capacity-bridge-demand-empty">
              Phase-1 demand not yet captured. Fill the labour (c1) and capital (c4)
              estimates in this resource plan to populate the bridge.
            </p>
          )}
        </div>
      </div>

      {demand.captured && (
        <p
          className={`${css.balance} ${hoursBalance < 0 ? css.balanceShort : css.balanceOk}`}
          data-testid="capacity-bridge-balance"
        >
          {hoursBalance >= 0
            ? `${hoursBalance} hrs/week headroom -- declared supply covers captured Phase-1 labour demand.`
            : `${-hoursBalance} hrs/week shortfall -- captured Phase-1 labour demand exceeds declared supply.`}
        </p>
      )}
    </section>
  );
}
