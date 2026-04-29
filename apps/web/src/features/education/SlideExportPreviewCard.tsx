/**
 * §19 SlideExportPreviewCard — slide-presentation-mode preview deck.
 *
 * Renders the project as a slide deck — one slide per placed feature —
 * so a steward can preview exactly what a "Slide presentation mode"
 * export of the educational/interpretive layer would carry. Pairs with
 * the existing `WalkingTourScriptCard` (voiceover script) to close both
 * halves of the §19 leaf "Voiceover-ready script export, slide
 * presentation mode" at preview level.
 *
 * Each slide carries a category eyebrow, the feature name, a one-sentence
 * body blurb derived from feature properties, and a speaker-note prompt.
 * Copy-as-markdown emits the whole deck as a presenter-ready script.
 *
 * Pure derivation — reads structure / zone / utility stores filtered by
 * project. No new entities, no shared math, no map overlays.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useStructureStore,
  type Structure,
  type StructureType,
} from '../../store/structureStore.js';
import {
  useZoneStore,
  type LandZone,
  type ZoneCategory,
} from '../../store/zoneStore.js';
import {
  useUtilityStore,
  type Utility,
  type UtilityType,
} from '../../store/utilityStore.js';
import css from './SlideExportPreviewCard.module.css';

interface Props {
  project: LocalProject;
}

type SlideKind = 'structure' | 'zone' | 'utility';
type DeckStatus = 'ready' | 'partial' | 'thin' | 'empty';

interface Slide {
  kind: SlideKind;
  category: string;
  title: string;
  body: string;
  speakerNote: string;
}

const STRUCTURE_CATEGORY: Record<StructureType, string> = {
  cabin: 'Habitation',
  yurt: 'Habitation',
  earthship: 'Habitation',
  tent_glamping: 'Habitation',
  pavilion: 'Commons',
  fire_circle: 'Commons',
  lookout: 'Commons',
  prayer_space: 'Spiritual',
  bathhouse: 'Service',
  classroom: 'Education',
  greenhouse: 'Food production',
  barn: 'Livestock',
  animal_shelter: 'Livestock',
  workshop: 'Service',
  storage: 'Service',
  compost_station: 'Service',
  water_pump_house: 'Water',
  water_tank: 'Water',
  well: 'Water',
  solar_array: 'Energy',
};

const ZONE_CATEGORY_LABEL: Record<ZoneCategory, string> = {
  habitation: 'Habitation',
  food_production: 'Food production',
  livestock: 'Livestock',
  commons: 'Commons',
  spiritual: 'Spiritual',
  education: 'Education',
  retreat: 'Retreat',
  conservation: 'Conservation',
  water_retention: 'Water',
  infrastructure: 'Infrastructure',
  access: 'Access',
  buffer: 'Buffer',
  future_expansion: 'Future expansion',
};

const UTILITY_CATEGORY: Record<UtilityType, string> = {
  solar_panel: 'Energy',
  battery_room: 'Energy',
  generator: 'Energy',
  water_tank: 'Water',
  well_pump: 'Water',
  greywater: 'Water',
  septic: 'Water',
  rain_catchment: 'Water',
  lighting: 'Service',
  firewood_storage: 'Service',
  waste_sorting: 'Service',
  compost: 'Service',
  biochar: 'Service',
  tool_storage: 'Service',
  laundry_station: 'Service',
};

const STRUCTURE_PROMPT: Record<string, string> = {
  Habitation: 'Who stays here, and what season serves them best?',
  Commons: 'What gathering does this space invite?',
  Spiritual: 'What practice does this space hold?',
  Service: 'Which daily rhythm depends on this building?',
  Education: 'What can a visitor learn standing here?',
  'Food production': 'What does this structure grow or protect?',
  Livestock: 'Which animals live here, and how long each day?',
  Water: 'How does water arrive here, and where does it leave?',
  Energy: 'What energy flow does this enable?',
};

const ZONE_PROMPT: Record<string, string> = {
  Habitation: 'What home life does this zone support?',
  'Food production': 'What does this zone produce, and in which season?',
  Livestock: 'How are animals moved through this zone?',
  Commons: 'What gathering happens here?',
  Spiritual: 'What contemplative practice does this zone hold?',
  Education: 'What lessons can be staged here?',
  Retreat: 'What kind of retreat does this zone host?',
  Conservation: 'What habitat is protected here, and from what?',
  Water: 'How does this zone slow, spread, or sink water?',
  Infrastructure: 'Which systems pass through here?',
  Access: 'Who travels through, and how?',
  Buffer: 'What does this buffer protect, and from what?',
  'Future expansion': 'What is held in reserve for later phases?',
};

function structureBody(s: Structure): string {
  const cat = STRUCTURE_CATEGORY[s.type];
  const dimsM2 = Math.round(s.widthM * s.depthM);
  const stories = s.storiesCount && s.storiesCount > 1 ? `, ${s.storiesCount} stories` : '';
  return `${cat} structure · ${dimsM2} m² footprint${stories} · phase ${s.phase || 'unscheduled'}`;
}

function zoneBody(z: LandZone): string {
  const acres = z.areaM2 / 4046.86;
  const season = z.seasonality ? ` · ${z.seasonality}` : '';
  return `${ZONE_CATEGORY_LABEL[z.category]} zone · ${acres.toFixed(2)} acres${season}`;
}

function utilityBody(u: Utility): string {
  const cat = UTILITY_CATEGORY[u.type];
  const cap = u.capacityGal ? ` · ${u.capacityGal.toLocaleString()} gal` : '';
  const demand = u.demandKwhPerDay ? ` · ${u.demandKwhPerDay} kWh/day` : '';
  return `${cat} utility${cap}${demand} · phase ${u.phase || 'unscheduled'}`;
}

function deckStatus(total: number): DeckStatus {
  if (total === 0) return 'empty';
  if (total < 3) return 'thin';
  if (total < 8) return 'partial';
  return 'ready';
}

function statusClass(s: DeckStatus): string {
  if (s === 'ready') return css.statusReady ?? '';
  if (s === 'partial') return css.statusPartial ?? '';
  if (s === 'thin') return css.statusThin ?? '';
  return css.statusEmpty ?? '';
}

const STATUS_LABEL: Record<DeckStatus, string> = {
  ready: 'Export-ready',
  partial: 'Presentable',
  thin: 'Too thin',
  empty: 'Empty deck',
};

const SLIDE_SECONDS = 30;

export default function SlideExportPreviewCard({ project }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];

    for (const s of allStructures) {
      if (s.projectId !== project.id) continue;
      const cat = STRUCTURE_CATEGORY[s.type];
      out.push({
        kind: 'structure',
        category: cat,
        title: s.name || s.type.replace(/_/g, ' '),
        body: structureBody(s),
        speakerNote: STRUCTURE_PROMPT[cat] ?? 'How does this serve the design?',
      });
    }

    for (const z of allZones) {
      if (z.projectId !== project.id) continue;
      const cat = ZONE_CATEGORY_LABEL[z.category];
      out.push({
        kind: 'zone',
        category: cat,
        title: z.name || `${cat} zone`,
        body: zoneBody(z),
        speakerNote: ZONE_PROMPT[cat] ?? 'What does this zone hold?',
      });
    }

    for (const u of allUtilities) {
      if (u.projectId !== project.id) continue;
      const cat = UTILITY_CATEGORY[u.type];
      out.push({
        kind: 'utility',
        category: cat,
        title: u.name || u.type.replace(/_/g, ' '),
        body: utilityBody(u),
        speakerNote:
          cat === 'Water'
            ? 'How does water arrive here, and where does it leave?'
            : cat === 'Energy'
            ? 'What energy flow does this enable?'
            : 'Which daily rhythm depends on this?',
      });
    }

    return out;
  }, [allStructures, allZones, allUtilities, project.id]);

  const counts = useMemo(() => {
    let s = 0;
    let z = 0;
    let u = 0;
    for (const sl of slides) {
      if (sl.kind === 'structure') s += 1;
      else if (sl.kind === 'zone') z += 1;
      else u += 1;
    }
    return { structures: s, zones: z, utilities: u };
  }, [slides]);

  const total = slides.length;
  const status = deckStatus(total);
  const runtimeMin = Math.max(1, Math.round((total * SLIDE_SECONDS) / 60));
  const visible = showAll ? slides : slides.slice(0, 6);

  const handleCopy = () => {
    const md = [
      `# ${project.name} — Slide deck preview`,
      '',
      `_${total} slides · ~${runtimeMin} min at 30 s/slide_`,
      '',
      ...slides.flatMap((sl, i) => [
        `## Slide ${i + 1}: ${sl.title}`,
        `**${sl.category}** — ${sl.body}`,
        '',
        `> Speaker note: ${sl.speakerNote}`,
        '',
      ]),
    ].join('\n');
    void navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <section className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Slide export preview</h3>
          <p className={css.hint}>
            One slide per placed feature — structures, zones, utilities. Pairs with the walking-tour voiceover
            script to preview both halves of a §19 slide-presentation-mode export.
          </p>
        </div>
        <span className={css.modeBadge}>PREVIEW</span>
      </div>

      <div className={css.headlineRow}>
        <div className={css.headline}>
          <div className={css.headlineValue}>{total}</div>
          <div className={css.headlineLabel}>Slides</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>{counts.structures}/{counts.zones}/{counts.utilities}</div>
          <div className={css.headlineLabel}>Str/Zon/Util</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>~{runtimeMin}</div>
          <div className={css.headlineLabel}>Min runtime</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>{SLIDE_SECONDS}s</div>
          <div className={css.headlineLabel}>Per slide</div>
        </div>
      </div>

      <div className={`${css.verdictBanner} ${statusClass(status)}`}>
        <div className={css.verdictTitle}>
          {status === 'ready' && `Deck has ${total} slides — enough for a full guided presentation.`}
          {status === 'partial' && `Deck has ${total} slides — presentable, but adding more features deepens the story.`}
          {status === 'thin' && `Deck has only ${total} slide${total === 1 ? '' : 's'} — below the 3-slide presentable floor.`}
          {status === 'empty' && 'No features placed yet — no slides to preview.'}
        </div>
        <div className={css.verdictNote}>
          Status: <strong>{STATUS_LABEL[status]}</strong>. Each slide draws title, category, and body from the feature's stored properties; speaker notes are derived from category prompts, not free-text.
        </div>
      </div>

      {total > 0 && (
        <>
          <div className={css.deckHead}>
            <span className={css.deckHeadTitle}>Deck preview</span>
            <button type="button" className={css.copyBtn} onClick={handleCopy} disabled={total === 0}>
              {copied ? 'Copied' : 'Copy as markdown'}
            </button>
          </div>

          <ol className={css.slideList}>
            {visible.map((sl, i) => (
              <li key={i} className={css.slide}>
                <div className={css.slideHead}>
                  <span className={css.slideNumber}>Slide {i + 1}</span>
                  <span className={`${css.kindPill} ${css[`kind_${sl.kind}`] ?? ''}`}>{sl.kind}</span>
                </div>
                <div className={css.slideCategory}>{sl.category}</div>
                <div className={css.slideTitle}>{sl.title}</div>
                <div className={css.slideBody}>{sl.body}</div>
                <div className={css.slideNote}>
                  <span className={css.slideNoteLabel}>Speaker note</span>
                  <span className={css.slideNoteText}>{sl.speakerNote}</span>
                </div>
              </li>
            ))}
          </ol>

          {total > 6 && (
            <button type="button" className={css.showAllBtn} onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Show first 6 slides` : `Show all ${total} slides`}
            </button>
          )}
        </>
      )}

      <p className={css.assumption}>
        Slide bodies derive from each feature's stored fields (type, footprint dimensions, area, capacity, phase). Runtime estimate fixes 30 s/slide. Speaker notes are category prompts — not steward-authored narrative. The walking-tour voiceover script lives separately on <code>WalkingTourScriptCard</code>.
      </p>
    </section>
  );
}
