export function AppShell({ children, className = "" }) {
  return <div className={`olos-shell ${className}`}>{children}</div>;
}
