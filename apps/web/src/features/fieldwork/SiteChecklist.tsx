/**
 * SiteChecklist — structured checklist for site visits.
 * Boundary verification, water sources, soil observations,
 * access points, structure conditions. GPS stamp per item.
 */

import { useState, useCallback } from 'react';
import css from './FieldworkPanel.module.css';

export interface ChecklistItemState {
  id: string;
  checked: boolean;
  note: string;
  gpsStamp: [number, number] | null; // [lng, lat]
  checkedAt: string | null;
}

interface SiteChecklistProps {
  projectId: string;
  onItemComplete?: (item: ChecklistItemState) => void;
}

interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
}

const CHECKLIST_ITEMS: ChecklistTemplate[] = [
  { id: 'boundary_walk', title: 'Walk perimeter', description: 'Walk the full property boundary and confirm corners', category: 'Boundary' },
  { id: 'boundary_corners', title: 'Confirm corner markers', description: 'Verify all boundary corners are marked or identifiable', category: 'Boundary' },
  { id: 'water_springs', title: 'Identify springs/seeps', description: 'Locate natural springs, seeps, or wet areas', category: 'Water' },
  { id: 'water_streams', title: 'Map streams and drainage', description: 'Trace seasonal and perennial streams', category: 'Water' },
  { id: 'water_wells', title: 'Well/pump locations', description: 'Note well locations, pump condition, and flow rate', category: 'Water' },
  { id: 'soil_texture', title: 'Soil texture test', description: 'Ribbon test at 3+ points — sandy, loam, or clay', category: 'Soil' },
  { id: 'soil_color', title: 'Soil color observations', description: 'Note topsoil color and depth across zones', category: 'Soil' },
  { id: 'soil_moisture', title: 'Soil moisture check', description: 'Probe moisture at different elevations', category: 'Soil' },
  { id: 'access_roads', title: 'Road entry condition', description: 'Assess road surface, width, and all-weather access', category: 'Access' },
  { id: 'access_gates', title: 'Gate condition', description: 'Check gate hardware, latches, and clearance', category: 'Access' },
  { id: 'structure_buildings', title: 'Building condition', description: 'Note condition of existing buildings, roofs, foundations', category: 'Structures' },
  { id: 'structure_fences', title: 'Fence condition', description: 'Walk fence lines and note repairs needed', category: 'Structures' },
];

export default function SiteChecklist({ projectId, onItemComplete }: SiteChecklistProps) {
  const [items, setItems] = useState<Record<string, ChecklistItemState>>(() => {
    const init: Record<string, ChecklistItemState> = {};
    for (const t of CHECKLIST_ITEMS) {
      init[t.id] = { id: t.id, checked: false, note: '', gpsStamp: null, checkedAt: null };
    }
    return init;
  });

  const captureGps = useCallback((): Promise<[number, number] | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, []);

  const handleToggle = useCallback(async (id: string) => {
    const current = items[id];
    if (!current) return;

    const newChecked = !current.checked;
    let gps = current.gpsStamp;

    if (newChecked && !gps) {
      gps = await captureGps();
    }

    const updated: ChecklistItemState = {
      ...current,
      checked: newChecked,
      gpsStamp: newChecked ? gps : current.gpsStamp,
      checkedAt: newChecked ? new Date().toISOString() : null,
    };

    setItems((prev) => ({ ...prev, [id]: updated }));
    if (newChecked) onItemComplete?.(updated);
  }, [items, captureGps, onItemComplete]);

  const handleNoteChange = useCallback((id: string, note: string) => {
    setItems((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, note } };
    });
  }, []);

  const completed = Object.values(items).filter((i) => i.checked).length;
  const total = CHECKLIST_ITEMS.length;

  // Group by category
  const categories = [...new Set(CHECKLIST_ITEMS.map((i) => i.category))];

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 12, color: 'rgba(240,253,244,0.5)' }}>
        {completed}/{total} completed
      </div>

      {categories.map((cat) => (
        <div key={cat} className={css.section}>
          <h4 className={css.sectionLabel}>{cat}</h4>
          {CHECKLIST_ITEMS.filter((t) => t.category === cat).map((t) => {
            const state = items[t.id]!;
            return (
              <div key={t.id} className={state.checked ? css.checklistItemDone : css.checklistItem}>
                <input
                  type="checkbox"
                  checked={state.checked}
                  onChange={() => handleToggle(t.id)}
                  className={css.checklistCheckbox}
                  aria-label={t.title}
                />
                <div className={css.checklistContent}>
                  <div className={css.checklistTitle}>{t.title}</div>
                  <div className={css.checklistDesc}>{t.description}</div>
                  <input
                    type="text"
                    placeholder="Add note..."
                    value={state.note}
                    onChange={(e) => handleNoteChange(t.id, e.target.value)}
                    className={css.checklistNote}
                  />
                  {state.gpsStamp && (
                    <div className={css.checklistGps}>
                      GPS: {state.gpsStamp[1].toFixed(5)}, {state.gpsStamp[0].toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
