/**
 * §23 CartographicStylePresetsCard — named style preset library for branded
 * presentation / print exports.
 *
 * Presents 4 curated map-style presets (blueprint, sepia field map,
 * presentation, audit) with palette swatches, intended use-case, and the
 * recommended export format. Click "Set as active" to flag the preset in
 * localStorage so the next preview-export step can pick it up.
 *
 * Heuristic only — actual map-style binding lives on the Map canvas layer
 * and is outside this card's scope. This is the steward-facing preset
 * library: print-and-pick reference + a tiny activation flag.
 */
import { useEffect, useState } from 'react';
import css from './CartographicStylePresetsCard.module.css';

type PresetId = 'blueprint' | 'sepia_field_map' | 'presentation' | 'audit';

interface Preset {
  id: PresetId;
  name: string;
  intent: string;
  palette: { label: string; color: string }[];
  recommendedExport: string;
  audience: string;
  caveat?: string;
}

const PRESETS: Preset[] = [
  {
    id: 'blueprint',
    name: 'Blueprint',
    intent: 'Technical drawing aesthetic — high-contrast cyan-on-deep-navy line work for contractors, engineers, and permit submissions.',
    palette: [
      { label: 'Background', color: '#0e2438' },
      { label: 'Primary line', color: '#7fcfd9' },
      { label: 'Secondary', color: '#3a7fa6' },
      { label: 'Accent', color: '#f5f5f5' },
      { label: 'Annotation', color: '#ffd966' },
    ],
    recommendedExport: 'PDF · Tabloid (11 × 17 in)',
    audience: 'Builder, Engineer, Permit office',
    caveat: 'Avoid for full-color satellite imagery — line work assumes a vector base.',
  },
  {
    id: 'sepia_field_map',
    name: 'Sepia Field Map',
    intent: 'Warm parchment palette evoking a hand-drawn field journal. Friendly for site walks, family meetings, and CSRA member updates.',
    palette: [
      { label: 'Background', color: '#f4ead0' },
      { label: 'Primary line', color: '#5a4632' },
      { label: 'Secondary', color: '#8b6f4e' },
      { label: 'Accent', color: '#a85d2a' },
      { label: 'Annotation', color: '#3d2f20' },
    ],
    recommendedExport: 'PNG · Letter (8.5 × 11 in)',
    audience: 'Steward, Family, Visiting CSRA member',
  },
  {
    id: 'presentation',
    name: 'Presentation',
    intent: 'Bold, projector-friendly palette with strong figure-ground separation. Optimized for slide decks, investor pitches, and stakeholder workshops.',
    palette: [
      { label: 'Background', color: '#1a1a1a' },
      { label: 'Primary line', color: '#e8dcc8' },
      { label: 'Secondary', color: '#b4a58c' },
      { label: 'Accent', color: '#c4a265' },
      { label: 'Annotation', color: '#96c8aa' },
    ],
    recommendedExport: 'PNG @ 2× · 16:9 (1920 × 1080)',
    audience: 'Investor, Funder, Board, Workshop',
  },
  {
    id: 'audit',
    name: 'Audit',
    intent: 'High-saturation diagnostic palette that flags problems first — red for hazards, amber for warnings, sage for compliant zones. Use for design reviews and regulatory walkthroughs.',
    palette: [
      { label: 'Background', color: '#f8f4ec' },
      { label: 'Compliant', color: '#7fa57a' },
      { label: 'Warning', color: '#d4a437' },
      { label: 'Hazard', color: '#c83a2a' },
      { label: 'Annotation', color: '#2a2418' },
    ],
    recommendedExport: 'PDF · A3 + page-numbered legend',
    audience: 'Reviewer, Inspector, Insurance assessor',
    caveat: 'Designed for two-color overlay on a muted basemap — not a primary basemap palette.',
  },
];

const STORAGE_KEY = 'atlas:cartographic-style-preset';

export default function CartographicStylePresetsCard() {
  const [activeId, setActiveId] = useState<PresetId>('presentation');

  // Restore + persist active preset
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && PRESETS.some((p) => p.id === stored)) {
        setActiveId(stored as PresetId);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const activate = (id: PresetId) => {
    setActiveId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const active = PRESETS.find((p) => p.id === activeId)!;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Cartographic Style Presets</h3>
          <p className={css.cardHint}>
            Named palette presets for branded presentation, print, and audit exports. The active preset is stored
            locally and surfaced to the export pipeline. Map-canvas binding is part of the export step — this card
            is the steward-facing preset library.
          </p>
        </div>
        <span className={css.heuristicBadge}>UI PRESET</span>
      </div>

      <div className={css.activeBlock}>
        <div className={css.activeLabel}>Active preset</div>
        <div className={css.activeName}>{active.name}</div>
        <div className={css.activeIntent}>{active.intent}</div>
        <div className={css.activeMeta}>
          <span><strong>Audience:</strong> {active.audience}</span>
          <span><strong>Export:</strong> {active.recommendedExport}</span>
        </div>
      </div>

      <div className={css.presetGrid}>
        {PRESETS.map((p) => {
          const isActive = p.id === activeId;
          return (
            <article key={p.id} className={`${css.preset} ${isActive ? css.presetActive : ''}`}>
              <div className={css.presetHead}>
                <div>
                  <h4 className={css.presetName}>{p.name}</h4>
                  <div className={css.presetAudience}>{p.audience}</div>
                </div>
                {isActive ? (
                  <span className={css.activeBadge}>Active</span>
                ) : (
                  <button type="button" className={css.activateBtn} onClick={() => activate(p.id)}>
                    Set as active
                  </button>
                )}
              </div>

              <div
                className={css.swatchRow}
                style={{ background: p.palette[0]?.color }}
                role="img"
                aria-label={`${p.name} palette preview`}
              >
                {p.palette.slice(1).map((s) => (
                  <div key={s.label} className={css.swatch} style={{ background: s.color }} title={`${s.label}: ${s.color}`} />
                ))}
              </div>

              <ul className={css.swatchLegend}>
                {p.palette.map((s) => (
                  <li key={s.label} className={css.swatchLegendItem}>
                    <span className={css.swatchDot} style={{ background: s.color }} />
                    <span className={css.swatchLabel}>{s.label}</span>
                    <span className={css.swatchHex}>{s.color.toUpperCase()}</span>
                  </li>
                ))}
              </ul>

              <p className={css.presetIntent}>{p.intent}</p>

              <div className={css.presetFooter}>
                <div className={css.presetMeta}>
                  <span className={css.presetMetaLabel}>Export</span>
                  <span className={css.presetMetaValue}>{p.recommendedExport}</span>
                </div>
                {p.caveat && (
                  <div className={css.presetCaveat}>{p.caveat}</div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className={css.footnote}>
        Selecting a preset persists to <em>localStorage</em> under <code>{STORAGE_KEY}</code> — the export pipeline
        reads that flag at PDF/PNG render time. Map-canvas live preview is intentionally out of scope for this card.
        Add new presets by extending the <em>PRESETS</em> array.
      </p>
    </div>
  );
}
