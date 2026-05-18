/**
 * Sentinel file — the only reliable channel from Vitest `globalSetup` (main
 * process) to the forked test workers. `globalSetup` `process.env` mutations
 * do NOT propagate to `forks` workers, so the testcontainer connection URL
 * (or a skip marker) is written to a JSON file in `os.tmpdir()` and read
 * synchronously at `harness.ts` import time.
 */

import { join } from 'path';
import { tmpdir } from 'os';

export const SENTINEL_PATH = join(tmpdir(), 'ogden-api-pgtest-sentinel.json');

export interface Sentinel {
  /** true → integration suite green-skips (Docker absent / container failed). */
  skipped: boolean;
  reason?: string;
  /** Set only when `skipped` is false. */
  databaseUrl?: string;
}
