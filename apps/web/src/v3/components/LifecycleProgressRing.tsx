/**
 * LifecycleProgressRing — single unifying lifecycle indicator.
 *
 * Replaces the rejected per-stage backdrop tint (Permaculture Scholar:
 * "Integrate Rather Than Segregate" — color-tinting each stage fragments
 * the lifecycle-as-loop). One thin SVG arc shows position in the full
 * loop: Observe → Test → Steward → Evaluate.
 *
 * Visual register: monochrome earth tones, 2px stroke, no animation
 * beyond a soft fill transition when the active stage changes.
 */
import type { LifecycleStage } from "../types.js";

export interface LifecycleProgressRingProps {
  activeStage: LifecycleStage | "home";
  size?: number;
  className?: string;
}

const LOOP_ORDER: readonly (LifecycleStage | "home")[] = [
  "home",
  "discover",
  "diagnose",
  "design",
  "prove",
  "build",
  "operate",
  "report",
];

const STAGE_LABEL: Record<LifecycleStage | "home", string> = {
  home:     "Home",
  discover: "Observe",
  diagnose: "Diagnose",
  design:   "Design",
  prove:    "Test",
  build:    "Build",
  operate:  "Steward",
  report:   "Evaluate",
};

export default function LifecycleProgressRing({
  activeStage,
  size = 28,
  className,
}: LifecycleProgressRingProps) {
  const idx = LOOP_ORDER.indexOf(activeStage);
  const total = LOOP_ORDER.length;
  const fraction = idx < 0 ? 0 : (idx + 1) / total;

  const strokeWidth = 2;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * fraction;

  return (
    <span
      className={className}
      title={`Lifecycle: ${STAGE_LABEL[activeStage]} (${idx + 1}/${total})`}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Lifecycle position: ${STAGE_LABEL[activeStage]}, step ${idx + 1} of ${total}`}
        style={{ display: "block" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(var(--color-earth-600-rgb), 0.20)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--color-earth-600)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 400ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--font-medium)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
        }}
      >
        {STAGE_LABEL[activeStage]} · {idx + 1}/{total}
      </span>
    </span>
  );
}
