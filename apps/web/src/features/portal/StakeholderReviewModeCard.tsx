/**
 * §20 StakeholderReviewModeCard — simplified stakeholder view + community
 * review mode preview and scaffold.
 *
 * The §20 collaboration cluster carries three distinct sharing surfaces:
 *
 *   - the *public portal*  (anonymous, no-account, mass-broadcast view)
 *     handled by `PortalConfigPanel` + `PublicPortalPage`
 *   - the *internal workspace* (full state for stewards and crew)
 *   - the *stakeholder review mode* — narrower than the public portal in
 *     audience (a curated list of CSRA members / donors / neighbors / a
 *     review board) and broader in surface (can show phasing, acreage,
 *     and headline metrics that the public view rounds or hides), but
 *     still strictly view-only and structured around inviting *feedback*
 *     rather than passive consumption.
 *
 * `InternalVsPublicViewCard` already covers the first two boundaries.
 * This card covers the third: it renders a **review pack preview** the
 * steward can mentally walk through before sending the share link to a
 * reviewer, plus a deterministic question scaffold the steward can paste
 * into the email or print on a one-pager so the reviewer knows what kind
 * of feedback the project actually wants. No comment-thread plumbing
 * (that's `team-activity-feed` / `suggest-edit-markup` — both still
 * planned and require auth/RBAC); this card is the framing layer that
 * sits one level above those, and that explicitly does not require a
 * server round-trip to be useful today.
 *
 * Closes manifest §20 `stakeholder-community-review-mode` (P3) planned -> done.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { usePortalStore } from '../../store/portalStore.js';
import css from './StakeholderReviewModeCard.module.css';

interface Props {
  project: LocalProject;
}

interface ReviewPrompt {
  id: string;
  category: 'vision' | 'phasing' | 'concerns' | 'fit' | 'support';
  prompt: string;
  rationale: string;
}

// Six deterministic review prompts that stay constant across projects so
// reviewers can answer the same questions for any project they're shown.
// Ordering matters — vision first (warm-up), concerns and fit in the
// middle (the substantive ask), support last (the call to action).
const REVIEW_PROMPTS: ReviewPrompt[] = [
  {
    id: 'vision-resonance',
    category: 'vision',
    prompt: 'Reading the vision statement, what about it resonates with you, and what feels unclear?',
    rationale: 'Catches vision-statement gaps that the steward has gone blind to from re-reading.',
  },
  {
    id: 'phasing-pace',
    category: 'phasing',
    prompt: 'Looking at the phase sequence, does the pace feel right \u2014 too aggressive, too cautious, or about right?',
    rationale: 'Reviewer pacing intuition is uncorrelated with the steward\u2019s; useful signal.',
  },
  {
    id: 'concern-priority',
    category: 'concerns',
    prompt: 'Of the planned elements, which one would you want to see done *first*, and which one feels like it could wait?',
    rationale: 'Surfaces priority disagreements without forcing the reviewer into a budget conversation.',
  },
  {
    id: 'missing-element',
    category: 'concerns',
    prompt: 'Is there anything important you\u2019d expect to see on a project like this that\u2019s missing from the plan?',
    rationale: 'The reviewer\u2019s blind-spot question \u2014 catches gaps even careful stewards miss.',
  },
  {
    id: 'community-fit',
    category: 'fit',
    prompt: 'How does this project sit with the surrounding community / neighbors / bioregion as you understand it?',
    rationale: 'Specific to community-supported regenerative-ag framing; tests local-fit assumptions.',
  },
  {
    id: 'support-form',
    category: 'support',
    prompt: 'If you wanted to support this project, what form would feel most natural \u2014 funding, time, network introductions, or staying as a sounding board?',
    rationale: 'Replaces the vague \u201cdo you want to help?\u201d with a structured menu the reviewer can actually answer.',
  },
];

// Three audience archetypes the steward might be sending the review pack
// to. Affects the framing copy and the "why this view" line.
type Audience = 'csra' | 'neighbor' | 'board';

const AUDIENCES: Record<Audience, { label: string; framing: string; note: string }> = {
  csra: {
    label: 'CSRA member',
    framing: 'Community-Supported Regenerative-Ag member who has financial standing in the project.',
    note: 'Shows phasing, acreage, and headline metrics. Hides AI drafts and steward-only working notes.',
  },
  neighbor: {
    label: 'Neighbor / bioregion',
    framing: 'Adjacent landholder or bioregional ally without financial standing.',
    note: 'Shows vision, phasing, and aggregate entity counts. Hides exact metrics, acreage, and parcel detail.',
  },
  board: {
    label: 'Review board',
    framing: 'Advisory board, donor circle, or external review panel evaluating the plan.',
    note: 'Shows everything in the public portal plus phasing rollups and design-rule diagnostics. Hides drafts.',
  },
};

export default function StakeholderReviewModeCard({ project }: Props) {
  const portalConfig = usePortalStore((s) => s.getConfig(project.id));
  const phases = usePhaseStore(
    (s) =>
      s.phases
        .filter((p) => p.projectId === project.id)
        .slice()
        .sort((a, b) => a.order - b.order),
  );
  const structuresLen = useStructureStore(
    (s) => s.structures.filter((st) => st.projectId === project.id).length,
  );
  const utilitiesLen = useUtilityStore(
    (s) => s.utilities.filter((u) => u.projectId === project.id).length,
  );
  const cropsLen = useCropStore(
    (s) => s.cropAreas.filter((c) => c.projectId === project.id).length,
  );
  const paddocksLen = useLivestockStore(
    (s) => s.paddocks.filter((p) => p.projectId === project.id).length,
  );
  const zonesLen = useZoneStore(
    (s) => s.zones.filter((z) => z.projectId === project.id).length,
  );

  const [audience, setAudience] = useState<Audience>('csra');
  const [copied, setCopied] = useState(false);

  const totalEntities = structuresLen + utilitiesLen + cropsLen + paddocksLen + zonesLen;
  const completedPhases = phases.filter((p) => p.completed).length;

  const heroMetrics = useMemo(() => {
    const out: { label: string; value: string }[] = [];
    if (project.acreage != null && project.acreage > 0) {
      // Round to nearest 5 ac for stakeholder framing (matches public portal redaction).
      const rounded = Math.round(project.acreage / 5) * 5;
      out.push({ label: 'Property size', value: `~${rounded} ac` });
    } else {
      out.push({ label: 'Property size', value: '\u2014 (not yet entered)' });
    }
    out.push({
      label: 'Planned elements',
      value: totalEntities > 0 ? `${totalEntities} placed` : 'Site planning in progress',
    });
    out.push({
      label: 'Phasing',
      value: phases.length > 0 ? `${phases.length} phases \u2014 ${completedPhases} complete` : 'No phases yet',
    });
    return out;
  }, [project.acreage, totalEntities, phases.length, completedPhases]);

  const visionLine =
    project.visionStatement && project.visionStatement.trim().length > 0
      ? project.visionStatement.trim()
      : 'No vision statement yet \u2014 add one on the project intake page before sending to a reviewer.';

  // Build a copy-pasteable email body the steward can drop into a message
  // to the reviewer. Deterministic — same project state and same audience
  // always produce the same body.
  const emailBody = useMemo(() => {
    const aud = AUDIENCES[audience];
    const lines: string[] = [];
    lines.push('Hi \u2014');
    lines.push('');
    lines.push(`I\u2019m sharing the current plan for ${project.name} and would value your eyes on it as a ${aud.label.toLowerCase()}.`);
    lines.push('');
    lines.push('Vision in one sentence:');
    lines.push(`  ${visionLine}`);
    lines.push('');
    lines.push(`At a glance: ${heroMetrics.map((m) => `${m.label} \u2014 ${m.value}`).join('; ')}.`);
    lines.push('');
    lines.push('I\u2019m not asking for a thumbs-up or thumbs-down. I\u2019m asking for honest feedback on these six prompts \u2014 short answers are fine:');
    lines.push('');
    REVIEW_PROMPTS.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.prompt}`);
    });
    lines.push('');
    lines.push('The portal link below is view-only and doesn\u2019t require an account.');
    return lines.join('\n');
  }, [audience, project.name, visionLine, heroMetrics]);

  const handleCopyEmail = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(emailBody).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        // ignore copy failures
      },
    );
  };

  const audienceCfg = AUDIENCES[audience];

  return (
    <section className={css.card} aria-label="Stakeholder review mode">
      <header className={css.head}>
        <div>
          <h3 className={css.title}>Stakeholder review mode</h3>
          <p className={css.hint}>
            A curated review-pack framing for sending the share link to a
            specific reviewer. Sits between the public portal and the
            internal workspace: shows vision, phasing, and headline metrics
            without exposing internal notes, AI drafts, or working
            financials, and pairs the link with a six-prompt feedback
            scaffold so reviewers know what kind of input the project
            actually wants.
          </p>
        </div>
        <span className={css.modeBadge}>Review pack</span>
      </header>

      <div className={css.audienceTabs}>
        {(Object.keys(AUDIENCES) as Audience[]).map((aud) => (
          <button
            key={aud}
            type="button"
            className={`${css.audienceTab} ${audience === aud ? css.audienceTabActive : ''}`}
            onClick={() => setAudience(aud)}
          >
            <span className={css.audienceTabLabel}>{AUDIENCES[aud].label}</span>
            <span className={css.audienceTabSub}>{AUDIENCES[aud].framing}</span>
          </button>
        ))}
      </div>

      <div className={css.audienceNote}>
        <span className={css.audienceNoteLabel}>What this audience sees:</span>
        <span className={css.audienceNoteText}>{audienceCfg.note}</span>
      </div>

      <div className={css.previewBlock}>
        <span className={css.previewLabel}>Preview \u2014 review pack as the reviewer sees it</span>
        <div className={css.previewContent}>
          <div className={css.previewProjectName}>
            {portalConfig?.heroTitle?.trim() || project.name}
          </div>
          {portalConfig?.heroSubtitle?.trim() && (
            <div className={css.previewSubtitle}>{portalConfig.heroSubtitle.trim()}</div>
          )}
          <div className={css.previewVision}>{visionLine}</div>

          <div className={css.previewMetrics}>
            {heroMetrics.map((m) => (
              <div className={css.previewMetric} key={m.label}>
                <span className={css.previewMetricValue}>{m.value}</span>
                <span className={css.previewMetricLabel}>{m.label}</span>
              </div>
            ))}
          </div>

          {phases.length > 0 && (
            <div className={css.previewPhases}>
              <span className={css.previewPhasesLabel}>Phasing arc</span>
              <ol className={css.previewPhasesList}>
                {phases.map((p) => (
                  <li
                    key={p.id}
                    className={`${css.previewPhase} ${p.completed ? css.previewPhaseDone : ''}`}
                  >
                    <span className={css.previewPhaseDot} style={{ background: p.color }} />
                    <span className={css.previewPhaseName}>{p.name}</span>
                    <span className={css.previewPhaseTime}>{p.timeframe || '\u2014'}</span>
                    {p.completed && <span className={css.previewPhaseTag}>Done</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      <div className={css.promptsBlock}>
        <span className={css.promptsLabel}>Six-question feedback scaffold</span>
        <ul className={css.promptsList}>
          {REVIEW_PROMPTS.map((p, i) => (
            <li key={p.id} className={`${css.promptRow} ${css[`promptCat_${p.category}`] ?? ''}`}>
              <span className={css.promptIndex}>{i + 1}</span>
              <div className={css.promptBody}>
                <span className={css.promptText}>{p.prompt}</span>
                <span className={css.promptRationale}>{p.rationale}</span>
              </div>
              <span className={`${css.promptCat} ${css[`promptCatTag_${p.category}`] ?? ''}`}>
                {p.category}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={css.emailBlock}>
        <div className={css.emailHead}>
          <span className={css.emailLabel}>Copy-pasteable email body</span>
          <button
            type="button"
            className={css.copyBtn}
            onClick={handleCopyEmail}
            disabled={typeof navigator === 'undefined' || !navigator.clipboard}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className={css.emailBody}>{emailBody}</pre>
      </div>

      <div className={css.calloutBlock}>
        <span className={css.calloutLabel}>What stakeholder review mode is *not*:</span>
        <ul className={css.calloutList}>
          <li>Not a comment thread \u2014 reviewer feedback returns over email or phone, not in-app (that&apos;s <em>team-activity-feed</em>, still planned).</li>
          <li>Not a substitute for the published public portal \u2014 the portal handles broadcast; this card handles directed asks.</li>
          <li>Not edit access \u2014 reviewers can&apos;t modify the plan; the share link remains strictly view-only.</li>
          <li>Not anonymous \u2014 the steward chooses each reviewer by hand and tracks responses outside the app.</li>
        </ul>
      </div>

      <p className={css.footnote}>
        <em>How this card frames a review:</em> deterministic. Audience tabs
        change the &ldquo;what this audience sees&rdquo; copy and the
        leading line of the email body, but the six-prompt scaffold is
        constant across audiences and projects so reviewers can compare
        answers across multiple projects they&apos;re asked to weigh in on.
        The actual share link sits one card up
        (&ldquo;view-only-shareable-link&rdquo;); send the link plus this
        email body together.
      </p>
    </section>
  );
}
