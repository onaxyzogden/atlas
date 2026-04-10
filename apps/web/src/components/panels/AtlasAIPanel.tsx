/**
 * AtlasAIPanel — AI-powered land design companion.
 * Phase 3: Connected to Claude API with full project context.
 * All outputs follow Section 0d AI Guardrails (confidence, sources, caveats).
 *
 * Three sections:
 *   1. AI Assessment — site narrative + design recommendations from enrichment
 *   2. Chat — conversational interface seeded with real project data
 *   3. Persistent guardrails banner — non-dismissable
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, useSiteDataStore } from '../../store/siteDataStore.js';
import { sendMessage, type ClaudeMessage } from '../../lib/claude.js';
import { buildProjectContext, SYSTEM_PROMPT } from '../../features/ai/ContextBuilder.js';
import {
  computeAssessmentScores,
  computeOverallScore,
} from '../../lib/computeScores.js';
import { Spinner } from '../ui/Spinner.js';
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

const DOMAIN_MAP: Record<string, string> = {
  soils: 'Agriculture', elevation: 'Terrain', climate: 'Climate',
  watershed: 'Hydrology', wetlands_flood: 'Hydrology', land_cover: 'Ecology',
  zoning: 'Regulatory', terrain_analysis: 'Terrain', microclimate: 'Climate',
  soil_regeneration: 'Agriculture', watershed_derived: 'Hydrology',
  Soils: 'Agriculture', Elevation: 'Terrain', Climate: 'Climate',
  Watershed: 'Hydrology', 'Wetlands / Flood': 'Hydrology', 'Land Cover': 'Ecology',
  Zoning: 'Regulatory',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  confidence?: 'high' | 'medium' | 'low';
  tokens?: { input: number; output: number };
  rating?: 'helpful' | 'not_helpful' | null;
}

type PanelTab = 'assessment' | 'chat';

export default function AtlasAIPanel({ project }: AtlasAIPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('assessment');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegeneratingNarrative, setIsRegeneratingNarrative] = useState(false);
  const [regeneratingRecIdx, setRegeneratingRecIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const siteData = useSiteData(project.id);
  const enrichment = siteData?.enrichment;
  const enrichProject = useSiteDataStore((st) => st.enrichProject);

  // Score breakdown for seeding chat context
  const layers = siteData?.layers ?? [];
  const assessmentScores = useMemo(
    () => computeAssessmentScores(layers, project.acreage ?? null),
    [layers, project.acreage],
  );
  const overallScore = useMemo(
    () => computeOverallScore(assessmentScores),
    [assessmentScores],
  );

  // Parse recommendations into structured items
  const recommendations = useMemo(() => {
    if (!enrichment?.designRecommendation?.content) return [];
    const content = enrichment.designRecommendation.content;
    const blocks = content.split(/\n(?=\d+\.)/).filter(Boolean);
    return blocks.map((block) => {
      const text = block.trim();
      // Try to extract data layer citations from the text
      const sources: string[] = [];
      const sourcePatterns = [
        /[Bb]ased on (?:the )?(\w[\w\s/]*?) data/g,
        /(?:source|layer|from)[:\s]+(\w[\w\s/]*?)(?:[,.\n]|$)/gi,
        /\(([^)]*?(?:soil|elevation|climate|watershed|wetland|land cover|zoning)[^)]*?)\)/gi,
      ];
      for (const pattern of sourcePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          sources.push(match[1]!.trim());
        }
      }
      // Infer domain from data sources mentioned
      const domain = inferDomain(text, enrichment.designRecommendation!.dataSources);
      return { text, sources, domain };
    });
  }, [enrichment?.designRecommendation]);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isThinking) return;

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: prompt.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const siteState = useSiteDataStore.getState().dataByProject[project.id];
      const context = buildProjectContext(project.id, siteState?.layers ?? []);

      // Include score breakdown in context so answers are grounded
      const scoreContext = assessmentScores.map((sc) =>
        `${sc.label}: ${sc.score}/100 (${sc.rating}, ${sc.confidence} confidence)`,
      ).join('\n');
      const enrichedContext = `${context}\n\n## Assessment Scores\nOverall: ${overallScore}/100\n${scoreContext}`;

      const systemWithContext = `${SYSTEM_PROMPT}\n\n${enrichedContext}`;

      const history: ClaudeMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: prompt.trim() },
      ];

      abortRef.current = new AbortController();
      const response = await sendMessage(history, systemWithContext, abortRef.current.signal);

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
  }, [isThinking, messages, project.id, assessmentScores, overallScore]);

  const handleRating = (index: number, rating: 'helpful' | 'not_helpful') => {
    setMessages((prev) => prev.map((m, i) => i === index ? { ...m, rating } : m));
  };

  const handleRegenerateNarrative = useCallback(async () => {
    if (isRegeneratingNarrative) return;
    setIsRegeneratingNarrative(true);
    try {
      // Clear existing enrichment to force re-generation
      const store = useSiteDataStore.getState();
      const cur = store.dataByProject[project.id];
      if (cur) {
        useSiteDataStore.setState({
          dataByProject: {
            ...store.dataByProject,
            [project.id]: {
              ...cur,
              enrichment: { ...cur.enrichment, status: 'idle' as const },
            },
          },
        });
      }
      await enrichProject(project.id);
    } finally {
      setIsRegeneratingNarrative(false);
    }
  }, [isRegeneratingNarrative, project.id, enrichProject]);

  const handleRegenerateRec = useCallback(async (idx: number) => {
    if (regeneratingRecIdx !== null) return;
    setRegeneratingRecIdx(idx);
    try {
      const store = useSiteDataStore.getState();
      const cur = store.dataByProject[project.id];
      if (cur) {
        useSiteDataStore.setState({
          dataByProject: {
            ...store.dataByProject,
            [project.id]: {
              ...cur,
              enrichment: {
                ...cur.enrichment,
                status: 'idle' as const,
                designRecommendation: undefined,
              },
            },
          },
        });
      }
      await enrichProject(project.id);
    } finally {
      setRegeneratingRecIdx(null);
    }
  }, [regeneratingRecIdx, project.id, enrichProject]);

  const showWelcome = messages.length === 0;
  const hasEnrichment = enrichment?.status === 'complete';
  const isEnriching = enrichment?.status === 'loading';

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

      {/* Guardrails banner — persistent, non-dismissable */}
      <div className={s.guardrailsBanner}>
        <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={s.guardrailsIcon}>
          <path d="M8 1l6 12H2z" strokeLinejoin="round" />
          <path d="M8 6v3M8 11h.01" strokeLinecap="round" />
        </svg>
        <span>
          All AI outputs are generated from the listed data sources and should be verified on-site before acting on them. AI analysis is a starting point, not a final assessment.
        </span>
      </div>

      {/* Tab bar */}
      <div className={s.tabBar}>
        <button
          className={`${s.tabBtn} ${activeTab === 'assessment' ? s.tabBtnActive : ''}`}
          onClick={() => setActiveTab('assessment')}
        >
          Assessment
        </button>
        <button
          className={`${s.tabBtn} ${activeTab === 'chat' ? s.tabBtnActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
      </div>

      {/* ── Assessment Tab ──────────────────────────────────────── */}
      {activeTab === 'assessment' && (
        <div className={s.assessmentArea}>
          {isEnriching && (
            <div className={s.enrichingHint}>
              <Spinner size="sm" color="#5b9db8" />
              <span>Generating AI assessment...</span>
            </div>
          )}

          {!hasEnrichment && !isEnriching && (
            <div className={s.emptyAssessment}>
              <div className={s.welcomeIcon}>{'\u2726'}</div>
              <p className={s.emptyText}>
                {layers.length === 0
                  ? 'Draw a property boundary to generate an AI assessment.'
                  : 'AI assessment will generate automatically once site data is loaded.'}
              </p>
              {layers.length > 0 && (
                <button className={`${p.btn} ${p.btnAccent}`} onClick={() => enrichProject(project.id)}>
                  Generate Assessment
                </button>
              )}
            </div>
          )}

          {/* ── Site Narrative ──────────────────────────────────── */}
          {hasEnrichment && enrichment.aiNarrative && (
            <div className={s.narrativeSection}>
              <div className={s.sectionHeader}>
                <h3 className={s.sectionTitle}>AI Assessment</h3>
                <div className={s.sectionMeta}>
                  <AIBadge />
                  <ConfBadge level={enrichment.aiNarrative.confidence} />
                </div>
              </div>

              <div className={s.narrativeContent}>
                {enrichment.aiNarrative.content}
              </div>

              {enrichment.aiNarrative.caveat && (
                <p className={s.caveat}>{enrichment.aiNarrative.caveat}</p>
              )}

              {/* Source layers */}
              {enrichment.aiNarrative.dataSources.length > 0 && (
                <div className={s.sourceLayers}>
                  <span className={s.sourceLabel}>Source layers:</span>
                  {enrichment.aiNarrative.dataSources.map((src) => (
                    <span key={src} className={s.sourceTag}>{src}</span>
                  ))}
                </div>
              )}

              {/* Regenerate */}
              <button
                className={s.regenerateBtn}
                onClick={handleRegenerateNarrative}
                disabled={isRegeneratingNarrative}
              >
                {isRegeneratingNarrative ? (
                  <><Spinner size="sm" color="#5b9db8" /> Regenerating...</>
                ) : (
                  <><RefreshIcon /> Regenerate narrative</>
                )}
              </button>
            </div>
          )}

          {/* ── Design Recommendations ─────────────────────────── */}
          {hasEnrichment && recommendations.length > 0 && (
            <div className={s.recsSection}>
              <div className={s.sectionHeader}>
                <h3 className={s.sectionTitle}>Design Recommendations</h3>
                <div className={s.sectionMeta}>
                  <AIBadge />
                  {enrichment.designRecommendation && (
                    <ConfBadge level={enrichment.designRecommendation.confidence} />
                  )}
                </div>
              </div>

              {enrichment.designRecommendation?.caveat && (
                <p className={s.caveat}>{enrichment.designRecommendation.caveat}</p>
              )}

              <div className={s.recsList}>
                {recommendations.map((rec, i) => (
                  <div key={i} className={s.recCard}>
                    <div className={s.recNumber}>{i + 1}</div>
                    <div className={s.recBody}>
                      <p className={s.recText}>{rec.text}</p>
                      <div className={s.recMeta}>
                        {rec.domain && (
                          <span className={s.domainTag}>{rec.domain}</span>
                        )}
                        {rec.sources.length > 0 && rec.sources.slice(0, 2).map((src) => (
                          <span key={src} className={s.sourceTag}>{src}</span>
                        ))}
                        {enrichment.designRecommendation && (
                          <ConfBadge level={enrichment.designRecommendation.confidence} />
                        )}
                      </div>
                      <button
                        className={s.regenerateBtn}
                        onClick={() => handleRegenerateRec(i)}
                        disabled={regeneratingRecIdx !== null}
                      >
                        {regeneratingRecIdx === i ? (
                          <><Spinner size="sm" color="#5b9db8" /> Regenerating...</>
                        ) : (
                          <><RefreshIcon /> Regenerate</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Source layers for all recommendations */}
              {enrichment.designRecommendation?.dataSources && enrichment.designRecommendation.dataSources.length > 0 && (
                <div className={s.sourceLayers}>
                  <span className={s.sourceLabel}>Source layers:</span>
                  {enrichment.designRecommendation.dataSources.map((src) => (
                    <span key={src} className={s.sourceTag}>{src}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty recs state */}
          {hasEnrichment && recommendations.length === 0 && !enrichment.designRecommendation && (
            <div className={s.emptyRecs}>
              <span className={s.emptyText}>Design recommendations could not be generated.</span>
              <button className={s.regenerateBtn} onClick={() => handleRegenerateRec(0)}>
                <RefreshIcon /> Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Chat Tab ────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <>
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
                    Responses are grounded in your property's real site data and assessment scores.
                  </p>
                </div>

                <div className={p.section}>
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

                {msg.role === 'assistant' && (
                  <div className={s.msgMeta}>
                    <AIBadge />
                    {msg.confidence && (
                      <ConfBadge level={msg.confidence} />
                    )}
                    {msg.tokens && (
                      <span className={s.msgTokens}>
                        {msg.tokens.input + msg.tokens.output} tokens
                      </span>
                    )}

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
        </>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function AIBadge() {
  return (
    <span className={s.aiBadge}>
      <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M8 1l1.5 4.5H14l-3.5 2.5L12 13 8 10l-4 3 1.5-5L2 5.5h4.5z" strokeLinejoin="round" />
      </svg>
      AI-generated
    </span>
  );
}

function ConfBadge({ level }: { level: string }) {
  const cls = level === 'high' ? p.badgeHigh : level === 'medium' ? p.badgeMedium : p.badgeLow;
  return (
    <span className={`${p.badgeConfidence} ${cls}`}>
      {level}
    </span>
  );
}

function RefreshIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M1 1v5h5M15 15v-5h-5" />
      <path d="M2.5 10A6 6 0 0113.5 6M13.5 6A6 6 0 012.5 10" />
    </svg>
  );
}

function inferDomain(text: string, dataSources: string[]): string {
  const lower = text.toLowerCase();
  const allSources = [...dataSources, ...Object.keys(DOMAIN_MAP)];

  for (const [key, domain] of Object.entries(DOMAIN_MAP)) {
    if (lower.includes(key.toLowerCase())) return domain;
  }

  if (lower.includes('water') || lower.includes('stream') || lower.includes('flood') || lower.includes('drain')) return 'Hydrology';
  if (lower.includes('soil') || lower.includes('crop') || lower.includes('farm') || lower.includes('plant')) return 'Agriculture';
  if (lower.includes('forest') || lower.includes('tree') || lower.includes('canopy') || lower.includes('timber')) return 'Forestry';
  if (lower.includes('livestock') || lower.includes('cattle') || lower.includes('sheep') || lower.includes('paddock') || lower.includes('graze')) return 'Livestock';
  if (lower.includes('slope') || lower.includes('elevation') || lower.includes('terrain') || lower.includes('contour')) return 'Terrain';
  if (lower.includes('habitat') || lower.includes('wetland') || lower.includes('riparian') || lower.includes('ecolog')) return 'Ecology';
  if (lower.includes('zone') || lower.includes('permit') || lower.includes('regulat') || lower.includes('setback')) return 'Regulatory';
  if (lower.includes('climate') || lower.includes('frost') || lower.includes('wind') || lower.includes('precipit')) return 'Climate';

  return 'General';
}
