/**
 * ObserveTools — module-aware left-rail tool panel for the Observe stage.
 *
 * Phase A: 6 placeholder tool groups, one per Observe module. Tools are
 * disabled buttons labeled "(coming soon)" — Phase B wires real interactions.
 * Layout mirrors `DesignPage` toolbox at apps/web/src/v3/pages/DesignPage.tsx.
 */

import {
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import css from './ObserveTools.module.css';

interface ObserveToolsProps {
  activeModule: ObserveModule;
}

interface ToolItem {
  id: string;
  label: string;
  glyph: string;
}

const TOOL_GROUPS: Record<ObserveModule, ToolItem[]> = {
  'human-context': [
    { id: 'stakeholder-card',   label: 'Stakeholder', glyph: '👤' },
    { id: 'tenure-card',        label: 'Tenure',      glyph: '📜' },
    { id: 'use-card',           label: 'Land use',    glyph: '🏘' },
    { id: 'neighbour-card',     label: 'Neighbour',   glyph: '🤝' },
  ],
  'macroclimate-hazards': [
    { id: 'climate-pull',       label: 'Climate normals', glyph: '🌤' },
    { id: 'wildfire-overlay',   label: 'Wildfire',        glyph: '🔥' },
    { id: 'flood-overlay',      label: 'Flood',           glyph: '🌊' },
    { id: 'wind-overlay',       label: 'Wind',            glyph: '🌬' },
  ],
  topography: [
    { id: 'slope-raster',       label: 'Slope',     glyph: '⛰' },
    { id: 'aspect-raster',      label: 'Aspect',    glyph: '🧭' },
    { id: 'contours',           label: 'Contours',  glyph: '〰' },
    { id: 'drainage',           label: 'Drainage',  glyph: '💧' },
  ],
  'earth-water-ecology': [
    { id: 'soil-sample',        label: 'Soil',       glyph: '🌱' },
    { id: 'water-feature',      label: 'Water',      glyph: '💧' },
    { id: 'flora-survey',       label: 'Flora',      glyph: '🌿' },
    { id: 'fauna-survey',       label: 'Fauna',      glyph: '🦌' },
  ],
  'sectors-zones': [
    { id: 'sector-arrow',       label: 'Sector',  glyph: '↗' },
    { id: 'zone-marker',        label: 'Zone',    glyph: '⊙' },
    { id: 'corridor',           label: 'Corridor', glyph: '↔' },
    { id: 'access',             label: 'Access',   glyph: '🚪' },
  ],
  'swot-synthesis': [
    { id: 'strength',           label: 'Strength',     glyph: '💪' },
    { id: 'weakness',           label: 'Weakness',     glyph: '⚠' },
    { id: 'opportunity',        label: 'Opportunity',  glyph: '✨' },
    { id: 'threat',             label: 'Threat',       glyph: '☠' },
  ],
};

export default function ObserveTools({ activeModule }: ObserveToolsProps) {
  const items = TOOL_GROUPS[activeModule];
  const moduleLabel = OBSERVE_MODULE_LABEL[activeModule];

  return (
    <aside className={css.toolbox} aria-label={`${moduleLabel} tools`}>
      <header className={css.toolboxHeader}>
        <span className={css.eyebrow}>Toolbox</span>
        <h2 className={css.toolboxTitle}>{moduleLabel}</h2>
      </header>
      <section className={css.group}>
        <span className={css.groupLabel}>Coming soon</span>
        <div className={css.itemGrid}>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={css.toolItem}
              disabled
              aria-disabled="true"
              title={`${it.label} — Phase B`}
            >
              <span className={css.toolGlyph} aria-hidden="true">{it.glyph}</span>
              <span className={css.toolLabel}>{it.label}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
