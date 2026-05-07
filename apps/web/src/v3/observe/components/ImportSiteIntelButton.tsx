/**
 * ImportSiteIntelButton — bottom-right floater on the OBSERVE map (above
 * ExportButton). Lets the steward download a JSON template scoped to the
 * current project, fill it offline, and upload it back to populate site
 * intelligence layers + project notes.
 */
import { useEffect, useRef, useState } from 'react';
import { Upload, FileDown, FileUp } from 'lucide-react';
import { useProjectStore } from '../../../store/projectStore.js';
import { buildTemplate, templateFilename } from '../lib/siteIntelTemplate.js';
import {
  parseAndValidate,
  buildDiff,
  applyTemplate,
  type ParseResult,
  type TemplateDiff,
} from '../lib/siteIntelTemplate.apply.js';
import css from './ImportSiteIntelButton.module.css';

interface Props {
  projectId: string | null;
}

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

export default function ImportSiteIntelButton({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [diff, setDiff] = useState<TemplateDiff | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const project = useProjectStore((s) =>
    projectId ? s.projects.find((p) => p.id === projectId) ?? null : null,
  );
  const isBuiltin = project?.isBuiltin === true;
  const disabled = !projectId || !project || isBuiltin;

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

  const onDownload = () => {
    if (!project) return;
    const tpl = buildTemplate(project);
    const body = JSON.stringify(tpl, null, 2);
    const blob = new Blob([body], { type: 'application/json;charset=utf-8' });
    triggerDownload(blob, templateFilename(project.id, project.name));
    setOpen(false);
  };

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !project) return;
    const text = await file.text();
    const result = parseAndValidate(text, project.id);
    setParseResult(result);
    if (result.template) {
      setDiff(buildDiff(result.template, project));
    } else {
      setDiff(null);
    }
    setOpen(false);
  };

  const onCancelModal = () => {
    setParseResult(null);
    setDiff(null);
  };

  const onConfirmApply = () => {
    if (!parseResult?.template || !project) return;
    const result = applyTemplate(parseResult.template, project.id);
    setParseResult(null);
    setDiff(null);
    if (typeof window !== 'undefined') {
      window.alert(
        `Applied ${result.appliedLayerCount} layer(s) and ${result.appliedNoteCount} project note(s).`,
      );
    }
  };

  const renderModal = () => {
    if (!parseResult) return null;
    const hasErrors = parseResult.errors.length > 0;
    const canApply =
      !hasErrors &&
      parseResult.template !== null &&
      diff !== null &&
      (diff.layers.length > 0 || diff.notes.length > 0);

    return (
      <div className={css.modalBackdrop} role="dialog" aria-modal="true">
        <div className={css.modal}>
          <div className={css.modalHeader}>
            <h2>Review site intelligence import</h2>
            <p>
              {hasErrors
                ? "We couldn't read this template — fix the errors below and try again."
                : 'Confirm the changes the import will apply to this project.'}
            </p>
          </div>
          <div className={css.modalBody}>
            {hasErrors && (
              <div className={css.section}>
                <h3>Errors</h3>
                <ul className={css.errorList}>
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {parseResult.warnings.length > 0 && (
              <div className={css.section}>
                <h3>Warnings</h3>
                <ul className={css.warningList}>
                  {parseResult.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
            {!hasErrors && diff && (
              <>
                <div className={css.section}>
                  <h3>Layers ({diff.layers.length})</h3>
                  {diff.layers.length === 0 ? (
                    <div className={css.empty}>No layer changes.</div>
                  ) : (
                    <ul className={css.diffList}>
                      {diff.layers.map((entry) => (
                        <li key={entry.layerType}>
                          <strong>{entry.layerType}</strong>{' '}
                          <span className={css.before}>
                            {entry.action === 'replace' ? '(replace fetched)' : '(add new)'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className={css.section}>
                  <h3>Project notes ({diff.notes.length})</h3>
                  {diff.notes.length === 0 ? (
                    <div className={css.empty}>No project-note changes.</div>
                  ) : (
                    <ul className={css.diffList}>
                      {diff.notes.map((entry) => (
                        <li key={entry.key}>
                          <strong>{entry.key}</strong>:{' '}
                          <span className={css.before}>
                            {entry.before === null ? '(empty)' : String(entry.before)}
                          </span>
                          <span className={css.after}>
                            {entry.after === null ? '(empty)' : String(entry.after)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
          <div className={css.modalFooter}>
            <button type="button" className={css.cancelBtn} onClick={onCancelModal}>
              Cancel
            </button>
            <button
              type="button"
              className={css.applyBtn}
              onClick={onConfirmApply}
              disabled={!canApply}
            >
              Apply import
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={css.dock} ref={dockRef}>
        {open && (
          <div className={css.popover} role="menu" aria-label="Site intelligence import">
            <button type="button" role="menuitem" className={css.row} onClick={onDownload}>
              <FileDown aria-hidden="true" />
              <span>Download template</span>
            </button>
            <button type="button" role="menuitem" className={css.row} onClick={onPickFile}>
              <FileUp aria-hidden="true" />
              <span>Upload filled template</span>
            </button>
          </div>
        )}
        <button
          type="button"
          className={css.btn}
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          title={
            !projectId
              ? 'Open a project to import site intelligence'
              : isBuiltin
                ? 'Read-only sample project'
                : 'Import site intelligence'
          }
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Upload aria-hidden="true" />
          <span>Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className={css.hidden}
          onChange={onFileChosen}
        />
      </div>
      {renderModal()}
    </>
  );
}
