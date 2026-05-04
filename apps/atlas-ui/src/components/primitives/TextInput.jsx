import { forwardRef, useId } from "react";

export const TextInput = forwardRef(function TextInput(
  { label, error, hint, id, className = "", ...props },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={`prim-field ${error ? "prim-field--error" : ""} ${className}`.trim()}>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <input
        ref={ref}
        id={inputId}
        className="prim-input"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {error ? <p id={errorId} className="prim-field__error">{error}</p> : null}
      {hint && !error ? <p id={hintId} className="prim-field__hint">{hint}</p> : null}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, id, className = "", rows = 4, ...props },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={`prim-field ${error ? "prim-field--error" : ""} ${className}`.trim()}>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className="prim-input prim-textarea"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {error ? <p id={errorId} className="prim-field__error">{error}</p> : null}
      {hint && !error ? <p id={hintId} className="prim-field__hint">{hint}</p> : null}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, id, className = "", children, ...props },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={`prim-field ${error ? "prim-field--error" : ""} ${className}`.trim()}>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <select
        ref={ref}
        id={inputId}
        className="prim-input prim-select"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...props}
      >
        {children}
      </select>
      {error ? <p id={errorId} className="prim-field__error">{error}</p> : null}
      {hint && !error ? <p id={hintId} className="prim-field__hint">{hint}</p> : null}
    </div>
  );
});
