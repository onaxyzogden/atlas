/**
 * §3 OwnerStakeholderRosterCard — read-back of intake `ownerNotes` plus
 * a roster cross-reference for the project's stakeholder coverage.
 *
 * Fourth §3 intake-text sibling (after FieldObservationsLegalCard,
 * RestrictionsCovenantsCard, ZoningAccessUtilityCard). Frames the
 * single `ownerNotes` free-text field as the *people picture* — who
 * holds title, who decides, who lives next door, who carries
 * stewardship weight. Word count + topical-cue detection drives a
 * single-row tier (detailed / outline / sparse / empty), with promotion
 * from outline → detailed when a short note hits 2+ topical cues.
 *
 * Below the field, a small cross-reference panel rolls collaboration
 * `useMemberStore` members by role (owner / designer / reviewer /
 * viewer) — a thin sanity check that the people captured in narrative
 * form line up with the people actually invited to the project. The
 * fuller team-management UI lives in the Collaboration panel; this is
 * just an at-a-glance sibling for the §3 intake-text trilogy.
 *
 * Pure presentation — reads `project` and the current `useMemberStore`
 * snapshot only. No fetches, no entity writes, no map overlays.
 *
 * Spec: §3 owner-stakeholder-notes (featureManifest line 87).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useMemberStore } from '../../store/memberStore.js';
import type { ProjectRole } from '@ogden/shared';
import css from './OwnerStakeholderRosterCard.module.css';

interface Props {
  project: LocalProject;
}

/* ── Tunables ────────────────────────────────────────────────────── */

const DETAILED_WORDS = 45;
const OUTLINE_WORDS = 12;
const PREVIEW_CHAR_CAP = 320;
const PROMOTE_CUE_THRESHOLD = 2;

/* Cue patterns scoped to the owner / stakeholder narrative. Hits
 * surface as chips and contribute to topical density for tier
 * promotion. */
const OWNER_CUES: { label: string; pattern: RegExp }[] = [
  { label: 'Previous owner', pattern: /\b(previous|prior|former|past)\s+(owner|landlord|steward|tenant)\b/i },
  { label: 'Family lineage', pattern: /\b(family|generation|inheritance|inherited|legacy|heir|heirs|estate)\b/i },
  { label: 'Decision maker', pattern: /\b(decision[- ]?maker|principal|managing partner|trustee|executor|signing authority)\b/i },
  { label: 'Neighbour relations', pattern: /\b(neighbour|neighbor|adjacent|abutter|adjoining|next[- ]door)\b/i },
  { label: 'Stewardship role', pattern: /\b(steward|stewardship|caretaker|caretaking|guardian|kheilfah|khalifah)\b/i },
  { label: 'Tenancy / lease', pattern: /\b(tenant|tenancy|lease|leasehold|renter|sharecrop)\b/i },
  { label: 'Indigenous / treaty', pattern: /\b(indigenous|first[- ]nation|m[ée]tis|treaty|traditional territory|land back)\b/i },
  { label: 'Local relationships', pattern: /\b(community|cooperative|co[- ]op|local council|township|parish|municipality)\b/i },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function wordCount(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + '…';
}

type Tier = 'detailed' | 'outline' | 'sparse' | 'empty';

function tierFor(text: string, cueHits: number): Tier {
  const w = wordCount(text);
  if (w === 0) return 'empty';
  if (w >= DETAILED_WORDS) return 'detailed';
  if (w >= OUTLINE_WORDS) {
    return cueHits >= PROMOTE_CUE_THRESHOLD ? 'detailed' : 'outline';
  }
  return cueHits >= PROMOTE_CUE_THRESHOLD ? 'outline' : 'sparse';
}

function detectCues(text: string, cues: { label: string; pattern: RegExp }[]): string[] {
  if (!text) return [];
  return cues.filter((c) => c.pattern.test(text)).map((c) => c.label);
}

const TIER_LABEL: Record<Tier, string> = {
  detailed: 'Detailed',
  outline: 'Outline',
  sparse: 'Sparse',
  empty: 'Empty',
};

const TIER_CLS: Record<Tier, string> = {
  detailed: css.tierDetailed!,
  outline: css.tierOutline!,
  sparse: css.tierSparse!,
  empty: css.tierEmpty!,
};

/* Verdict — combines narrative tier with whether *anyone* is on the
 * roster. Roster coverage is a soft signal: fuller team-management UI
 * lives in the Collaboration panel, so an empty roster here is just a
 * "consider inviting your collaborators" nudge, not a block. */

type Verdict = 'unknown' | 'block' | 'work' | 'done';

const VERDICT_CFG: Record<Verdict, { label: string; cls: string; blurb: string }> = {
  done:    { label: 'Documented',    cls: css.verdictDone!,    blurb: 'Owner narrative detailed and roster populated' },
  work:    { label: 'Needs depth',   cls: css.verdictWork!,    blurb: 'Outline captured — fill in cues or invite the team' },
  block:   { label: 'Sparse',        cls: css.verdictBlock!,   blurb: 'Only a sentence or two — expand before site work' },
  unknown: { label: 'Not recorded',  cls: css.verdictUnknown!, blurb: 'No owner / stakeholder notes at intake' },
};

/* Project-type criticality framing. Drives a small "expected role
 * coverage" hint — e.g. an educational farm benefits from at least one
 * reviewer, a retreat centre similarly. Homestead minimum is just an
 * owner. */
const TYPE_EXPECTATION: Record<string, { label: string; expectsReviewer: boolean; expectsDesigner: boolean }> = {
  regenerative_farm: { label: 'Regenerative farm',  expectsReviewer: false, expectsDesigner: true },
  retreat_center:    { label: 'Retreat centre',     expectsReviewer: true,  expectsDesigner: true },
  homestead:         { label: 'Homestead',          expectsReviewer: false, expectsDesigner: false },
  educational_farm:  { label: 'Educational farm',   expectsReviewer: true,  expectsDesigner: true },
  conservation:      { label: 'Conservation',       expectsReviewer: true,  expectsDesigner: false },
  multi_enterprise:  { label: 'Multi-enterprise',   expectsReviewer: true,  expectsDesigner: true },
  moontrance:        { label: 'OGDEN template',     expectsReviewer: false, expectsDesigner: true },
};

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Owner',
  designer: 'Designer',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

/* ── Component ───────────────────────────────────────────────────── */

export default function OwnerStakeholderRosterCard({ project }: Props) {
  const members = useMemberStore((s) => s.members);
  const isLoading = useMemberStore((s) => s.isLoading);

  const owner = (project.ownerNotes ?? '').trim();
  const cues = useMemo(() => detectCues(owner, OWNER_CUES), [owner]);
  const tier: Tier = useMemo(() => tierFor(owner, cues.length), [owner, cues.length]);

  const projectId = project.serverId ?? project.id;
  const rosterMembers = useMemo(
    () => members,
    // The store is per-app; in practice it tracks the active project, so
    // we accept the current snapshot. projectId is referenced so the memo
    // re-runs if the user switches projects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, projectId],
  );

  const roleCounts = useMemo(() => {
    const c: Record<ProjectRole, number> = { owner: 0, designer: 0, reviewer: 0, viewer: 0 };
    for (const m of rosterMembers) c[m.role] += 1;
    return c;
  }, [rosterMembers]);

  const totalMembers = rosterMembers.length;
  const expectation = TYPE_EXPECTATION[project.projectType ?? ''] ?? null;

  const verdict: Verdict = useMemo(() => {
    if (tier === 'empty') return 'unknown';
    if (tier === 'sparse') return 'block';
    if (tier === 'outline') return 'work';
    // detailed
    if (totalMembers === 0) return 'work';
    if (expectation?.expectsReviewer && roleCounts.reviewer === 0) return 'work';
    if (expectation?.expectsDesigner && roleCounts.designer === 0) return 'work';
    return 'done';
  }, [tier, totalMembers, expectation, roleCounts]);

  const w = wordCount(owner);

  return (
    <section className={css.card!} aria-labelledby="owner-stakeholder-title">
      <header className={css.cardHead!}>
        <div>
          <h3 id="owner-stakeholder-title" className={css.cardTitle!}>
            Owner & stakeholder notes
            <span className={css.badge!}>INTAKE</span>
          </h3>
          <p className={css.cardHint!}>
            The people picture from intake — title-holders, decision-makers,
            neighbours, and stewardship roles captured in free-text, plus the
            collaboration roster of who&apos;s actually been invited to the
            project. Word count, topical cue chips, and a verdict band help
            judge whether more depth is needed before site work.
          </p>
        </div>
        <div className={`${css.verdictPill!} ${VERDICT_CFG[verdict].cls}`}>
          <span className={css.verdictLabel!}>{VERDICT_CFG[verdict].label}</span>
          <span className={css.verdictBlurb!}>{VERDICT_CFG[verdict].blurb}</span>
        </div>
      </header>

      <div className={css.field!}>
        <div className={css.fieldHead!}>
          <span className={css.fieldLabel!}>Owner / stakeholder narrative</span>
          <span className={`${css.tierPill!} ${TIER_CLS[tier]}`}>{TIER_LABEL[tier]}</span>
          <span className={css.fieldMeta!}>
            {w} word{w === 1 ? '' : 's'}
            {cues.length > 0 ? ` · ${cues.length} cue${cues.length === 1 ? '' : 's'}` : ''}
          </span>
        </div>
        <p className={css.fieldHintRow!}>
          Title history, decision-makers, family lineage, neighbour relations,
          stewardship roles, tenancies, treaty / indigenous context.
        </p>
        {owner ? (
          <p className={css.fieldText!}>{clip(owner, PREVIEW_CHAR_CAP)}</p>
        ) : (
          <p className={css.fieldEmpty!}>Not recorded at intake.</p>
        )}
        {cues.length > 0 && (
          <div className={css.cueRow!}>
            <span className={css.cueLabel!}>Topical cues:</span>
            {cues.map((c) => (
              <span key={c} className={`${css.cueChip!} ${css.cueChipPass!}`}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={css.support!}>
        <div className={css.supportHead!}>Collaboration roster</div>
        <div className={css.supportGrid!}>
          {(['owner', 'designer', 'reviewer', 'viewer'] as ProjectRole[]).map((role) => {
            const count = roleCounts[role];
            const expected =
              (role === 'reviewer' && expectation?.expectsReviewer) ||
              (role === 'designer' && expectation?.expectsDesigner) ||
              role === 'owner';
            const cls =
              count > 0
                ? css.supportCellFilled!
                : expected
                  ? css.supportCellExpected!
                  : css.supportCellEmpty!;
            return (
              <div key={role} className={`${css.supportCell!} ${cls}`}>
                <span className={css.supportLabel!}>{ROLE_LABEL[role]}</span>
                <span className={css.supportValue!}>
                  {count}
                  {expected && count === 0 ? ' · expected' : ''}
                </span>
              </div>
            );
          })}
        </div>
        {isLoading && totalMembers === 0 && (
          <p className={css.supportNote!}>Roster loading…</p>
        )}
        {!isLoading && totalMembers === 0 && (
          <p className={css.supportNote!}>
            No members loaded — see Collaboration panel to invite your team.
          </p>
        )}
      </div>

      <p className={css.footnote!}>
        <em>Verdict logic:</em> tier &lt; outline blocks; outline or empty
        roster needs depth; detailed narrative + populated roster passes —
        with role-coverage hints from project type
        {expectation ? ` (${expectation.label})` : ''}. Tier promotes from
        outline → detailed when a short note hits {PROMOTE_CUE_THRESHOLD}+
        topical cues.
      </p>
    </section>
  );
}
