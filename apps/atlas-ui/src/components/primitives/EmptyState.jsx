import { Link } from "@tanstack/react-router";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "empty",
  size = "md",
  className = "",
}) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 48 : 36;
  const cls = `prim-empty-state prim-empty-state--${size} prim-empty-state--${variant} ${className}`.trim();

  return (
    <div className={cls} role={variant === "error" ? "alert" : undefined}>
      {Icon && (
        <div className="prim-empty-state__icon">
          <Icon size={iconSize} aria-hidden="true" />
        </div>
      )}
      {title && <p className="prim-empty-state__title">{title}</p>}
      {description && <p className="prim-empty-state__desc">{description}</p>}
      {action && (
        action.to ? (
          <Link to={action.to} className="prim-empty-state__cta">{action.label}</Link>
        ) : (
          <button className="prim-empty-state__cta" type="button" onClick={action.onClick}>
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
