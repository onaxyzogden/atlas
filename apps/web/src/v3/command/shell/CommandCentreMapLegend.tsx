/**
 * CommandCentreMapLegend — the stage-agnostic colour key for the Command Centre
 * site map. Each row maps a module to its dot colour (the same per-stage palette
 * the compass + tabs use). When a module lens is active, the legend narrows to
 * that single module so the key matches what's focused on the map.
 *
 * Per-stage wrappers (ObserveMapLegend / PlanMapLegend / ActMapLegend) inject the
 * title, the module list, and the label + dot maps. Generic over the stage's
 * module-id union `M`.
 */

import css from './CommandCentreShell.module.css';

export interface CommandCentreMapLegendProps<M extends string> {
  /** Section title, e.g. "Act modules". */
  title: string;
  /** Full module list, shown when no lens is active. */
  modules: readonly M[];
  moduleLabel: Record<M, string>;
  moduleDot: Record<M, string>;
  active: M | null;
}

export default function CommandCentreMapLegend<M extends string>({
  title,
  modules,
  moduleLabel,
  moduleDot,
  active,
}: CommandCentreMapLegendProps<M>) {
  const list = active ? [active] : modules;
  return (
    <div className={css.legend} aria-label="Map legend">
      <p className={css.legendTitle}>{title}</p>
      {list.map((module) => (
        <span key={module} className={css.legendRow}>
          <span
            className={css.legendDot}
            style={{ background: moduleDot[module] }}
          />
          {moduleLabel[module]}
        </span>
      ))}
    </div>
  );
}
