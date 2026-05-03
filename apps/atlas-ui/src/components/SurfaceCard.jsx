export function SurfaceCard({ as: Element = "section", className = "", children, ...props }) {
  return (
    <Element className={`surface-card ${className}`} {...props}>
      {children}
    </Element>
  );
}
