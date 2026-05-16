/**
 * ProjectBundleBar — the multi-device data-safety affordance on the v3 shell.
 *
 * The v3 design surface is local-first: only a few slices round-trip through
 * `syncService` even when authenticated (see `lib/projectBundle.ts` and the
 * sync-boundary wiki note). A tester moving between devices would otherwise
 * silently lose everything else. This bar is the bounded escape hatch:
 *
 *   - Until a bundle has ever been exported it shows a prominent warning
 *     ("your design lives in this browser") — the data-safety banner.
 *   - After the first export it collapses to a quiet line, but Export /
 *     Import stay reachable (re-export after edits; import on a fresh device,
 *     where nothing has been exported so the warning shows there anyway).
 *
 * Import is a full overwrite of the portable `ogden-` namespace followed by a
 * page reload so every zustand persist store re-hydrates and runs its own
 * migrate. A bundle is opaque raw strings, so a per-field diff is impossible;
 * the confirm step instead states plainly that everything will be replaced.
 */

import { useRef, useState } from 'react';
import { Download, Upload, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  buildBundle,
  serializeBundle,
  parseBundle,
  applyBundle,
  bundleFilename,
  markBundleExported,
  hasExportedBundle,
  type ProjectBundle,
} from '../../lib/projectBundle.js';
import css from './ProjectBundleBar.module.css';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface PendingImport {
  bundle: ProjectBundle;
  keyCount: number;
}

export default function ProjectBundleBar() {
  const [exported, setExported] = useState<boolean>(() => hasExportedBundle());
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onExport = () => {
    const bundle = buildBundle();
    const blob = new Blob([serializeBundle(bundle)], {
      type: 'application/json;charset=utf-8',
    });
    triggerDownload(blob, bundleFilename());
    markBundleExported();
    setExported(true);
  };

  const onPickFile = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = parseBundle(text);
    if (!result.ok) {
      setPending(null);
      setError(result.error);
      return;
    }
    setError(null);
    setPending({
      bundle: result.bundle,
      keyCount: Object.keys(result.bundle.entries).length,
    });
  };

  const onConfirmImport = () => {
    if (!pending) return;
    applyBundle(pending.bundle);
    // Reload so every zustand persist store re-hydrates from the restored
    // localStorage and runs its own migrate.
    window.location.reload();
  };

  const onCancelImport = () => {
    setPending(null);
    setError(null);
  };

  if (pending) {
    const when = pending.bundle.exportedAt
      ? new Date(pending.bundle.exportedAt).toLocaleString()
      : 'an unknown date';
    return (
      <div className={`${css.bar} ${css.confirm}`} role="alertdialog" aria-modal="false">
        <div className={css.message}>
          <ShieldAlert aria-hidden="true" />
          <span>
            Replace <strong>all projects and design data</strong> in this
            browser with this bundle (exported {when}, {pending.keyCount}{' '}
            data {pending.keyCount === 1 ? 'slice' : 'slices'})? This cannot
            be undone, and the page will reload.
          </span>
        </div>
        <div className={css.actions}>
          <button type="button" className={css.ghostBtn} onClick={onCancelImport}>
            Cancel
          </button>
          <button type="button" className={css.dangerBtn} onClick={onConfirmImport}>
            Replace &amp; reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${css.bar} ${exported ? css.calm : css.warn}`}
      role={exported ? undefined : 'status'}
    >
      <div className={css.message}>
        {exported ? (
          <ShieldCheck aria-hidden="true" />
        ) : (
          <ShieldAlert aria-hidden="true" />
        )}
        <span>
          {exported
            ? 'Your design lives in this browser. Re-export a bundle after changes to keep your backup current.'
            : 'Your design lives in this browser. Export a bundle to move devices or back up — it is not fully saved to your account.'}
        </span>
      </div>
      <div className={css.actions}>
        {error && <span className={css.error}>{error}</span>}
        <button type="button" className={css.ghostBtn} onClick={onPickFile}>
          <Upload aria-hidden="true" />
          <span>Import bundle</span>
        </button>
        <button type="button" className={css.solidBtn} onClick={onExport}>
          <Download aria-hidden="true" />
          <span>Export bundle</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className={css.hidden}
          onChange={onFileChosen}
        />
      </div>
    </div>
  );
}
