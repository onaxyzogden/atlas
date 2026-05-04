import { forwardRef } from "react";

export const IconButton = forwardRef(function IconButton(
  { variant = "ghost", size = "md", label, className = "", children, type, ...props },
  ref,
) {
  const cls = `prim-icon-btn prim-icon-btn--${variant} prim-icon-btn--${size} ${className}`.trim();
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cls}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
});
