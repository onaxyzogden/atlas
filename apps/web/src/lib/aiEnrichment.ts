/**
 * AI Enrichment Service — site narrative, design recommendations, and
 * assessment flag enrichment.
 *
 * Narrative + recommendation now go through the server's
 * POST /ai/project/:id/generate-outputs route (server-side context build,
 * prompts, guardrails, and ai_outputs persistence — single prompt source,
 * no client/server drift). Flag enrichment still composes its context
 * client-side via the /api/v1/ai/chat proxy because the flags themselves
 * are derived in the browser from local layer data.
 *
 * All functions return null on failure (never throw). Callers use
 * existing pure-function outputs as fallback when null is returned.
 */

import type { AIOutput, AIEnrichmentResponse, AssessmentFlag, ConfidenceLevel } from '@ogden/shared';
import { sendMessage } from './claude.js';
import { api, type ServerAiOutputRow, type ServerAiOutputType } from './apiClient.js';
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

// ── Server-side generation (narrative + recommendation) ─────────────────
// The prompts, guardrails, and ai_outputs persistence live in the API's
// ClaudeClient — this is just transport + row→AIOutput mapping. The server
// debounces (rows fresher than ~5 min are returned, not re-generated), so
// repeat calls are cheap.

function rowToAIOutput(localProjectId: string, row: ServerAiOutputRow): AIOutput {
  return {
    outputId: row.id,
    // Keep the LOCAL project id — callers key UI state by it, not by the
    // server id the row carries.
    projectId: localProjectId,
    outputType: row.outputType,
    content: row.content,
    confidence: row.confidence,
    dataSources: row.dataSources,
    computedAt: row.generatedAt,
    caveat: row.caveat ?? undefined,
    needsSiteVisit: row.needsSiteVisit,
    generatedAt: row.generatedAt,
    modelId: row.modelId,
  };
}

async function generateServerOutput(
  projectId: string,
  outputType: ServerAiOutputType,
): Promise<AIOutput | null> {
  try {
    const serverId = useProjectStore
      .getState()
      .projects.find((p) => p.id === projectId)?.serverId;
    if (!serverId) {
      // Local-only project: the server has no layer rows to build context
      // from. Callers fall back to pure-function outputs.
      console.warn(`[ATLAS AI] ${outputType} skipped — project ${projectId} has no server id`);
      return null;
    }

    const { data } = await api.ai.generateOutputs(serverId, [outputType]);
    const row = data?.[outputType];
    if (!row) return null;
    return rowToAIOutput(projectId, row);
  } catch (err) {
    console.warn(`[ATLAS AI] ${outputType} generation failed:`, err);
    return null;
  }
}

// ── Site Narrative ───────────────────────────────────────────────────────

export async function generateSiteNarrative(projectId: string): Promise<AIOutput | null> {
  return generateServerOutput(projectId, 'site_narrative');
}

// ── Design Recommendation ────────────────────────────────────────────────

export async function generateDesignRecommendation(projectId: string): Promise<AIOutput | null> {
  return generateServerOutput(projectId, 'design_recommendation');
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
