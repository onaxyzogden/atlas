import type { EcologyObservation, TrophicLevel } from '../../../../store/ecologyStore.js';

interface Props {
  observations: EcologyObservation[];
  compact?: boolean;
  className?: string;
}

const TROPHIC_ORDER: TrophicLevel[] = ['producer', 'primary', 'secondary', 'tertiary', 'decomposer'];
const TROPHIC_LABELS: Record<TrophicLevel, string> = {
  producer: 'Producers',
  primary: 'Primary consumers',
  secondary: 'Secondary consumers',
  tertiary: 'Tertiary consumers',
  decomposer: 'Decomposers',
};
const TROPHIC_ICONS: Record<TrophicLevel, string> = {
  producer: '🌿',
  primary: '🐛',
  secondary: '🐸',
  tertiary: '🦅',
  decomposer: '🍄',
};

export default function SpeciesObservationList({ observations, compact, className }: Props) {
  if (observations.length === 0) {
    return (
      <div className={`species-observation-list is-empty ${className ?? ''}`}>
        <span>No observations yet — log species sightings to build a trophic picture of the site.</span>
      </div>
    );
  }

  const grouped = new Map<TrophicLevel, EcologyObservation[]>();
  for (const o of observations) {
    const arr = grouped.get(o.trophicLevel) ?? [];
    arr.push(o);
    grouped.set(o.trophicLevel, arr);
  }

  const levels = TROPHIC_ORDER.filter((l) => grouped.has(l));

  if (compact) {
    return (
      <div className={`species-observation-list compact ${className ?? ''}`}>
        {levels.map((level) => {
          const items = grouped.get(level)!;
          return (
            <span key={level} className={`species-chip trophic-${level}`}>
              {TROPHIC_ICONS[level]} {items.length}
            </span>
          );
        })}
        <small>{observations.length} total</small>
      </div>
    );
  }

  return (
    <div className={`species-observation-list ${className ?? ''}`}>
      {levels.map((level) => {
        const items = grouped.get(level)!;
        return (
          <section key={level} className={`trophic-group trophic-${level}`}>
            <h3>
              <span>{TROPHIC_ICONS[level]}</span>
              {TROPHIC_LABELS[level]}
              <em>{items.length}</em>
            </h3>
            <ul>
              {items.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <b>{o.species}</b>
                  {o.notes ? <span>{o.notes}</span> : null}
                </li>
              ))}
              {items.length > 5 && <li className="more-note">+{items.length - 5} more</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
