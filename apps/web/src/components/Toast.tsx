/**
 * Lightweight toast notification system.
 * Uses a Zustand store for state + a React component for rendering.
 *
 * Usage:
 *   import { toast } from '../components/Toast';
 *   toast.success('Project created');
 *   toast.error('Failed to save');
 *   toast.info('Boundary updated');
 */

import { create } from 'zustand';
import { useEffect } from 'react';
import { zIndex } from '../lib/tokens.js';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  add: (type: ToastType, message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (type, message, duration = 4000) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ─── Public API (importable without React) ───────────────────────────────────

export const toast = {
  success: (msg: string, duration?: number) => useToastStore.getState().add('success', msg, duration),
  error: (msg: string, duration?: number) => useToastStore.getState().add('error', msg, duration ?? 6000),
  info: (msg: string, duration?: number) => useToastStore.getState().add('info', msg, duration),
  warning: (msg: string, duration?: number) => useToastStore.getState().add('warning', msg, duration ?? 5000),
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const ICON: Record<ToastType, string> = {
  success: '\u2713',
  error: '\u2717',
  info: '\u24D8',
  warning: '\u26A0',
};

const BG: Record<ToastType, string> = {
  success: 'var(--color-confidence-high, #2d7a4f)',
  error: 'var(--color-confidence-low, #9b3a2a)',
  info: 'var(--color-water-500, #3d7f9e)',
  warning: 'var(--color-confidence-medium, #8a6d1e)',
};

// ─── Single Toast ────────────────────────────────────────────────────────────

function ToastItem({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, dismiss]);

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 'var(--radius-md, 8px)',
        background: BG[item.type],
        color: '#fff',
        fontSize: 13,
        fontFamily: 'var(--font-sans, sans-serif)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        animation: 'toast-slide-in 200ms ease',
        cursor: 'pointer',
        maxWidth: 360,
        wordBreak: 'break-word',
      }}
      onClick={() => dismiss(item.id)}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{ICON[item.type]}</span>
      <span>{item.message}</span>
    </div>
  );
}

// ─── Toast Container (mount once in App) ─────────────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 64,
          right: 16,
          zIndex: zIndex.toast,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem item={t} />
          </div>
        ))}
      </div>
    </>
  );
}
