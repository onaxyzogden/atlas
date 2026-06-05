/**
 * Agent registry tests — Phase C.6.
 *
 * Covers:
 *  - `routeIntent` pure function (no fetch): keyword scoring, ties,
 *    case-insensitivity, word-boundary rules.
 *  - `runAgent` role composition: assert request body `system` is a
 *    2-element array — `[0]` is the cached Atlas base prompt, `[1]` is
 *    the per-role addendum.
 *  - Handoff parsing: positive case, no-handoff case, malformed case.
 *  - `ClaudeClient.chatWithRole` direct unit test: verifies the
 *    multi-block system array is constructed and forwarded.
 *
 * Pattern matches `ClaudeClient.test.ts` (global fetch stub via
 * `vi.stubGlobal('fetch', mockFetch)`).
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import {
  routeIntent,
  parseHandoff,
  resolveRole,
  runAgent,
  roleSystemAddendum,
} from '../services/ai/agentRegistry.js';
import { ClaudeClient, SYSTEM_PROMPT, claudeClient } from '../services/ai/ClaudeClient.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
beforeEach(() => mockFetch.mockReset());

// The module-level singleton reads `config.ANTHROPIC_API_KEY` at load
// time, which is undefined in the test env. Override once so the
// configured-key gate passes and we can exercise the network layer.
beforeAll(() => {
  (claudeClient as unknown as { apiKey: string }).apiKey = 'sk-ant-test';
});

function anthropicResponse(text: string, model = 'claude-sonnet-4-20250514') {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text }],
      model,
      usage: { input_tokens: 100, output_tokens: 200 },
    }),
  };
}

// ─── routeIntent ─────────────────────────────────────────────────────────────

describe('routeIntent', () => {
  it('routes hydro-keyword text to hydro-engineer', () => {
    expect(routeIntent('build a swale system')).toBe('hydro-engineer');
    expect(routeIntent('design a keyline for runoff infiltration')).toBe('hydro-engineer');
  });

  it('routes agro-keyword text to agro-designer', () => {
    expect(routeIntent('add an orchard row')).toBe('agro-designer');
    expect(routeIntent('plant a cover crop after the rotation')).toBe('agro-designer');
  });

  it('returns general for neutral text', () => {
    expect(routeIntent('hello')).toBe('general');
    expect(routeIntent('what is this property worth')).toBe('general');
  });

  it('returns general on a 0-0 tally', () => {
    expect(routeIntent('')).toBe('general');
  });

  it('returns general on a tied tally', () => {
    // One swale + one orchard = 1 hydro, 1 agro → tie → general
    expect(routeIntent('swale next to the orchard')).toBe('general');
  });

  it('is case-insensitive', () => {
    expect(routeIntent('BUILD A KEYLINE')).toBe('hydro-engineer');
    expect(routeIntent('Orchard Layout')).toBe('agro-designer');
  });

  it('respects word boundaries for plain keywords', () => {
    // "transplanting" should not match "plant" as a whole word.
    expect(routeIntent('we are transplanting tomorrow')).toBe('general');
  });
});

// ─── parseHandoff ────────────────────────────────────────────────────────────

describe('parseHandoff', () => {
  it('extracts a valid HANDOFF line and strips it from content', () => {
    const raw = 'You should ask the hydrology lead about this.\nHANDOFF: hydro-engineer — paddock water budget is out of scope';
    const { content, handoff } = parseHandoff(raw);
    expect(handoff).toEqual({
      to: 'hydro-engineer',
      reason: 'paddock water budget is out of scope',
    });
    expect(content).toBe('You should ask the hydrology lead about this.');
    expect(content).not.toContain('HANDOFF:');
  });

  it('returns null handoff when no HANDOFF line is present', () => {
    const raw = 'Just a normal answer with no handoff.';
    const { content, handoff } = parseHandoff(raw);
    expect(handoff).toBeNull();
    expect(content).toBe(raw);
  });

  it('returns null and preserves content on malformed role', () => {
    const raw = 'Answer body.\nHANDOFF: nonsense — some reason';
    const { content, handoff } = parseHandoff(raw);
    expect(handoff).toBeNull();
    expect(content).toBe(raw);
  });

  it('accepts ASCII double-dash as the separator', () => {
    const raw = 'Answer.\nHANDOFF: agro-designer -- planting question';
    const { handoff } = parseHandoff(raw);
    expect(handoff).toEqual({ to: 'agro-designer', reason: 'planting question' });
  });
});

// ─── resolveRole ─────────────────────────────────────────────────────────────

describe('resolveRole', () => {
  it('honours an explicit role override', () => {
    expect(
      resolveRole({
        role: 'agro-designer',
        contextText: 'this text mentions swale',
        projectId: 'p1',
      }),
    ).toBe('agro-designer');
  });

  it('falls through to autoRoute when no explicit role', () => {
    expect(
      resolveRole({ contextText: 'design a swale', projectId: 'p1' }),
    ).toBe('hydro-engineer');
  });

  it('returns general when autoRoute is explicitly disabled', () => {
    expect(
      resolveRole({
        autoRoute: false,
        contextText: 'design a swale',
        projectId: 'p1',
      }),
    ).toBe('general');
  });
});

// ─── runAgent (multi-block system composition) ───────────────────────────────

function getFetchBody(): {
  system: Array<{ type: string; text: string; cache_control?: { type: string } }>;
  messages: Array<{ role: string; content: string }>;
} {
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const [, init] = mockFetch.mock.calls[0]!;
  return JSON.parse(init.body as string);
}

describe('runAgent', () => {
  it('composes a 2-block system array with the cached Atlas base prompt', async () => {
    mockFetch.mockResolvedValue(anthropicResponse('answer text'));
    await runAgent({
      role: 'hydro-engineer',
      contextText: 'how should I size this swale',
      projectId: 'p-1',
    });

    const body = getFetchBody();
    expect(Array.isArray(body.system)).toBe(true);
    expect(body.system).toHaveLength(2);
    expect(body.system[0]).toEqual({
      type: 'text',
      text: SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' },
    });
    expect(body.system[1]).toEqual({
      type: 'text',
      text: roleSystemAddendum('hydro-engineer'),
    });
  });

  it('autoRoutes when no role is provided', async () => {
    mockFetch.mockResolvedValue(anthropicResponse('answer'));
    const result = await runAgent({
      contextText: 'design an orchard layout',
      projectId: 'p-1',
    });
    expect(result.role).toBe('agro-designer');
    expect(getFetchBody().system[1]!.text).toBe(roleSystemAddendum('agro-designer'));
  });

  it('defaults to general when text is neutral', async () => {
    mockFetch.mockResolvedValue(anthropicResponse('hi'));
    const result = await runAgent({
      contextText: 'hello there',
      projectId: 'p-1',
    });
    expect(result.role).toBe('general');
    expect(getFetchBody().system[1]!.text).toBe(roleSystemAddendum('general'));
  });

  it('returns content + handoff parsed off the trailing line', async () => {
    mockFetch.mockResolvedValue(
      anthropicResponse('Main answer text.\nHANDOFF: hydro-engineer — water question'),
    );
    const result = await runAgent({
      role: 'agro-designer',
      contextText: 'random',
      projectId: 'p-1',
    });
    expect(result.handoff).toEqual({
      to: 'hydro-engineer',
      reason: 'water question',
    });
    expect(result.content).toBe('Main answer text.');
    expect(result.role).toBe('agro-designer');
  });

  it('returns null handoff when no HANDOFF line is in the reply', async () => {
    mockFetch.mockResolvedValue(anthropicResponse('Plain answer.'));
    const result = await runAgent({
      role: 'general',
      contextText: 'random',
      projectId: 'p-1',
    });
    expect(result.handoff).toBeNull();
    expect(result.content).toBe('Plain answer.');
  });

  it('forwards usage tokens from the Anthropic response', async () => {
    mockFetch.mockResolvedValue(anthropicResponse('answer'));
    const result = await runAgent({
      role: 'general',
      contextText: 'random',
      projectId: 'p-1',
    });
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(200);
  });
});

// ─── ClaudeClient.chatWithRole direct unit test ──────────────────────────────

describe('ClaudeClient.chatWithRole', () => {
  it('builds a 2-element system array with the cached base prompt', async () => {
    mockFetch.mockResolvedValue(anthropicResponse('hi'));
    const client = new ClaudeClient('sk-ant-test');
    await client.chatWithRole({
      roleSystemAddendum: 'ROLE-ADDENDUM-XYZ',
      userMessage: 'user text',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(init.body as string);
    expect(body.system).toHaveLength(2);
    expect(body.system[0].text).toBe(SYSTEM_PROMPT);
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(body.system[1].text).toBe('ROLE-ADDENDUM-XYZ');
    expect(body.messages).toEqual([{ role: 'user', content: 'user text' }]);
  });

  it('returns token usage from the response', async () => {
    mockFetch.mockResolvedValue(anthropicResponse('hi'));
    const client = new ClaudeClient('sk-ant-test');
    const result = await client.chatWithRole({
      roleSystemAddendum: 'addendum',
      userMessage: 'user',
    });
    expect(result).toMatchObject({
      text: 'hi',
      inputTokens: 100,
      outputTokens: 200,
    });
  });
});
