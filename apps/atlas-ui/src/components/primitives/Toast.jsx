import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant, message, opts = {}) => {
    const id = ++idRef.current;
    const duration = opts.duration ?? DEFAULT_DURATION;
    setToasts((current) => [...current, { id, variant, message }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (msg, opts) => push("success", msg, opts),
    warning: (msg, opts) => push("warning", msg, opts),
    error:   (msg, opts) => push("error", msg, opts),
    info:    (msg, opts) => push("info", msg, opts),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== "undefined" ? createPortal(
        <div className="prim-toast-stack" role="region" aria-label="Notifications">
          {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
        </div>,
        document.body,
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const Icon = ICONS[toast.variant] ?? Info;
  return (
    <div className={`prim-toast prim-toast--${toast.variant}`} role="status">
      <Icon aria-hidden="true" />
      <span>{toast.message}</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

