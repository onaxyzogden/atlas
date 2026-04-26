import { useMapStore, type ViewMode } from '../../store/mapStore.js';
import { semantic } from '../../lib/tokens.js';

const MODES: { id: ViewMode; label: string }[] = [
  { id: '2d',   label: '2D' },
  { id: '2.5d', label: '2.5D' },
  { id: '3d',   label: '3D' },
];

interface ViewModeSwitcherProps {
  onPitch?: (pitchDeg: number) => void;
}

/**
 * Â§2 view-mode control. 2D and 2.5D stay inside MapLibre (pitch 0 / 45Â°).
 * 3D flips `is3DTerrain`, which MapView uses to mount CesiumTerrainViewer.
 */
export default function ViewModeSwitcher({ onPitch }: ViewModeSwitcherProps) {
  const viewMode = useMapStore((s) => s.viewMode);
  const setViewMode = useMapStore((s) => s.setViewMode);

  const handleSelect = (id: ViewMode) => {
    setViewMode(id);
    if (id === '2d') onPitch?.(0);
    else if (id === '2.5d') onPitch?.(45);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        background: 'var(--color-chrome-bg-translucent)',
        borderRadius: 8,
        padding: '4px 6px',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
        flexShrink: 0,
      }}
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => handleSelect(m.id)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            background: viewMode === m.id ? semantic.primary : 'transparent',
            color: viewMode === m.id ? '#fff' : '#c4b49a',
            transition: 'background 200ms ease, color 200ms ease',
          }}
          aria-pressed={viewMode === m.id}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
