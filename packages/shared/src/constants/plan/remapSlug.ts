// remapSlug.ts
//
// Single source of truth for the Tier -> Stratum identifier renumber
// (OLOS Dev Change Note "Stratum Renaming", Approach B). The Plan-stage
// spine was renumbered from "Tier 0-6" to "Stratum 1-7": every embedded
// slug token `t{n}` becomes `s{n+1}`. These pure helpers are imported by
// BOTH the shared catalogue/relationship constants AND the apps/web
// persisted-store migrations so the two cannot drift.
//
// Design guarantees (covered by remapSlug.test.ts):
//   - totality      : never throws; an off-pattern id passes through unchanged
//   - injectivity   : no two distinct old slugs map to the same new slug
//   - tier-bijection: t0->s1, t1->s2, ... t6->s7
//   - idempotency   : re-running on an already-migrated `s{n}` id is a no-op
//
// Pass-through is the safety backstop: ids in other namespaces (the OLOS
// `{domain}--{stage}` catalogue, project-type ids, tension ids) contain no
// leading/`-`-delimited `t{n}` token, so they are returned verbatim.

/**
 * Remap a stratum/tier identifier token of the form `t{n}-<name>` to
 * `s{n+1}-<name>`. Also handles a bare `t{n}` token (some field-action
 * fixtures store the bare tier token). Any other string passes through
 * unchanged.
 *
 *   remapTierId('t0-project-foundation') === 's1-project-foundation'
 *   remapTierId('t6-phasing-resourcing') === 's7-phasing-resourcing'
 *   remapTierId('t0')                     === 's1'
 *   remapTierId('vision-intent--plan')    === 'vision-intent--plan'  // pass-through
 */
export function remapTierId(id: string): string {
  const full = /^t(\d+)-(.*)$/.exec(id);
  if (full) return `s${Number(full[1]) + 1}-${full[2]}`;
  const bare = /^t(\d+)$/.exec(id);
  if (bare) return `s${Number(bare[1]) + 1}`;
  return id;
}

/**
 * Remap any objective / checklist-item id by rewriting the FIRST
 * hyphen-delimited `t{n}` token to `s{n+1}` while preserving an optional
 * prefix (`rf-`, `ev-`, `res-`), the semantic name, and any suffix
 * (`-c1`, `-pres-1`).
 *
 *   remapId('t0-vision')                        === 's1-vision'
 *   remapId('t0-vision-c1')                     === 's1-vision-c1'
 *   remapId('rf-t1-landscape-context')          === 'rf-s2-landscape-context'
 *   remapId('rf-t1-landscape-context-pres-1')   === 'rf-s2-landscape-context-pres-1'
 *   remapId('vision-intent--plan--1')           === 'vision-intent--plan--1'  // pass-through
 */
export function remapId(id: string): string {
  return id.replace(
    /(^|-)t(\d+)(?=-|$)/,
    (_m, sep: string, n: string) => `${sep}s${Number(n) + 1}`,
  );
}

/**
 * Remap an uppercase catalogue reference code: the `-T{n}.` segment becomes
 * `-S{n+1}.`. Handles plain and cross-reference (`RES>U-`) forms.
 *
 *   remapRef('U-T0.1')      === 'U-S1.1'
 *   remapRef('RF-T1.6')     === 'RF-S2.6'
 *   remapRef('EV-T6.9')     === 'EV-S7.9'
 *   remapRef('RES>U-T3.2')  === 'RES>U-S4.2'
 */
export function remapRef(ref: string): string {
  return ref.replace(/-T(\d+)\./g, (_m, n: string) => `-S${Number(n) + 1}.`);
}
