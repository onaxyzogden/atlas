/**
 * useVisionBuilder — state + persistence for the Stage Zero Vision Builder.
 *
 * Owns the current-question cursor and reads/writes the VisionProfile that
 * lives in `project.metadata.visionProfile`. Every answer autosaves through
 * `updateProject` (localStorage + sync), so the builder is fully resumable:
 * re-entry restores answers and lands the cursor on the first unanswered
 * visible question.
 *
 * The question set is dynamic — `visibleWhen` predicates add/remove
 * conditional questions (e.g. livestock detail) as answers change — so the
 * cursor and total are computed against the *currently visible* list, never
 * the raw config length.
 */

import { useCallback, useMemo, useState } from 'react';
import type { VisionProfile } from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import {
  VISION_QUESTIONS,
  toProjectType,
  type VisionQuestion,
} from './data/visionBuilderQuestions.js';

// ── dotted-path helpers (read/write nested VisionProfile fields) ──────────

function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc != null && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

/** Immutably set a (possibly nested) dotted path, returning a new object. */
function setAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.');
  const [head, ...rest] = keys;
  if (rest.length === 0) {
    return { ...obj, [head!]: value };
  }
  const child = (obj[head!] ?? {}) as Record<string, unknown>;
  return { ...obj, [head!]: setAtPath(child, rest.join('.'), value) };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

// ── hook ─────────────────────────────────────────────────────────────────

export interface UseVisionBuilder {
  profile: VisionProfile;
  /** Questions whose `visibleWhen` currently passes, in config order. */
  visibleQuestions: VisionQuestion[];
  currentIndex: number;
  currentQuestion: VisionQuestion | undefined;
  /** Count of currently-visible questions ("M" in "Question N of M"). */
  total: number;
  /** 0–1 progress over visible questions that have an answer. */
  progress: number;
  /** Selected id(s) for a question's profile path. */
  selectedFor: (question: VisionQuestion) => string[];
  /** Set a single-select answer (replaces any prior value). */
  setSingle: (question: VisionQuestion, optionId: string) => void;
  /** Toggle a multi-select answer, honouring `maxSelections`. */
  toggleMulti: (question: VisionQuestion, optionId: string) => void;
  /**
   * Select-all toggle for a multi question: if not every option is selected,
   * select them all; if all are already selected, clear to none. Batched into
   * a single persist.
   */
  toggleSelectAll: (question: VisionQuestion) => void;
  /** True when every option of a multi question is currently selected. */
  allSelectedFor: (question: VisionQuestion) => boolean;
  goNext: () => void;
  goBack: () => void;
  goToQuestion: (id: string) => void;
  isLast: boolean;
  /** Stamp `completedAt` and return the persisted profile. */
  finish: () => void;
}

export function useVisionBuilder(projectId: string): UseVisionBuilder {
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const updateProject = useProjectStore((s) => s.updateProject);

  const profile: VisionProfile = useMemo(
    () => project?.metadata?.visionProfile ?? {},
    [project?.metadata?.visionProfile],
  );

  const visibleQuestions = useMemo(
    () =>
      VISION_QUESTIONS.filter(
        (q) => !q.deferToPlan && (!q.visibleWhen || q.visibleWhen(profile)),
      ),
    [profile],
  );

  // Cursor: resume on the first unanswered visible question.
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const firstUnanswered = visibleQuestions.findIndex((q) => {
      const v = getAtPath(profile as Record<string, unknown>, q.profilePath);
      return v == null || (Array.isArray(v) && v.length === 0);
    });
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });

  // The visible list can shrink (a conditional question disappears); clamp.
  const clampedIndex = Math.min(currentIndex, Math.max(0, visibleQuestions.length - 1));
  const currentQuestion = visibleQuestions[clampedIndex];

  const persist = useCallback(
    (nextProfile: VisionProfile, extraProjectFields?: { projectType?: string }) => {
      const stamped: VisionProfile = {
        ...nextProfile,
        updatedAt: new Date().toISOString(),
      };
      updateProject(projectId, {
        ...(extraProjectFields?.projectType
          ? { projectType: extraProjectFields.projectType }
          : {}),
        metadata: {
          ...(project?.metadata ?? {}),
          visionProfile: stamped,
        },
      });
    },
    [projectId, project?.metadata, updateProject],
  );

  const selectedFor = useCallback(
    (question: VisionQuestion): string[] => {
      const v = getAtPath(profile as Record<string, unknown>, question.profilePath);
      if (v == null) return [];
      return Array.isArray(v) ? (v as string[]) : [String(v)];
    },
    [profile],
  );

  const setSingle = useCallback(
    (question: VisionQuestion, optionId: string) => {
      const next = setAtPath(
        profile as Record<string, unknown>,
        question.profilePath,
        optionId,
      ) as VisionProfile;
      // The project-type question mirrors the closest strict enum value into
      // `project.projectType` (which Plan reads via useEffectivePlanProjectType).
      if (question.special === 'projectType') {
        const mapped = toProjectType(optionId);
        persist(next, mapped ? { projectType: mapped } : undefined);
      } else {
        persist(next);
      }
    },
    [profile, persist],
  );

  const toggleMulti = useCallback(
    (question: VisionQuestion, optionId: string) => {
      const current = asStringArray(
        getAtPath(profile as Record<string, unknown>, question.profilePath),
      );
      const has = current.includes(optionId);
      let nextList: string[];
      if (has) {
        nextList = current.filter((id) => id !== optionId);
      } else if (
        question.maxSelections != null &&
        current.length >= question.maxSelections
      ) {
        // At cap — drop the oldest selection to make room (FIFO), matching the
        // mockup's forgiving "pick up to N" behaviour rather than hard-blocking.
        nextList = [...current.slice(1), optionId];
      } else {
        nextList = [...current, optionId];
      }
      const next = setAtPath(
        profile as Record<string, unknown>,
        question.profilePath,
        nextList,
      ) as VisionProfile;
      persist(next);
    },
    [profile, persist],
  );

  const allSelectedFor = useCallback(
    (question: VisionQuestion): boolean => {
      if (question.options.length === 0) return false;
      const current = new Set(
        asStringArray(
          getAtPath(profile as Record<string, unknown>, question.profilePath),
        ),
      );
      return question.options.every((o) => current.has(o.id));
    },
    [profile],
  );

  const toggleSelectAll = useCallback(
    (question: VisionQuestion) => {
      const nextList = allSelectedFor(question)
        ? []
        : question.options.map((o) => o.id);
      const next = setAtPath(
        profile as Record<string, unknown>,
        question.profilePath,
        nextList,
      ) as VisionProfile;
      persist(next);
    },
    [profile, persist, allSelectedFor],
  );

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, visibleQuestions.length - 1));
  }, [visibleQuestions.length]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goToQuestion = useCallback(
    (id: string) => {
      const idx = visibleQuestions.findIndex((q) => q.id === id);
      if (idx !== -1) setCurrentIndex(idx);
    },
    [visibleQuestions],
  );

  const finish = useCallback(() => {
    persist({ ...profile, completedAt: new Date().toISOString() });
  }, [profile, persist]);

  const answeredCount = useMemo(
    () =>
      visibleQuestions.filter((q) => {
        const v = getAtPath(profile as Record<string, unknown>, q.profilePath);
        return v != null && (!Array.isArray(v) || v.length > 0);
      }).length,
    [visibleQuestions, profile],
  );

  return {
    profile,
    visibleQuestions,
    currentIndex: clampedIndex,
    currentQuestion,
    total: visibleQuestions.length,
    progress: visibleQuestions.length === 0 ? 0 : answeredCount / visibleQuestions.length,
    selectedFor,
    setSingle,
    toggleMulti,
    toggleSelectAll,
    allSelectedFor,
    goNext,
    goBack,
    goToQuestion,
    isLast: clampedIndex >= visibleQuestions.length - 1,
    finish,
  };
}
