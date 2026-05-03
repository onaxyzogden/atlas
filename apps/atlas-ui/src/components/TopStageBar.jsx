import { Settings } from "lucide-react";

const defaultSteps = [
  { number: 1, label: "Roots & Diagnosis", active: true },
  { number: 2, label: "Design" },
  { number: 3, label: "Implementation" }
];

export function TopStageBar({
  stage = "Stage 1 of 3",
  module = "Roots & Diagnosis",
  steps = defaultSteps,
  actionLabel = "Project Settings"
}) {
  return (
    <header className="top-stage-bar">
      <div className="stage-title">
        <strong>{stage}</strong>
        <span aria-hidden="true">•</span>
        <em>{module}</em>
      </div>
      <ol className="stage-steps" aria-label="Project stages">
        {steps.map((step) => (
          <li className={step.active ? "is-active" : ""} key={step.number}>
            <b>{step.number}</b>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
      <button className="stage-settings" type="button">
        <Settings aria-hidden="true" />
        {actionLabel}
      </button>
    </header>
  );
}
