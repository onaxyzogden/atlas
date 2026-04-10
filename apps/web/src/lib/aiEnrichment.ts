/**
 * AI Enrichment Service — generates site narrative, design recommendations,
 * and assessment flag enrichment via the /api/v1/ai/chat proxy.
 *
 * All functions return null on failure (never throw). Callers use
 * existing pure-function outputs as fallback when null is returned.
 */

import type { AIOutput, AIEnrichmentResponse, AssessmentFlag, ConfidenceLevel } from '@ogden/shared';
import { sendMessage } from './claude.js';
import { buildProjectContext, SYSTEM_PROMPT } from '../features/ai/ContextBuilder.js';
import { useSiteDataStore } from '../store/siteDataStore.js';
import { useProjectStore } from '../store/projectStore.js';
import { deriveOpportunities, deriveRisks } from './computeScores.js';

// ── Response Parsing ─────────────────────────────────────────────────────

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
    const trimmed = line.trim();
    if (trimmed.startsWith('CONFIDENCE:')) {
      const val = trimmed.slice(11).trim().toLowerCase();
      if (val === 'high' || val === 'medium' || val === 'low') {
        confidence = val;
      }
    } else if (trimmed.startsWith('DATA_SOURCES:')) {
      dataSources = trimmed.slice(13).trim().split(',').map((s) => s.trim()).filter(Boolean);
    } else if (trimmed.startsWith('NEEDS_SITE_VISIT:')) {
      needsSiteVisit = trimmed.slice(17).trim().toLowerCase() !== 'false';
    } else if (trimmed.startsWith('CAVEAT:')) {
      const val = trimmed.slice(7).trim();
      if (val && val.toLowerCase() !== 'none') caveat = val;
    }
  }

  return { confidence, dataSources, needsSiteVisit, caveat, content };
}

/**
 * Inline guardrail validation matching AnalysisGuardrails.validate() from
 * ClaudeClient.ts (which lives in the API package and can't be imported here).
 */
function validateGuardrails(output: AIOutput): AIOutput {
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

// ── Site Narrative ───────────────────────────────────────────────────────

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

export async function generateSiteNarrative(projectId: string): Promise<AIOutput | null> {
  try {
    const siteData = useSiteDataStore.getState().dataByProject[projectId];
    const realLayers = siteData?.layers ?? [];
    const projectContext = buildProjectContext(projectId, realLayers);
    const systemPrompt = `${SYSTEM_PROMPT}\n\n${NARRATIVE_TASK}`;
    const userMessage = projectContext;

    const response = await sendMessage(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
    );

    const parsed = parseStructuredResponse(response.content);

    const output: AIOutput = {
      outputId: crypto.randomUUID(),
      projectId,
      outputType: 'site_narrative',
      content: parsed.content,
      confidence: parsed.confidence,
      dataSources: parsed.dataSources,
      computedAt: new Date().toISOString(),
      caveat: parsed.caveat,
      needsSiteVisit: parsed.needsSiteVisit,
      generatedAt: new Date().toISOString(),
      modelId: response.model,
    };

    return validateGuardrails(output);
  } catch (err) {
    console.warn('[ATLAS AI] Site narrative generation failed:', err);
    return null;
  }
}

// ── Design Recommendation ────────────────────────────────────────────────

const RECOMMENDATION_TASK = `Generate 3-5 prioritized design interventions for this property, given its project type and site conditions. Each recommendation must:
- Name the intervention clearly
- Cite which data layer(s) informed it (e.g., "Based on soil data: Loam, pH 6.1-6.8")
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

export async function generateDesignRecommendation(projectId: string): Promise<AIOutput | null> {
  try {
    const siteData = useSiteDataStore.getState().dataByProject[projectId];
    const realLayers = siteData?.layers ?? [];
    const projectContext = buildProjectContext(projectId, realLayers);
    const systemPrompt = `${SYSTEM_PROMPT}\n\n${RECOMMENDATION_TASK}`;
    const userMessage = projectContext;

    const response = await sendMessage(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
    );

    const parsed = parseStructuredResponse(response.content);

    const output: AIOutput = {
      outputId: crypto.randomUUID(),
      projectId,
      outputType: 'design_recommendation',
      content: parsed.content,
      confidence: parsed.confidence,
      dataSources: parsed.dataSources,
      computedAt: new Date().toISOString(),
      caveat: parsed.caveat,
      needsSiteVisit: parsed.needsSiteVisit,
      generatedAt: new Date().toISOString(),
      modelId: response.model,
    };

    return validateGuardrails(output);
  } catch (err) {
    console.warn('[ATLAS AI] Design recommendation generation failed:', err);
    return null;
  }
}

// ── Assessment Enrichment ────────────────────────────────────────────────

function buildFlagContext(projectId: string): { flags: AssessmentFlag[]; text: string } {
  const siteData = useSiteDataStore.getState().dataByProject[projectId];
  const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
  const layers = siteData?.layers ?? [];
  const country = project?.country ?? 'US';

  const opportunities = deriveOpportunities(layers, country);
  const risks = deriveRisks(layers, country);
  const allFlags = [...opportunities, ...risks];

  const lines = allFlags.map(
    (f) => `- [${f.id}] (${f.type}, ${f.severity}, ${f.category}) ${f.message}${f.layerSource ? ` [source: ${f.layerSource}]` : ''}`,
  );

  return { flags: allFlags, text: lines.join('\n') };
}

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

export async function enrichAssessmentFlags(projectId: string): Promise<AIEnrichmentResponse | null> {
  try {
    const siteData = useSiteDataStore.getState().dataByProject[projectId];
    const realLayers = siteData?.layers ?? [];
    const projectContext = buildProjectContext(projectId, realLayers);
    const { flags, text: flagText } = buildFlagContext(projectId);

    if (flags.length === 0) return null;

    const systemPrompt = `${SYSTEM_PROMPT}\n\n${ENRICHMENT_TASK}`;
    const userMessage = `${projectContext}\n\nAssessment Flags:\n${flagText}`;

    const response = await sendMessage(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
    );

    const parsed = parseStructuredResponse(response.content);

    // Parse per-flag narratives and synthesis from content
    const enrichedFlags = flags.map((flag) => {
      const flagPattern = new RegExp(`FLAG:\\s*\\[?${flag.id}\\]?\\s*\\n([\\s\\S]*?)(?=\\nFLAG:|\\nSYNTHESIS:|$)`);
      const match = parsed.content.match(flagPattern);
      const aiNarrative = match?.[1]?.trim() || undefined;

      return {
        ...flag,
        aiNarrative,
        aiConfidence: aiNarrative ? parsed.confidence : undefined,
      };
    });

    // Extract synthesis
    const synthMatch = parsed.content.match(/SYNTHESIS:\s*\n([\s\S]*?)$/);
    const siteSynthesis = synthMatch?.[1]?.trim() || undefined;

    return {
      enrichedFlags,
      siteSynthesis,
      generatedAt: new Date().toISOString(),
      modelId: response.model,
    };
  } catch (err) {
    console.warn('[ATLAS AI] Assessment enrichment failed:', err);
    return null;
  }
}
