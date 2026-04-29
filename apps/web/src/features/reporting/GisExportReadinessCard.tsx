/**
 * §18 GisExportReadinessCard — KML / GeoJSON export readiness audit.
 *
 * Rolls up the four spatial entity stores (zones · structures · paths ·
 * utilities) into a per-layer readiness snapshot before the steward
 * triggers a GIS export. For each layer it reports feature count, name
 * coverage (named features / total), geometry validity (lat/lon in
 * range, non-NaN), and a per-format eligibility verdict. KML is
 * stricter — it wants every feature to carry a name. GeoJSON only
 * needs valid geometry.
 *
 * Pure derivation — reads stores, computes verdicts, renders the
 * preview. No file write happens here; that lives in the existing
 * export pipeline.
 *
 * Closes manifest §18 `gis-kml-geojson-export` (P3) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore, type LandZone } from '../../store/zoneStore.js';
import { useStructureStore, type Structure } from '../../store/structureStore.js';
import { usePathStore, type DesignPath } from '../../store/pathStore.js';
import { useUtilityStore, type Utility } from '../../store/utilityStore.js';
import css from './GisExportReadinessCard.module.css';

interface Props {
  project: LocalProject;
}

type LayerKey = 'zones' | 'structures' | 'paths' | 'utilities';

interface LayerRow {
  key: LayerKey;
  label: string;
  geomLabel: string;
  total: number;
  named: number;
  geomValid: number;
  notes: string[];
}

const LAYER_LABEL: Record<LayerKey, string> = {
  zones: 'Zones',
  structures: 'Structures',
  paths: 'Paths',
  utilities: 'Utilities',
};

const LAYER_GEOM: Record<LayerKey, string> = {
  zones: 'Polygon',
  structures: 'Polygon',
  paths: 'LineString',
  utilities: 'Point',
};

function isValidLngLat(coord: unknown): boolean {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lng, lat] = coord;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (Number.isNaN(lng) || Number.isNaN(lat)) return false;
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function polygonValid(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined): boolean {
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0];
    if (!ring || ring.length < 4) return false;
    return ring.every(isValidLngLat);
  }
  if (geom.type === 'MultiPolygon') {
    if (!geom.coordinates.length) return false;
    return geom.coordinates.every((poly) => {
      const ring = poly[0];
      return !!ring && ring.length >= 4 && ring.every(isValidLngLat);
    });
  }
  return false;
}

function lineStringValid(geom: GeoJSON.LineString | undefined): boolean {
  if (!geom || geom.type !== 'LineString') return false;
  return geom.coordinates.length >= 2 && geom.coordinates.every(isValidLngLat);
}

function auditZones(items: LandZone[]): LayerRow {
  const named = items.filter((z) => (z.name ?? '').trim().length > 0).length;
  const geomValid = items.filter((z) => polygonValid(z.geometry)).length;
  const notes: string[] = [];
  const noCategory = items.filter((z) => !z.category).length;
  if (noCategory > 0) notes.push(`${noCategory} missing category`);
  const noArea = items.filter((z) => !z.areaM2 || z.areaM2 <= 0).length;
  if (noArea > 0) notes.push(`${noArea} missing area`);
  return { key: 'zones', label: 'Zones', geomLabel: 'Polygon', total: items.length, named, geomValid, notes };
}

function auditStructures(items: Structure[]): LayerRow {
  const named = items.filter((s) => (s.name ?? '').trim().length > 0).length;
  const geomValid = items.filter((s) => polygonValid(s.geometry)).length;
  const notes: string[] = [];
  const noType = items.filter((s) => !s.type).length;
  if (noType > 0) notes.push(`${noType} missing type`);
  return { key: 'structures', label: 'Structures', geomLabel: 'Polygon', total: items.length, named, geomValid, notes };
}

function auditPaths(items: DesignPath[]): LayerRow {
  const named = items.filter((p) => (p.name ?? '').trim().length > 0).length;
  const geomValid = items.filter((p) => lineStringValid(p.geometry)).length;
  const notes: string[] = [];
  const noType = items.filter((p) => !p.type).length;
  if (noType > 0) notes.push(`${noType} missing type`);
  return { key: 'paths', label: 'Paths', geomLabel: 'LineString', total: items.length, named, geomValid, notes };
}

function auditUtilities(items: Utility[]): LayerRow {
  const named = items.filter((u) => (u.name ?? '').trim().length > 0).length;
  const geomValid = items.filter((u) => isValidLngLat(u.center)).length;
  const notes: string[] = [];
  const noType = items.filter((u) => !u.type).length;
  if (noType > 0) notes.push(`${noType} missing type`);
  return { key: 'utilities', label: 'Utilities', geomLabel: 'Point', total: items.length, named, geomValid, notes };
}

type Eligibility = 'ready' | 'partial' | 'blocked' | 'empty';

function geojsonEligibility(row: LayerRow): Eligibility {
  if (row.total === 0) return 'empty';
  if (row.geomValid === 0) return 'blocked';
  if (row.geomValid < row.total) return 'partial';
  return 'ready';
}

function kmlEligibility(row: LayerRow): Eligibility {
  if (row.total === 0) return 'empty';
  if (row.geomValid === 0) return 'blocked';
  // KML rendering is much friendlier when every feature has a name.
  if (row.geomValid < row.total || row.named < row.total) return 'partial';
  return 'ready';
}

const ELIG_LABEL: Record<Eligibility, string> = {
  ready: 'Ready',
  partial: 'Partial',
  blocked: 'Blocked',
  empty: 'Empty',
};

export default function GisExportReadinessCard({ project }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const allPaths = usePathStore((s) => s.paths);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const rows: LayerRow[] = useMemo(() => {
    const zones = allZones.filter((z) => z.projectId === project.id);
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    return [auditZones(zones), auditStructures(structures), auditPaths(paths), auditUtilities(utilities)];
  }, [allZones, allStructures, allPaths, allUtilities, project.id]);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const named = rows.reduce((s, r) => s + r.named, 0);
    const geomValid = rows.reduce((s, r) => s + r.geomValid, 0);
    const layersWithData = rows.filter((r) => r.total > 0).length;
    return { total, named, geomValid, layersWithData };
  }, [rows]);

  const verdict = useMemo(() => {
    if (totals.total === 0) {
      return { tone: 'unknown', label: 'No spatial features yet — nothing to export' } as const;
    }
    const geojsonReady = rows.filter((r) => r.total > 0 && geojsonEligibility(r) === 'ready').length;
    const kmlReady = rows.filter((r) => r.total > 0 && kmlEligibility(r) === 'ready').length;
    if (geojsonReady === totals.layersWithData && kmlReady === totals.layersWithData) {
      return { tone: 'done', label: 'All layers export-ready (KML + GeoJSON)' } as const;
    }
    if (geojsonReady === totals.layersWithData) {
      return { tone: 'work', label: 'GeoJSON ready — KML needs naming pass' } as const;
    }
    return { tone: 'block', label: `${totals.layersWithData - geojsonReady} layer${totals.layersWithData - geojsonReady === 1 ? '' : 's'} need geometry fixes` } as const;
  }, [rows, totals]);

  return (
    <section className={css.card} aria-label="GIS export readiness">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>GIS Export Readiness {'—'} KML / GeoJSON</h3>
          <p className={css.cardHint}>
            Per-layer audit before export. GeoJSON wants valid geometry; KML
            additionally wants every feature to carry a name so it renders
            sensibly in Earth / Maps. Missing categories or types don't block
            export but show up as caveats so the receiving GIS user knows
            what to expect.
          </p>
        </div>
        <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>{verdict.label}</div>
      </header>

      <div className={css.headlineRow}>
        <Headline value={totals.total} label="features" />
        <Headline value={totals.layersWithData} label="layers with data" />
        <Headline value={totals.named} label="named" />
        <Headline value={totals.geomValid} label="valid geometry" />
      </div>

      <div className={css.tableWrap}>
        <table className={css.table}>
          <thead>
            <tr>
              <th className={css.thLayer}>Layer</th>
              <th>Geom</th>
              <th>Count</th>
              <th>Named</th>
              <th>Valid</th>
              <th>GeoJSON</th>
              <th>KML</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const gj = geojsonEligibility(r);
              const km = kmlEligibility(r);
              const namedRatio = r.total > 0 ? Math.round((r.named / r.total) * 100) : 0;
              const validRatio = r.total > 0 ? Math.round((r.geomValid / r.total) * 100) : 0;
              return (
                <tr key={r.key}>
                  <td className={css.tdLayer}>{r.label}</td>
                  <td className={css.tdGeom}>{r.geomLabel}</td>
                  <td className={css.tdNum}>{r.total}</td>
                  <td className={css.tdNum}>
                    {r.total > 0 ? `${r.named} (${namedRatio}%)` : '—'}
                  </td>
                  <td className={css.tdNum}>
                    {r.total > 0 ? `${r.geomValid} (${validRatio}%)` : '—'}
                  </td>
                  <td className={css.tdElig}>
                    <span className={`${css.eligPill} ${css[`elig_${gj}`]}`}>{ELIG_LABEL[gj]}</span>
                  </td>
                  <td className={css.tdElig}>
                    <span className={`${css.eligPill} ${css[`elig_${km}`]}`}>{ELIG_LABEL[km]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.some((r) => r.notes.length > 0) && (
        <div className={css.notesSection}>
          <h4 className={css.sectionTitle}>Caveats</h4>
          <ul className={css.notesList}>
            {rows.map((r) =>
              r.notes.length > 0 ? (
                <li key={r.key} className={css.noteRow}>
                  <span className={css.noteLayer}>{LAYER_LABEL[r.key]}</span>
                  <span className={css.noteText}>{r.notes.join(' · ')}</span>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      )}

      <div className={css.previewSection}>
        <h4 className={css.sectionTitle}>What would be in the export</h4>
        <ul className={css.previewList}>
          {rows.map((r) => (
            <li key={r.key} className={css.previewRow}>
              <span className={css.previewLayer}>{LAYER_LABEL[r.key]}</span>
              <span className={css.previewMeta}>
                {r.total > 0
                  ? `${r.geomValid}/${r.total} ${LAYER_GEOM[r.key]}${r.geomValid === 1 ? '' : 's'} would write`
                  : `0 ${LAYER_GEOM[r.key]}s — layer omitted`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className={css.footnote}>
        This is a pre-flight audit, not the export itself {'—'} hit one of the
        export buttons above to actually generate the file. Geometry validity
        checks lat/lon range and non-NaN; ring closure and self-intersection
        checks happen at write time.
      </p>
    </section>
  );
}

function Headline({ value, label }: { value: number; label: string }) {
  return (
    <div className={css.headline}>
      <div className={css.headlineValue}>{value}</div>
      <div className={css.headlineLabel}>{label}</div>
    </div>
  );
}
