/**
 * replayEvidenceAudit.cli — thin Node entrypoint for the Phase G.2 sweep.
 *
 * Usage:
 *   pnpm --filter @ogden/api evidence:replay -- --all-since 2026-05-21T00:00:00Z
 *
 * Exit codes:
 *   0  — all rows in the window replayed byte-identically
 *   1  — at least one row mismatched (selector / hash / output drift)
 *   2  — bad arguments (missing or invalid --all-since)
 */

import postgres from 'postgres';
import { config } from '../lib/config.js';
import { replayEvidenceAuditSince } from './replayEvidenceAudit.js';

function parseArgs(argv: readonly string[]): { sinceIso: string } {
  const idx = argv.indexOf('--all-since');
  if (idx === -1 || idx + 1 >= argv.length) {
    process.stderr.write(
      'usage: evidence:replay -- --all-since <ISO-8601 timestamp>\n',
    );
    process.exit(2);
  }
  const value = argv[idx + 1]!;
  if (Number.isNaN(new Date(value).getTime())) {
    process.stderr.write(`error: invalid --all-since value: ${value}\n`);
    process.exit(2);
  }
  return { sinceIso: value };
}

async function main(): Promise<void> {
  const { sinceIso } = parseArgs(process.argv.slice(2));
  const sql = postgres(config.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
    onnotice: () => {},
  });
  try {
    const result = await replayEvidenceAuditSince(sql, sinceIso);
    for (const f of result.failures) {
      process.stderr.write(
        `[FAIL] ${f.rowId} panel=${f.panelKey} reason=${f.reason}${
          f.detail ? ` ${f.detail}` : ''
        }\n`,
      );
    }
    process.stdout.write(
      `OK ${result.okRows} / FAIL ${result.failRows} / TOTAL ${result.totalRows} since ${sinceIso}\n`,
    );
    process.exit(result.failRows === 0 ? 0 : 1);
  } finally {
    await sql.end();
  }
}

void main().catch((err: unknown) => {
  process.stderr.write(
    `fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
