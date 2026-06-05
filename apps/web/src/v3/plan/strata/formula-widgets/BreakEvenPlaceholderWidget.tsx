/**
 * BreakEvenPlaceholderWidget — placeholder for `enterprise-break-even`.
 *
 * Financial wiring is DEFERRED to a later slice and is covenant-governed: this
 * widget renders a calm pending message only — NO inputs, NO numbers, and no
 * advance-sale / offer / investor framing of any kind. The catalogue
 * `summarize` for this id returns `hasResult: false`, so it never
 * auto-satisfies a checklist item.
 */
import css from './formulaWidget.module.css';

interface Props {
  projectId: string;
  resultLabel?: string;
}

export default function BreakEvenPlaceholderWidget({ resultLabel }: Props) {
  return (
    <div className={css.widget}>
      <h4 className={css.title}>{resultLabel ?? 'Break-even'}</h4>
      <p className={css.empty}>
        Break-even — financial wiring lands in a later slice.
      </p>
    </div>
  );
}
