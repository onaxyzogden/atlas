/**
 * agentRegistry — Per-role system-prompt registry around ClaudeClient.
 *
 * Phase C.6 of the Apricot Lane Validation Protocol. The protocol asks
 * Atlas to move from a single generic assistant to a small workforce of
 * specialised agents. We do not replace `ClaudeClient`; we wrap it with
 * a thin role registry that composes a per-role system addendum on top
 * of the cached Atlas base prompt and parses an explicit handoff line
 * out of the model's reply.
 *
 * Three roles:
 *   - `agro-designer` — orchards, paddocks, succession, species
 *   - `hydro-engineer` — keylines, swales, ponds, sponge capacity
 *   - `general`       — triage / multi-domain default
 *
 * Handoff protocol:
 *   When the answer belongs to another role, the model is instructed
 *   to end its reply with a single line of the form
 *     HANDOFF: <role> — <one-sentence reason>
 *   The registry parses that line off the reply, returns it on the
 *   `handoff` field, and strips it from `content`. The server does
 *   NOT auto-chain — callers decide whether to act on the handoff.
 */

import { claudeClient } from './ClaudeClient.js';

export type AgentRole = 'agro-designer' | 'hydro-engineer' | 'general';

export interface AgentResponse {
  /** Role that actually produced the answer (post-autoRoute). */
  role: AgentRole;
  /** Model text, with any trailing HANDOFF line stripped. */
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Parsed handoff hint, or null when the model did not request one. */
  handoff: { to: AgentRole; reason: string } | null;
}

export interface RunAgentInput {
  /** Explicit role override; bypasses autoRoute when set. */
  role?: AgentRole;
  /** Default true. When `role` is set this flag is ignored. */
  autoRoute?: boolean;
  /** Pre-built site + user-question text passed to the model. */
  contextText: string;
  /** For logging / observability. Not sent to the model. */
  projectId: string;
}

// ─── Role prompts ────────────────────────────────────────────────────────────

const HANDOFF_INSTRUCTION = `If the answer genuinely belongs to another role, end your reply with a single line \`HANDOFF: <role> — <one-sentence reason>\` where \`<role>\` is exactly \`agro-designer\`, \`hydro-engineer\`, or \`general\`. Do not invent handoffs when none is warranted.`;

const ROLE_PROMPTS: Record<AgentRole, string> = {
  'agro-designer': `You are @Agro-Designer. You specialise in orchard layout, paddock rotations, zone-1→5 planting succession, and species selection. Stay in your lane: water-engineering questions hand off to @Hydro-Engineer. Always cite which layer (soils, land-cover, watershed) informs each recommendation.\n\n${HANDOFF_INSTRUCTION}`,
  'hydro-engineer': `You are @Hydro-Engineer. You specialise in keylines, swales, ponds, sponge-capacity reconciliation, and water-budget math. Stay in your lane: planting / livestock questions hand off to @Agro-Designer. Cite slope, watershed, and soil layers explicitly.\n\n${HANDOFF_INSTRUCTION}`,
  general: `You are the @general triage agent. You answer steward questions directly when they span multiple domains, and hand off to the right specialist when a question is squarely in another role's lane. Always cite the data layers you draw from.\n\n${HANDOFF_INSTRUCTION}`,
};

export function roleSystemAddendum(role: AgentRole): string {
  return ROLE_PROMPTS[role];
}

// ─── Intent routing ──────────────────────────────────────────────────────────

const HYDRO_KEYWORDS = [
  'swale',
  'keyline',
  'pond',
  'water',
  'hydro',
  'runoff',
  'infiltration',
  'drainage',
  'riparian',
  'aquifer',
  'cistern',
  'dam',
  'creek',
  'flood',
];

const AGRO_KEYWORDS = [
  'orchard',
  'paddock',
  'tree',
  'plant',
  'species',
  'crop',
  'pasture',
  'grazing',
  'livestock',
  'rotation',
  'cover crop',
  'compost',
  'silvopasture',
];

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let total = 0;
  for (const kw of keywords) {
    // Word-boundary-aware: escape regex metacharacters, allow spaces in
    // multi-word keywords like "cover crop". `\b` works on alphanumerics
    // and underscores so plain-word keywords get a clean boundary.
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = /\s/.test(kw)
      ? new RegExp(escaped, 'gi')
      : new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = lower.match(pattern);
    if (matches) total += matches.length;
  }
  return total;
}

/**
 * Pure keyword router. Tally case-insensitive word-boundary matches
 * across the hydro + agro keyword sets; the larger tally wins. Ties
 * and zero-zero results fall through to `'general'`.
 */
export function routeIntent(text: string): AgentRole {
  const hydro = countMatches(text, HYDRO_KEYWORDS);
  const agro = countMatches(text, AGRO_KEYWORDS);
  if (hydro > agro) return 'hydro-engineer';
  if (agro > hydro) return 'agro-designer';
  return 'general';
}

// ─── Handoff parser ──────────────────────────────────────────────────────────

const VALID_ROLES: readonly AgentRole[] = ['agro-designer', 'hydro-engineer', 'general'];

function isAgentRole(s: string): s is AgentRole {
  return (VALID_ROLES as readonly string[]).includes(s);
}

/**
 * Parse a trailing `HANDOFF: <role> — <reason>` line out of the model
 * reply. Accepts either em-dash (—) or ASCII double-dash separator;
 * returns null on malformed or absent handoffs and leaves content
 * unchanged in those cases.
 */
export function parseHandoff(raw: string): {
  content: string;
  handoff: { to: AgentRole; reason: string } | null;
} {
  const trimmed = raw.trimEnd();
  const lastNewline = trimmed.lastIndexOf('\n');
  const lastLine = lastNewline >= 0 ? trimmed.slice(lastNewline + 1) : trimmed;

  const match = lastLine.match(/^HANDOFF:\s*([a-z-]+)\s*[—-]+\s*(.+)$/i);
  if (!match) return { content: raw, handoff: null };

  const roleCandidate = (match[1] ?? '').trim().toLowerCase();
  const reason = (match[2] ?? '').trim();
  if (!isAgentRole(roleCandidate) || !reason) {
    return { content: raw, handoff: null };
  }

  const content = lastNewline >= 0 ? trimmed.slice(0, lastNewline).trimEnd() : '';
  return { content, handoff: { to: roleCandidate, reason } };
}

// ─── runAgent ────────────────────────────────────────────────────────────────

/**
 * Resolve the effective role for a request:
 *   explicit `role` > `autoRoute(text)` when enabled > default `'general'`
 */
export function resolveRole(input: RunAgentInput): AgentRole {
  if (input.role) return input.role;
  if (input.autoRoute === false) return 'general';
  return routeIntent(input.contextText);
}

export async function runAgent(input: RunAgentInput): Promise<AgentResponse> {
  const role = resolveRole(input);
  const addendum = roleSystemAddendum(role);
  const result = await claudeClient.chatWithRole({
    roleSystemAddendum: addendum,
    userMessage: input.contextText,
  });
  const { content, handoff } = parseHandoff(result.text);

  return {
    role,
    content,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    handoff,
  };
}
