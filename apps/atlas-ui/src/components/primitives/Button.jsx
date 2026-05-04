import { forwardRef } from "react";

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", as: Element = "button", className = "", children, type, ...props },
  ref,
) {
  const cls = `prim-btn prim-btn--${variant} prim-btn--${size} ${className}`.trim();
  const extra = Element === "button" ? { type: type ?? "button" } : {};
  return (
    <Element ref={ref} className={cls} {...extra} {...props}>
      {children}
    </Element>
  );
});
