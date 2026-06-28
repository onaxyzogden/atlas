/**
 * StewardTeamCapture -- store-direct capture for the s1-steward (Steward / Team
 * Object) family (Tier-0 / Stratum-1 restructure, 2026-06-16).
 *
 * Architecture note (mirrors StakeholderCapture):
 *   - The Steward/Team Object is the canonical "who does the work, with what
 *     capacity" record. Per-person presence + capability (resident status,
 *     allocation, decision rights by domain, capability by domain) live on each
 *     `StewardProfile` keyed by member userId; the per-member OPERATIONAL ROLE
 *     (the standardized "what they do" / default domain focus) lives on the
 *     membership row via `memberStore`, not the profile; team-level fields
 *     (governance framework, identified skill gaps, permitted capital funding
 *     sources) live on the project-level `StewardTeam`. This component writes all
 *     three and reads them back via `useStewardRoster` + a stewardTeam selector.
 *   - It does NOT lift state to the panel. The panel passes no marker; the data
 *     IS the store. The recorded FormValue is therefore empty -- completion is
 *     marked by the panel, the human-readable record comes from summarise*.
 *   - Pure helpers (`stewardTeamModeFor`, `isStewardTeamValid`,
 *     `summariseStewardTeam`) operate on SNAPSHOTS (roster + team passed as args)
 *     so they remain unit-testable without store wiring.
 *
 * Phase-4 consolidation (2026-06-28): the c2 "People & roles" capture absorbed
 * the standalone operational-roles item (formerly c9). The legacy free-text
 * `teamRole` input retired in favour of the standardized operational-role pills;
 * the `teamRole` field stays on `StewardProfile` for legacy display only (the c1
 * roster falls back to it when present). See [[project_operational_role_layer]].
 *
 * Seasonal labour (s1-steward-c5) is NOT handled here -- it routes to
 * LabourInventoryCapture via the panel's isLabourInventory arm, the single
 * canonical labour record. `stewardTeamModeFor` returns null for c5.
 *
 * ASCII-only: em-dash -> " -- "; copy avoids apostrophes; all glyphs are lucide.
 */

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Coins,
  Info,
  Landmark,
  Plus,
  Users,
  X,
} from 'lucide-react';
import {
  STEWARD_DOMAINS,
  STEWARD_DOMAIN_LABELS,
  operationalRolesApplyTo,
} from '@ogden/shared';
import type { FormValue } from './actToolCatalog.js';
import {
  useVisionStore,
  type StewardProfile,
  type StewardTeam,
} from '../../../store/visionStore.js';
import { useMemberStore } from '../../../store/memberStore.js';
import {
  useStewardRoster,
  type StewardRosterEntry,
} from '../../observe/modules/human-context/roster.js';
import {
  CAPITAL_CHANNEL_LIST,
  CAPITAL_SCOPE_NOTES,
} from './EcovillageCapitalPlanCapture.js';
import ScopePreview from '../../../features/collaboration/ScopePreview.js';
import { useResolvedOperationalRoles } from '../../roles/useResolvedOperationalRoles.js';
import css from './StewardTeamCapture.module.css';

// --------------------------------------------------------------------------
// Mode type + router (exported pure helper)
// --------------------------------------------------------------------------

export type StewardTeamMode =
  | 'roster'
  | 'roles'
  | 'rights'
  | 'capability'
  | 'capital'
  | 'gaps'
  | 'governance';

/**
 * Returns the capture mode for an s1-steward item, or null when the item is not
 * handled here (c5 labour -> LabourInventoryCapture; any non-steward id).
 *
 * c9 (standalone operational roles) was retired 2026-06-28: its pills folded
 * into the c2 'roles' capture, so c9 now resolves to null like any other
 * unhandled id.
 */
export function stewardTeamModeFor(itemId: string): StewardTeamMode | null {
  switch (itemId) {
    case 's1-steward-c1':
      return 'roster';
    case 's1-steward-c2':
      return 'roles';
    case 's1-steward-c3':
      return 'rights';
    case 's1-steward-c4':
      return 'capability';
    case 's1-steward-c6':
      return 'capital';
    case 's1-steward-c7':
      return 'gaps';
    case 's1-steward-c8':
      return 'governance';
    default:
      return null;
  }
}

// Stable empty container -- shared so the panel's selector and this component's
// selector return the same reference when a project has no vision record yet
// (avoids the Zustand v5 fresh-ref re-render trap).
export const EMPTY_STEWARD_TEAM: StewardTeam = Object.freeze({});

// --------------------------------------------------------------------------
// Co-located option lists
// --------------------------------------------------------------------------

type ResidentStatus = NonNullable<StewardProfile['residentStatus']>;
const RESIDENT_STATUS: readonly { id: ResidentStatus; label: string }[] = [
  { id: 'live-in', label: 'Live-in' },
  { id: 'off-site', label: 'Off-site' },
  { id: 'visiting', label: 'Visiting' },
];

interface DecisionLevel {
  id: string;
  label: string;
}
// Decision-rights levels per domain (single-select per cell). Clicking the
// active level again clears it.
const DECISION_LEVELS: readonly DecisionLevel[] = [
  { id: 'lead', label: 'Leads' },
  { id: 'shared', label: 'Shared' },
  { id: 'advises', label: 'Advises' },
];

// --------------------------------------------------------------------------
// Small pure helpers
// --------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function memberName(entry: StewardRosterEntry): string {
  return entry.member.displayName ?? entry.member.email;
}

function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .filter((w) => w.length > 0)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('')
      .slice(0, 2) || '?'
  );
}

function roleLabel(role: string): string {
  return role
    .split('_')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Domains with at least one capable steward across the whole team. */
function domainsCovered(roster: readonly StewardRosterEntry[]): Set<string> {
  const set = new Set<string>();
  for (const e of roster) {
    for (const key of Object.keys(e.profile.capabilityByDomain ?? {})) {
      set.add(key);
    }
  }
  return set;
}

// --------------------------------------------------------------------------
// Validity helper (exported pure -- operates on snapshot)
// --------------------------------------------------------------------------

// The Steward/Team Object is an all-optional declaration: every item is
// recordable as soon as it is opened, EXCEPT the roster (c1), which cannot be
// recorded with an empty team (a project always has at least its creator, so
// this only blocks a degenerate empty roster).
export function isStewardTeamValid(
  itemId: string,
  roster: readonly StewardRosterEntry[],
  _team: StewardTeam,
  _marker: FormValue,
): boolean {
  if (itemId === 's1-steward-c1') return roster.length >= 1;
  return true;
}

// --------------------------------------------------------------------------
// Summary helper (exported pure -- operates on snapshot)
// --------------------------------------------------------------------------

export function summariseStewardTeam(
  itemId: string,
  roster: readonly StewardRosterEntry[],
  team: StewardTeam,
  _marker: FormValue,
): string {
  switch (itemId) {
    case 's1-steward-c1': {
      const n = roster.length;
      return `${n} steward${n === 1 ? '' : 's'} on the team`;
    }
    case 's1-steward-c2': {
      // People & roles (Phase-4 consolidation 2026-06-28): c2 absorbed the
      // operational-role pills (the free-text team-role input retired), so its
      // summary now counts members the layer applies to that carry a role.
      // Members the layer does not apply to always keep the full view and are
      // never "assigned".
      const assignable = roster.filter((e) =>
        operationalRolesApplyTo(e.member.role),
      );
      const n = assignable.filter(
        (e) => (e.member.operationalRoles ?? []).length > 0,
      ).length;
      return n === 0
        ? 'No operational roles assigned'
        : `Operational focus set for ${n} member${n === 1 ? '' : 's'}`;
    }
    case 's1-steward-c3': {
      const n = roster.filter(
        (e) => Object.keys(e.profile.decisionRights ?? {}).length > 0,
      ).length;
      return `Decision rights set for ${n} steward${n === 1 ? '' : 's'}`;
    }
    case 's1-steward-c4': {
      const n = domainsCovered(roster).size;
      return `${n} of ${STEWARD_DOMAINS.length} domains covered`;
    }
    case 's1-steward-c6': {
      const n = (team.fundingSources ?? []).length;
      return n === 0
        ? 'No funding sources recorded'
        : `${n} funding source${n === 1 ? '' : 's'} noted`;
    }
    case 's1-steward-c7': {
      const n = (team.skillGaps ?? []).length;
      return n === 0
        ? 'No skill gaps recorded'
        : `${n} skill gap${n === 1 ? '' : 's'} identified`;
    }
    case 's1-steward-c8':
      return asString(team.governance).trim() !== ''
        ? 'Governance framework noted'
        : 'No governance framework recorded';
    default:
      return '';
  }
}

// --------------------------------------------------------------------------
// Component props + store action types
// --------------------------------------------------------------------------

type VisionActions = ReturnType<typeof useVisionStore.getState>;
type UpdateProfileFn = VisionActions['updateStewardProfile'];
type UpdateTeamFn = VisionActions['updateStewardTeam'];

export interface StewardTeamCaptureProps {
  itemId: string;
  projectId: string;
}

// --------------------------------------------------------------------------
// Default component
// --------------------------------------------------------------------------

export default function StewardTeamCapture(
  props: StewardTeamCaptureProps,
): JSX.Element {
  const { itemId, projectId } = props;

  const roster = useStewardRoster(projectId);
  const team = useVisionStore(
    (s) => s.getVisionData(projectId)?.stewardTeam ?? EMPTY_STEWARD_TEAM,
  );

  // Actions are stable references in Zustand v5 -- safe to pull from getState().
  const { updateStewardProfile, updateStewardTeam } = useVisionStore.getState();

  const mode = stewardTeamModeFor(itemId);

  switch (mode) {
    case 'roster':
      return <RosterBody roster={roster} />;
    case 'roles':
      return (
        <RolesBody
          roster={roster}
          projectId={projectId}
          updateStewardProfile={updateStewardProfile}
        />
      );
    case 'rights':
      return (
        <RightsBody
          roster={roster}
          projectId={projectId}
          updateStewardProfile={updateStewardProfile}
        />
      );
    case 'capability':
      return (
        <CapabilityBody
          roster={roster}
          projectId={projectId}
          updateStewardProfile={updateStewardProfile}
        />
      );
    case 'capital':
      return (
        <CapitalBody
          team={team}
          projectId={projectId}
          updateStewardTeam={updateStewardTeam}
        />
      );
    case 'gaps':
      return (
        <GapsBody
          team={team}
          projectId={projectId}
          updateStewardTeam={updateStewardTeam}
        />
      );
    case 'governance':
      return (
        <GovernanceBody
          team={team}
          projectId={projectId}
          updateStewardTeam={updateStewardTeam}
        />
      );
    default:
      return (
        <div className={css.emptyNote}>
          This steward item has no structured capture.
        </div>
      );
  }
}

// --------------------------------------------------------------------------
// Shared sub-components
// --------------------------------------------------------------------------

function FeedsBlock({ text }: { text: string }): JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <span className={css.feedsIcon} aria-hidden="true">
        <ArrowRight size={13} />
      </span>
      <div className={css.feedsTxt}>{text}</div>
    </div>
  );
}

function EmptyRoster(): JSX.Element {
  return (
    <p className={css.emptyNote}>
      No stewards on the team yet. Add people in the project members roster, then
      record their details here.
    </p>
  );
}

function PersonHead({ entry }: { entry: StewardRosterEntry }): JSX.Element {
  return (
    <div className={css.personHead}>
      <span className={css.av}>{initialsOf(memberName(entry))}</span>
      <span className={css.personName}>{memberName(entry)}</span>
      <span className={css.personRole}>{roleLabel(entry.member.role)}</span>
    </div>
  );
}

// --------------------------------------------------------------------------
// c1 -- roster (read-only canonical team)
// --------------------------------------------------------------------------

function RosterBody({
  roster,
}: {
  roster: readonly StewardRosterEntry[];
}): JSX.Element {
  return (
    <div className={css.root}>
      <div className={css.guidanceBlock}>
        <span className={css.guidanceIcon} aria-hidden="true">
          <Info size={14} />
        </span>
        <div className={css.guidanceTxt}>
          This is the canonical steward team. Everyone here is referenced across
          every later tier and is never re-asked. Manage who belongs in the
          project members roster; record each role and capacity in the items
          below.
        </div>
      </div>
      <div className={css.section}>
        <div className={css.secLbl}>
          <Users size={13} /> Steward team
          <span className={css.secCount}>
            {roster.length} {roster.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <div className={css.rowList}>
          {roster.length === 0 ? (
            <EmptyRoster />
          ) : (
            roster.map((e) => (
              <div key={e.member.userId} className={css.contactRow}>
                <span className={css.av}>{initialsOf(memberName(e))}</span>
                <div className={css.crInfo}>
                  <span className={css.crName}>{memberName(e)}</span>
                  <span className={css.crRole}>
                    {asString(e.profile.teamRole).trim() !== ''
                      ? e.profile.teamRole
                      : roleLabel(e.member.role)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// c2 -- people & roles (per-person operational role + presence)
// --------------------------------------------------------------------------
//
// Phase-4 consolidation (2026-06-28): this body absorbed the standalone
// operational-roles item (formerly c9). The free-text "team role" input retired
// in favour of the standardized operational-role pills -- the single, project-
// natural answer to "what does this person do". Per assignable member it now
// renders: operational-role pills (project-labeled, written to the membership
// via memberStore) + a live ScopePreview + resident-status + allocation.
//
// Operational roles are orthogonal to the system role (which governs surfaces)
// and to decision rights (c3). They set each member's DEFAULT domain focus
// across Plan/Act/Observe and never grant, remove, or gate anything; out-of-
// scope signals are de-emphasized, never hidden. The layer applies only to
// stewards / team members (operationalRolesApplyTo); everyone else keeps the
// full view and is listed read-only under "Not role-scoped". Presence fields
// (resident status, allocation) are edited on the assignable cards.

function RolesBody({
  roster,
  projectId,
  updateStewardProfile,
}: {
  roster: readonly StewardRosterEntry[];
  projectId: string;
  updateStewardProfile: UpdateProfileFn;
}): JSX.Element {
  const setOperationalRoles = useMemberStore((s) => s.setOperationalRoles);
  // Option C: project-resolved defs (label/description) + domain map so each
  // member's pills carry this project's natural role names and the ScopePreview
  // reflects any re-scope. No override => the six built-ins => byte-identical.
  const { defs, domainsMap } = useResolvedOperationalRoles(projectId);
  const assignable = roster.filter((e) =>
    operationalRolesApplyTo(e.member.role),
  );
  const blocked = roster.filter((e) => !operationalRolesApplyTo(e.member.role));

  return (
    <div className={css.root}>
      <FeedsBlock text="Operational roles set each member's default domain focus across Plan, Act, and Observe, and feed Tier 1 direction-setting. View-scoping only -- they never grant or remove a capability, and out-of-scope signals are de-emphasized, never hidden." />
      {roster.length === 0 ? (
        <EmptyRoster />
      ) : (
        <>
          {assignable.map((e) => {
            const current = e.member.operationalRoles ?? [];
            return (
              <div key={e.member.userId} className={css.personCard}>
                <PersonHead entry={e} />
                <div className={css.personBody}>
                  <label className={css.fieldLbl}>Operational roles</label>
                  <div className={css.chips}>
                    {defs.map((def) => {
                      const active = current.includes(def.slug);
                      return (
                        <button
                          key={def.slug}
                          type="button"
                          className={css.chip}
                          data-active={active}
                          title={def.description}
                          onClick={() => {
                            const next = active
                              ? current.filter((r) => r !== def.slug)
                              : [...current, def.slug];
                            void setOperationalRoles(
                              projectId,
                              e.member.userId,
                              next,
                            );
                          }}
                        >
                          {def.label}
                        </button>
                      );
                    })}
                  </div>
                  <ScopePreview
                    roles={current}
                    emptyMeans="full"
                    domainsMap={domainsMap}
                  />
                  <label className={css.fieldLbl}>Resident status</label>
                  <div className={css.chips}>
                    {RESIDENT_STATUS.map((rs) => (
                      <button
                        key={rs.id}
                        type="button"
                        className={css.chip}
                        data-active={e.profile.residentStatus === rs.id}
                        onClick={() =>
                          updateStewardProfile(projectId, e.member.userId, {
                            residentStatus:
                              e.profile.residentStatus === rs.id
                                ? undefined
                                : rs.id,
                          })
                        }
                      >
                        {rs.label}
                      </button>
                    ))}
                  </div>
                  <label className={css.fieldLbl}>Allocation</label>
                  <input
                    className={css.textInput}
                    type="text"
                    value={asString(e.profile.roleAllocation)}
                    placeholder="e.g. full-time, 3 days/week, 40%"
                    onChange={(ev) =>
                      updateStewardProfile(projectId, e.member.userId, {
                        roleAllocation: ev.target.value,
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
          {blocked.length > 0 ? (
            <div className={css.section}>
              <div className={css.secLbl}>
                <Info size={13} /> Not role-scoped
              </div>
              <p className={css.modeHint}>
                Contractors, landowners, reviewers and viewers keep the full
                view -- the operational-role layer does not apply to them.
              </p>
              <div className={css.rowList}>
                {blocked.map((e) => (
                  <div key={e.member.userId} className={css.contactRow}>
                    <span className={css.av}>{initialsOf(memberName(e))}</span>
                    <div className={css.crInfo}>
                      <span className={css.crName}>{memberName(e)}</span>
                      <span className={css.crRole}>
                        {roleLabel(e.member.role)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// c3 -- decision rights by domain (per-person matrix, single-select level)
// --------------------------------------------------------------------------

function RightsBody({
  roster,
  projectId,
  updateStewardProfile,
}: {
  roster: readonly StewardRosterEntry[];
  projectId: string;
  updateStewardProfile: UpdateProfileFn;
}): JSX.Element {
  return (
    <div className={css.root}>
      <FeedsBlock text="Decision rights feed Tier 1 direction-setting." />
      {roster.length === 0 ? (
        <EmptyRoster />
      ) : (
        roster.map((e) => {
          const rights = e.profile.decisionRights ?? {};
          return (
            <div key={e.member.userId} className={css.personCard}>
              <PersonHead entry={e} />
              <div className={css.personBody}>
                {STEWARD_DOMAINS.map((domain) => (
                  <div key={domain} className={css.matrixRow}>
                    <span className={css.matrixLbl}>
                      {STEWARD_DOMAIN_LABELS[domain]}
                    </span>
                    <div className={css.chips}>
                      {DECISION_LEVELS.map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          className={css.levelBtn}
                          data-active={rights[domain] === lvl.id}
                          onClick={() => {
                            const next = { ...rights };
                            if (next[domain] === lvl.id) {
                              delete next[domain];
                            } else {
                              next[domain] = lvl.id;
                            }
                            updateStewardProfile(projectId, e.member.userId, {
                              decisionRights: next,
                            });
                          }}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// c4 -- capability by domain (per-person domain coverage toggles)
// --------------------------------------------------------------------------

function CapabilityBody({
  roster,
  projectId,
  updateStewardProfile,
}: {
  roster: readonly StewardRosterEntry[];
  projectId: string;
  updateStewardProfile: UpdateProfileFn;
}): JSX.Element {
  return (
    <div className={css.root}>
      <FeedsBlock text="Capabilities feed Tier 1 direction-setting and Tier 6 resource planning." />
      {roster.length === 0 ? (
        <EmptyRoster />
      ) : (
        roster.map((e) => {
          const cap = e.profile.capabilityByDomain ?? {};
          return (
            <div key={e.member.userId} className={css.personCard}>
              <PersonHead entry={e} />
              <div className={css.personBody}>
                <label className={css.fieldLbl}>Capable domains</label>
                <div className={css.chips}>
                  {STEWARD_DOMAINS.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      className={css.chip}
                      data-active={domain in cap}
                      onClick={() => {
                        const next = { ...cap };
                        if (domain in next) {
                          delete next[domain];
                        } else {
                          next[domain] = [];
                        }
                        updateStewardProfile(projectId, e.member.userId, {
                          capabilityByDomain: next,
                        });
                      }}
                    >
                      {STEWARD_DOMAIN_LABELS[domain]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// c6 -- capital funding sources (team-level, permitted channels only)
// --------------------------------------------------------------------------

function CapitalBody({
  team,
  projectId,
  updateStewardTeam,
}: {
  team: StewardTeam;
  projectId: string;
  updateStewardTeam: UpdateTeamFn;
}): JSX.Element {
  const sources = team.fundingSources ?? [];
  return (
    <div className={css.root}>
      <div className={css.warnBlock}>
        <span className={css.warnIcon} aria-hidden="true">
          <AlertTriangle size={14} />
        </span>
        <div className={css.warnTxt}>{CAPITAL_SCOPE_NOTES}</div>
      </div>
      <div className={css.section}>
        <div className={css.secLbl}>
          <Coins size={13} /> Permitted funding sources
        </div>
        <p className={css.modeHint}>
          Select the capital channels the team will draw on. These are the only
          permitted channels.
        </p>
        <div className={css.chips}>
          {CAPITAL_CHANNEL_LIST.map((channel) => (
            <button
              key={channel}
              type="button"
              className={css.chip}
              data-active={sources.includes(channel)}
              onClick={() => {
                const next = sources.includes(channel)
                  ? sources.filter((c) => c !== channel)
                  : [...sources, channel];
                updateStewardTeam(projectId, { fundingSources: next });
              }}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// c7 -- identified skill gaps (team-level chip list)
// --------------------------------------------------------------------------

function GapsBody({
  team,
  projectId,
  updateStewardTeam,
}: {
  team: StewardTeam;
  projectId: string;
  updateStewardTeam: UpdateTeamFn;
}): JSX.Element {
  const gaps = team.skillGaps ?? [];
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (v === '' || gaps.includes(v)) {
      setText('');
      return;
    }
    updateStewardTeam(projectId, { skillGaps: [...gaps, v] });
    setText('');
  };
  return (
    <div className={css.root}>
      <FeedsBlock text="Skill gaps feed Tier 6 resource planning and the risk register." />
      <div className={css.section}>
        <div className={css.secLbl}>
          <AlertTriangle size={13} /> Identified skill gaps
        </div>
        <div className={css.addRow}>
          <input
            className={css.textInput}
            type="text"
            value={text}
            placeholder="e.g. Water-system design, Bookkeeping, Beekeeping"
            onChange={(ev) => setText(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className={css.addBtn} onClick={add}>
            <Plus size={13} /> Add
          </button>
        </div>
        {gaps.length === 0 ? (
          <p className={css.emptyNote}>No skill gaps recorded yet.</p>
        ) : (
          <div className={css.chips}>
            {gaps.map((g) => (
              <span key={g} className={css.gapChip}>
                {g}
                <button
                  type="button"
                  className={css.removeBtn}
                  aria-label={`Remove ${g}`}
                  onClick={() =>
                    updateStewardTeam(projectId, {
                      skillGaps: gaps.filter((x) => x !== g),
                    })
                  }
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// c8 -- governance framework (team-level free text)
// --------------------------------------------------------------------------

function GovernanceBody({
  team,
  projectId,
  updateStewardTeam,
}: {
  team: StewardTeam;
  projectId: string;
  updateStewardTeam: UpdateTeamFn;
}): JSX.Element {
  return (
    <div className={css.root}>
      <FeedsBlock text="Governance principles feed Tier 1 direction-setting." />
      <div className={css.section}>
        <div className={css.secLbl}>
          <Landmark size={13} /> Governance framework
        </div>
        <p className={css.modeHint}>
          How the team makes decisions together: the process, who decides what,
          and how disagreements are resolved.
        </p>
        <textarea
          className={css.textTa}
          value={asString(team.governance)}
          rows={5}
          placeholder="Describe the decision-making process, quorum, and dispute resolution."
          onChange={(ev) =>
            updateStewardTeam(projectId, { governance: ev.target.value })
          }
        />
      </div>
    </div>
  );
}

