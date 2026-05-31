// VisionFormModal.tsx
//
// Text-capture popup for non-spatial Act tier-shell checklist items (kind:
// 'form' tools). One modal instance is rendered by ActTierShell and reused
// across all form-arm tools; `formId` + `prompt` change on each open.
//
// State is held by the parent (ActTierShell.formValues) so text survives
// objective switching and re-opening the modal within a session. Full
// cross-session persistence in planStratumStore is a follow-up slice.

import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal.js';
import styles from './VisionFormModal.module.css';

interface VisionFormModalProps {
  open: boolean;
  formId: string;
  prompt: string;
  placeholder?: string;
  /** Text previously saved for this formId -- pre-populates the textarea. */
  initialValue: string;
  onSave: (formId: string, text: string) => void;
  onClose: () => void;
}

export default function VisionFormModal({
  open,
  formId,
  prompt,
  placeholder,
  initialValue,
  onSave,
  onClose,
}: VisionFormModalProps) {
  const [draft, setDraft] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const labelId = useId();

  // Re-sync draft whenever a different form opens (formId change) or the
  // modal re-opens with potentially-updated initialValue.
  useEffect(() => {
    if (open) {
      setDraft(initialValue);
    }
  }, [open, formId, initialValue]);

  // Autofocus the textarea when the modal opens.
  useEffect(() => {
    if (open) {
      // Defer one tick so the Modal portal finishes mounting.
      const id = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  function handleSave() {
    const text = draft.trim();
    if (!text) return;
    onSave(formId, text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter / Cmd+Enter saves without leaving the textarea.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  const canSave = draft.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={prompt}
      size="md"
      footer={
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancel
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
      <div className={styles.body}>
        <label id={labelId} className={styles.hint}>
          {canSave ? 'Ctrl+Enter to save' : 'Enter your response below'}
        </label>
        <textarea
          ref={textareaRef}
          aria-labelledby={labelId}
          className={styles.textarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={6}
          spellCheck
        />
      </div>
    </Modal>
  );
}
