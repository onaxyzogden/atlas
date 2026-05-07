/**
 * ExportButton — bottom-right floater on the OBSERVE map. Opens a popover
 * offering project-scoped exports of the current OBSERVE data set in three
 * formats:
 *
 *   - GeoJSON (.geojson) — RFC 7946 FeatureCollection, every record with
 *                          geometry across the seven namespace stores.
 *   - KML     (.kml)     — KML 2.2 Document with one <Folder> per kind.
 *   - CSV     (.csv)     — multi-section CSV with `# kind: <name>` headers
 *                          per kind; geometry as WKT, all scalar fields as
 *                          columns.
 *
 * Disabled when there is no project context. The popover closes on outside
 * click and on Esc.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, FileJson, FileCode2, FileSpreadsheet } from 'lucide-react';
import {
  collectProjectAnnotations,
  exportFilename,
  toCSV,
  toGeoJSON,
  toKML,
} from '../lib/annotationExport.js';
import css from './ExportButton.module.css';

interface Props {
  projectId: string | null;
}

type Fmt = 'geojson' | 'kml' | 'csv';

type FormatExt = 'geojson' | 'kml' | 'csv';

const FORMATS: ReadonlyArray<{
  id: Fmt;
  label: string;
  ext: FormatExt;
  mime: string;
  Icon: typeof FileJson;
}> = [
  { id: 'geojson', label: 'GeoJSON', ext: 'geojson', mime: 'application/geo+json', Icon: FileJson },
  { id: 'kml', label: 'KML', ext: 'kml', mime: 'application/vnd.google-earth.kml+xml', Icon: FileCode2 },
  { id: 'csv', label: 'CSV', ext: 'csv', mime: 'text/csv', Icon: FileSpreadsheet },
];

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportButton({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement | null>(null);

  // Outside click + Esc close the popover.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const node = dockRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onPick = (fmt: Fmt) => {
    if (!projectId) return;
    const collected = collectProjectAnnotations(projectId);
    const spec = FORMATS.find((f) => f.id === fmt)!;
    let body: string;
    if (fmt === 'geojson') {
      body = JSON.stringify(toGeoJSON(collected), null, 2);
    } else if (fmt === 'kml') {
      body = toKML(collected);
    } else {
      body = toCSV(collected);
    }
    const blob = new Blob([body], { type: `${spec.mime};charset=utf-8` });
    triggerDownload(blob, exportFilename(projectId, spec.ext));
    setOpen(false);
  };

  const disabled = !projectId;
  // We compute count lazily only when the popover opens to avoid touching
  // every store on every map render.
  const count =
    open && projectId ? collectProjectAnnotations(projectId).totalCount : null;

  return (
    <div className={css.dock} ref={dockRef}>
      {open && (
        <div
          className={css.popover}
          role="menu"
          aria-label="Export annotations"
        >
          {count === 0 ? (
            <div className={css.empty}>No annotations to export.</div>
          ) : (
            FORMATS.map(({ id, label, ext, Icon }) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                className={css.row}
                onClick={() => onPick(id)}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
                <span className={css.rowMeta}>.{ext}</span>
              </button>
            ))
          )}
        </div>
      )}
      <button
        type="button"
        className={css.btn}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title={disabled ? 'Open a project to export annotations' : 'Export annotations'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download aria-hidden="true" />
        <span>Export</span>
      </button>
    </div>
  );
}
