/**
 * useServerAiOutputs — fetch the latest server-generated AI outputs for a
 * project from /api/v1/projects/:id/ai-outputs.
 *
 * Returns a map keyed by `output_type` (site_narrative, design_recommendation,
 * risk_flag, planting_guide, investor_summary, design_brief). The narrative
 * BullMQ worker writes into this table when Tier-3 analysis finishes; this
 * hook is the read path. Returns `null` until the first fetch completes.
 */

import { useEffect, useState } from 'react';
import { api } from '../lib/apiClient.js';

export interface ServerAiOutput {
  id: string;
  projectId: string;
  outputType: string;
  content: string;
  confidence: 'high' | 'medium' | 'low';
  dataSources: string[];
  caveat: string | null;
  needsSiteVisit: boolean;
  modelId: string;
  generatedAt: string;
}

export type ServerAiOutputs = Record<string, ServerAiOutput>;

export function useServerAiOutputs(projectId: string | undefined): {
  outputs: ServerAiOutputs | null;
  loading: boolean;
  error: string | null;
} {
  const [outputs, setOutputs] = useState<ServerAiOutputs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.projects.aiOutputs(projectId)
      .then((envelope) => {
        if (cancelled) return;
        setOutputs((envelope.data ?? {}) as ServerAiOutputs);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  return { outputs, loading, error };
}
