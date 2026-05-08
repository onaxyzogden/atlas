/**
 * siteIntelTemplate.apply — parses an uploaded JSON template, validates it
 * via Zod, and (on confirm) writes user-import layers into siteDataStore +
 * project-note overrides into projectStore.
 *
 * Imported layers replace any fetched layer of the same `layerType` per the
 * confirmed merge mode. Layers absent from the upload (or with include=false)
 * are left untouched.
 */

import type { ZodIssue } from 'zod';
import { useSiteDataStore } from '../../../store/siteDataStore.js';
import { useProjectStore, type LocalProject } from '../../../store/projectStore.js';
import { normalizeSummary } from '@ogden/shared/scoring';
import type { MockLayerResult } from '@ogden/shared/scoring';
import {
  SCHEMA_VERSION,
  TIER1_IMPORT_LAYERS,
  PROJECT_NOTE_KEYS,
  type SiteIntelTemplate,
  type Tier1ImportLayerType,
  type ProjectNoteKey,
  type TemplateLayerEntry,
} from './siteIntelTemplate.js';
import { SiteIntelTemplateSchema } from './siteIntelTemplate.schema.js';

export interface ParseResult {
  template: SiteIntelTemplate | null;
  errors: string[];
  warnings: string[];
}

export interface LayerDiffEntry {
  layerType: Tier1ImportLayerType;
  action: 'replace' | 'add';
}

export interface NoteDiffEntry {
  key: ProjectNoteKey;
  before: string | number | null;
  after: string | number | null;
}

export interface TemplateDiff {
  layers: LayerDiffEntry[];
  notes: NoteDiffEntry[];
}

function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.length ? issue.path.join('.') : '(root)';
  return `${path}: ${issue.message}`;
}

function stripHints(summary: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(summary)) {
    if (k.startsWith('__hint_')) continue;
    if (v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function parseAndValidate(text: string, currentProjectId: string | null): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      template: null,
      errors: [`Invalid JSON: ${(err as Error).message}`],
      warnings: [],
    };
  }

  const parsed = SiteIntelTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      template: null,
      errors: parsed.error.issues.map(formatZodIssue),
      warnings: [],
    };
  }

  const tpl = parsed.data as SiteIntelTemplate;
  const warnings: string[] = [];

  if (tpl.__meta.schemaVersion !== SCHEMA_VERSION) {
    warnings.push(
      `Template schemaVersion ${tpl.__meta.schemaVersion} differs from current ${SCHEMA_VERSION}. Fields may not map cleanly.`,
    );
  }
  if (currentProjectId && tpl.__meta.projectId !== currentProjectId) {
    warnings.push(
      `Template was generated for project ${tpl.__meta.projectId}, but the active project is ${currentProjectId}.`,
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const lt of TIER1_IMPORT_LAYERS) {
    const entry = tpl.layers[lt];
    if (entry.include && entry.dataDate && entry.dataDate > today) {
      warnings.push(`Layer "${lt}" has a future dataDate (${entry.dataDate}).`);
    }
  }

  const anyIncluded = TIER1_IMPORT_LAYERS.some((lt) => tpl.layers[lt].include);
  const anyNoteSet = PROJECT_NOTE_KEYS.some((k) => tpl.projectNotes[k] !== null);
  if (!anyIncluded && !anyNoteSet) {
    warnings.push('Template contains no included layers and no project-note changes.');
  }

  return { template: tpl, errors: [], warnings };
}

export function buildDiff(
  template: SiteIntelTemplate,
  project: LocalProject,
): TemplateDiff {
  const siteDataStore = useSiteDataStore.getState();
  const existing = siteDataStore.dataByProject[project.id];
  const existingTypes = new Set((existing?.layers ?? []).map((l) => l.layerType));

  const layers: LayerDiffEntry[] = [];
  for (const lt of TIER1_IMPORT_LAYERS) {
    const entry = template.layers[lt];
    if (!entry.include) continue;
    layers.push({ layerType: lt, action: existingTypes.has(lt) ? 'replace' : 'add' });
  }

  const notes: NoteDiffEntry[] = [];
  for (const key of PROJECT_NOTE_KEYS) {
    const after = template.projectNotes[key];
    if (after === null) continue;
    const before = project[key] as string | number | null;
    if (before === after) continue;
    notes.push({ key, before, after });
  }

  return { layers, notes };
}

function buildLayerResult(
  layerType: Tier1ImportLayerType,
  entry: TemplateLayerEntry,
): MockLayerResult {
  const cleanedSummary = stripHints(entry.summary);
  const normalized = normalizeSummary(layerType, cleanedSummary);
  return {
    layerType,
    fetchStatus: 'complete',
    confidence: entry.confidence,
    dataDate: entry.dataDate ?? new Date().toISOString().slice(0, 10),
    sourceApi: 'user_import',
    attribution: entry.attribution.trim() || 'User-imported data',
    summary: normalized as MockLayerResult['summary'],
  } as MockLayerResult;
}

export interface ApplyResult {
  appliedLayerCount: number;
  appliedNoteCount: number;
}

export function applyTemplate(
  template: SiteIntelTemplate,
  projectId: string,
): ApplyResult {
  const siteStore = useSiteDataStore;
  const projectStore = useProjectStore;

  const newLayers: MockLayerResult[] = [];
  for (const lt of TIER1_IMPORT_LAYERS) {
    const entry = template.layers[lt];
    if (!entry.include) continue;
    newLayers.push(buildLayerResult(lt, entry));
  }

  if (newLayers.length > 0) {
    siteStore.setState((s) => {
      const cur = s.dataByProject[projectId];
      const existingLayers = cur?.layers ?? [];
      const replaceTypes = new Set(newLayers.map((l) => l.layerType));
      const merged: MockLayerResult[] = [
        ...existingLayers.filter((l) => !replaceTypes.has(l.layerType)),
        ...newLayers,
      ];
      const liveCount = merged.filter((l) => l.fetchStatus === 'complete').length;
      return {
        dataByProject: {
          ...s.dataByProject,
          [projectId]: {
            layers: merged,
            isLive: cur?.isLive ?? true,
            liveCount,
            fetchedAt: Date.now(),
            status: 'complete',
            lastCenter: cur?.lastCenter,
            lastCountry: cur?.lastCountry,
            // Drop prior enrichment so it re-runs against the new layer set.
            enrichment: undefined,
          },
        },
      };
    });
    // Re-trigger AI enrichment with the merged layer set.
    void siteStore.getState().enrichProject(projectId);
  }

  const notePatch: Partial<LocalProject> = {};
  for (const key of PROJECT_NOTE_KEYS) {
    const after = template.projectNotes[key];
    if (after === null) continue;
    (notePatch as Record<string, unknown>)[key] = after;
  }
  let appliedNoteCount = 0;
  if (Object.keys(notePatch).length > 0) {
    projectStore.getState().updateProject(projectId, notePatch);
    appliedNoteCount = Object.keys(notePatch).length;
  }

  return {
    appliedLayerCount: newLayers.length,
    appliedNoteCount,
  };
}
