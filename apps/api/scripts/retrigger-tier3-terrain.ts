/**
 * One-off: re-enqueue compute_terrain for a project after a widened-column
 * migration landed. Microclimate auto-fires from the terrain worker's tail.
 */
import { Queue } from 'bullmq';
import postgres from 'postgres';

const projectId = process.argv[2];
if (!projectId) { console.error('usage: tsx retrigger-tier3-terrain.ts <projectId>'); process.exit(1); }

const sql = postgres(process.env.DATABASE_URL!);
const connection = { host: 'localhost', port: 6379 };
const queue = new Queue('tier3-terrain', { connection });

await sql`INSERT INTO data_pipeline_jobs (project_id, job_type, status) VALUES (${projectId}, 'compute_terrain', 'queued')`;
await queue.add('compute_terrain', { projectId }, { attempts: 2, backoff: { type: 'exponential', delay: 10000 }, removeOnComplete: 50, removeOnFail: 25 });

console.log('enqueued compute_terrain for', projectId);
await queue.close();
await sql.end();
