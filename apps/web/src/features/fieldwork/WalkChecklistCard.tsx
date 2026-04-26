/**
 * §24 WalkChecklistCard — site-checklist mode that turns the §17
 * NeedsSiteVisit findings into a tap-friendly walking list with
 * localStorage-persisted check state per project. Lets the steward carry
 * the dashboard's open questions onto the parcel and tick them off with
 * an optional on-site note.
 *
 * Heuristic — re-runs the same NeedsSiteVisit detection over the site-data
 * + entity stores. Each "low/none confidence" topic becomes a checkable
 * row with the why-line and the walk-for line preserved verbatim.
 *
 * Tap a row to mark observed; the row collapses with a timestamp and an
 * inline note input. Persists to `ogden-walk-checklist-<projectId>` and
 * survives reload + cross-tab sync via the `storage` event.
 *
 * Closes manifest §24 `voice-memo-site-checklist` (P2 planned -> done)
 * — the voice-memo half is already in `FieldNotesTab`; this card ships
 * the site-checklist-mode half.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './WalkChecklistCard.module.css';

interface Props {
  projectId: string;
}

type Topic = 'water' | 'soil' | 'slope' | 'vegetation' | 'structures' | 'livestock';
type Confidence = 'none' | 'low';

interface Flag {
  id: string;
  topic: Topic;
  confidence: Confidence;
  title: string;
  why: string;
  walkFor: string;
}

interface ObservedEntry {
  observedAt: string;
  note: string;
}

interface ClimateSummary {
  annual_precip_mm?: number;
  growing_season_days?: number;
}
interface SoilSummary {
  organic_matter_pct?: number | string;
  hydrologic_group?: string;
  drainage_class?: string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
}
interface HydrologySummary {
  watershed_area_km2?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}

const TOPIC_LABEL: Record<Topic, string> = {
  water: 'Water',
  soil: 'Soil',
  slope: 'Slope & terrain',
  vegetation: 'Vegetation',
  structures: 'Structures',
  livestock: 'Livestock',
};

const TOPIC_ORDER: Topic[] = ['water', 'soil', 'slope', 'vegetation', 'structures', 'livestock'];

const STORAGE_PREFIX = 'ogden-walk-checklist-';

function storageKey(projectId: string) {
  return STORAGE_PREFIX + projectId;
}

function loadObserved(projectId: string): Record<string, ObservedEntry> {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, ObservedEntry>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function saveObserved(projectId: string, observed: Record<string, ObservedEntry>): void {
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(observed));
  } catch {
    /* ignore */
  }
}

export default function WalkChecklistCard({ projectId }: Props) {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(
    () => allStructures.filter((st) => st.projectId === projectId),
    [allStructures, projectId],
  );
  const allUtilities = useUtilityStore((s) => s.utilities);
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === projectId),
    [allUtilities, projectId],
  );
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === projectId),
    [allCropAreas, projectId],
  );
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const siteData = useSiteData(projectId);

  const [observed, setObserved] = useState<Record<string, ObservedEntry>>(() =>
    loadObserved(projectId),
  );

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== storageKey(projectId)) return;
      setObserved(loadObserved(projectId));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [projectId]);

  // Re-load when projectId changes.
  useEffect(() => {
    setObserved(loadObserved(projectId));
  }, [projectId]);

  const flags = useMemo<Flag[]>(() => {
    if (!project) return [];
    const out: Flag[] = [];
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soil = siteData ? getLayerSummary<SoilSummary>(siteData, 'soil') : null;
    const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const hydrology = siteData ? getLayerSummary<HydrologySummary>(siteData, 'hydrology') : null;
    const landcover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'landcover') : null;

    const hasClimateNumbers =
      !!climate && typeof climate.annual_precip_mm === 'number' && climate.annual_precip_mm > 0;
    const waterUtilityCount = utilities.filter(
      (u) => u.type === 'water_tank' || u.type === 'well_pump' || u.type === 'rain_catchment',
    ).length;
    if (!hasClimateNumbers && !hydrology) {
      out.push({
        id: 'water-no-climate-no-hydrology',
        topic: 'water',
        confidence: 'none',
        title: 'No climate or hydrology data fetched',
        why: 'Annual precip is unknown and there is no watershed delineation.',
        walkFor:
          'Existing wells, springs, seasonal seeps, drainage paths after rain, neighbour water sources.',
      });
    } else if (!hasClimateNumbers || !hydrology) {
      out.push({
        id: 'water-thin-data',
        topic: 'water',
        confidence: 'low',
        title: 'Water data is thin',
        why: hasClimateNumbers
          ? 'Climate exists but no hydrology — drainage and watershed routing are heuristic.'
          : 'Hydrology exists but climate precip is missing — annual catchment math defaults to a placeholder.',
        walkFor:
          'Where does runoff actually flow? Seasonal pools, low spots, and where a swale or pond would sit on the contour.',
      });
    }
    if (waterUtilityCount === 0) {
      out.push({
        id: 'water-no-infrastructure',
        topic: 'water',
        confidence: 'low',
        title: 'No water infrastructure placed yet',
        why: 'No wells, tanks, or rain catchment surfaces are on the map.',
        walkFor:
          'Existing well location & depth, tank sizes, rooftop catchment opportunities, water-truck access route.',
      });
    }

    const hasSoilFields =
      !!soil && (soil.organic_matter_pct != null || soil.hydrologic_group != null);
    if (!soil) {
      out.push({
        id: 'soil-no-layer',
        topic: 'soil',
        confidence: 'none',
        title: 'No SSURGO soil layer fetched',
        why: 'Drainage class, hydrologic group, and OM baselines are unknown.',
        walkFor:
          'Hand-pits at 3–5 spots: structure, colour, smell, root depth, ribbon test, worm count.',
      });
    } else if (!hasSoilFields) {
      out.push({
        id: 'soil-thin-fields',
        topic: 'soil',
        confidence: 'low',
        title: 'Soil layer present but key fields missing',
        why: 'No organic-matter or hydrologic-group value parsed.',
        walkFor:
          'Sample 2–3 reps per major slope/aspect zone. A jar-test for texture and a $20 lab pH/OM test collapses most uncertainty.',
      });
    }

    const hasSlope = !!elevation && typeof elevation.mean_slope_deg === 'number';
    if (!elevation) {
      out.push({
        id: 'slope-no-layer',
        topic: 'slope',
        confidence: 'none',
        title: 'No elevation / slope layer fetched',
        why: 'Slope, aspect, and curvature are absent.',
        walkFor:
          'Walk the contour — flat shoulders, steep faces, swales. Carry a level or phone clinometer at 5–10 marker points.',
      });
    } else if (!hasSlope) {
      out.push({
        id: 'slope-no-mean',
        topic: 'slope',
        confidence: 'low',
        title: 'Elevation layer present, but mean slope missing',
        why: 'Per-acre slope distribution defaults are in use.',
        walkFor:
          'Walk the steepest faces and the flat shoulders. Note ground stability, erosion gullies, frost-hollow signs.',
      });
    }

    const cropsMissingSpecies = cropAreas.filter((c) => c.species.length === 0).length;
    if (!landcover) {
      out.push({
        id: 'vegetation-no-landcover',
        topic: 'vegetation',
        confidence: 'none',
        title: 'No NLCD land-cover layer fetched',
        why: 'Tree-canopy %, vegetation type, and disturbance signals are absent.',
        walkFor:
          'Dominant overstory species, understory composition, invasive presence, recent disturbance evidence.',
      });
    }
    if (cropAreas.length > 0 && cropsMissingSpecies > 0) {
      out.push({
        id: 'vegetation-crop-species-blank',
        topic: 'vegetation',
        confidence: 'low',
        title: `${cropsMissingSpecies} of ${cropAreas.length} crop areas have no species set`,
        why: 'Polyculture diversity and harvest-window estimation are running on generic defaults.',
        walkFor:
          'Confirm what is actually growing in each marked area. Flag mature trees worth keeping that polygons would clear.',
      });
    }

    const structuresMissingNotes = structures.filter(
      (st) => !st.notes || st.notes.trim() === '',
    ).length;
    if (structures.length > 0 && structuresMissingNotes === structures.length) {
      out.push({
        id: 'structures-no-notes',
        topic: 'structures',
        confidence: 'low',
        title: 'No notes on any placed structure',
        why: 'Structures are sized by the type table only — no steward annotations.',
        walkFor:
          'For each footprint: ground stability, foundation type, distance to utility lines, prevailing-wind orientation, view sightlines.',
      });
    }
    if (structures.length > 0 && !elevation) {
      out.push({
        id: 'structures-no-elevation',
        topic: 'structures',
        confidence: 'low',
        title: 'Structures placed but no elevation data',
        why: 'Footprint placements have no terrain context.',
        walkFor:
          'Stand on each footprint at first light and at sunset. View, upslope context, post-rain flooding.',
      });
    }

    const paddocksMissingSpecies = paddocks.filter((p) => p.species.length === 0).length;
    if (paddocks.length > 0 && paddocksMissingSpecies > 0) {
      out.push({
        id: 'livestock-paddock-species-blank',
        topic: 'livestock',
        confidence: 'low',
        title: `${paddocksMissingSpecies} of ${paddocks.length} paddocks have no species set`,
        why: 'Stocking density defaults to a single AU/ac.',
        walkFor:
          'Existing forage species mix, stocking history, water access per paddock, predator pressure, fence-line condition.',
      });
    }
    if (paddocks.length > 0 && !landcover) {
      out.push({
        id: 'livestock-no-landcover',
        topic: 'livestock',
        confidence: 'low',
        title: 'Paddocks placed but no land-cover data',
        why: 'Forage productivity baselines are unknown.',
        walkFor:
          'Square-foot frame at 5–10 representative spots per paddock; forage vs. weed cover ratio.',
      });
    }

    return out.sort((a, b) => {
      const da = TOPIC_ORDER.indexOf(a.topic);
      const db = TOPIC_ORDER.indexOf(b.topic);
      if (da !== db) return da - db;
      // none before low
      return (a.confidence === 'none' ? 0 : 1) - (b.confidence === 'none' ? 0 : 1);
    });
  }, [project, structures, utilities, cropAreas, paddocks, siteData]);

  const totalFlags = flags.length;
  const checkedCount = flags.filter((f) => observed[f.id] != null).length;
  const remaining = totalFlags - checkedCount;

  const captureGps = useCallback((): Promise<[number, number] | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, []);

  const handleToggle = useCallback(
    async (flagId: string) => {
      const isObserved = observed[flagId] != null;
      let next: Record<string, ObservedEntry>;
      if (isObserved) {
        next = { ...observed };
        delete next[flagId];
      } else {
        // Capture optional GPS as a side note for later — not blocking.
        const gps = await captureGps();
        const noteSeed = gps ? `${gps[1].toFixed(5)}, ${gps[0].toFixed(5)}` : '';
        next = {
          ...observed,
          [flagId]: { observedAt: new Date().toISOString(), note: noteSeed },
        };
      }
      setObserved(next);
      saveObserved(projectId, next);
    },
    [observed, captureGps, projectId],
  );

  const handleNoteChange = useCallback(
    (flagId: string, note: string) => {
      const current = observed[flagId];
      if (!current) return;
      const next: Record<string, ObservedEntry> = {
        ...observed,
        [flagId]: { ...current, note },
      };
      setObserved(next);
      saveObserved(projectId, next);
    },
    [observed, projectId],
  );

  const handleClearAll = useCallback(() => {
    setObserved({});
    saveObserved(projectId, {});
  }, [projectId]);

  const grouped = useMemo(() => {
    const map: Partial<Record<Topic, Flag[]>> = {};
    for (const f of flags) {
      const arr = map[f.topic] ?? [];
      arr.push(f);
      map[f.topic] = arr;
    }
    return TOPIC_ORDER.flatMap((t) => {
      const items = map[t];
      if (!items || items.length === 0) return [];
      return [{ topic: t, items }];
    });
  }, [flags]);

  const tone =
    totalFlags === 0
      ? css.tone_good
      : remaining === 0
        ? css.tone_good
        : checkedCount > 0
          ? css.tone_fair
          : css.tone_muted;

  return (
    <section className={css.card} aria-label="Walk checklist">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Site checklist mode</h3>
          <p className={css.cardHint}>
            The dashboard&rsquo;s open <em>walk-for</em> rows turned into a
            tap-friendly checklist. Mark items as you observe them on-site;
            check state persists per project and survives reload.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      <div className={`${css.summaryRow} ${tone}`}>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{totalFlags}</div>
          <div className={css.summaryLabel}>Items</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{checkedCount}</div>
          <div className={css.summaryLabel}>Observed</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{remaining}</div>
          <div className={css.summaryLabel}>Remaining</div>
        </div>
        <div className={css.summaryBlock}>
          <button
            type="button"
            className={css.clearBtn}
            onClick={handleClearAll}
            disabled={checkedCount === 0}
            aria-label="Clear all observed marks"
          >
            Reset
          </button>
        </div>
      </div>

      {totalFlags === 0 && (
        <div className={css.empty}>
          No site-visit items raised. Every topic has at least medium confidence
          in the underlying inputs &mdash; revisit when site data or placed
          entities change.
        </div>
      )}

      {grouped.map(({ topic, items }) => (
        <div key={topic} className={css.topicBlock}>
          <h4 className={css.topicTitle}>{TOPIC_LABEL[topic]}</h4>
          <ul className={css.flagList}>
            {items.map((f) => {
              const entry = observed[f.id];
              const isObserved = entry != null;
              return (
                <li
                  key={f.id}
                  className={`${css.flag} ${
                    isObserved
                      ? css.observed
                      : f.confidence === 'none'
                        ? css.conf_none
                        : css.conf_low
                  }`}
                >
                  <label className={css.flagRow}>
                    <input
                      type="checkbox"
                      className={css.checkbox}
                      checked={isObserved}
                      onChange={() => {
                        void handleToggle(f.id);
                      }}
                      aria-label={f.title}
                    />
                    <div className={css.flagBody}>
                      <div className={css.flagTitle}>{f.title}</div>
                      <div className={css.flagLine}>
                        <span className={css.flagLineLabel}>Walk for:</span>{' '}
                        {f.walkFor}
                      </div>
                      {!isObserved && (
                        <div className={css.flagLineMuted}>
                          <span className={css.flagLineLabel}>Why:</span> {f.why}
                        </div>
                      )}
                    </div>
                  </label>

                  {isObserved && entry && (
                    <div className={css.observedRow}>
                      <div className={css.observedMeta}>
                        Observed {new Date(entry.observedAt).toLocaleString()}
                      </div>
                      <input
                        type="text"
                        className={css.noteInput}
                        placeholder="On-site note (optional)…"
                        value={entry.note}
                        onChange={(e) => handleNoteChange(f.id, e.target.value)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <p className={css.footnote}>
        <em>How this list is built:</em> the same deterministic rule cascade
        the §17 NeedsSiteVisitCard runs &mdash; topics where the dashboard is
        leaning on defaults or has no grounding data at all. Observed state is
        stored in <code>localStorage</code>, keyed by project, and syncs across
        tabs.
      </p>
    </section>
  );
}
