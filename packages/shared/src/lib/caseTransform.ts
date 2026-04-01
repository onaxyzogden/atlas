/**
 * Snake_case <-> camelCase transformation utilities.
 *
 * PostgreSQL returns snake_case columns, but our Zod schemas and
 * frontend code expect camelCase. These functions bridge the gap.
 */

/** Convert a single snake_case string to camelCase */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert a single camelCase string to snake_case */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Recursively transform all keys of an object from snake_case to camelCase */
export function toCamelCase<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map((item) => toCamelCase(item)) as T;
  if (typeof obj !== 'object') return obj as T;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[snakeToCamel(key)] = toCamelCase(value);
  }
  return result as T;
}

/** Recursively transform all keys of an object from camelCase to snake_case */
export function toSnakeCase<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map((item) => toSnakeCase(item)) as T;
  if (typeof obj !== 'object') return obj as T;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[camelToSnake(key)] = toSnakeCase(value);
  }
  return result as T;
}
