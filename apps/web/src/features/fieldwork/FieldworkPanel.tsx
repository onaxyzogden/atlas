/**
 * FieldworkPanel — advanced field data collection for site visits.
 * Tabs: Soil Samples, Water Issues, Structure Issues, Measurements, Walk Routes
 */

import { useState, useMemo } from 'react';
import { useFieldworkStore, type FieldworkEntry, type FieldworkType } from '../../store/fieldworkStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import WalkRouteRecorder from './WalkRouteRecorder.js';

interface Props {
  project: LocalProject;
  map: mapboxgl.Map | null;
}

type Tab = 'soil' | 'water' | 'structure' | 'measurement' | 'walk';

const TAB_CONFIG: { id: Tab; label: string; type: FieldworkType }[] = [
  { id: 'soil', label: 'Soil', type: 'soil_sample' },
  { id: 'water', label: 'Water', type: 'water_issue' },
  { id: 'structure', label: 'Structure', type: 'structure_issue' },
  { id: 'measurement', label: 'Measure', type: 'measurement' },
  { id: 'walk', label: 'Routes', type: 'annotation' },
];

export default function FieldworkPanel({ project, map }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('soil');
  const entries = useFieldworkStore((s) => s.entries);
  const walkRoutes = useFieldworkStore((s) => s.walkRoutes);
  const addEntry = useFieldworkStore((s) => s.addEntry);
  const deleteEntry = useFieldworkStore((s) => s.deleteEntry);

  const projectEntries = useMemo(
    () => entries.filter((e) => e.projectId === project.id),
    [entries, project.id],
  );
  const projectRoutes = useMemo(
    () => walkRoutes.filter((r) => r.projectId === project.id),
    [walkRoutes, project.id],
  );

  const [isPlacing, setIsPlacing] = useState(false);

  const currentType = TAB_CONFIG.find((t) => t.id === activeTab)?.type ?? 'soil_sample';
  const tabEntries = projectEntries.filter((e) => e.type === currentType);

  const handleAddFromMap = () => {
    if (!map) return;
    setIsPlacing(true);
    map.getCanvas().style.cursor = 'crosshair';

    const handler = (e: mapboxgl.MapMouseEvent) => {
      const notes = prompt(`Add ${currentType.replace('_', ' ')} note:`) ?? '';
      if (notes) {
        const entry: FieldworkEntry = {
          id: crypto.randomUUID(),
          projectId: project.id,
          type: currentType,
          location: [e.lngLat.lng, e.lngLat.lat],
          timestamp: new Date().toISOString(),
          data: {},
          notes,
          photos: [],
          verified: false,
        };
        addEntry(entry);
      }
      map.getCanvas().style.cursor = '';
      map.off('click', handler);
      setIsPlacing(false);
    };
    map.once('click', handler);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
        Fieldwork
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(196,162,101,0.2)' }}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '8px 0', fontSize: 10, fontWeight: activeTab === tab.id ? 600 : 400,
              background: activeTab === tab.id ? 'rgba(196,162,101,0.12)' : 'transparent',
              border: 'none', color: activeTab === tab.id ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Walk Routes tab */}
      {activeTab === 'walk' ? (
        <WalkRouteRecorder project={project} routes={projectRoutes} />
      ) : (
        <>
          {/* Add from map */}
          <button
            onClick={handleAddFromMap}
            style={{
              width: '100%', padding: '10px', fontSize: 12, fontWeight: 500,
              border: isPlacing ? '1px solid rgba(196,162,101,0.3)' : '1px solid var(--color-panel-card-border)',
              borderRadius: 8,
              background: isPlacing ? 'rgba(196,162,101,0.08)' : 'transparent',
              color: isPlacing ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: 'pointer', marginBottom: 16,
            }}
          >
            {isPlacing ? 'Click on map to place...' : `+ Add ${currentType.replace('_', ' ')} on Map`}
          </button>

          {/* Entry list */}
          {tabEntries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tabEntries.map((entry) => (
                <div key={entry.id} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-panel-text)' }}>
                      {entry.notes.slice(0, 40)}{entry.notes.length > 40 ? '...' : ''}
                    </span>
                    <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
                      {'\u00D7'}
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>
                    {new Date(entry.timestamp).toLocaleString()} &middot; [{entry.location[0].toFixed(4)}, {entry.location[1].toFixed(4)}]
                    {entry.verified && <span style={{ color: '#2d7a4f', marginLeft: 4 }}>{'\u2713'} verified</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 20 }}>
              No {currentType.replace('_', ' ')} entries yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}
