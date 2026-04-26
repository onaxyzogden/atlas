/**
 * §14 ServiceStewardshipFramingCard — explanatory framing panels that reframe
 * each enabled public-portal section in terms of *service to the visitor* and
 * *stewardship of the land*, not extractive marketing.
 *
 * The public portal can default to a brochure tone — "look what we built,
 * give us money." This card sits beside the portal section toggles and gives
 * the steward, per enabled section, three explicit framings:
 *
 *   - **Service framing**: what the section *offers* to the visitor (hospitality,
 *     knowledge, witness, invitation) rather than what it asks them to pay for.
 *   - **Stewardship framing**: what role the section plays in the steward's
 *     responsibility to the land (transparency, accountability, ongoing care).
 *   - **Reframe nudge**: a concrete prompt the steward can use to audit the
 *     copy in that section before publishing — "If you removed the donation
 *     link, would this section still earn its place?" style.
 *
 * No copy is auto-rewritten; this is a framing prompt, not a generator.
 *
 * Closes manifest §14 `service-stewardship-framing-panels` (MT) partial -> done.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePortalStore, type PortalSection } from '../../store/portalStore.js';
import css from './ServiceStewardshipFramingCard.module.css';

interface Props {
  project: LocalProject;
}

interface SectionFraming {
  label: string;
  service: string;
  stewardship: string;
  nudge: string;
}

const SECTION_FRAMING: Record<PortalSection, SectionFraming> = {
  hero: {
    label: 'Hero Banner',
    service:
      'Offers the visitor a clear, honest first impression of the place \u2014 what it is, where it is, and who tends it. Not a sales pitch.',
    stewardship:
      'The steward\u2019s public introduction. Read it as: "This is the land I\u2019ve been entrusted with, and here is how I\u2019m introducing it."',
    nudge:
      'Does the hero copy describe the land, or sell access to it? If a stranger read only this, would they understand what is being cared for?',
  },
  mission: {
    label: 'Mission Statement',
    service:
      'Tells the visitor what work is being attempted here \u2014 not as a brand promise, but as an honest statement of intent and limits.',
    stewardship:
      'The covenant in plain language. The steward names what the land is being stewarded *toward*, with enough specificity that they could be held to it.',
    nudge:
      'Could a neighbor in five years compare the land to this statement and judge whether it was honored? If not, the statement is too vague.',
  },
  map: {
    label: 'Interactive Map',
    service:
      'Offers spatial honesty \u2014 visitors can see the actual parcel, terrain, and placed features rather than a curated photo.',
    stewardship:
      'A transparency surface. The steward shows the land as it is, including the unfinished and the not-yet-planted, not just the photogenic corners.',
    nudge:
      'Does the map view masking hide problems, or just protect privacy? If a CSRA member asked "what aren\u2019t I being shown?", could you answer plainly?',
  },
  stageReveal: {
    label: 'Phase Reveal Story',
    service:
      'Offers the visitor a realistic timeline \u2014 what exists today, what comes next, and what is still aspirational. No "coming soon" without dates.',
    stewardship:
      'The steward\u2019s public commitment to a sequence. Each phase shown is a stake in the ground the steward will be measured against.',
    nudge:
      'If a phase slips by a year, will the public portal show that honestly, or quietly re-render the timeline? Decide now, before publishing.',
  },
  beforeAfter: {
    label: 'Before / After Slider',
    service:
      'Offers visual evidence of work done. Not a marketing carousel \u2014 the comparison should be a specific place at two specific dates.',
    stewardship:
      'A record of restoration. The steward documents what was received and what was returned, in the same frame.',
    nudge:
      'Are the "before" images chosen to flatter the "after"? Pick the most honest pair, not the most dramatic. Caption the dates plainly.',
  },
  guidedTour: {
    label: 'Guided Tour',
    service:
      'Offers the visitor a curated path through the place \u2014 hospitality in the old sense: walking a guest through the home so they understand it.',
    stewardship:
      'The steward chooses what to show in what order. That sequence is itself a teaching about how to *read* a regenerative site.',
    nudge:
      'Does the tour stop at things you are proud of, or things that teach? A good guided tour includes one stop where the steward says "this didn\u2019t work, here\u2019s why."',
  },
  narrative: {
    label: 'Narrative Sections',
    service:
      'Offers context the map cannot \u2014 history of the parcel, the watershed, the people, the practices. Slow reading for visitors who want to understand.',
    stewardship:
      'The land\u2019s story carried forward. The steward writes as one chapter in a longer text, not the final author.',
    nudge:
      'Does the narrative center the steward, or the land and the lineages \u2014 ecological, cultural, prophetic \u2014 that the project sits within?',
  },
  support: {
    label: 'Get Involved / Donate',
    service:
      'Offers the visitor a structured way to participate \u2014 funding, time, network, sounding-board \u2014 not a one-button extraction.',
    stewardship:
      'The steward names what the project actually needs, and what kinds of involvement fit. Saying "we don\u2019t need money right now, we need X" is a stewardship act.',
    nudge:
      'If you removed the donation link, would the rest of the portal still earn its place? If not, the portal is structured around the ask, not the work.',
  },
  education: {
    label: 'Educational Tour',
    service:
      'Offers the visitor knowledge they can take home and use \u2014 species, patterns, decisions \u2014 with enough detail to be genuinely transferable.',
    stewardship:
      'The steward returns knowledge to the commons. What was learned on this land is taught back, including what failed.',
    nudge:
      'Could a steward of a different parcel read this and apply something tomorrow? If not, the educational content is decorative rather than transferable.',
  },
};

const ALL_SECTIONS: PortalSection[] = [
  'hero',
  'mission',
  'map',
  'stageReveal',
  'beforeAfter',
  'guidedTour',
  'narrative',
  'support',
  'education',
];

export default function ServiceStewardshipFramingCard({ project }: Props) {
  const allConfigs = usePortalStore((s) => s.configs);
  const config = useMemo(
    () => allConfigs.find((c) => c.projectId === project.id),
    [allConfigs, project.id],
  );
  const [expanded, setExpanded] = useState<PortalSection | null>(null);

  const enabledSet = useMemo(
    () => new Set<PortalSection>(config?.sections ?? []),
    [config?.sections],
  );

  const enabledCount = enabledSet.size;
  const totalCount = ALL_SECTIONS.length;

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Service {'\u2014'} Stewardship Framing</h3>
          <p className={css.cardHint}>
            Per portal section, the steward-facing reframing in terms of <em>service</em> to the
            visitor and <em>stewardship</em> of the land. Use these to audit each section{'\u2019'}s
            copy before publishing.
          </p>
        </div>
        <span className={css.modeBadge}>FRAMING</span>
      </header>

      <div className={css.summaryRow}>
        <div className={css.summaryStat}>
          <div className={css.summaryValue}>
            {enabledCount}
            <span className={css.summaryDenom}>/{totalCount}</span>
          </div>
          <div className={css.summaryLabel}>Sections enabled</div>
        </div>
        <div className={css.summaryNote}>
          {enabledCount === 0
            ? 'No portal sections enabled yet \u2014 framings appear as you toggle sections on.'
            : enabledCount < 4
              ? 'Sparse portal. Each enabled section has more weight \u2014 audit them carefully.'
              : enabledCount === totalCount
                ? 'Full portal surface. Every section below should earn its place.'
                : 'Mixed surface. Walk each enabled section through the framing nudge before publishing.'}
        </div>
      </div>

      <ul className={css.sectionList}>
        {ALL_SECTIONS.map((key) => {
          const framing = SECTION_FRAMING[key];
          const isEnabled = enabledSet.has(key);
          const isOpen = expanded === key;
          return (
            <li
              key={key}
              className={`${css.sectionItem} ${isEnabled ? css.sectionEnabled : css.sectionDisabled}`}
            >
              <button
                type="button"
                className={css.sectionHeader}
                onClick={() => setExpanded(isOpen ? null : key)}
                aria-expanded={isOpen}
              >
                <span className={css.sectionHeaderLeft}>
                  <span className={css.sectionDot} aria-hidden="true" />
                  <span className={css.sectionName}>{framing.label}</span>
                  <span className={css.sectionStatus}>
                    {isEnabled ? 'ENABLED' : 'OFF'}
                  </span>
                </span>
                <span className={css.sectionChevron} aria-hidden="true">
                  {isOpen ? '\u2212' : '+'}
                </span>
              </button>

              {isOpen && (
                <div className={css.sectionDetail}>
                  <div className={css.framingGroup}>
                    <div className={css.framingLabel}>Service framing</div>
                    <p className={css.framingText}>{framing.service}</p>
                  </div>
                  <div className={css.framingGroup}>
                    <div className={css.framingLabel}>Stewardship framing</div>
                    <p className={css.framingText}>{framing.stewardship}</p>
                  </div>
                  <div className={css.framingNudge}>
                    <div className={css.framingLabel}>Audit nudge</div>
                    <p className={css.framingText}>{framing.nudge}</p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className={css.footnote}>
        These framings are not auto-applied to portal copy. They are prompts the steward walks
        each section through before publishing {'\u2014'} the public portal stays a hand-written
        surface, not a generated one.
      </p>
    </section>
  );
}
