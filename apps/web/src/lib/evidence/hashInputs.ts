/**
 * hashInputs — F.4 reproducibility anchor.
 *
 * Computes a stable SHA-256 hash of an arbitrary selector input so two
 * renders that fed the same inputs into `selectEvidenceFor(...)` write
 * the SAME `input_hash` row to `evidence_audit_log`. The replay tool
 * (deferred) consults the hash to reproduce historical Evidence emissions.
 *
 * Stability requires deterministic JSON serialization: object keys are
 * sorted recursively before stringification so `{a:1,b:2}` and `{b:2,a:1}`
 * hash equal. Arrays preserve order (they ARE ordered data).
 */

/**
 * Deterministic JSON serializer — sorts object keys recursively so
 * key-order is not a hash-input.
 *
 * NaN / Infinity / -Infinity collapse to `null` (matching JSON.stringify
 * default semantics). Functions and `undefined` are dropped from objects
 * and become `null` inside arrays (also matching JSON.stringify).
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      const v = obj[k];
      if (typeof v === 'function' || v === undefined) continue;
      out[k] = canonicalize(v);
    }
    return out;
  }
  return value;
}

/**
 * SHA-256 hex of stableStringify(input). Returns a 64-char lowercase
 * hex string. Uses `crypto.subtle.digest` — available in modern browsers
 * and in Node 18+ via the WebCrypto global.
 */
export async function hashInputs(input: unknown): Promise<string> {
  const text = stableStringify(input);
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const view = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < view.length; i += 1) {
    hex += view[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}
