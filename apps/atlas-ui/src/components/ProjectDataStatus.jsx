import { AlertTriangle, RefreshCw } from "lucide-react";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";

export function ProjectDataStatus({ className = "" }) {
  const { status, retry } = useBuiltinProject();
  if (status !== "error") return null;
  return (
    <div className={`project-data-status ${className}`.trim()} role="alert">
      <AlertTriangle aria-hidden="true" />
      <span>
        <strong>Live data unavailable.</strong>
        <small>Showing static sample. The project service didn't respond.</small>
      </span>
      <button type="button" onClick={retry}>
        <RefreshCw aria-hidden="true" /> Retry
      </button>
    </div>
  );
}
