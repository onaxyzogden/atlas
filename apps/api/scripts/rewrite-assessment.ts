/**
 * Force-rewrite the canonical site_assessment for a project (ignores debounce
 * by first clearing is_current rows' computed_at back far enough).
 * Diagnostic helper for parity drift investigations.
 */
import postgres from 'postgres';
import { writeCanonicalAssessment } from '../src/services/assessments/SiteAssessmentWriter.js';

const projectId = process.argv[2];
if (!projectId) { console.error('usage: tsx rewrite-assessment.ts <projectId>'); process.exit(1); }

const sql = postgres(process.env.DATABASE_URL!);
// Move debounce window so the writer actually runs
await sql`UPDATE site_assessments SET computed_at = now() - interval '1 hour' WHERE project_id = ${projectId} AND is_current = true`;
const res = await writeCanonicalAssessment(sql, projectId);
console.log(res);
await sql.end();
