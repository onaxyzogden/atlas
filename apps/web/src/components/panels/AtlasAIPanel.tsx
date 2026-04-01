/**
 * AtlasAIPanel — AI-powered land design companion.
 * Phase 3: Connected to Claude API with full project context.
 * All outputs follow Section 0d AI Guardrails (confidence, sources, caveats).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { sendMessage, type ClaudeMessage } from '../../lib/claude.js';
import { buildProjectContext, SYSTEM_PROMPT } from '../../features/ai/ContextBuilder.js';
import p from '../../styles/panel.module.css';
import s from './AtlasAIPanel.module.css';

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
    <div className={s.root}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerInner}>
          <div className={s.headerIcon}>
            {'\u2726'}
          </div>
          <div>
            <div className={s.headerTitle}>ATLAS AI</div>
            <div className={s.headerSub}>
              Claude Sonnet {'\u00B7'} Land Design Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className={s.chatArea}>
        {showWelcome && (
          <>
            <div className={s.welcomeWrap}>
              <div className={s.welcomeIcon}>
                {'\u2726'}
              </div>
              <h3 className={s.welcomeTitle}>Your Land Design Companion</h3>
              <p className={s.welcomeDesc}>
                Ask about water systems, zone placement, livestock, phasing, economics, or any aspect of your land.
              </p>
            </div>

            <div className={`${p.section}`}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className={s.promptBtn}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`${s.msgWrap} ${msg.role === 'user' ? s.msgWrapUser : s.msgWrapAssistant}`}>
            <div className={`${s.bubble} ${msg.role === 'user' ? s.bubbleUser : s.bubbleAssistant}`}>
              {msg.content}
            </div>

            {/* Meta info for assistant messages */}
            {msg.role === 'assistant' && (
              <div className={s.msgMeta}>
                <span className={s.msgMetaLabel}>Atlas AI</span>
                {msg.confidence && (
                  <span className={`${p.badgeConfidence} ${
                    msg.confidence === 'high' ? p.badgeHigh :
                    msg.confidence === 'medium' ? p.badgeMedium : p.badgeLow
                  }`}>
                    {msg.confidence}
                  </span>
                )}
                {msg.tokens && (
                  <span className={s.msgTokens}>
                    {msg.tokens.input + msg.tokens.output} tokens
                  </span>
                )}

                {/* Rating */}
                <div className={s.ratingWrap}>
                  <button
                    onClick={() => handleRating(i, 'helpful')}
                    className={`${s.ratingBtn} ${msg.rating === 'helpful' ? s.ratingActive : s.ratingInactive}`}
                    style={{ color: '#2d7a4f' }}
                    title="Helpful"
                  >
                    {'\u{1F44D}'}
                  </button>
                  <button
                    onClick={() => handleRating(i, 'not_helpful')}
                    className={`${s.ratingBtn} ${msg.rating === 'not_helpful' ? s.ratingActive : s.ratingInactive}`}
                    style={{ color: '#c44e3f' }}
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
          <div className={s.thinkingWrap}>
            <span className={s.thinkingIcon}>{'\u2726'}</span>
            Thinking...
            <button
              onClick={() => abortRef.current?.abort()}
              className={s.cancelBtn}
            >
              Cancel
            </button>
          </div>
        )}

        {error && (
          <div className={s.error}>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className={s.inputBar}>
        <div className={s.inputRow}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="Ask about your land..."
            className={s.chatInput}
          />
        </div>
      </div>
    </div>
  );
}
