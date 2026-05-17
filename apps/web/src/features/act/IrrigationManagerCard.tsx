/**
 * IrrigationManagerCard — ACT-stage Module 2 (Maintenance & Operations).
 *
 * Tracks the active → transitioning → passive irrigation transition per
 * crop area. Perennial systems start under active watering at install and
 * (in a successful design) move to swale- or rain-fed once roots
 * establish. The 3-state radio + transition-start datepicker gives the
 * steward the levers; the "days since transition" badge is the readout.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useCropStore, type CropArea } from '../../store/cropStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useLandDesignStore } from '../../store/landDesignStore.js';
import type { DesignElement } from '../../store/designElementsStore.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

const EMPTY_ELEMENTS: DesignElement[] = [];

interface Props { project: LocalProject; onSwitchToMap: () => void; }

type Mode = NonNullable<CropArea['irrigationMode']>;
const MODES: Array<{ value: Mode; label: string; cls: string }> = [
  { value: 'active',        label: 'Active',        cls: styles.pillRunning ?? '' },
  { value: 'transitioning', label: 'Transitioning', cls: styles.pillIncon ?? '' },
  { value: 'passive',       label: 'Passive',       cls: styles.pillSuccess ?? '' },
];

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
}

export default function IrrigationManagerCard({ project }: Props) {
  const allCrops = useCropStore((s) => s.cropAreas);
  const updateCropArea = useCropStore((s) => s.updateCropArea);

  const allGuilds = usePolycultureStore((s) => s.guilds);
  const designElements = useLandDesignStore(
    (s) => s.byProject[project.id] ?? EMPTY_ELEMENTS,
  );

  const crops = useMemo(
    () => allCrops.filter((c) => c.projectId === project.id),
    [allCrops, project.id],
  );
  // Plant systems designed in Plan are watered areas too. The active →
  // passive transition state persists per `CropArea`; guilds/orchards have
  // no such field, so they surface here read-only (no longer invisible —
  // run-2 #67) with an explicit status, rather than silently absent.
  const guilds = useMemo(
    () => allGuilds.filter((g) => g.projectId === project.id),
    [allGuilds, project.id],
  );
  const orchards = useMemo(
    () => designElements.filter((e) => e.kind === 'orchard'),
    [designElements],
  );
  const designedSystems = useMemo(
    () => [
      ...guilds.map((g) => ({ id: g.id, name: g.name, kind: 'Guild' })),
      ...orchards.map((o, i) => ({
        id: o.id,
        name: o.label ?? `Orchard ${i + 1}`,
        kind: 'Orchard',
      })),
    ],
    [guilds, orchards],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="act">
        <span className={styles.heroTag}>Act · Module 2 — Irrigation Transition</span>
        <h1 className={styles.title}>Irrigation Manager</h1>
        <p className={styles.lede}>
          A regenerative system trends from active watering to passive
          (swale- and rain-fed). Track each crop area on its own arc; mark
          transitions with a date so &ldquo;days since&rdquo; tells you how
          deeply roots have stretched.
        </p>
      </header>

      <section className={styles.section}>
        {crops.length === 0 && designedSystems.length === 0 ? (
          <p className={styles.empty}>No crop areas or plant systems yet — draw a crop area, or design a guild/orchard in Plan first.</p>
        ) : crops.length === 0 ? (
          <p className={styles.empty}>No crop areas yet — draw them on the map to track an irrigation transition. Designed plant systems are listed below.</p>
        ) : (
          <ul className={styles.list}>
            {crops.map((c) => {
              const mode: Mode = c.irrigationMode ?? 'active';
              const ds = daysSince(c.transitionStartDate);
              return (
                <li key={c.id} className={styles.listRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span>
                      <strong>{c.name}</strong>
                      <div className={styles.listMeta}>
                        {c.type} · {c.irrigationType} · {c.areaM2.toFixed(0)} m²
                      </div>
                    </span>
                    <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {MODES.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          className={`${styles.pill} ${mode === m.value ? m.cls : ''}`}
                          onClick={() => updateCropArea(c.id, {
                            irrigationMode: m.value,
                            transitionStartDate: m.value === 'transitioning'
                              ? (c.transitionStartDate ?? new Date().toISOString().slice(0, 10))
                              : c.transitionStartDate,
                          })}
                          style={{ cursor: 'pointer' }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </span>
                  </div>
                  {mode === 'transitioning' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <label className={styles.listMeta} style={{ minWidth: 140 }}>Transition started</label>
                      <input
                        type="date"
                        value={c.transitionStartDate ?? ''}
                        onChange={(e) => updateCropArea(c.id, { transitionStartDate: e.target.value || undefined })}
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: 'rgba(232,220,200,0.9)',
                          fontFamily: 'inherit',
                          fontSize: 13,
                        }}
                      />
                      {ds !== null && (
                        <span className={styles.listMeta}>
                          · {ds} day{ds === 1 ? '' : 's'} ago
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {designedSystems.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Designed plant systems</h2>
          <p className={styles.lede} style={{ marginTop: 0 }}>
            Guilds and orchards designed in Plan. Irrigation-transition
            tracking records onto crop areas; represent a system as a crop
            area to track its active → passive arc here.
          </p>
          <ul className={styles.list}>
            {designedSystems.map((d) => (
              <li key={d.id} className={styles.listRow}>
                <span>
                  <strong>{d.name}</strong>
                  <div className={styles.listMeta}>{d.kind} · designed</div>
                </span>
                <span className={styles.pill}>Not yet a crop area</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
