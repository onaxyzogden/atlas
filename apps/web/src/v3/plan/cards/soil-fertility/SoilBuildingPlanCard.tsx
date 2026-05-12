/**
 * SoilBuildingPlanCard — Plan Module 5 (Soil Fertility), 6th tab.
 *
 * Per Permaculture Scholar follow-up
 * (`wiki/decisions/2026-05-07-atlas-plan-soil-scholar-build-fresh.md`):
 * the Scholar's three-tab Soil-fertility workflow ends in a chronological
 * "Soil-building plan." This card was deferred until Module 7 (Phasing)
 * was rebuilt, which is now the case (commit `000840e` landed
 * `PhasingScaleMatrixCard` + `designLayer` on `PhaseTask`). It joins
 * three threads:
 *
 *   1. **Diagnose now** — limiting-factor remedies derived from the most
 *      recent reading in `soilTestStore` (re-runs `deriveLimits` over the
 *      jar/perc/pH numbers), grouped by zone label when the reading is
 *      zone-tagged.
 *   2. **Establish (one-time)** — counts of fertility infrastructure
 *      already declared in `closedLoopStore.fertilityInfra` by Yeomans
 *      sub-pillar (structural / vegetative / animal-integration).
 *   3. **Recurring flows** — every `wasteVector` rendered as a season-
 *      by-season cadence ("compost → orchard, every spring") so the
 *      steward sees the closed loop as a calendar, not just a graph.
 *
 * Read-only summary; edits happen in the upstream cards (Soil baseline,
 * Soil fertility designer, Closed-loop graph). Holmgren P3 (*Obtain a
 * Yield*) and P6 (*Produce No Waste*) framed sequentially: yield is the
 * point, waste is the input — and both happen on a clock.
 *
 * Sources: NotebookLM Permaculture Scholar (5aa3dcf3-…) 2026-05-07; OSU
 * PDC "Soil Building Goals & Plan" (Tab 3 — chronological plan).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useSoilTestStore, type SoilTest } from '../../../../store/soilTestStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useClosedLoopStore, type FertilityInfraType } from '../../../../store/closedLoopStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface Limit {
  flag: string;
  remedy: string;
}

// Mirrors `SoilBaselineCard.deriveLimits` (kept in sync intentionally —
// this card is a read-only re-derivation, never a write path, so the
// duplication is one-way: SoilBaselineCard is the canonical author of
// the limit set; we re-evaluate on the same inputs to surface the
// remedies in a chronological view).
function deriveLimits(t: SoilTest): Limit[] {
  const out: Limit[] = [];
  const { sandPct: sand, siltPct: silt, clayPct: clay, percolationInPerHr: perc, pH } = t;
  if (sand >= 70) out.push({ flag: 'Drains too fast (sand-dominant)', remedy: 'Sheet-mulch + biochar to lift water-holding capacity; cover-crop with deep-rooted nitrogen fixers.' });
  if (clay >= 35) out.push({ flag: 'Compaction risk (clay-dominant)', remedy: 'Daikon/tillage radish + Keyline subsoiling; avoid heavy traffic when wet.' });
  if (silt >= 60 && clay < 15) out.push({ flag: 'Crusting / erosion-prone (silt-dominant)', remedy: 'Permanent groundcover; chop-and-drop mulch; reduce bare-soil events.' });
  if (perc > 0 && perc < 0.25) out.push({ flag: 'Drains too slow (< 0.25 in/hr)', remedy: 'Hugelkultur mounding to lift root zone; deep-rooted cover crops to open profile.' });
  if (perc > 4) out.push({ flag: 'Drains very fast (> 4 in/hr)', remedy: 'Compost + biochar at planting; mulch heavily; consider swale-fed irrigation.' });
  if (pH > 0 && pH < 5.5) out.push({ flag: 'Acidic (pH < 5.5)', remedy: 'Wood-ash or lime amendment; acid-loving crops (blueberry, rhododendron) for the most affected blocks.' });
  if (pH > 7.8) out.push({ flag: 'Alkaline (pH > 7.8)', remedy: 'Sulphur amendment; pine-needle / oak-leaf mulch; alkaline-tolerant guilds (fig, pomegranate).' });
  return out;
}

// Yeomans three-pillar grouping for fertility infra (Scholar 2026-05-07).
const FERTILITY_PILLAR: Record<FertilityInfraType, 'structural' | 'vegetative' | 'animal'> = {
  composter:           'structural',
  hugelkultur:         'structural',
  biochar:             'structural',
  worm_bin:            'structural',
  cover_crop:          'vegetative',
  chop_and_drop:       'vegetative',
  dynamic_accumulator: 'vegetative',
  rotational_grazing:  'animal',
};
const PILLAR_LABEL = {
  structural: 'Structural (composter / hugel / biochar / worm bin)',
  vegetative: 'Vegetative (cover crop / chop-and-drop / dynamic accumulator)',
  animal:     'Animal integration (rotational grazing)',
} as const;
const FERTILITY_TYPE_LABEL: Record<FertilityInfraType, string> = {
  composter:           'composter',
  hugelkultur:         'hugelkultur',
  biochar:             'biochar',
  worm_bin:            'worm bin',
  cover_crop:          'cover crop',
  chop_and_drop:       'chop-and-drop',
  dynamic_accumulator: 'dynamic accumulator',
  rotational_grazing:  'rotational grazing',
};

// Heuristic season cadence for vectors based on the resource type label.
// The store keeps `resourceType` but it's a free-form string in v1, so
// we map by inspection of the label/type for now. A future schema bump
// could add an explicit `cadence` field; until then this is best-effort.
function vectorCadence(resource: string, label: string): string {
  const s = `${resource} ${label}`.toLowerCase();
  if (/(compost|kitchen|food scrap)/.test(s)) return 'weekly · year-round';
  if (/(manure|bedding)/.test(s)) return 'monthly · year-round';
  if (/(prun|chop|drop|leaf|mulch)/.test(s)) return 'seasonal · spring + autumn';
  if (/(cover crop|green manure)/.test(s)) return 'seasonal · sown autumn, turned spring';
  if (/(graze|paddock)/.test(s)) return 'rotational · 28-day cycle';
  if (/(biochar)/.test(s)) return 'episodic · annual at most';
  return 'cadence unset — tag in Closed-loop graph';
}

export default function SoilBuildingPlanCard({ project }: Props) {
  const byProject = useSoilTestStore((s) => s.byProject);
  const allZones = useZoneStore((s) => s.zones);
  const allVectors = useClosedLoopStore((s) => s.wasteVectors);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);

  const tests = useMemo(() => byProject[project.id] ?? [], [byProject, project.id]);
  const projectZones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id),
    [allZones, project.id],
  );
  const vectors = useMemo(
    () => allVectors.filter((v) => v.projectId === project.id),
    [allVectors, project.id],
  );
  const fertility = useMemo(
    () => allFertility.filter((f) => f.projectId === project.id),
    [allFertility, project.id],
  );

  // Diagnose-now: most-recent reading per (zoneId or 'project'). Picking
  // most-recent — not all — so the steward sees the live diagnosis, not
  // a history of since-resolved limitations.
  const diagnoseRows = useMemo(() => {
    if (tests.length === 0) return [];
    const byArea = new Map<string, SoilTest>();
    for (const t of tests) {
      const key = t.zoneId ?? '__project__';
      const cur = byArea.get(key);
      if (!cur || t.createdAt > cur.createdAt) byArea.set(key, t);
    }
    return Array.from(byArea.entries()).map(([key, t]) => {
      let area = 'Project-wide';
      if (t.zoneId) {
        const z = projectZones.find((z) => z.id === t.zoneId);
        area = z?.name ?? z?.category ?? `Zone ${t.zoneId.slice(0, 6)}`;
      }
      return { key, area, label: t.label, limits: deriveLimits(t), createdAt: t.createdAt };
    });
  }, [tests, projectZones]);

  // Establish: fertility infra grouped by Yeomans sub-pillar.
  const establishGroups = useMemo(() => {
    const buckets: Record<'structural' | 'vegetative' | 'animal', Record<string, number>> = {
      structural: {}, vegetative: {}, animal: {},
    };
    for (const f of fertility) {
      const pillar = FERTILITY_PILLAR[f.type];
      const tLabel = FERTILITY_TYPE_LABEL[f.type];
      buckets[pillar][tLabel] = (buckets[pillar][tLabel] ?? 0) + 1;
    }
    return buckets;
  }, [fertility]);

  // Recurring: each vector with a heuristic cadence.
  const recurringRows = useMemo(() => {
    return vectors.map((v) => ({
      id: v.id,
      label: v.label || `${v.resourceType} flow`,
      resource: v.resourceType,
      cadence: vectorCadence(v.resourceType, v.label || ''),
    }));
  }, [vectors]);

  const empty =
    diagnoseRows.length === 0 &&
    fertility.length === 0 &&
    vectors.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 5 · Soil</span>
        <h1 className={styles.title}>Soil-building plan</h1>
        <p className={styles.lede}>
          OSU PDC&rsquo;s "Soil Building Goals &amp; Plan" tab 3:
          chronological plan, not just a parts list. Three horizons —
          diagnose now (limiting factors), establish once (fertility
          infrastructure), then sustain by recurring flow (closed-loop
          vectors). Read-only — edits live in the upstream tabs.
        </p>
      </header>

      {empty ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            Nothing to plan yet. Save a soil baseline reading, place
            fertility infrastructure, and declare waste-to-resource
            vectors in the upstream tabs to populate this plan.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1 · Diagnose now (limiting factors)</h2>
            {diagnoseRows.length === 0 ? (
              <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0' }}>
                No soil readings yet — open <em>Soil baseline</em> and
                save a jar/perc/pH test for at least one management area.
              </p>
            ) : (
              diagnoseRows.map((r) => (
                <div key={r.key} style={{ marginBottom: 12 }}>
                  <div className={styles.statRow} style={{ alignItems: 'baseline' }}>
                    <strong>{r.area}</strong>
                    <span className={styles.listMeta}>
                      {r.label ? `${r.label} · ` : ''}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.limits.length === 0 ? (
                    <div
                      className={styles.listMeta}
                      style={{ marginTop: 2, color: 'rgba(140,180,120,0.95)' }}
                    >
                      No limiting factors flagged — maintain with cover and mulch.
                    </div>
                  ) : (
                    <ul className={styles.list} style={{ margin: '6px 0 0' }}>
                      {r.limits.map((l, i) => (
                        <li key={i} className={styles.listRow} style={{ display: 'block' }}>
                          <strong style={{ color: 'rgba(220,150,90,0.95)' }}>{l.flag}</strong>
                          <div className={styles.listMeta} style={{ marginTop: 2 }}>
                            {l.remedy}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2 · Establish (one-time infrastructure)</h2>
            <p className={styles.lede} style={{ marginBottom: 8 }}>
              Fertility infrastructure already declared in the project,
              grouped by Yeomans sub-pillar. Empty pillars highlight
              under-served fertility legs the Scholar called out
              (structural · vegetative · animal-integration).
            </p>
            {(['structural', 'vegetative', 'animal'] as const).map((pillar) => {
              const entries = Object.entries(establishGroups[pillar]);
              const total = entries.reduce((s, [, n]) => s + n, 0);
              return (
                <div key={pillar} className={styles.statRow} style={{ alignItems: 'baseline' }}>
                  <span>
                    {PILLAR_LABEL[pillar]}{' '}
                    {total === 0 && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          color: 'rgba(220,150,90,0.9)',
                        }}
                      >
                        · gap
                      </span>
                    )}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {total === 0
                      ? '0'
                      : entries.map(([n, c]) => `${c}× ${n}`).join(' · ')}
                  </span>
                </div>
              );
            })}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3 · Recurring flows (closed-loop calendar)</h2>
            {recurringRows.length === 0 ? (
              <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0' }}>
                No waste-to-resource vectors yet — declare them in the{' '}
                <em>Waste-to-resource vectors</em> or{' '}
                <em>Closed-loop graph</em> tabs so they appear here as a
                recurring calendar.
              </p>
            ) : (
              <ul className={styles.list}>
                {recurringRows.map((r) => (
                  <li key={r.id} className={styles.listRow}>
                    <div style={{ flex: 1 }}>
                      <strong>{r.label}</strong>
                      <div className={styles.listMeta} style={{ marginTop: 2 }}>
                        resource: {r.resource}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>{r.cadence}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why a plan, not just a graph</h2>
        <p className={styles.lede}>
          Holmgren P3 (<em>Obtain a Yield</em>) + P6 (<em>Produce No
          Waste</em>) only land if the closed loop runs on a clock. The
          jar test diagnoses; the infrastructure embodies; the vectors
          carry. This card is the rope between them.
        </p>
      </section>
    </div>
  );
}
