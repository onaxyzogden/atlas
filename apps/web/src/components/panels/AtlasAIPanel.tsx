/**
 * AtlasAIPanel — AI-powered land design companion.
 * Phase 3: Connected to Claude API with full project context.
 * All outputs follow Section 0d AI Guardrails (confidence, sources, caveats).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { sendMessage, type ClaudeMessage } from '../../lib/claude.js';
import { buildProjectContext, SYSTEM_PROMPT } from '../../features/ai/ContextBuilder.js';

interface AtlasAIPanelProps {
  project: LocalProject;
}

const SUGGESTED_PROMPTS = [
  'What water systems would work best for this land?',
  'Suggest an optimal zone layout for our vision',
  'What livestock species would suit this property?',
  'How do I phase this development over 5 years?',
  'What are the highest-leverage interventions for Year 1?',
  'Analyze the feasibility of our current design',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  confidence?: 'high' | 'medium' | 'low';
  tokens?: { input: number; output: number };
  rating?: 'helpful' | 'not_helpful' | null;
}

export default function AtlasAIPanel({ project }: AtlasAIPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isThinking) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: prompt.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      // Build context from all project stores
      const context = buildProjectContext(project.id);
      const systemWithContext = `${SYSTEM_PROMPT}\n\n${context}`;

      // Build message history for Claude
      const history: ClaudeMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: prompt.trim() },
      ];

      abortRef.current = new AbortController();
      const response = await sendMessage(history, systemWithContext, abortRef.current.signal);

      // Parse confidence from response
      const confidenceMatch = response.content.match(/confidence:\s*(high|medium|low)/i);
      const confidence = (confidenceMatch?.[1]?.toLowerCase() as 'high' | 'medium' | 'low') ?? 'medium';

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.content,
        confidence,
        tokens: { input: response.inputTokens, output: response.outputTokens },
        rating: null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
    } finally {
      setIsThinking(false);
      abortRef.current = null;
    }
  }, [isThinking, messages, project.id]);

  const handleRating = (index: number, rating: 'helpful' | 'not_helpful') => {
    setMessages((prev) => prev.map((m, i) => i === index ? { ...m, rating } : m));
  };

  const showWelcome = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(91,157,184,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#5b9db8' }}>
            {'\u2726'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text)' }}>ATLAS AI</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Claude Sonnet {'\u00B7'} Land Design Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {showWelcome && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(91,157,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#5b9db8', margin: '0 auto 12px' }}>
                {'\u2726'}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Your Land Design Companion</h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
                Ask about water systems, zone placement, livestock, phasing, economics, or any aspect of your land.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  style={{ width: '100%', padding: '12px 14px', fontSize: 12, lineHeight: 1.4, border: '1px solid var(--color-border)', borderRadius: 8, background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,162,101,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '90%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.role === 'user' ? 'rgba(196,162,101,0.15)' : 'var(--color-surface)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(196,162,101,0.2)' : 'var(--color-border)'}`,
              fontSize: 12, lineHeight: 1.6, color: 'var(--color-text)', whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>

            {/* Meta info for assistant messages */}
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingInline: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>Atlas AI</span>
                {msg.confidence && (
                  <span style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: msg.confidence === 'high' ? 'rgba(45,122,79,0.1)' : msg.confidence === 'medium' ? 'rgba(196,162,101,0.1)' : 'rgba(196,78,63,0.1)',
                    color: msg.confidence === 'high' ? '#2d7a4f' : msg.confidence === 'medium' ? '#c4a265' : '#c44e3f',
                  }}>
                    {msg.confidence}
                  </span>
                )}
                {msg.tokens && (
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted)', opacity: 0.5 }}>
                    {msg.tokens.input + msg.tokens.output} tokens
                  </span>
                )}

                {/* Rating */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleRating(i, 'helpful')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: msg.rating === 'helpful' ? 1 : 0.3, color: '#2d7a4f' }}
                    title="Helpful"
                  >
                    {'\u{1F44D}'}
                  </button>
                  <button
                    onClick={() => handleRating(i, 'not_helpful')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: msg.rating === 'not_helpful' ? 1 : 0.3, color: '#c44e3f' }}
                    title="Not helpful"
                  >
                    {'\u{1F44E}'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 12, padding: '8px 0' }}>
            <span style={{ animation: 'pulse 1.5s infinite', fontSize: 16, color: '#5b9db8' }}>{'\u2726'}</span>
            Thinking...
            <button
              onClick={() => abortRef.current?.abort()}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(196,78,63,0.06)', border: '1px solid rgba(196,78,63,0.15)', borderRadius: 6, fontSize: 11, color: '#c44e3f', marginBottom: 8 }}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="Ask about your land..."
            style={{
              flex: 1, padding: '10px 12px', fontSize: 12,
              border: '1px solid var(--color-border)', borderRadius: 8,
              background: 'var(--color-surface)', color: 'var(--color-text)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    </div>
  );
}
