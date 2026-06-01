// VisionFormsTabsModal.tsx
//
// Tabbed text-capture popup for the Act tier-shell kind:'form' tools. Replaces
// the one-textarea VisionFormModal at the mount point: clicking ANY form tile in
// a category opens THIS single popup with one tab per form tool in that category,
// focused on the clicked tool's tab. The steward can fill every field in the
// category without re-opening.
//
// State/persistence is unchanged from VisionFormModal: the parent's onSave writes
// text to actEvidenceStore (saveVisionForm) and marks the checklist item complete
// (planStratumProgressStore). Saving a tab does NOT close the popup -- the steward
// continues to other tabs; Esc / click-outside / the X close it (Modal handles).
//
// Per-tab draft state is kept in a Record keyed by formId so switching tabs never
// loses unsaved edits. Drafts are (re)seeded from the saved values only on the
// closed->open transition, so saving one tab never wipes unsaved edits in others.

import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal.js';
import { Tabs } from '../../../components/ui/Tabs.js';
import type { ActTool, ActToolArm } from './actToolCatalog.js';
import styles from './VisionFormsTabsModal.module.css';

type FormArm = Extract<ActToolArm, { kind: 'form' }>;
type FormTool = ActTool & { arm: FormArm };

interface VisionFormsTabsModalProps {
  open: boolean;
  /** Category label, shown as the modal title (e.g. "Vision & Setup"). */
  title: string;
  /** The kind:'form' tools in the clicked tool's category (one tab each). */
  tools: ActTool[];
  /** Which tab (formId) is currently shown. */
  activeFormId: string;
  /** Saved text keyed by formId -- pre-populates each tab's textarea. */
  initialValues: Record<string, string>;
  onTabChange: (formId: string) => void;
  onSave: (formId: string, text: string) => void;
  onClose: () => void;
}

export default function VisionFormsTabsModal({
  open,
  title,
  tools,
  activeFormId,
  initialValues,
  onTabChange,
  onSave,
  onClose,
}: VisionFormsTabsModalProps) {
  const formTools = tools.filter((t): t is FormTool => t.arm.kind === 'form');

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasOpen = useRef(false);
  const hintId = useId();

  // Seed per-tab drafts from saved values on the closed->open transition only.
  // Reseeding on every initialValues change would wipe unsaved edits in other
  // tabs after one tab is saved (saving updates the store -> initialValues prop).
  useEffect(() => {
    if (open && !wasOpen.current) {
      const seed: Record<string, string> = {};
      for (const t of formTools) {
        seed[t.arm.formId] = initialValues[t.arm.formId] ?? '';
      }
      setDrafts(seed);
    }
    wasOpen.current = open;
  }, [open, formTools, initialValues]);

  // Autofocus the active tab's textarea when the popup opens or the tab changes.
  useEffect(() => {
    if (open) {
      // Defer one tick so the Modal portal / panel finishes mounting.
      const id = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open, activeFormId]);

  function setDraft(formId: string, text: string) {
    setDrafts((d) => ({ ...d, [formId]: text }));
  }

  function handleSave() {
    const text = (drafts[activeFormId] ?? '').trim();
    if (!text) return;
    onSave(activeFormId, text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter / Cmd+Enter saves the active tab without leaving the textarea.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  const canSave = (drafts[activeFormId] ?? '').trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!canSave}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      }
    >
      <Tabs value={activeFormId} onChange={onTabChange}>
        <Tabs.List className={styles.tabList}>
          {formTools.map((tool) => {
            const Icon = tool.icon;
            const captured = (initialValues[tool.arm.formId] ?? '').length > 0;
            return (
              <Tabs.Tab key={tool.arm.formId} value={tool.arm.formId}>
                <span className={styles.tabLabel}>
                  <Icon size={14} aria-hidden />
                  {tool.label}
                  {captured ? (
                    <span className={styles.capturedDot} aria-hidden />
                  ) : null}
                </span>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {formTools.map((tool) => (
          <Tabs.Panel key={tool.arm.formId} value={tool.arm.formId}>
            <div className={styles.body}>
              <label id={hintId} className={styles.prompt}>
                {tool.arm.prompt}
              </label>
              <textarea
                ref={tool.arm.formId === activeFormId ? textareaRef : undefined}
                aria-labelledby={hintId}
                className={styles.textarea}
                value={drafts[tool.arm.formId] ?? ''}
                onChange={(e) => setDraft(tool.arm.formId, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tool.arm.placeholder}
                rows={6}
                spellCheck
              />
              <span className={styles.hint}>
                {canSave ? 'Ctrl+Enter to save' : 'Enter your response above'}
              </span>
            </div>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Modal>
  );
}
