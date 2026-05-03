import { ArrowRight } from "lucide-react";

export function ActionCard({ className = "", icon, title, body, art, action }) {
  return (
    <button className={`action-card ${className}`} type="button">
      {icon ? <span className="action-icon">{icon}</span> : null}
      <span className="action-copy">
        <strong>{title}</strong>
        {body ? <span>{body}</span> : null}
      </span>
      {art}
      {action ? <ArrowRight className="action-arrow" /> : null}
    </button>
  );
}
