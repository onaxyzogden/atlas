/**
 * matchLivestockFulfillment — generalize the RotationScheduleCard ±7-day
 * auto-fulfilment pattern across ALL livestock work on the spine.
 *
 * Two work shapes, two evidence pools:
 *
 *   MOVE-SHAPED  (row carries a `direction`) — proved by an actual
 *   livestock-move event with the SAME species AND the SAME destination
 *   (paddock or structure) dated within ±windowDays of the due anchor.
 *   Mirrors the legacy scheduled-move matcher exactly.
 *
 *   CHECK-SHAPED (no direction; the livestock-plan care/cadence layer) —
 *   proved by a check-proof record (caller-adapted: maintenance events,
 *   typed proof records, …) matched on provenance — `sourceProtocolId`
 *   when both sides carry one, else `kind` — within the same date window.
 *
 * Determinism contract (record-keeping only — this module never mutates):
 *   - earliest-unfulfilled first: work rows are processed in dueDate order
 *     (id tiebreak), so when one event could prove two overdue rows the
 *     oldest obligation is the one retired.
 *   - first-match-wins: per work row, candidates are scanned in event-date
 *     order (id tiebreak) and the first one inside the window is taken —
 *     same semantics as the legacy `.find` matcher.
 *   - one event proves at most ONE work row: a candidate consumed by an
 *     earlier row leaves the pool; candidates already carrying a
 *     `workItemId` back-link never enter it.
 *
 * The caller (web `useLivestockFulfillmentSync`) owns all writes, routing
 * each match through the existing single completion writers
 * (`confirmTypedProofMatch` / `fulfilWorkItem`) — the sovereign-steward
 * spine discipline is untouched: this matches RECORDS of work the operator
 * already confirmed against RECORDS of execution the operator already
 * logged. Nothing here creates work and nothing here invents evidence.
 */

/** Due work as the matcher sees it (caller pre-filters to live rows). */
export interface MatchableWorkRow {
  id: string;
  /** YYYY-MM-DD due anchor (caller derives: scheduledEnd ?? scheduledStart). */
  dueDate: string;
  /** Present ⇒ move-shaped; absent ⇒ check-shaped. */
  direction?: string;
  species?: string;
  /** Destination refs for move-shaped rows (target.toId split by kind). */
  toPaddockId?: string;
  toStructureId?: string;
  /** Provenance for check-shaped rows. */
  sourceProtocolId?: string;
  kind?: string;
}

/** An actual livestock-move event (destination already legacy-resolved). */
export interface MatchableMoveEvent {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  species: string;
  toPaddockId?: string;
  toStructureId?: string;
  /** Already proving another row → excluded from the pool. */
  workItemId?: string;
}

/** A check-proof record, adapted by the caller from whichever log fits. */
export interface MatchableCheckProof {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  sourceProtocolId?: string;
  /** LivestockWorkKind-compatible tag (caller maps e.g. maintenance actions). */
  kind?: string;
  workItemId?: string;
}

export interface LivestockFulfillmentMatch {
  workItemId: string;
  eventId: string;
  shape: 'move' | 'check';
  /** Signed event-minus-due day offset (the variance the UI surfaces). */
  offsetDays: number;
}

export interface MatchLivestockFulfillmentInput {
  work: ReadonlyArray<MatchableWorkRow>;
  moveEvents?: ReadonlyArray<MatchableMoveEvent>;
  checkProofs?: ReadonlyArray<MatchableCheckProof>;
  /** Inclusive half-window in days. Default 7 (legacy scheduled-move). */
  windowDays?: number;
}

const DEFAULT_WINDOW_DAYS = 7;
const MS_PER_DAY = 86_400_000;

/** Signed whole-day difference b − a between two YYYY-MM-DD strings (UTC). */
function daysBetween(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  return Math.round((tb - ta) / MS_PER_DAY);
}

function byDateThenId(
  a: { date: string; id: string },
  b: { date: string; id: string },
): number {
  return a.date === b.date
    ? a.id < b.id
      ? -1
      : a.id > b.id
        ? 1
        : 0
    : a.date < b.date
      ? -1
      : 1;
}

function moveMatches(work: MatchableWorkRow, ev: MatchableMoveEvent): boolean {
  if (work.toPaddockId) {
    if (ev.toPaddockId !== work.toPaddockId) return false;
  } else if (work.toStructureId) {
    if (ev.toStructureId !== work.toStructureId) return false;
  } else {
    // A move row with no destination ref is unmatchable evidence-side.
    return false;
  }
  return !work.species || ev.species === work.species;
}

function checkMatches(
  work: MatchableWorkRow,
  proof: MatchableCheckProof,
): boolean {
  // Provenance precedence: protocol identity when both sides carry one
  // (the strongest claim), else kind equality. A proof with NEITHER axis in
  // common never matches — date proximity alone is not evidence.
  if (work.sourceProtocolId && proof.sourceProtocolId) {
    return work.sourceProtocolId === proof.sourceProtocolId;
  }
  if (work.kind && proof.kind) return work.kind === proof.kind;
  return false;
}

export function matchLivestockFulfillment(
  input: MatchLivestockFulfillmentInput,
): LivestockFulfillmentMatch[] {
  const windowDays = input.windowDays ?? DEFAULT_WINDOW_DAYS;

  // Earliest-unfulfilled first (id tiebreak ⇒ deterministic on input order).
  const work = [...input.work].sort((a, b) =>
    byDateThenId(
      { date: a.dueDate, id: a.id },
      { date: b.dueDate, id: b.id },
    ),
  );

  const movePool = (input.moveEvents ?? [])
    .filter((e) => !e.workItemId)
    .sort(byDateThenId);
  const checkPool = (input.checkProofs ?? [])
    .filter((p) => !p.workItemId)
    .sort(byDateThenId);
  const consumed = new Set<string>();

  const matches: LivestockFulfillmentMatch[] = [];

  for (const row of work) {
    if (row.direction) {
      for (const ev of movePool) {
        if (consumed.has(ev.id)) continue;
        const offset = daysBetween(row.dueDate, ev.date);
        if (Math.abs(offset) > windowDays) continue;
        if (!moveMatches(row, ev)) continue;
        consumed.add(ev.id);
        matches.push({
          workItemId: row.id,
          eventId: ev.id,
          shape: 'move',
          offsetDays: offset,
        });
        break; // first-match-wins
      }
    } else {
      for (const proof of checkPool) {
        if (consumed.has(proof.id)) continue;
        const offset = daysBetween(row.dueDate, proof.date);
        if (Math.abs(offset) > windowDays) continue;
        if (!checkMatches(row, proof)) continue;
        consumed.add(proof.id);
        matches.push({
          workItemId: row.id,
          eventId: proof.id,
          shape: 'check',
          offsetDays: offset,
        });
        break;
      }
    }
  }

  return matches;
}
