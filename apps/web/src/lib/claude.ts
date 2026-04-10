/**
 * Claude API client for Atlas AI.
 *
 * Proxies all requests through the backend at /api/v1/ai/chat.
 * The Anthropic API key is stored server-side — never in the browser.
 * Auth token is injected automatically via apiClient.
 */

import { api } from './apiClient.js';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Send a message to Claude via the backend AI proxy.
 * Returns the assistant's response text.
 */
export async function sendMessage(
  messages: ClaudeMessage[],
  systemPrompt: string,
  signal?: AbortSignal,
): Promise<ClaudeResponse> {
  const envelope = await api.ai.chat(
    messages.map((m) => ({ role: m.role, content: m.content })),
    systemPrompt,
    signal,
  );
  return envelope.data;
}
