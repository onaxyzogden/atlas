import { useMapStore, type MapStyle } from '../../store/mapStore.js';
import { semantic } from '../../lib/tokens.js';

const STYLES: { id: MapStyle; label: string }[] = [
  { id: 'satellite',   label: 'Satellite' },
  { id: 'terrain',     label: 'Terrain' },
  { id: 'topographic', label: 'Topographic' },
  { id: 'street',      label: 'Street' },
  { id: 'hybrid',      label: 'Hybrid' },
];

export default function MapStyleSwitcher() {
  const { style, setStyle } = useMapStore();

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        background: 'rgba(26, 22, 17, 0.85)',
        borderRadius: 8,
        padding: '4px 6px',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
        flexShrink: 0,
      }}
    >
      {STYLES.map((s) => (
        <button
          key={s.id}
          onClick={() => setStyle(s.id)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            background: style === s.id ? semantic.primary : 'transparent',
            color: style === s.id ? '#fff' : '#c4b49a',
            transition: 'background 200ms ease, color 200ms ease',
          }}
          aria-pressed={style === s.id}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
