/**
 * EducationalAtlasDashboard — P3 entry point for §19 Educational & Interpretive Layer.
 *
 * Provides six explanation modes (ecology, water, livestock, agroforestry,
 * regeneration phases, spiritual symbolism) and a "Why here, not there?"
 * rationale index derived from placed features (structures, zones, utilities).
 *
 * P4 items (guided tour playback, voiceover export, slide mode) are stubbed.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useUtilityStore } from '../../../store/utilityStore.js';
import GatheringRetreatCard from '../../structures/GatheringRetreatCard.js';
import BuildOrderCard from '../../structures/BuildOrderCard.js';
import SpiritualCommunalCard from '../../structures/SpiritualCommunalCard.js';
import SitingWarningsCard from '../../rules/SitingWarningsCard.js';
import SpatialRelationshipsCard from '../../rules/SpatialRelationshipsCard.js';
import SetbackSlopeSolarCard from '../../rules/SetbackSlopeSolarCard.js';
import PrivacyCohortPlanningCard from '../../zones/PrivacyCohortPlanningCard.js';
import ContemplationZonesCard from '../../zones/ContemplationZonesCard.js';
import SignsInCreationPanel from '../../education/SignsInCreationPanel.js';
import EducationalRouteOverlaysCard from '../../education/EducationalRouteOverlaysCard.js';
import GuidedWalkthroughCard from '../../education/GuidedWalkthroughCard.js';
import WalkingTourScriptCard from '../../education/WalkingTourScriptCard.js';
import css from './EducationalAtlasDashboard.module.css';

interface EducationalAtlasProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

type ModeId = 'ecology' | 'water' | 'livestock' | 'agroforestry' | 'regeneration' | 'spiritual';

interface ExplanationMode {
  id: ModeId;
  label: string;
  icon: string;
  blurb: string;
  body: string;
}

const MODES: ExplanationMode[] = [
  {
    id: 'ecology',
    label: 'Ecology',
    icon: '\u{1F33F}',
    blurb: 'Habitat, biodiversity, and soil biology',
    body:
      'Every placed feature is read through its ecological role — does it support pollinators, close a nutrient loop, shelter wildlife corridors, or contribute to soil food webs? Use this mode to surface the living systems under each design choice.',
  },
  {
    id: 'water',
    label: 'Water',
    icon: '\u{1F4A7}',
    blurb: 'Catchment, flow, and retention logic',
    body:
      'Water explanations trace the path of every drop: from ridge to swale, swale to pond, pond to aquifer or crop bed. Rainfall budgets, detention potential, and greywater re-use are narrated here so the design reads as a watershed, not a map.',
  },
  {
    id: 'livestock',
    label: 'Livestock',
    icon: '\u{1F404}',
    blurb: 'Herd rotation and animal welfare rationale',
    body:
      'Why this paddock size? Why rotate in this order? Livestock mode interprets grazing plans through animal impact, rest periods, and feed availability — keeping the design legible to both the rancher and the land.',
  },
  {
    id: 'agroforestry',
    label: 'Agroforestry',
    icon: '\u{1F333}',
    blurb: 'Species layering and silvopasture patterns',
    body:
      'Tree guilds, alley crops, and nurse-plant relationships are explained here. Each planting decision is grounded in the ecological niche it fills, the canopy it contributes to, and the harvest timeline it promises.',
  },
  {
    id: 'regeneration',
    label: 'Regeneration Phases',
    icon: '\u{1F331}',
    blurb: 'Where the land is on its recovery arc',
    body:
      'Regeneration is a sequence, not a state. This mode overlays the pioneer → mid-successional → mature phase logic on the design so stewards can see what stage each zone is in and what the next interventions should be.',
  },
  {
    id: 'spiritual',
    label: 'Spiritual Symbolism',
    icon: '\u{2728}',
    blurb: 'Meaning, covenant, and signs in creation',
    body:
      'Every feature can carry meaning: a prayer space facing qiblah, a waterway as a sign, an orchard as an act of stewardship. Spiritual mode surfaces the intention behind each design choice for readers who want the why, not just the what.',
  },
];

export default function EducationalAtlasDashboard({ project, onSwitchToMap }: EducationalAtlasProps) {
  const [activeMode, setActiveMode] = useState<ModeId>('ecology');

  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );
  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id),
    [allZones, project.id],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );

  const totalFeatures = structures.length + zones.length + utilities.length;

  const active = MODES.find((m) => m.id === activeMode)!;

  return (
    <div className={css.page}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={css.header}>
        <div>
          <span className={css.eyebrow}>SECTION 19 · EDUCATIONAL &amp; INTERPRETIVE LAYER</span>
          <h1 className={css.title}>Educational Atlas</h1>
          <p className={css.desc}>
            Explain the design. Each placed feature can be read through six
            interpretive lenses — ecology, water, livestock, agroforestry, phases
            of regeneration, and spiritual meaning. This is the layer that turns
            a site plan into a story a steward, student, or funder can follow.
          </p>
        </div>
        <button className={css.mapBtn} onClick={onSwitchToMap}>
          Open Map View
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7H11M8 4L11 7L8 10" />
          </svg>
        </button>
      </div>

      {/* ── Mode selector ───────────────────────────────────────────── */}
      <div className={css.modes}>
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`${css.modeCard} ${m.id === activeMode ? css.modeCardActive : ''}`}
            onClick={() => setActiveMode(m.id)}
          >
            <span className={css.modeIcon}>{m.icon}</span>
            <span className={css.modeLabel}>{m.label}</span>
            <span className={css.modeBlurb}>{m.blurb}</span>
          </button>
        ))}
      </div>

      {/* ── Active explanation ──────────────────────────────────────── */}
      <div className={css.explainCard}>
        <div className={css.explainHead}>
          <span className={css.explainIcon}>{active.icon}</span>
          <h2 className={css.explainTitle}>{active.label} mode</h2>
        </div>
        <p className={css.explainBody}>{active.body}</p>
      </div>

      {/* ── Rationale index ─────────────────────────────────────────── */}
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Rationale Index ({totalFeatures})</h2>
          <span className={css.cardHint}>
            Placed features grouped by type. Click through to the map for "Why here?" detail.
          </span>
        </div>
        {totalFeatures === 0 ? (
          <div className={css.empty}>
            <p>No features placed yet. Add structures, zones, or utilities from the Map view.</p>
            <button className={css.emptyBtn} onClick={onSwitchToMap}>
              Open the map
            </button>
          </div>
        ) : (
          <div className={css.countGrid}>
            <RationaleTile label="Structures" count={structures.length} prompt="Why this building here?" />
            <RationaleTile label="Zones" count={zones.length} prompt="What does this zone protect or produce?" />
            <RationaleTile label="Utilities" count={utilities.length} prompt="Which system does this serve?" />
          </div>
        )}
      </div>

      {/* ── §9 Gathering & retreat capacity rollup ──────────────────── */}
      <GatheringRetreatCard projectId={project.id} />

      {/* ── §5 Wind / View / Privacy / Noise siting warnings ────────── */}
      <SitingWarningsCard project={project} />

      {/* ── §5 Walkability / Water / Zone relationship checks ───────── */}
      <SpatialRelationshipsCard project={project} />

      {/* ── §9 Setback / Slope / Solar orientation warnings ─────────── */}
      <SetbackSlopeSolarCard project={project} />

      {/* ── §9 Structure dependency & build-order rollup ────────────── */}
      <BuildOrderCard projectId={project.id} />

      {/* ── §8 Family privacy & men's cohort program-design rollup ──── */}
      <PrivacyCohortPlanningCard projectId={project.id} />

      {/* ── §9 Prayer / bathhouse / classroom rationale rollup ──────── */}
      <SpiritualCommunalCard project={project} />

      {/* ── §8 Quiet contemplation zone rollup ──────────────────────── */}
      <ContemplationZonesCard projectId={project.id} />

      {/* ── §19 Signs in Creation interpretive overlay ──────────────── */}
      <SignsInCreationPanel project={project} />

      {/* ── §19 Educational route narrative overlays ────────────────── */}
      <EducationalRouteOverlaysCard project={project} />

      {/* ── §19 Guided walkthrough — auto-grouped thematic tours ─────── */}
      <GuidedWalkthroughCard project={project} />

      {/* ── §19 Walking tour script — voiceable 5-stop narration ─────── */}
      <WalkingTourScriptCard project={project} />

      {/* ── Remaining tour-playback items (P4 stubs) ─────────────────── */}
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Tour Playback (Pending)</h2>
          <span className={css.cardHint}>Slide mode, quiz checkpoints.</span>
        </div>
        <div className={css.p4List}>
          <P4Row label="Slide presentation mode" desc="Present the design as a deck, one feature per slide." />
          <P4Row label="Training / quiz mode" desc="Checkpoint questions for students and operators." />
        </div>
      </div>

      {/* ── Footnote ────────────────────────────────────────────────── */}
      <div className={css.footnote}>
        Spec ref: §19 Educational &amp; Interpretive Layer. Core explanation modes
        are P3. Guided tour, voiceover export, and training modes are P4 (not yet
        shipped).
      </div>
    </div>
  );
}

function RationaleTile({ label, count, prompt }: { label: string; count: number; prompt: string }) {
  return (
    <div className={css.tile}>
      <span className={css.tileCount}>{count}</span>
      <span className={css.tileLabel}>{label}</span>
      <span className={css.tilePrompt}>{prompt}</span>
    </div>
  );
}

function P4Row({ label, desc }: { label: string; desc: string }) {
  return (
    <div className={css.p4Row}>
      <div className={css.p4Body}>
        <span className={css.p4Label}>{label}</span>
        <span className={css.p4Desc}>{desc}</span>
      </div>
      <span className={css.p4Badge}>P4</span>
    </div>
  );
}
