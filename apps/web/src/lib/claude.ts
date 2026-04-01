/**
 * Claude API client for Atlas AI.
 *
 * Proxies all requests through the backend at /api/v1/ai/chat.
 * The Anthropic API key is stored server-side — never in the browser.
 */

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
  const response = await fetch('/api/v1/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      systemPrompt,
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    const msg = err?.error?.message ?? `API error ${response.status}`;
    throw new Error(msg);
  }

  const { data } = await response.json() as {
    data: { content: string; model: string; inputTokens: number; outputTokens: number };
  };

  return data;
}
