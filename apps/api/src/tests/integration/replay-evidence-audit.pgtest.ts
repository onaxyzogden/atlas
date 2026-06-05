/**
 * replay-evidence-audit.pgtest.ts — Phase G.3 reproducibility integration test.
 *
 * Exercises `replayEvidenceAuditSince` against a real `evidence_audit_log`
 * inside the integration testcontainer. The test is self-cleaning: it
 * seeds its own user + project + audit rows in `beforeAll`, asserts the
 * replay sweeps cleanly, tampers one row to prove drift detection, and
 * relies on `resetDb` (project CASCADE → audit rows) in `afterEach`/
 * `afterAll`.
 *
 * Why the FIXTURES exist in this file rather than in `fixtures.ts`:
 * they're representative *inputs* for three selectors, not minimal seed
 * rows — they need to round-trip through the actual selector at insert
 * time so the stored `evidence_output` is provably consistent with
 * current code. Lifting them into the shared fixtures file would invite
 * reuse for unrelated suites that would then drift them.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type postgres from 'postgres';
import {
  selectEvidenceFor,
  hashInputs,
  type EvidenceDispatchInputs,
} from '@ogden/shared/evidence';
import {
  INTEGRATION_ENABLED,
  getHarness,
  resetDb,
  closeHarness,
} from './harness.js';
import { seedUser, seedProject } from './fixtures.js';
import { replayEvidenceAuditSince } from '../../scripts/replayEvidenceAudit.js';

// Three representative selectors — covers a Tier-1 verdict path, the
// permaculture three-ethics rollup, and the capital-partner export.
const FIXTURES: EvidenceDispatchInputs[] = [
  {
    panelKey: 'land-verdict',
    inputs: {
      overallScore: 72,
      layers: [
        { layerType: 'soil', confidence: 'high' },
        { layerType: 'hydrology', confidence: 'medium' },
      ],
      topFlags: [],
      country: 'US',
    },
  },
  {
    panelKey: 'three-ethics',
    inputs: {
      perEthicStatus: {
        'earth-care': 'met',
        'people-care': 'partial',
        'fair-share': 'unmet',
      },
      perEthicFeatureCount: {
        'earth-care': 4,
        'people-care': 2,
        'fair-share': 0,
      },
      perEthicRationale: {
        'earth-care': '3 met · 1 partial · 0 unmet across 4 principles',
      },
      principleCheckCount: 12,
    },
  },
  {
    panelKey: 'capital-partner',
    inputs: {
      totalCapitalUsd: 250_000,
      enterpriseCount: 3,
      costLineItemCount: 18,
      revenueStreamCount: 4,
      natCapUsdYr: 12_500,
      natCapUsdPerTc: 50,
      troughYear: 2,
      troughValueUsd: -75_000,
      breakevenYear: 6,
      somHasTrajectory: true,
      somHorizonYears: 20,
      missionScore: 78,
      pdfAssumptionCount: 15,
    },
  },
];

describe.skipIf(!INTEGRATION_ENABLED)(
  'replayEvidenceAuditSince (real evidence_audit_log)',
  () => {
    let sql: postgres.Sql;
    let projectId: string;
    let insertedIds: string[] = [];
    let sinceIso: string;

    beforeAll(async () => {
      ({ sql } = await getHarness());
      await resetDb(sql);
    });

    afterEach(async () => {
      insertedIds = [];
      await resetDb(sql);
    });

    afterAll(async () => {
      await closeHarness();
    });

    async function seedAuditRows(): Promise<void> {
      sinceIso = new Date(Date.now() - 60_000).toISOString();
      const ownerId = await seedUser(sql);
      projectId = await seedProject(sql, ownerId, { name: 'Replay Proj' });
      for (const bundle of FIXTURES) {
        const item = selectEvidenceFor(bundle);
        const inputHash = await hashInputs(bundle.inputs);
        const [row] = await sql<{ id: string }[]>`
          INSERT INTO evidence_audit_log (
            project_id, panel_key, input_hash, input_payload,
            selector_name, evidence_output, created_by
          ) VALUES (
            ${projectId},
            ${bundle.panelKey},
            ${inputHash},
            ${sql.json(bundle.inputs as never) as unknown as string},
            ${`select-${bundle.panelKey}`},
            ${sql.json(item as never) as unknown as string},
            ${ownerId}
          )
          RETURNING id
        `;
        insertedIds.push(row!.id);
      }
    }

    it('reports OK on freshly-seeded rows (no drift)', async () => {
      await seedAuditRows();
      const r = await replayEvidenceAuditSince(sql, sinceIso);
      expect(r.failRows).toBe(0);
      expect(r.okRows).toBeGreaterThanOrEqual(FIXTURES.length);
      expect(r.failures).toEqual([]);
    });

    it('reports output-mismatch when a row is tampered', async () => {
      await seedAuditRows();
      const tamperedId = insertedIds[0]!;
      await sql`
        UPDATE evidence_audit_log
        SET evidence_output = ${sql.json({
          panelKey: 'tampered',
          summary: { label: 'x', value: 0 },
          evidence: [],
        } as never) as unknown as string}
        WHERE id = ${tamperedId}
      `;
      const r = await replayEvidenceAuditSince(sql, sinceIso);
      expect(r.failRows).toBeGreaterThanOrEqual(1);
      expect(
        r.failures.some(
          (f) => f.rowId === tamperedId && f.reason === 'output-mismatch',
        ),
      ).toBe(true);
    });

    it('reports hash-mismatch when input_hash is corrupted', async () => {
      await seedAuditRows();
      const tamperedId = insertedIds[1]!;
      const wrongHash = '0'.repeat(64);
      await sql`
        UPDATE evidence_audit_log
        SET input_hash = ${wrongHash}
        WHERE id = ${tamperedId}
      `;
      const r = await replayEvidenceAuditSince(sql, sinceIso);
      expect(
        r.failures.some(
          (f) => f.rowId === tamperedId && f.reason === 'hash-mismatch',
        ),
      ).toBe(true);
    });
  },
);
