/**
 * ObservedStamp — quiet "last observed N days ago" timestamp.
 *
 * Replaces the rejected live-pulse dot from the Emergent concept mockups
 * (Permaculture Scholar: violates "Use Small and Slow Solutions"). Uses the
 * `.observed-stamp` utility from chrome.css for the dot + typography.
 */
import "../styles/chrome.css";

export interface ObservedStampProps {
  /** ISO timestamp or Date or epoch ms. */
  at: string | Date | number;
  /** Optional override label, e.g. "synced". Default: "observed". */
  verb?: string;
  className?: string;
}

function relativePhrase(then: Date, now: Date): string {
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return "just now";
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  if (diffMs < minute) return "moments ago";
  if (diffMs < hour) return `${Math.round(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.round(diffMs / hour)} hr ago`;
  if (diffMs < week) return `${Math.round(diffMs / day)} days ago`;
  if (diffMs < month) return `${Math.round(diffMs / week)} wk ago`;
  const months = Math.round(diffMs / month);
  return months >= 12 ? `${Math.round(months / 12)} yr ago` : `${months} mo ago`;
}

export default function ObservedStamp({
  at,
  verb = "observed",
  className,
}: ObservedStampProps) {
  const then = typeof at === "string" || typeof at === "number" ? new Date(at) : at;
  const now = new Date();
  const phrase = relativePhrase(then, now);
  const cls = className ? `observed-stamp ${className}` : "observed-stamp";
  return (
    <span className={cls} title={then.toLocaleString()}>
      {verb} {phrase}
    </span>
  );
}
