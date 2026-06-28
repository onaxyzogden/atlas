/**
 * TeamRegistryPanel -- the Declaration right-pane REFERENCE block for the
 * Steward/Team Object (1.2 / s1-steward). It sits ABOVE the DecisionWorkingPanel
 * in the workbench right pane and is read-only: the actual capture happens in the
 * working panel below (StewardTeamCapture). This panel renders the mockup's
 * right-column reference sections, themed with project tokens:
 *
 *   1. Header                     -- canonical-object eyebrow + title + sub.
 *   2. "Why this object matters"  -- mauve canonical-object callout.
 *   3. "Team Registry"            -- constituted member rows (av + role + check).
 *   4. "Labour Availability"      -- per-steward weekly-hours bars.
 *   5. "Intent Object reference"  -- Purpose / Non-negotiable / Committed.
 *   6. "Downstream references"    -- mauve note on what consumes this object.
 *
 * Plan-only: mounted by ActTierZeroWorkbench solely when `mode === "declaration"`
 * AND the active objective is the team objective. All derivations come from the
 * pure `selectTeamRoster` adapter; this file owns presentation only.
 *
 * Theming: project --color-* tokens shared with the sibling DeclarationCenter /
 * DecisionList, EXCEPT the mockup's mauve "canonical object" accent, which has no
 * global token -- a literal #9b7ec8 (matching AdaptiveManagementCapture's local
 * --am-mauve) is used for the callout + downstream note. ASCII-only: every glyph
 * is a lucide icon.
 *
 * AMANAH: the intent reference surfaces the project's OWN SharedVision data via
 * selectTeamRoster (Amanah-clean -- see that module). No advance-sale / CSA /
 * yield-share copy is authored here.
 */

import { useMemo } from 'react';
import { Check, Compass, Database, Lock, Network, Sprout, Users } from 'lucide-react';
import { useStewardRoster } from '../../observe/modules/human-context/roster.js';
import { useVisionStore, type SharedVision } from '../../../store/visionStore.js';
import { useResolvedOperationalRoles } from '../../roles/useResolvedOperationalRoles.js';
import { tierZeroDisplayFor } from './declarationModel.js';
import {
  selectTeamRoster,
  type IntentReferenceKind,
  type OperationalRoleLabelMap,
} from './selectTeamRoster.js';
import css from './TeamRegistryPanel.module.css';

/** The objective that constitutes the Team Object (panel mounts only for this). */
export const TEAM_OBJECTIVE_ID = 's1-steward';

export interface TeamRegistryPanelProps {
  projectId: string;
}

/** Stable empty fallback so the SharedVision selector never mints a fresh ref. */
const EMPTY_SHARED_VISION: SharedVision = {};

/** Static, Amanah-neutral downstream-reference note (no sale/CSA framing). */
const DOWNSTREAM_NOTE =
  'Referenced downstream by role and decision-rights (Tier 4 direction), by ' +
  'capacity-matching against plan-derived demand (Tier 6), and by resource ' +
  'planning (Tier 7). Built once here -- never re-asked.';

/** Per-intent-row leading icon (kind -> lucide component). */
const INTENT_ICON: Readonly<Record<IntentReferenceKind, typeof Compass>> = {
  purpose: Compass,
  nonNegotiable: Lock,
  committed: Sprout,
};

export default function TeamRegistryPanel({
  projectId,
}: TeamRegistryPanelProps): JSX.Element {
  const entries = useStewardRoster(projectId);
  const sharedVision = useVisionStore(
    (s) => s.getVisionData(projectId)?.sharedVision ?? EMPTY_SHARED_VISION,
  );
  // Project-resolved operational-role labels (Option C rename) so the roster
  // label + chips read this project's vocabulary. Built from the resolved defs,
  // memoized off them so selectTeamRoster's memo stays stable across renders.
  const { defs } = useResolvedOperationalRoles(projectId);
  const roleLabelMap = useMemo<OperationalRoleLabelMap>(() => {
    const map: OperationalRoleLabelMap = {};
    for (const def of defs) map[def.slug] = def.label;
    return map;
  }, [defs]);
  const model = useMemo(
    () => selectTeamRoster(entries, sharedVision, roleLabelMap),
    [entries, sharedVision, roleLabelMap],
  );

  const display = tierZeroDisplayFor(TEAM_OBJECTIVE_ID)?.display ?? '1.2';

  return (
    <aside className={css.panel} data-testid="team-registry-panel">
      {/* ---------- Header ---------- */}
      <div className={css.hd}>
        <div className={css.eyebrow}>
          <span className={css.eyebrowNum}>{display}</span>
          <span className={css.eyebrowLbl}>Canonical Team Object</span>
        </div>
        <div className={css.title}>Constitute the steward team</div>
        <div className={css.sub}>
          Built once here, then referenced by every later tier -- never re-asked.
        </div>
      </div>

      {/* ---------- Why this object matters (callout) ---------- */}
      <div className={css.callout}>
        <div className={css.calloutTitle}>
          <Database size={11} className={css.calloutIcon} aria-hidden="true" />
          Canonical Object
        </div>
        <div className={css.calloutBody}>
          The single source of truth for who is doing this work and what they can
          contribute. The capacity baseline that Tier 6 matches plan-derived
          demand against.
        </div>
      </div>

      {/* ---------- Team Registry ---------- */}
      <section className={css.sec}>
        <div className={css.secLabel}>
          <Users size={11} className={css.secIcon} aria-hidden="true" />
          Team Registry
          <span className={css.secCount} data-testid="registry-count">
            {model.constitutedCount} of {model.rosterSize} constituted
          </span>
        </div>
        {model.members.length > 0 ? (
          <div>
            {model.members.map((m) => (
              <div
                key={m.userId}
                className={css.memberRow}
                data-testid={`member-row-${m.userId}`}
                data-complete={m.complete || undefined}
              >
                <span className={css.av} aria-hidden="true">
                  {m.initials}
                </span>
                <span className={css.mBody}>
                  <span className={css.mName}>{m.name}</span>
                  <span className={css.mRole}>{m.roleLabel}</span>
                  {m.operationalRoleLabels.length > 0 ? (
                    <span
                      className={css.opChips}
                      data-testid={`op-roles-${m.userId}`}
                    >
                      {m.operationalRoleLabels.map((label) => (
                        <span key={label} className={css.opChip}>
                          {label}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                {m.complete ? (
                  <span className={css.mDone}>
                    <Check size={10} aria-hidden="true" />
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className={css.empty}>No stewards on the roster yet.</div>
        )}
      </section>

      {/* ---------- Labour Availability ---------- */}
      <section className={css.sec}>
        <div className={css.secLabel}>
          Labour Availability
          <span className={css.secCount}>
            {model.totalWeeklyHours} hr / wk declared
          </span>
        </div>
        {model.labour.length > 0 ? (
          <div>
            {model.labour.map((bar) => (
              <div
                key={bar.userId}
                className={css.capRow}
                data-testid={`labour-bar-${bar.userId}`}
              >
                <span className={css.capName} title={bar.name}>
                  {bar.name}
                </span>
                <span className={css.capBg}>
                  <span
                    className={css.capFill}
                    style={{ width: `${bar.pct}%` }}
                  />
                </span>
                <span className={css.capVal}>{bar.hoursPerWeek} hr / wk</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={css.empty}>No weekly hours declared yet.</div>
        )}
      </section>

      {/* ---------- Intent Object reference ---------- */}
      <section className={css.sec}>
        <div className={css.secLabel}>Intent Object -- for reference</div>
        {model.intent.length > 0 ? (
          <div>
            {model.intent.map((item) => {
              const Icon = INTENT_ICON[item.kind];
              return (
                <div
                  key={item.kind}
                  className={css.intentRow}
                  data-testid={`intent-${item.kind}`}
                >
                  <Icon size={12} className={css.intentIcon} aria-hidden="true" />
                  <span className={css.intentTxt}>
                    <span className={css.intentLabel}>{item.label}:</span>{' '}
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={css.empty}>Intent Object not yet declared.</div>
        )}
      </section>

      {/* ---------- Downstream references ---------- */}
      <div className={css.dsNote}>
        <Network size={11} className={css.dsIcon} aria-hidden="true" />
        <span>{DOWNSTREAM_NOTE}</span>
      </div>
    </aside>
  );
}
