/**
 * PortfolioViewToggle — segmented two-state control flipping Portfolio Home
 * between the four-zone Map view and the card-grid Dashboard view (§3.2 /
 * §6 top-bar toggle). Mirrors ActShellToggle's pattern so the control feels
 * native to the app; lives inline in the top bar (not floated over a map).
 */

import { LayoutGrid, Map as MapIcon } from 'lucide-react';
import css from './PortfolioViewToggle.module.css';

export type PortfolioView = 'map' | 'dashboard';

interface Props {
  view: PortfolioView;
  onChange: (view: PortfolioView) => void;
}

const OPTIONS: ReadonlyArray<{ view: PortfolioView; label: string; Icon: typeof MapIcon }> = [
  { view: 'map', label: 'Map', Icon: MapIcon },
  { view: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
];

export default function PortfolioViewToggle({ view, onChange }: Props) {
  return (
    <div className={css.wrap} role="radiogroup" aria-label="Portfolio view">
      {OPTIONS.map(({ view: optView, label, Icon }) => {
        const isActive = view === optView;
        return (
          <button
            key={optView}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={css.option}
            data-active={isActive}
            onClick={() => onChange(optView)}
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
