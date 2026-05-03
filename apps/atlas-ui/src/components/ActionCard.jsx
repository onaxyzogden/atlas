import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function ActionCard({ className = "", icon, title, body, art, action, to }) {
  const inner = (
    <>
      {icon ? <span className="action-icon">{icon}</span> : null}
      <span className="action-copy">
        <strong>{title}</strong>
        {body ? <span>{body}</span> : null}
      </span>
      {art}
      {action ? <ArrowRight className="action-arrow" /> : null}
    </>
  );
  if (to) return <Link to={to} className={`action-card ${className}`}>{inner}</Link>;
  return <button className={`action-card ${className}`} type="button">{inner}</button>;
}
