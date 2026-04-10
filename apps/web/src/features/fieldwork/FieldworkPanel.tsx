/**
 * FieldworkPanel — advanced field data collection for site visits.
 * Tabs: Soil Samples, Water Issues, Structure Issues, Measurements, Walk Routes
 */

import type maplibregl from 'maplibre-gl';
import { useState, useMemo } from 'react';
import { useFieldworkStore, type FieldworkEntry, type FieldworkType } from '../../store/fieldworkStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import WalkRouteRecorder from './WalkRouteRecorder.js';
import p from '../../styles/panel.module.css';

interface Props {
  project: LocalProject;
  map: maplibregl.Map | null;
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

    const handler = (e: maplibregl.MapMouseEvent) => {
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
    <div className={p.container}>
      <h2 className={p.title}>
        Fieldwork
      </h2>

      {/* Tabs */}
      <div className={p.tabBar}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${p.tabBtn} ${p.tabBtnSm} ${activeTab === tab.id ? p.tabBtnActive : ''}`}
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
            className={p.btn}
            style={{
              marginBottom: 16,
              ...(isPlacing ? { borderColor: 'rgba(196,162,101,0.3)', background: 'rgba(196,162,101,0.08)', color: '#c4a265' } : {}),
            }}
          >
            {isPlacing ? 'Click on map to place...' : `+ Add ${currentType.replace('_', ' ')} on Map`}
          </button>

          {/* Entry list */}
          {tabEntries.length > 0 ? (
            <div className={p.section}>
              {tabEntries.map((entry) => (
                <div key={entry.id} className={p.card}>
                  <div className={p.rowBetween} style={{ marginBottom: 4 }}>
                    <span className={`${p.text11} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)' }}>
                      {entry.notes.slice(0, 40)}{entry.notes.length > 40 ? '...' : ''}
                    </span>
                    <button onClick={() => deleteEntry(entry.id)} className={p.deleteBtn}>
                      {'\u00D7'}
                    </button>
                  </div>
                  <div className={`${p.text10} ${p.muted}`}>
                    {new Date(entry.timestamp).toLocaleString()} &middot; [{entry.location[0].toFixed(4)}, {entry.location[1].toFixed(4)}]
                    {entry.verified && <span style={{ color: '#2d7a4f', marginLeft: 4 }}>{'\u2713'} verified</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={p.empty}>
              No {currentType.replace('_', ' ')} entries yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}
