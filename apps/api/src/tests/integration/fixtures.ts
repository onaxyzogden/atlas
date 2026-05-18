/**
 * Minimal seed helpers — insert real rows via the harness `sql`. Only the
 * columns the 4 locked surfaces actually need; everything else relies on
 * schema defaults so a migration adding a column never breaks these.
 */

import type { FastifyInstance } from 'fastify';
import type postgres from 'postgres';

let seq = 0;

export async function seedUser(sql: postgres.Sql): Promise<string> {
  const email = `pgtest-user-${Date.now()}-${seq++}@example.com`;
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO users (email, display_name, auth_provider)
    VALUES (${email}, 'Test User', 'local')
    RETURNING id
  `;
  return row!.id;
}

export async function seedOrganization(sql: postgres.Sql): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO organizations (name) VALUES (${`Org ${seq++}`}) RETURNING id
  `;
  return row!.id;
}

export async function seedProject(
  sql: postgres.Sql,
  ownerId: string,
  opts: { name?: string; country?: string; acreage?: number } = {},
): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO projects (owner_id, name, country, acreage)
    VALUES (
      ${ownerId},
      ${opts.name ?? `Project ${seq++}`},
      ${opts.country ?? 'US'},
      ${opts.acreage ?? null}
    )
    RETURNING id
  `;
  return row!.id;
}

export async function seedProjectMember(
  sql: postgres.Sql,
  projectId: string,
  userId: string,
  role: string,
): Promise<void> {
  await sql`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (${projectId}, ${userId}, ${role})
  `;
}

/**
 * A `project_layers` row with fetch_status='complete' so
 * `writeCanonicalAssessment` will score it.
 */
export async function seedCompleteLayer(
  sql: postgres.Sql,
  projectId: string,
  layerType: string,
  summary: Record<string, unknown>,
): Promise<void> {
  await sql`
    INSERT INTO project_layers (
      project_id, layer_type, source_api, fetch_status, confidence, summary_data
    ) VALUES (
      ${projectId}, ${layerType}, 'test_fixture', 'complete', 'medium',
      ${sql.json(summary as never) as unknown as string}
    )
  `;
}

/** Sign a JWT the auth plugin will accept (payload: { sub, email }). */
export function signToken(app: FastifyInstance, userId: string): string {
  return (app as unknown as { jwt: { sign: (p: object, o: object) => string } }).jwt.sign(
    { sub: userId, email: `${userId}@example.com` },
    { expiresIn: '1h' },
  );
}
