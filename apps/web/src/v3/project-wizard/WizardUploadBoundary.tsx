/**
 * WizardUploadBoundary — file-picker overlay for Step 1.
 *
 * Accepts .geojson / .json / .kml / .kmz / .zip (Shapefile). 10MB hard
 * limit per AC 7.1. Picks the largest Polygon feature from the parsed
 * collection (matches BoundaryTool's `pickLargestPolygon` precedent
 * for non-Polygon-first uploads). Inline error surfaces on parse fail.
 */

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { parseGeoFile } from '../../lib/geoParsers.js';
import { toast } from '../../components/Toast.js';
import styles from './WizardUploadBoundary.module.css';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPT =
  '.geojson,.json,.kml,.kmz,.zip,application/geo+json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz';

interface WizardUploadBoundaryProps {
  onParsed: (polygon: GeoJSON.Polygon) => void;
  onCancel: () => void;
}

/** Pull the largest Polygon ring from a FeatureCollection. */
function pickLargestPolygon(
  fc: GeoJSON.FeatureCollection,
): GeoJSON.Polygon | null {
  let best: GeoJSON.Polygon | null = null;
  let bestRingLen = 0;
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') {
      const ringLen = g.coordinates[0]?.length ?? 0;
      if (ringLen > bestRingLen) {
        best = g;
        bestRingLen = ringLen;
      }
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        const ringLen = poly[0]?.length ?? 0;
        if (ringLen > bestRingLen) {
          best = { type: 'Polygon', coordinates: poly };
          bestRingLen = ringLen;
        }
      }
    }
  }
  return best;
}

export default function WizardUploadBoundary({
  onParsed,
  onCancel,
}: WizardUploadBoundaryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    setError(null);
    if (file.size > MAX_SIZE_BYTES) {
      setError(
        `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — limit is 10MB.`,
      );
      return;
    }
    setBusy(true);
    try {
      const result = await parseGeoFile(file);
      const polygon = pickLargestPolygon(result.geojson);
      if (!polygon) {
        setError(
          `${file.name} parsed but contains no Polygon — the wizard needs a closed boundary.`,
        );
        setBusy(false);
        return;
      }
      onParsed(polygon);
      toast.success(`Imported ${file.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown parse error';
      setError(`Could not read ${file.name}: ${msg}`);
      setBusy(false);
    }
  };

  return (
    <div className={styles.panel} role="dialog" aria-label="Upload boundary file">
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onCancel}
        aria-label="Cancel upload"
      >
        <X size={16} aria-hidden />
      </button>
      <Upload size={28} className={styles.icon} aria-hidden />
      <h2 className={styles.title}>Upload your parcel</h2>
      <p className={styles.help}>
        Accepts .geojson, .kml, .kmz, or zipped Shapefile (.zip).
        <br />
        Maximum 10MB.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className={styles.hiddenInput}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        className={styles.pickBtn}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? 'Reading file...' : 'Choose file'}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
