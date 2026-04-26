/**
 * ClaudeClient — Server-side Anthropic Messages client.
 *
 * Uses fetch directly (not the SDK) to match the existing `/api/v1/ai/chat` proxy
 * pattern and keep the backend dependency-light. The API key is read from
 * `config.ANTHROPIC_API_KEY`; callers must check `isConfigured()` or catch
 * `AI_NOT_CONFIGURED` before invoking any generation method.
 *
 * Three public methods:
 *   - generateSiteNarrative(projectId, contextText)
 *   - generateDesignRecommendation(projectId, contextText)
 *   - enrichAssessmentFlags(request)
 *
 * All three use the same structured-response envelope (CONFIDENCE / DATA_SOURCES
 * / NEEDS_SITE_VISIT / CAVEAT + `---` + content) that the frontend
 * `aiEnrichment.ts` parser expects, so server-generated outputs are drop-in
 * compatible with the UI parsing layer.
 *
 * Prompt caching (`cache_control: { type: 'ephemeral' }`) is applied to the
 * system prompt, which is large and stable across requests. Model is pinned
 * to Claude Sonnet 4 (20250514) to match the `/ai/chat` proxy.
 */

import { randomUUID } from 'node:crypto';
import type {
  AIOutput,
  AIEnrichmentRequest,
  AIEnrichmentResponse,
  AssessmentFlag,
  EnrichedAssessmentFlag,
  ConfidenceLevel,
} from '@ogden/shared';
import { config } from '../../lib/config.js';
import { AppError } from '../../lib/errors.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL_ID = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2048;
const REQUEST_TIMEOUT_MS = 60_000;

// ─── System prompt (shared, cacheable) ───────────────────────────────────────

const SYSTEM_PROMPT = `You are Atlas, a land intelligence agent helping restoration-minded stewards understand the properties they are evaluating. You analyze real geospatial data — soils, elevation, watershed, climate, wetlands, zoning, land cover — and translate it into plain, contemplative language.

Core principles:
- Cite specific data values from the layers provided. Do not invent numbers, regulations, or determinations.
- If the data is sparse or conflicting, label your confidence honestly (low / medium / high).
- Flag when an on-site visit is genuinely required — do not default to "needs site visit" when the data is clear.
- Respect the covenant framing of the work: this is stewardship, not extraction.
- Never produce cost figures, legal conclusions, or engineering certifications. Those require a qualified professional.
- Keep language grounded and specific to THIS property. No generic permaculture advice.`;

// ─── Task templates (match frontend aiEnrichment.ts prompts) ─────────────────

const NARRATIVE_TASK = `Generate a 2-3 paragraph site narrative for this property. Write in contemplative, plain language — as if describing the land to someone who will steward it. Cover:
1. What this land IS (terrain, soils, hydrology, ecology)
2. What it WANTS (natural tendencies, restoration needs)
3. Its PRIMARY CONSTRAINTS (regulatory, physical, climatic)

Cite specific data values from the layers provided. Do not invent data.

Respond in this exact format:
CONFIDENCE: high|medium|low
DATA_SOURCES: comma-separated list of data layers you drew from
NEEDS_SITE_VISIT: true|false
CAVEAT: optional caveat text, or "none"
---
(your narrative paragraphs here)`;

const RECOMMENDATION_TASK = `Generate 3-5 prioritized design interventions for this property, given its project type and site conditions. Each recommendation must:
- Name the intervention clearly
- Cite which data layer(s) informed it
- Explain WHY it fits this specific land
- Note any prerequisites or phasing considerations

Order by priority. Be specific to THIS property — not generic permaculture advice.

Respond in this exact format:
CONFIDENCE: high|medium|low
DATA_SOURCES: comma-separated list of data layers you drew from
NEEDS_SITE_VISIT: true|false
CAVEAT: optional caveat text, or "none"
---
(your numbered recommendations here)`;

const ENRICHMENT_TASK = `For each assessment flag below, provide a 1-2 sentence AI narrative explaining its significance for this specific property. Also provide an overall site synthesis paragraph (2-3 sentences) that connects the dots between flags.

Respond in this exact format:
CONFIDENCE: high|medium|low
DATA_SOURCES: comma-separated list of data layers you drew from
NEEDS_SITE_VISIT: true|false
CAVEAT: optional caveat text, or "none"
---
FLAG: [flag_id]
[1-2 sentence narrative]

FLAG: [flag_id]
[1-2 sentence narrative]

SYNTHESIS:
[2-3 sentence overall synthesis]`;

// ─── Response parsing (mirrors frontend parseStructuredResponse) ─────────────

interface ParsedMeta {
  confidence: ConfidenceLevel;
  dataSources: string[];
  needsSiteVisit: boolean;
  caveat?: string;
  content: string;
}

function parseStructuredResponse(raw: string): ParsedMeta {
  const divider = raw.indexOf('\n---');
  const metaBlock = divider >= 0 ? raw.slice(0, divider) : '';
  const content = divider >= 0 ? raw.slice(divider + 4).trim() : raw.trim();

  let confidence: ConfidenceLevel = 'medium';
  let dataSources: string[] = [];
  let needsSiteVisit = true;
  let caveat: string | undefined;

  for (const line of metaBlock.split('\n')) {
    const t = line.trim();
    if (t.startsWith('CONFIDENCE:')) {
      const v = t.slice(11).trim().toLowerCase();
      if (v === 'high' || v === 'medium' || v === 'low') confidence = v;
    } else if (t.startsWith('DATA_SOURCES:')) {
      dataSources = t.slice(13).trim().split(',').map((s) => s.trim()).filter(Boolean);
    } else if (t.startsWith('NEEDS_SITE_VISIT:')) {
      needsSiteVisit = t.slice(17).trim().toLowerCase() !== 'false';
    } else if (t.startsWith('CAVEAT:')) {
      const v = t.slice(7).trim();
      if (v && v.toLowerCase() !== 'none') caveat = v;
    }
  }
  return { confidence, dataSources, needsSiteVisit, caveat, content };
}

// ─── Anthropic API call ──────────────────────────────────────────────────────

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessageResponse {
  content: AnthropicContentBlock[];
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
}

/**
 * POST to the Anthropic Messages API. System prompt is sent as a
 * cacheable block (prompt caching) to reduce cost on repeated tasks.
 */
async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ text: string; model: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: MAX_TOKENS,
        system: [
          // Prompt caching on the stable system prompt (Sonnet supports cache_control)
          { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      const msg = err?.error?.message ?? `Anthropic API error ${response.status}`;
      throw new AppError('AI_API_ERROR', msg, 502);
    }

    const data = (await response.json()) as AnthropicMessageResponse;
    const text = data.content
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text as string)
      .join('\n');

    return { text, model: data.model };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('AI_TIMEOUT', 'Anthropic API request timed out', 504);
    }
    throw new AppError('AI_NETWORK', `Anthropic API request failed: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

export interface GenerationInput {
  projectId: string;
  /** Pre-built context string describing the site's layers and metadata. */
  contextText: string;
}

export class ClaudeClient {
  constructor(private readonly apiKey: string | undefined = config.ANTHROPIC_API_KEY) {}

  isConfigured(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.length > 0;
  }

  private requireKey(): string {
    if (!this.isConfigured()) {
      throw new AppError(
        'AI_NOT_CONFIGURED',
        'AI features are not configured. Set ANTHROPIC_API_KEY in the server environment.',
        503,
      );
    }
    return this.apiKey as string;
  }

  async generateSiteNarrative(input: GenerationInput): Promise<AIOutput> {
    const key = this.requireKey();
    const system = `${SYSTEM_PROMPT}\n\n${NARRATIVE_TASK}`;
    const { text, model } = await callAnthropic(key, system, input.contextText);
    const parsed = parseStructuredResponse(text);

    return AnalysisGuardrails.validate({
      outputId: randomUUID(),
      projectId: input.projectId,
      outputType: 'site_narrative',
      content: parsed.content,
      confidence: parsed.confidence,
      dataSources: parsed.dataSources,
      computedAt: new Date().toISOString(),
      caveat: parsed.caveat,
      needsSiteVisit: parsed.needsSiteVisit,
      generatedAt: new Date().toISOString(),
      modelId: model,
    });
  }

  async generateDesignRecommendation(input: GenerationInput): Promise<AIOutput> {
    const key = this.requireKey();
    const system = `${SYSTEM_PROMPT}\n\n${RECOMMENDATION_TASK}`;
    const { text, model } = await callAnthropic(key, system, input.contextText);
    const parsed = parseStructuredResponse(text);

    return AnalysisGuardrails.validate({
      outputId: randomUUID(),
      projectId: input.projectId,
      outputType: 'design_recommendation',
      content: parsed.content,
      confidence: parsed.confidence,
      dataSources: parsed.dataSources,
      computedAt: new Date().toISOString(),
      caveat: parsed.caveat,
      needsSiteVisit: parsed.needsSiteVisit,
      generatedAt: new Date().toISOString(),
      modelId: model,
    });
  }

  async enrichAssessmentFlags(request: AIEnrichmentRequest): Promise<AIEnrichmentResponse> {
    const key = this.requireKey();

    if (request.flags.length === 0) {
      return {
        enrichedFlags: [],
        siteSynthesis: undefined,
        generatedAt: new Date().toISOString(),
        modelId: MODEL_ID,
      };
    }

    const system = `${SYSTEM_PROMPT}\n\n${ENRICHMENT_TASK}`;
    const userMessage = buildEnrichmentUserMessage(request);
    const { text, model } = await callAnthropic(key, system, userMessage);
    const parsed = parseStructuredResponse(text);

    const enrichedFlags: EnrichedAssessmentFlag[] = request.flags.map((flag) => {
      const pattern = new RegExp(
        `FLAG:\\s*\\[?${escapeRegex(flag.id)}\\]?\\s*\\n([\\s\\S]*?)(?=\\nFLAG:|\\nSYNTHESIS:|$)`,
      );
      const match = parsed.content.match(pattern);
      const aiNarrative = match?.[1]?.trim() || undefined;
      return {
        ...flag,
        aiNarrative,
        aiConfidence: aiNarrative ? parsed.confidence : undefined,
      };
    });

    const synthMatch = parsed.content.match(/SYNTHESIS:\s*\n([\s\S]*?)$/);
    const siteSynthesis = synthMatch?.[1]?.trim() || undefined;

    return {
      enrichedFlags,
      siteSynthesis,
      generatedAt: new Date().toISOString(),
      modelId: model,
    };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildEnrichmentUserMessage(request: AIEnrichmentRequest): string {
  const flagLines = request.flags.map(
    (f: AssessmentFlag) =>
      `- [${f.id}] (${f.type}, ${f.severity}, ${f.category}) ${f.message}${f.layerSource ? ` [source: ${f.layerSource}]` : ''}`,
  );

  const layerLines: string[] = [];
  for (const [layer, summary] of Object.entries(request.layerSummaries)) {
    const keys = Object.keys(summary).slice(0, 8).join(', ');
    layerLines.push(`- ${layer}: ${keys}`);
  }

  return [
    `Project: ${request.projectId}`,
    `Country: ${request.country}`,
    '',
    'Layer summaries (field keys available):',
    layerLines.join('\n'),
    '',
    'Assessment Flags:',
    flagLines.join('\n'),
  ].join('\n');
}

// ─── Guardrails ──────────────────────────────────────────────────────────────

export class AnalysisGuardrails {
  /**
   * Enforce AI output standards from Section 0d of the product spec:
   * - Every output has a confidence level (already enforced by schema)
   * - Low-confidence outputs include a caveat
   * - Outputs below Medium confidence trigger needsSiteVisit = true
   * - No hallucinated specifics (enforced by the prompt, not structurally here)
   */
  static validate(output: AIOutput): AIOutput {
    const validated = { ...output };

    if (validated.confidence === 'low' && !validated.caveat) {
      validated.caveat =
        'This analysis is based on limited data. Results should be verified on-site by a qualified professional.';
    }

    if (validated.confidence !== 'high') {
      validated.needsSiteVisit = true;
    }

    return validated;
  }
}

// Singleton convenience for the route layer.
export const claudeClient = new ClaudeClient();
