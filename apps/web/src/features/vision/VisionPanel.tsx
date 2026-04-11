/**
 * VisionPanel — the concept overlay layer of Atlas.
 *
 * Where the user articulates what they are building and why,
 * and the platform holds that vision against the land's assessed capabilities.
 *
 * Register: contemplative. Not a form to fill out. A place to think.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useProjectStore, type LocalProject } from '../../store/projectStore.js';
import { useVisionStore, type PhaseKey, type MoontranceIdentity } from '../../store/visionStore.js';
import { useMapStore } from '../../store/mapStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import { computeAssessmentScores } from '../../lib/computeScores.js';
import { computeVisionFit, fitStatusLabel, projectTypeLabel, PROJECT_TYPES, type FitResult } from '../../lib/visionFit.js';
import p from '../../styles/panel.module.css';
import s from './VisionPanel.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VisionPanelProps {
  project: LocalProject;
}

type VisionTab = 'intention' | 'fit' | 'moontrance' | 'timeline';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VisionPanel({ project }: VisionPanelProps) {
  const [tab, setTab] = useState<VisionTab>('intention');
  const updateProject = useProjectStore((st) => st.updateProject);
  const visionData = useVisionStore((st) => st.getVisionData(project.id));
  const ensureDefaults = useVisionStore((st) => st.ensureDefaults);
  const setConceptOverlayVisible = useVisionStore((st) => st.setConceptOverlayVisible);
  const setActivePhaseFilter = useMapStore((st) => st.setActivePhaseFilter);

  // Ensure vision data exists for this project
  useEffect(() => {
    ensureDefaults(project.id);
  }, [project.id, ensureDefaults]);

  const overlayVisible = visionData?.conceptOverlayVisible ?? false;
  const isMoontrance = project.projectType === 'moontrance';

  const handleOverlayToggle = useCallback(() => {
    const next = !overlayVisible;
    setConceptOverlayVisible(project.id, next);
    setActivePhaseFilter(next ? 'all' : 'Phase 1');
  }, [overlayVisible, project.id, setConceptOverlayVisible, setActivePhaseFilter]);

  const tabs: { key: VisionTab; label: string }[] = useMemo(() => {
    const base: { key: VisionTab; label: string }[] = [
      { key: 'intention', label: 'Intention' },
      { key: 'fit', label: 'Land Fit' },
    ];
    if (isMoontrance) {
      base.push({ key: 'moontrance', label: 'Moontrance' });
    }
    base.push({ key: 'timeline', label: 'Timeline' });
    return base;
  }, [isMoontrance]);

  // Reset tab if moontrance tab disappears
  useEffect(() => {
    if (tab === 'moontrance' && !isMoontrance) setTab('intention');
  }, [isMoontrance, tab]);

  return (
    <div className={p.container}>
      {/* Header */}
      <div className={s.header}>
        <h2 className={p.title} style={{ marginBottom: 0 }}>Vision</h2>
        <div className={s.overlayToggle}>
          <span className={s.overlayLabel}>Overlay</span>
          <button
            className={`${s.overlaySwitch} ${overlayVisible ? s.overlaySwitchOn : ''}`}
            onClick={handleOverlayToggle}
            aria-label="Toggle concept overlay on map"
          >
            <span className={`${s.overlayDot} ${overlayVisible ? s.overlayDotOn : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className={p.tabBar}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`${p.tabBtn} ${tab === t.key ? p.tabBtnActive : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'intention' && (
        <IntentionTab project={project} updateProject={updateProject} />
      )}
      {tab === 'fit' && (
        <LandFitTab project={project} />
      )}
      {tab === 'moontrance' && isMoontrance && (
        <MoontranceTab projectId={project.id} />
      )}
      {tab === 'timeline' && (
        <TimelineTab projectId={project.id} />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Tab 1 — Intention                                                  */
/* ================================================================== */

function IntentionTab({
  project,
  updateProject,
}: {
  project: LocalProject;
  updateProject: (id: string, updates: Partial<LocalProject>) => void;
}) {
  const [draft, setDraft] = useState(project.visionStatement ?? '');
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync draft when project changes
  useEffect(() => {
    setDraft(project.visionStatement ?? '');
  }, [project.id, project.visionStatement]);

  const handleBlur = useCallback(() => {
    const trimmed = draft.trim();
    const current = project.visionStatement ?? '';
    if (trimmed !== current) {
      updateProject(project.id, { visionStatement: trimmed || null });
      setSaved(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaved(false), 2000);
    }
  }, [draft, project.id, project.visionStatement, updateProject]);

  const handleTypeChange = useCallback(
    (type: string) => {
      updateProject(project.id, { projectType: type });
    },
    [project.id, updateProject],
  );

  return (
    <div>
      <div className={`${p.rowBetween} ${p.mb8}`}>
        <div className={p.label}>Vision statement</div>
        <span className={`${s.savedIndicator} ${saved ? s.savedIndicatorVisible : ''}`}>
          Saved
        </span>
      </div>

      <textarea
        className={s.visionTextarea}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder="What is this land becoming? Describe the intention — not the plan, but the reason."
        spellCheck
      />

      <div className={s.typeSection}>
        <div className={s.typeLabel}>Project type</div>
        <div className={s.typeGrid}>
          {PROJECT_TYPES.map((t) => (
            <button
              key={t}
              className={`${s.typeChip} ${project.projectType === t ? s.typeChipActive : ''}`}
              onClick={() => handleTypeChange(t)}
            >
              {projectTypeLabel(t)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab 2 — Land Fit                                                   */
/* ================================================================== */

function LandFitTab({ project }: { project: LocalProject }) {
  const siteData = useSiteData(project.id);

  const fitResults = useMemo(() => {
    if (!siteData || siteData.status !== 'complete' || !project.projectType) return null;
    const scores = computeAssessmentScores(siteData.layers, project.acreage);
    return computeVisionFit(project.projectType, scores);
  }, [siteData, project.projectType, project.acreage]);

  if (!project.projectType) {
    return (
      <div className={s.emptyState}>
        Set a project type in the Intention tab to see how the land fits your vision.
      </div>
    );
  }

  if (!siteData || siteData.status === 'idle') {
    return (
      <div className={s.emptyState}>
        Run site intelligence first to see how the land fits your vision.
        <div className={s.emptyHint}>
          Open the Site Intelligence panel and fetch layer data for this property.
        </div>
      </div>
    );
  }

  if (siteData.status === 'loading') {
    return (
      <div className={s.emptyState}>
        Assessing the land...
      </div>
    );
  }

  if (!fitResults || fitResults.length === 0) {
    return (
      <div className={s.emptyState}>
        No fit requirements defined for this project type.
      </div>
    );
  }

  return (
    <div>
      <div className={`${p.subtitleItalic}`}>
        How {projectTypeLabel(project.projectType ?? '')} maps against what the land offers.
      </div>
      <div className={s.fitList}>
        {fitResults.map((fit) => (
          <FitRow key={fit.scoreName} fit={fit} />
        ))}
      </div>
    </div>
  );
}

function FitRow({ fit }: { fit: FitResult }) {
  const barWidth = Math.min(100, Math.max(0, fit.actual));
  const thresholdLeft = Math.min(100, Math.max(0, fit.threshold));

  const fillClass =
    fit.status === 'strong' ? s.fitBarFillStrong :
    fit.status === 'moderate' ? s.fitBarFillModerate :
    s.fitBarFillChallenge;

  const statusClass =
    fit.status === 'strong' ? s.fitStatusStrong :
    fit.status === 'moderate' ? s.fitStatusModerate :
    s.fitStatusChallenge;

  const weightClass =
    fit.weight === 'critical' ? s.fitWeightCritical :
    fit.weight === 'important' ? s.fitWeightImportant :
    s.fitWeightSupportive;

  const confClass =
    fit.confidence === 'high' ? p.badgeHigh :
    fit.confidence === 'medium' ? p.badgeMedium :
    p.badgeLow;

  return (
    <div className={s.fitRow}>
      <div className={s.fitRowHeader}>
        <span className={s.fitScoreName}>{fit.scoreName}</span>
        <span className={`${s.fitWeightBadge} ${weightClass}`}>{fit.weight}</span>
      </div>

      <div className={s.fitBar}>
        <div className={`${s.fitBarFill} ${fillClass}`} style={{ width: `${barWidth}%` }} />
        <div className={s.fitThresholdMarker} style={{ left: `${thresholdLeft}%` }} />
      </div>

      <div className={s.fitStatusRow}>
        <span className={`${s.fitStatusLabel} ${statusClass}`}>
          {fitStatusLabel(fit.status)}
        </span>
        <span className={s.fitScoreValue}>
          {fit.actual} / 100
        </span>
        <span className={`${s.fitConfidence} ${confClass}`}>{fit.confidence}</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab 3 — Moontrance Identity                                        */
/* ================================================================== */

const MOONTRANCE_FIELDS: {
  key: keyof MoontranceIdentity;
  question: string;
  placeholder: string;
}[] = [
  {
    key: 'prayerPavilionIntent',
    question: 'Where on this land does prayer belong?',
    placeholder: 'Describe the siting intent for prayer spaces — orientation, seclusion, water proximity...',
  },
  {
    key: 'quietZoneDesignation',
    question: 'Where does silence live?',
    placeholder: 'Which areas should be designated for quiet — no machinery, no gatherings, contemplation only...',
  },
  {
    key: 'hospitalitySequenceNotes',
    question: 'How does a guest move from arrival to departure?',
    placeholder: 'The sequence of spaces a visitor encounters — entry, welcome, orientation, immersion, farewell...',
  },
  {
    key: 'mensCohortZoneIntent',
    question: 'Where do the men gather, learn, and serve?',
    placeholder: 'Zones for cohort activity — study circles, physical work, shared meals, brotherhood...',
  },
  {
    key: 'waterLandWorshipIntegration',
    question: 'How do water, earth, and devotion meet here?',
    placeholder: 'The relationship between hydrology, terrain, and spiritual practice on this land...',
  },
];

function MoontranceTab({ projectId }: { projectId: string }) {
  const visionData = useVisionStore((st) => st.getVisionData(projectId));
  const ensureMoontrance = useVisionStore((st) => st.ensureMoontranceIdentity);
  const updateField = useVisionStore((st) => st.updateMoontranceField);

  useEffect(() => {
    ensureMoontrance(projectId);
  }, [projectId, ensureMoontrance]);

  const identity = visionData?.moontranceIdentity;
  if (!identity) return null;

  return (
    <div>
      <div className={p.subtitleItalic}>
        These are first-class fields of the Moontrance identity — not optional extras.
      </div>
      {MOONTRANCE_FIELDS.map((f) => (
        <MoontranceField
          key={f.key}
          projectId={projectId}
          fieldKey={f.key}
          question={f.question}
          placeholder={f.placeholder}
          value={identity[f.key]}
          onSave={updateField}
        />
      ))}
    </div>
  );
}

function MoontranceField({
  projectId,
  fieldKey,
  question,
  placeholder,
  value,
  onSave,
}: {
  projectId: string;
  fieldKey: keyof MoontranceIdentity;
  question: string;
  placeholder: string;
  value: string;
  onSave: (projectId: string, field: keyof MoontranceIdentity, value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = useCallback(() => {
    if (draft !== value) {
      onSave(projectId, fieldKey, draft);
    }
  }, [draft, value, projectId, fieldKey, onSave]);

  return (
    <div className={s.moontranceField}>
      <div className={s.moontranceQuestion}>{question}</div>
      <textarea
        className={s.moontranceTextarea}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        spellCheck
      />
    </div>
  );
}

/* ================================================================== */
/*  Tab 4 — Timeline                                                   */
/* ================================================================== */

const PHASE_CONFIG: {
  key: PhaseKey;
  label: string;
  timeframe: string;
  placeholder: string;
  cardClass: string;
}[] = [
  {
    key: 'year1',
    label: 'Year 1',
    timeframe: 'Foundation',
    placeholder: 'What must happen first? The essential moves — water, access, shelter, the ground truth of being here.',
    cardClass: 'phaseCardYear1',
  },
  {
    key: 'years2to3',
    label: 'Years 2\u20133',
    timeframe: 'Growth',
    placeholder: 'What grows in the middle years? The systems that take root — planting, building, establishing rhythm.',
    cardClass: 'phaseCardYear2',
  },
  {
    key: 'years4plus',
    label: 'Years 4+',
    timeframe: 'Maturity',
    placeholder: 'What does maturity look like? The vision at full expression — community, ecology, stewardship in motion.',
    cardClass: 'phaseCardYear4',
  },
];

function TimelineTab({ projectId }: { projectId: string }) {
  const visionData = useVisionStore((st) => st.getVisionData(projectId));
  const updatePhaseNote = useVisionStore((st) => st.updatePhaseNote);

  const phaseNotes = visionData?.phaseNotes ?? [];

  return (
    <div>
      <div className={p.subtitleItalic}>
        Articulate the vision in phases. These notes feed the Timeline panel.
      </div>
      <div className={s.phaseList}>
        {PHASE_CONFIG.map((phase) => {
          const note = phaseNotes.find((n) => n.phaseKey === phase.key);
          return (
            <PhaseCard
              key={phase.key}
              projectId={projectId}
              phaseKey={phase.key}
              label={phase.label}
              timeframe={phase.timeframe}
              placeholder={phase.placeholder}
              cardClass={phase.cardClass}
              value={note?.notes ?? ''}
              onSave={updatePhaseNote}
            />
          );
        })}
      </div>
    </div>
  );
}

function PhaseCard({
  projectId,
  phaseKey,
  label,
  timeframe,
  placeholder,
  cardClass,
  value,
  onSave,
}: {
  projectId: string;
  phaseKey: PhaseKey;
  label: string;
  timeframe: string;
  placeholder: string;
  cardClass: string;
  value: string;
  onSave: (projectId: string, phaseKey: PhaseKey, notes: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = useCallback(() => {
    if (draft !== value) {
      onSave(projectId, phaseKey, draft);
    }
  }, [draft, value, projectId, phaseKey, onSave]);

  return (
    <div className={`${s.phaseCard} ${s[cardClass] ?? ''}`}>
      <div className={s.phaseHeader}>
        <span className={s.phaseLabel}>{label}</span>
        <span className={s.phaseTimeframe}>{timeframe}</span>
      </div>
      <textarea
        className={s.phaseTextarea}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        spellCheck
      />
    </div>
  );
}
