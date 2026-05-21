import { useEffect, useState } from 'react';
import { Modal } from './Modal.js';

export interface ConfirmDestructiveDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  tone: 'warn' | 'danger';
  /**
   * If provided, the user must type this exact string for the confirm
   * button to enable. Used by `danger` tone for hard-delete flows so a
   * casual click cannot wipe a project.
   */
  typedConfirmation?: string;
}

export function ConfirmDestructiveDialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel,
  tone,
  typedConfirmation,
}: ConfirmDestructiveDialogProps) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setTyped('');
      setBusy(false);
    }
  }, [open]);

  const gateOk = !typedConfirmation || typed === typedConfirmation;
  const confirmDisabled = busy || !gateOk;

  const handleConfirm = async () => {
    if (confirmDisabled) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--border, #334155)',
              background: 'transparent',
              color: 'inherit',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background:
                tone === 'danger'
                  ? confirmDisabled
                    ? '#7f1d1d'
                    : '#dc2626'
                  : confirmDisabled
                    ? '#78350f'
                    : '#d97706',
              color: '#fff',
              cursor: confirmDisabled ? 'not-allowed' : 'pointer',
              opacity: confirmDisabled ? 0.55 : 1,
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>{body}</div>
        {typedConfirmation && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Type{' '}
              <code
                style={{
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.08)',
                }}
              >
                {typedConfirmation}
              </code>{' '}
              to confirm.
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--border, #334155)',
                background: 'rgba(0,0,0,0.25)',
                color: 'inherit',
                fontFamily: 'monospace',
              }}
            />
          </label>
        )}
      </div>
    </Modal>
  );
}
