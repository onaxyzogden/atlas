/**
 * SoilSamplesCard — §7 manual soil-test entry surface on EcologicalDashboard.
 *
 * Lets stewards log lab results (pH, OM%, CEC, EC, bulk density, texture,
 * NPK) and qualitative biological-activity readings against points on the
 * parcel. Complements the SSURGO / SoilGrids layers which are modeled, not
 * measured — this card is where measurements from A&L, Cornell Soil Health,
 * or an in-field probe land.
 *
 * Persistence: localStorage via `soilSampleStore` (presentation-layer only;
 * no server roundtrip). Project deletion cascades via `cascadeDelete`.
 * Sample data is NOT cloned by duplicateProject — observations belong to
 * the physical site, not the design template.
 *
 * Spec: §7 `manual-soil-test-entry` (featureManifest).
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useSoilSampleStore,
  TEXTURE_LABELS,
  DEPTH_LABELS,
  BIO_ACTIVITY_LABELS,
  type SoilSample,
  type SoilTextureClass,
  type SamplingDepth,
  type BiologicalActivity,
} from '../../store/soilSampleStore.js';
import css from './SoilSamples.module.css';

interface Props {
  project: LocalProject;
}

/** Parse a YYYY-MM-DD in local time so it doesn't shift across UTC midnight. */
function formatDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Average lon/lat of every point in a FeatureCollection — used to drop a
 *  "boundary centre" default pin for samples logged before the steward has
 *  walked the site. Matches `LogEventForm.boundaryCentroid` in shape. */
function boundaryCentroid(fc: GeoJSON.FeatureCollection | null): [number, number] | null {
  if (!fc || !fc.features.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const x = coords[0] as number;
      const y = coords[1] as number;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      return;
    }
    for (const c of coords) visit(c);
  };
  for (const f of fc.features) {
    if (f.geometry && 'coordinates' in f.geometry) visit(f.geometry.coordinates);
  }
  if (!isFinite(minX)) return null;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

export default function SoilSamplesCard({ project }: Props) {
  const samples = useSoilSampleStore((s) => s.samples);
  const deleteSample = useSoilSampleStore((s) => s.deleteSample);

  const [formOpen, setFormOpen] = useState(false);

  // Most-recent first, filtered to this project.
  const projectSamples = useMemo(
    () =>
      samples
        .filter((sm) => sm.projectId === project.id)
        .sort((a, b) => b.sampleDate.localeCompare(a.sampleDate)),
    [samples, project.id],
  );

  return (
    <div className={css.section}>
      <div className={css.headerRow}>
        <h3 className={css.sectionLabel}>MANUAL SOIL SAMPLES</h3>
        <span className={css.headerHint}>
          Lab + in-field readings complement the modeled SSURGO / SoilGrids layers.
        </span>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className={css.addBtn}
          >
            + Log sample
          </button>
        )}
      </div>

      {formOpen && (
        <SampleForm
          project={project}
          onDone={() => setFormOpen(false)}
        />
      )}

      {projectSamples.length === 0 ? (
        <div className={css.empty}>
          No manual samples logged yet. Use "Log sample" to capture lab results
          (pH, OM%, CEC, texture) or in-field observations like earthworm
          counts and compaction readings.
        </div>
      ) : (
        <div className={css.list}>
          {projectSamples.map((sm) => (
            <SampleRow key={sm.id} sample={sm} onDelete={() => deleteSample(sm.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sample row ──────────────────────────────────────────────────────

function SampleRow({
  sample,
  onDelete,
}: {
  sample: SoilSample;
  onDelete: () => void;
}) {
  const metrics: Array<{ label: string; value: string | null }> = [
    { label: 'pH', value: sample.ph != null ? sample.ph.toFixed(1) : null },
    { label: 'OM', value: sample.organicMatterPct != null ? `${sample.organicMatterPct.toFixed(1)}%` : null },
    { label: 'CEC', value: sample.cecMeq100g != null ? `${sample.cecMeq100g.toFixed(1)}` : null },
    { label: 'EC', value: sample.ecDsM != null ? `${sample.ecDsM.toFixed(2)} dS/m` : null },
    { label: 'Bulk density', value: sample.bulkDensityGCm3 != null ? `${sample.bulkDensityGCm3.toFixed(2)} g/cm³` : null },
    { label: 'Texture', value: sample.texture && sample.texture !== 'unknown' ? TEXTURE_LABELS[sample.texture] : null },
    { label: 'NPK', value: sample.npkPpm ? sample.npkPpm : null },
  ].filter((m): m is { label: string; value: string } => m.value != null);

  return (
    <div className={css.row}>
      <div className={css.rowHeader}>
        <span className={css.rowDate}>{formatDate(sample.sampleDate)}</span>
        <span className={css.rowLabel}>{sample.label || 'Untitled sample'}</span>
        <button
          type="button"
          className={css.rowDelete}
          onClick={() => {
            if (window.confirm('Delete this soil sample?')) onDelete();
          }}
          aria-label="Delete sample"
        >
          Delete
        </button>
      </div>

      <div className={css.chips}>
        <span className={css.chip}>{DEPTH_LABELS[sample.depth]}</span>
        <span className={`${css.chip} ${css[`chipBio_${sample.biologicalActivity}`] ?? ''}`}>
          Biology: {BIO_ACTIVITY_LABELS[sample.biologicalActivity]}
        </span>
        {sample.lab && <span className={css.chip}>{sample.lab}</span>}
      </div>

      {metrics.length > 0 && (
        <div className={css.metricsGrid}>
          {metrics.map((m) => (
            <div key={m.label} className={css.metric}>
              <span className={css.metricLabel}>{m.label}</span>
              <span className={css.metricValue}>{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {sample.notes && <div className={css.notes}>{sample.notes}</div>}

      {sample.location && (
        <div className={css.metaLine}>
          <span>
            {sample.location[1].toFixed(5)}°, {sample.location[0].toFixed(5)}°
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Inline form ─────────────────────────────────────────────────────

function SampleForm({ project, onDone }: { project: LocalProject; onDone: () => void }) {
  const addSample = useSoilSampleStore((s) => s.addSample);

  const [label, setLabel] = useState('');
  const [sampleDate, setSampleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [depth, setDepth] = useState<SamplingDepth>('0_5cm');
  const [ph, setPh] = useState('');
  const [om, setOm] = useState('');
  const [cec, setCec] = useState('');
  const [ec, setEc] = useState('');
  const [bulkDensity, setBulkDensity] = useState('');
  const [texture, setTexture] = useState<SoilTextureClass>('unknown');
  const [npk, setNpk] = useState('');
  const [bio, setBio] = useState<BiologicalActivity>('unknown');
  const [lab, setLab] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<[number, number] | null>(null);

  const parseNumber = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const handleUseBoundary = () => {
    const c = boundaryCentroid(project.parcelBoundaryGeojson);
    if (c) setLocation(c);
  };

  const canSave = label.trim().length > 0 && sampleDate.length === 10;

  const handleSave = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const sample: SoilSample = {
      id: crypto.randomUUID(),
      projectId: project.id,
      sampleDate,
      label: label.trim(),
      location,
      depth,
      ph: parseNumber(ph),
      organicMatterPct: parseNumber(om),
      cecMeq100g: parseNumber(cec),
      ecDsM: parseNumber(ec),
      bulkDensityGCm3: parseNumber(bulkDensity),
      texture,
      npkPpm: npk.trim() ? npk.trim() : null,
      biologicalActivity: bio,
      lab: lab.trim() ? lab.trim() : null,
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };
    addSample(sample);
    onDone();
  };

  return (
    <div className={css.form}>
      <div className={css.formGrid}>
        <div className={`${css.field} ${css.fieldWide}`}>
          <label className={css.fieldLabel}>Label</label>
          <input
            type="text"
            className={css.input}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. North paddock topsoil"
          />
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>Sample date</label>
          <input
            type="date"
            className={css.input}
            value={sampleDate}
            onChange={(e) => setSampleDate(e.target.value)}
          />
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>Depth</label>
          <select
            className={css.select}
            value={depth}
            onChange={(e) => setDepth(e.target.value as SamplingDepth)}
          >
            {(Object.keys(DEPTH_LABELS) as SamplingDepth[]).map((d) => (
              <option key={d} value={d}>{DEPTH_LABELS[d]}</option>
            ))}
          </select>
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>pH</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="14"
            inputMode="decimal"
            className={css.input}
            value={ph}
            onChange={(e) => setPh(e.target.value)}
            placeholder="6.5"
          />
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>Organic matter %</label>
          <input
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            className={css.input}
            value={om}
            onChange={(e) => setOm(e.target.value)}
            placeholder="3.2"
          />
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>CEC (meq/100g)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            className={css.input}
            value={cec}
            onChange={(e) => setCec(e.target.value)}
            placeholder="14"
          />
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>EC (dS/m)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className={css.input}
            value={ec}
            onChange={(e) => setEc(e.target.value)}
            placeholder="0.45"
          />
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>Bulk density (g/cm³)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className={css.input}
            value={bulkDensity}
            onChange={(e) => setBulkDensity(e.target.value)}
            placeholder="1.3"
          />
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>Texture class</label>
          <select
            className={css.select}
            value={texture}
            onChange={(e) => setTexture(e.target.value as SoilTextureClass)}
          >
            {(Object.keys(TEXTURE_LABELS) as SoilTextureClass[]).map((t) => (
              <option key={t} value={t}>{TEXTURE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div className={css.field}>
          <label className={css.fieldLabel}>Biological activity</label>
          <select
            className={css.select}
            value={bio}
            onChange={(e) => setBio(e.target.value as BiologicalActivity)}
          >
            {(Object.keys(BIO_ACTIVITY_LABELS) as BiologicalActivity[]).map((b) => (
              <option key={b} value={b}>{BIO_ACTIVITY_LABELS[b]}</option>
            ))}
          </select>
        </div>

        <div className={`${css.field} ${css.fieldWide}`}>
          <label className={css.fieldLabel}>NPK (free text, e.g. "N 28 / P 14 / K 120 ppm")</label>
          <input
            type="text"
            className={css.input}
            value={npk}
            onChange={(e) => setNpk(e.target.value)}
            placeholder="N 28 / P 14 / K 120 ppm"
          />
        </div>

        <div className={`${css.field} ${css.fieldWide}`}>
          <label className={css.fieldLabel}>Lab / source</label>
          <input
            type="text"
            className={css.input}
            value={lab}
            onChange={(e) => setLab(e.target.value)}
            placeholder="A&L Western, Cornell Soil Health, self-test kit…"
          />
        </div>

        <div className={`${css.field} ${css.fieldWide}`}>
          <label className={css.fieldLabel}>Location (optional)</label>
          <div className={css.locationRow}>
            <span className={css.locationCoords}>
              {location
                ? `${location[1].toFixed(5)}°, ${location[0].toFixed(5)}°`
                : 'Site-wide (no point)'}
            </span>
            <button
              type="button"
              className={css.locationBtn}
              onClick={handleUseBoundary}
              disabled={!project.parcelBoundaryGeojson}
              title={project.parcelBoundaryGeojson ? 'Use parcel boundary centre' : 'No parcel boundary yet'}
            >
              Use boundary centre
            </button>
            {location && (
              <button
                type="button"
                className={css.locationBtn}
                onClick={() => setLocation(null)}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className={`${css.field} ${css.fieldWide}`}>
          <label className={css.fieldLabel}>Notes (smell, color, rooting, compaction depth, worm count…)</label>
          <textarea
            className={css.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dark crumbly topsoil to ~8 cm; pan at 15 cm; ~6 worms per spade."
          />
        </div>
      </div>

      <div className={css.formActions}>
        <button type="button" className={css.cancelBtn} onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className={css.saveBtn}
          onClick={handleSave}
          disabled={!canSave}
        >
          Save sample
        </button>
      </div>

      <div className={css.formHint}>
        All fields except label and date are optional — save early, refine once
        lab results arrive. Samples are stored locally and do not sync to the
        server yet.
      </div>
    </div>
  );
}
