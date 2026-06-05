// FormulaResultSection — the LIVE CALCULATIONS region of ObjectiveDetailPanel.
//
// Collects every checklist item carrying a `formulaBinding` and renders that
// formula's live result widget, resolved through the app-layer
// `formulaCatalog`. Returns null when the objective has no bound items, so
// every non-livestock panel is untouched and pays no chunk cost.
//
// Widgets are already `lazy()` in formulaCatalog, so the engine only loads
// when a bound objective is opened. Each widget is wrapped in Suspense + a
// CardErrorBoundary, mirroring DetailsExpander: a widget whose store data is
// not hydrated yet degrades to a readable notice instead of taking the panel
// down.
//
// Covenant: capacity widgets are ECOLOGICAL only (animal-unit / forage / head
// / water). The `enterprise-break-even` widget is a deferred placeholder; no
// financial / advance-sale framing originates here.

import { Component, Suspense, type ReactNode } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';
import { resolveFormula } from './formulaCatalog.js';
import css from './FormulaResultSection.module.css';

interface Props {
  projectId: string;
  objective: PlanStratumObjective;
}

export default function FormulaResultSection({ projectId, objective }: Props) {
  const bound = objective.checklist.filter((i) => i.formulaBinding);
  if (bound.length === 0) return null;

  return (
    <section
      className={css.section}
      aria-label="Live calculations"
      data-testid="plan-objective-formulas"
    >
      <div className={css.headerLead}>
        <span className={css.eyebrow}>Live calculations</span>
      </div>
      <div className={css.stack}>
        {bound.map((item) => {
          const binding = item.formulaBinding!;
          const spec = resolveFormula(binding.formulaId);
          if (!spec) return null;
          const Widget = spec.Widget;
          return (
            <CardErrorBoundary key={item.id}>
              <Suspense
                fallback={<p className={css.placeholder}>Loading calculation…</p>}
              >
                <Widget
                  projectId={projectId}
                  resultLabel={binding.resultLabel ?? spec.label}
                />
              </Suspense>
            </CardErrorBoundary>
          );
        })}
      </div>
    </section>
  );
}

// Boundary so a widget whose store data isn't hydrated yet can't take down the
// panel. Mirrors DetailsExpander.CardErrorBoundary.
class CardErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; msg: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false, msg: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { failed: true, msg: error.message };
  }
  override componentDidCatch(error: Error) {
    console.warn('[FormulaResultSection] widget failed:', error.message);
  }
  override render() {
    if (this.state.failed) {
      return (
        <p className={css.placeholder}>
          Calculation failed to render: {this.state.msg}
        </p>
      );
    }
    return this.props.children;
  }
}
