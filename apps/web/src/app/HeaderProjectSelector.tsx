import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronDown, Check } from 'lucide-react';
import { useProjectStore } from '../store/projectStore.js';
import css from './HeaderProjectSelector.module.css';

interface Props {
  projectId: string;
  currentStage: 'observe' | 'plan' | 'act' | 'report' | null;
}

export default function HeaderProjectSelector({ projectId, currentStage }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const projects = useProjectStore((s) => s.projects);
  const current = projects.find((p) => p.id === projectId || p.serverId === projectId);
  const others = projects
    .filter((p) => p.status !== 'archived' && p.id !== current?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const stage = currentStage ?? 'plan';

  // Close on pointer-down outside
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className={css.root} ref={rootRef}>
      <button
        type="button"
        className={css.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Project: ${current?.name ?? 'Loading'}. Click to switch project.`}
      >
        <span className={css.name}>{current?.name ?? '…'}</span>
        <ChevronDown size={12} className={css.caret} aria-hidden="true" />
      </button>

      {open && (
        <div className={css.popover} role="listbox" aria-label="Switch project">
          <div className={css.currentRow} role="option" aria-selected="true">
            <Check size={12} aria-hidden="true" />
            <span>{current?.name}</span>
          </div>

          {others.length > 0 && (
            <>
              <div className={css.divider} />
              {others.map((p) => (
                <Link
                  key={p.id}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={`/v3/project/${p.id}/${stage}` as any}
                  className={css.projectRow}
                  role="option"
                  aria-selected="false"
                  onClick={() => setOpen(false)}
                >
                  {p.name}
                </Link>
              ))}
            </>
          )}

          <div className={css.divider} />
          <div className={css.footer}>
            <Link to="/v3/portfolio" onClick={() => setOpen(false)}>
              All projects →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
