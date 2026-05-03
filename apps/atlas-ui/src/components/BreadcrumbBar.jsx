import { CheckCircle2, ChevronRight, Save } from "lucide-react";

export function BreadcrumbBar({ items, primaryAction = "Save", secondaryAction = "Save draft" }) {
  return (
    <header className="breadcrumb-bar">
      <nav aria-label="Breadcrumb">
        {items.map((item, index) => (
          <span key={item}>
            {item}
            {index < items.length - 1 ? <ChevronRight aria-hidden="true" /> : null}
          </span>
        ))}
      </nav>
      <div className="breadcrumb-actions">
        {secondaryAction ? (
          <button className="text-action" type="button">
            <CheckCircle2 aria-hidden="true" />
            {secondaryAction}
          </button>
        ) : null}
        {primaryAction ? (
          <button className="save-button" type="button">
            <Save aria-hidden="true" />
            {primaryAction}
          </button>
        ) : null}
      </div>
    </header>
  );
}
