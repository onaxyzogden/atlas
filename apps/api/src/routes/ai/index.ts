/**
 * AI proxy route — relays chat messages to the Anthropic API from the backend,
 * keeping the API key server-side. Replaces the dangerous direct-browser-access
 * pattern that was in apps/web/src/lib/claude.ts.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../../lib/config.js';
import { AppError } from '../../lib/errors.js';

import { AIEnrichmentRequest } from '@ogden/shared';
import { claudeClient } from '../../services/ai/ClaudeClient.js';

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(32000),
    }),
  ).min(1),
  systemPrompt: z.string().max(64000),
});

export default async function aiRoutes(fastify: FastifyInstance) {
  const { authenticate } = fastify;

  // POST /ai/chat — proxy chat to Anthropic Messages API
  fastify.post('/chat', { preHandler: [authenticate] }, async (req) => {
    if (!config.ANTHROPIC_API_KEY) {
      throw new AppError('AI_NOT_CONFIGURED', 'AI features are not configured. Set ANTHROPIC_API_KEY in the server environment.', 503);
    }

    const body = ChatRequestSchema.parse(req.body);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: body.systemPrompt,
        messages: body.messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      const msg = err?.error?.message ?? `Anthropic API error ${response.status}`;
      throw new AppError('AI_API_ERROR', msg, 502);
    }

    const data = await response.json() as {
      content: { type: string; text: string }[];
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    return {
      data: {
        content: text,
        model: data.model,
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
      meta: undefined,
      error: null,
    };
  });

  // POST /ai/enrich-assessment — Phase 3 stub for AI-enriched assessment flags
  fastify.post('/enrich-assessment', { preHandler: [authenticate] }, async (req) => {
    if (!config.ANTHROPIC_API_KEY) {
      throw new AppError('AI_NOT_CONFIGURED', 'AI features are not configured. Set ANTHROPIC_API_KEY in the server environment.', 503);
    }

    const body = AIEnrichmentRequest.parse(req.body);
    const result = await claudeClient.enrichAssessmentFlags(body);
    return {
      data: result,
      meta: undefined,
      error: null,
    };
  });
}
