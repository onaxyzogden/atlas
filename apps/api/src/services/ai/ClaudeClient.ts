/**
 * ClaudeClient — Phase 3 stub.
 *
 * The AIOutput type is defined in @ogden/shared and already used by
 * frontend components. This client fills it in Phase 3.
 * No redesign needed when Phase 3 arrives.
 */

import type { AIOutput, AIEnrichmentRequest, AIEnrichmentResponse } from '@ogden/shared';

export class ClaudeClient {
  // Phase 3: inject Anthropic SDK client here
  // import Anthropic from '@anthropic-ai/sdk';

  async generateSiteNarrative(_projectId: string): Promise<AIOutput> {
    throw new Error('AI analysis is not enabled. Set FEATURE_AI=true to enable Phase 3 features.');
  }

  async generateDesignRecommendation(_projectId: string, _context: string): Promise<AIOutput> {
    throw new Error('AI analysis is not enabled. Set FEATURE_AI=true to enable Phase 3 features.');
  }

  async enrichAssessmentFlags(_request: AIEnrichmentRequest): Promise<AIEnrichmentResponse> {
    throw new Error('AI analysis is not enabled. Set FEATURE_AI=true to enable Phase 3 features.');
  }
}

export class AnalysisGuardrails {
  /**
   * Enforce AI output standards from Section 0d of the product spec:
   * - Every output has a confidence level
   * - Low-confidence outputs include a caveat
   * - Outputs below Medium confidence trigger needsSiteVisit = true
   * - No hallucinated specifics (cost figures, regulatory determinations)
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
