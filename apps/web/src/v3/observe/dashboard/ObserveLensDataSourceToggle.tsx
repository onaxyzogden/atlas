// ObserveLensDataSourceToggle — segmented two-state control that flips the
// module-bar Observe lens between LIVE project data (resolved from the real
// ObserveDataPoint store + domain snapshots) and the static MOCK fixtures
// (the escape hatch). Lives in the lens canvas as a top-right overlay,
// stacked just below ObserveShellToggle so the steward can switch the data
// source without leaving the lens.
//
// Mirrors ObserveShellToggle exactly; per-project + persisted via
// `observeLensDataSource` (getObserveLensDataSource defaults to `live`).

import { FlaskConical, Radio } from 'lucide-react';
import type { ObserveLensDataSource } from '../../../store/projectStore.js';
import css from './ObserveLensDataSourceToggle.module.css';

interface Props {
  source: ObserveLensDataSource;
  onChange: (source: ObserveLensDataSource) => void;
}

const OPTIONS: ReadonlyArray<{
  source: ObserveLensDataSource;
  label: string;
  Icon: typeof Radio;
}> = [
  { source: 'live', label: 'Live', Icon: Radio },
  { source: 'mock', label: 'Mock', Icon: FlaskConical },
];

export default function ObserveLensDataSourceToggle({ source, onChange }: Props) {
  return (
    <div
      className={css.wrap}
      role="radiogroup"
      aria-label="Observe lens data source"
    >
      {OPTIONS.map(({ source: optSource, label, Icon }) => {
        const isActive = source === optSource;
        return (
          <button
            key={optSource}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={css.option}
            data-active={isActive}
            onClick={() => onChange(optSource)}
            title={label}
          >
            <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
