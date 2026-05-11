/**
 * Payload-builder helpers for export-PDF dashboards.
 *
 * The Observe per-module export handlers (Topography · Earth · Water ·
 * Ecology · Macroclimate · …) walk filtered store arrays and shape
 * each entry into a Zod-validated payload slice. The store types use
 * `T | null` for optionals; the Zod schemas use `.optional()` which
 * accepts `undefined` — so a payload object should *omit* a key
 * entirely when its source is null/undefined.
 *
 * Before these helpers existed, each call site spread a chain of
 * conditional objects:
 *
 *     ...(x.ph != null ? { ph: x.ph } : {}),
 *     ...(x.notes ? { notes: x.notes } : {}),
 *
 * `pickDefined` covers the `!= null` branch; `pickTruthy` covers the
 * truthy branch. Use them as `{ ...required, ...pickDefined(src, [...]) }`.
 */

/**
 * Include each requested key only if its value is not null/undefined.
 * Returns a partial object suitable for spreading into a Zod-optional
 * payload slice.
 */
export function pickDefined<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): { [P in K]?: NonNullable<T[P]> } {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = obj[k];
    if (v != null) out[k as string] = v;
  }
  return out as { [P in K]?: NonNullable<T[P]> };
}

/**
 * Include each requested key only if its value is truthy. Use for
 * optional booleans / counts / strings where `false`, `0`, and `''`
 * mean "not set" — typically optional flags or labels in store rows.
 */
export function pickTruthy<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): { [P in K]?: T[P] } {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = obj[k];
    if (v) out[k as string] = v;
  }
  return out as { [P in K]?: T[P] };
}
