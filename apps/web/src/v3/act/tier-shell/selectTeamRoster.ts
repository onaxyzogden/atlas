/**
 * selectTeamRoster -- pure, React-free adapter that normalizes the canonical
 * Steward/Team Object (Stage 2) + the project Intent Object into the read-model
 * the Declaration right-pane reference panel (TeamRegistryPanel) renders:
 *
 *   - member rows       (who is constituted on the team, with role + initials)
 *   - labour bars        (per-steward weekly hours pledged, normalized to a bar)
 *   - intent reference   (Purpose / Non-negotiable / Committed, from SharedVision)
 *
 * It is a DISPLAY adapter only -- never a gate. It reads already-fetched data
 * (the `useStewardRoster` join + the project `SharedVision`) so it stays pure and
 * unit-testable with plain fixtures; the component does the store reads.
 *
 * AMANAH: the intent reference is derived from the project's OWN SharedVision
 * fields (statement / constraints / coreFunctions) with neutral static labels. No
 * advance-sale, subscription, CSA/CSRA, or yield-share framing is authored here;
 * the only enterprise wording that can appear is the steward's own recorded data.
 *
 * Per-steward weekly hours come from `totalHoursPerWeek` (the maintenance-hours
 * pledge already used by `stewardSupplyBaseline`), NOT the seasonal labour
 * FormValue -- that richer seasonal curve is a separate record (see the NOTE in
 * observe/human-context/derivations.ts) and is not summed for this reference bar.
 *
 * ASCII-only copy; em/en dashes are written as " -- " / "-".
 */

import type { SharedVision } from '../../../store/visionStore.js';
import type { StewardRosterEntry } from '../../observe/modules/human-context/roster.js';
import { totalHoursPerWeek } from '../../observe/modules/human-context/derivations.js';
import { OPERATIONAL_ROLE_DEFS } from '@ogden/shared';

// ---------------------------------------------------------------------------
// Read-model
// ---------------------------------------------------------------------------

export interface TeamMemberRow {
  userId: string;
  /** Display name (member.displayName, else email local-part, else "Steward"). */
  name: string;
  /** Up to two uppercase initials derived from `name`. */
  initials: string;
  /** Functional team role, else domain relationship, else humanized app role. */
  roleLabel: string;
  /** True once the steward carries a functional team role (the c2 declaration). */
  complete: boolean;
  /**
   * Human labels for this member's operational roles (ADR 2026-06-24), in
   * stored order, with unknown/stale slugs dropped. Empty => the member keeps
   * the full default view. Display-only -- the panel renders chips, never gates.
   */
  operationalRoleLabels: string[];
}

export interface TeamLabourBar {
  userId: string;
  name: string;
  /** Weekly hours pledged (maintenance initial + ongoing). */
  hoursPerWeek: number;
  /** 0-100 bar width relative to the roster's busiest steward. */
  pct: number;
}

export type IntentReferenceKind = 'purpose' | 'nonNegotiable' | 'committed';

export interface IntentReferenceItem {
  kind: IntentReferenceKind;
  /** Static, Amanah-neutral label ("Purpose" / "Non-negotiable" / "Committed"). */
  label: string;
  /** Value drawn from the project's own SharedVision. */
  text: string;
}

export interface TeamRosterModel {
  members: TeamMemberRow[];
  /** Stewards on the roster (members.length). */
  rosterSize: number;
  /** Stewards carrying a functional team role. */
  constitutedCount: number;
  labour: TeamLabourBar[];
  /** Sum of weekly hours across the roster. */
  totalWeeklyHours: number;
  intent: IntentReferenceItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emailLocalPart(email: string): string {
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
}

function memberName(entry: StewardRosterEntry): string {
  const display = entry.member.displayName?.trim();
  if (display) return display;
  const local = emailLocalPart(entry.member.email).trim();
  if (local) return local;
  return 'Steward';
}

/** First + last word initial (or first two chars for a single word). */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
  const first = words[0];
  if (!first) return '?';
  const last = words[words.length - 1];
  if (words.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  const a = first[0] ?? '';
  const b = last[0] ?? '';
  return (a + b).toUpperCase();
}

/** "primary_steward" / "off-site" -> "Primary Steward" / "Off Site". */
function humanizeToken(token: string): string {
  return token
    .split(/[_\s-]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function roleLabelOf(entry: StewardRosterEntry): string {
  const teamRole = entry.profile.teamRole?.trim();
  if (teamRole) return teamRole;
  const relationship = entry.profile.relationship;
  if (relationship) return humanizeToken(relationship);
  return humanizeToken(entry.member.role);
}

/** Join a string-list into a comma-separated phrase, trimming blanks. */
function joinList(list: readonly string[] | undefined): string {
  if (!list) return '';
  return list.map((s) => s.trim()).filter((s) => s.length > 0).join(', ');
}

/** First non-empty (trimmed) candidate. */
function firstNonEmpty(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) return candidate.trim();
  }
  return '';
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

const INTENT_LABEL: Readonly<Record<IntentReferenceKind, string>> = {
  purpose: 'Purpose',
  nonNegotiable: 'Non-negotiable',
  committed: 'Committed',
};

export function selectTeamRoster(
  entries: readonly StewardRosterEntry[],
  sharedVision: SharedVision,
): TeamRosterModel {
  // ---- member rows ----
  const members: TeamMemberRow[] = entries.map((entry) => {
    const name = memberName(entry);
    const teamRole = entry.profile.teamRole?.trim();
    return {
      userId: entry.member.userId,
      name,
      initials: initialsOf(name),
      roleLabel: roleLabelOf(entry),
      complete: Boolean(teamRole && teamRole.length > 0),
      operationalRoleLabels: (entry.member.operationalRoles ?? [])
        .map((slug) => OPERATIONAL_ROLE_DEFS[slug]?.label)
        .filter((label): label is string => Boolean(label)),
    };
  });
  const constitutedCount = members.filter((m) => m.complete).length;

  // ---- labour bars (only stewards who have pledged any weekly hours) ----
  const pledged = entries
    .map((entry) => ({
      userId: entry.member.userId,
      name: memberName(entry),
      hoursPerWeek: totalHoursPerWeek(entry.profile),
    }))
    .filter((row) => row.hoursPerWeek > 0);
  const maxHours = pledged.reduce((max, row) => Math.max(max, row.hoursPerWeek), 0);
  const labour: TeamLabourBar[] = pledged.map((row) => ({
    ...row,
    pct: maxHours > 0 ? Math.round((row.hoursPerWeek / maxHours) * 100) : 0,
  }));
  const totalWeeklyHours = pledged.reduce((sum, row) => sum + row.hoursPerWeek, 0);

  // ---- intent reference (project's own SharedVision; Amanah-neutral labels) ----
  const purpose = firstNonEmpty(
    sharedVision.statement,
    joinList(sharedVision.experienceGoals),
    sharedVision.coreFunctions?.[0],
  );
  const nonNegotiable = firstNonEmpty(
    sharedVision.constraints?.[0],
    sharedVision.principles?.[0],
  );
  const committed = firstNonEmpty(
    joinList(sharedVision.coreFunctions),
    sharedVision.successMetrics?.[0],
  );
  const intent: IntentReferenceItem[] = [];
  if (purpose) intent.push({ kind: 'purpose', label: INTENT_LABEL.purpose, text: purpose });
  if (nonNegotiable)
    intent.push({ kind: 'nonNegotiable', label: INTENT_LABEL.nonNegotiable, text: nonNegotiable });
  if (committed)
    intent.push({ kind: 'committed', label: INTENT_LABEL.committed, text: committed });

  return {
    members,
    rosterSize: members.length,
    constitutedCount,
    labour,
    totalWeeklyHours,
    intent,
  };
}
