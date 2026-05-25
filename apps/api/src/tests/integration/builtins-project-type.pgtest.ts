/**
 * builtins-project-type.pgtest.ts — regression lock for the invalid
 * `project_type = 'farm'` builtin seed (migrations 029 / 032).
 *
 * The projects.project_type column is plain text (no DB constraint), but the
 * API parses every row through the ProjectSummary Zod schema, whose ProjectType
 * enum only allows regenerative_farm | retreat_center | homestead |
 * educational_farm | conservation | multi_enterprise | moontrance. A row with
 * 'farm' therefore made the PUBLIC GET /api/v1/projects/builtins endpoint throw
 * a ZodError → 422 for any list containing such a row.
 *
 * Seeds 029/032 are now corrected to 'regenerative_farm' for fresh DBs, and
 * forward migration 042 repairs already-migrated DBs. This test proves all
 * three facts end-to-end against a real PostGIS container:
 *   1. A builtin with the corrected 'regenerative_farm' type → 200.
 *   2. A legacy 'farm' builtin reproduces the 422 regression.
 *   3. Running the real 042 migration file repairs that row → 200.
 *
 * Self-seeding and order-independent: resetDb() truncates the migration-seeded
 * builtins, so this never depends on them surviving a prior pgtest's TRUNCATE.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { FastifyInstance } from 'fastify';
import type postgres from 'postgres';
import {
  INTEGRATION_ENABLED,
  getHarness,
  resetDb,
  closeHarness,
} from './harness.js';
import { seedUser, seedOrganization } from './fixtures.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_042 = resolve(
  __dirname,
  '../../db/migrations/042_fix_farm_project_type.sql',
);

async function seedBuiltin(
  sql: postgres.Sql,
  projectType: string,
): Promise<string> {
  const ownerId = await seedUser(sql);
  const orgId = await seedOrganization(sql);
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO projects (owner_id, org_id, name, country, is_builtin, project_type)
    VALUES (${ownerId}, ${orgId}, 'Builtin Showcase', 'US', true, ${projectType})
    RETURNING id
  `;
  return row!.id;
}

describe.skipIf(!INTEGRATION_ENABLED)(
  'GET /api/v1/projects/builtins — project_type enum conformance',
  () => {
    let app: FastifyInstance;
    let sql: postgres.Sql;

    beforeAll(async () => {
      ({ app, sql } = await getHarness());
    });

    beforeEach(async () => {
      await resetDb(sql);
    });

    afterAll(async () => {
      await closeHarness();
    });

    it('returns 200 for a builtin with the corrected regenerative_farm type', async () => {
      await seedBuiltin(sql, 'regenerative_farm');

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/builtins',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { data: Array<{ projectType: string }> };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]!.projectType).toBe('regenerative_farm');
    });

    it('reproduces the 422 regression for a legacy farm row, then 042 repairs it', async () => {
      await seedBuiltin(sql, 'farm');

      // The bug: 'farm' is not in the ProjectType enum, so the public list
      // endpoint throws a ZodError → 422.
      const broken = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/builtins',
      });
      expect(broken.statusCode).toBe(422);

      // Apply the real forward migration that repairs already-migrated DBs.
      await sql.unsafe(readFileSync(MIGRATION_042, 'utf-8'));

      const repaired = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/builtins',
      });
      expect(repaired.statusCode).toBe(200);
      const body = repaired.json() as { data: Array<{ projectType: string }> };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]!.projectType).toBe('regenerative_farm');

      const [{ count }] = await sql<{ count: string }[]>`
        SELECT count(*)::text AS count FROM projects WHERE project_type = 'farm'
      `;
      expect(count).toBe('0');
    });
  },
);
