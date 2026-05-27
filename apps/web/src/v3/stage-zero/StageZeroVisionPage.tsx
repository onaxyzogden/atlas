/**
 * StageZeroVisionPage — the full-screen Stage Zero Vision Builder.
 *
 * A self-contained dark canvas (its own --vb-* palette, independent of the
 * app's light/dark theme) matching the OLOS Stage Zero mockup: top stage
 * spine + Save Progress, a centred question with an option grid and collapsible
 * upcoming questions, a live Vision Profile rail, and a bottom "what this
 * activates" strip. Answers autosave to project.metadata.visionProfile via
 * useVisionBuilder; finishing routes to OBSERVE to draw/import the boundary.
 *
 * Slice 2.4 (Phase 2) — superseded by the spec Project Creation Wizard
 * at `/v3/project/wizard`. The page is retained per
 * feedback_no_deletion.md so deep links keep working, and a deprecation
 * banner now points stewards at the new flow. Full retirement folds
 * into Phase 7.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, ArrowUpRight, Compass } from 'lucide-react';
import { useVisionBuilder } from './useVisionBuilder.js';
import { deriveActivatedModules } from './lib/deriveActivatedModules.js';
import { deriveDeferredTopics } from './data/visionBuilderQuestions.js';
import { VisionStageHeader } from './components/VisionStageHeader.js';
import { VisionQuestionCard } from './components/VisionQuestionCard.js';
import { VisionUpcomingQuestions } from './components/VisionUpcomingQuestions.js';
import { VisionProfileSidebar } from './components/VisionProfileSidebar.js';
import { VisionActivationStrip } from './components/VisionActivationStrip.js';
import styles from './StageZeroVisionPage.module.css';

const UPCOMING_PREVIEW = 4;

export default function StageZeroVisionPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const navigate = useNavigate();

  const builder = useVisionBuilder(projectId);
  const {
    profile,
    visibleQuestions,
    currentIndex,
    currentQuestion,
    total,
    progress,
    selectedFor,
    setSingle,
    toggleMulti,
    toggleSelectAll,
    allSelectedFor,
    goNext,
    goBack,
    goToQuestion,
    isLast,
    finish,
  } = builder;

  const [saved, setSaved] = useState(false);

  const activatedModules = useMemo(
    () => deriveActivatedModules(profile),
    [profile],
  );

  // Static (catalog-derived) list of topics deferred to the Plan stage.
  const deferredTopics = useMemo(() => deriveDeferredTopics(), []);

  const upcoming = useMemo(
    () => visibleQuestions.slice(currentIndex + 1, currentIndex + 1 + UPCOMING_PREVIEW),
    [visibleQuestions, currentIndex],
  );

  const handleSave = () => {
    finish(); // stamps updatedAt + persists; safe to call repeatedly
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleFinish = () => {
    finish();
    navigate({ to: '/v3/project/$projectId/observe', params: { projectId } });
  };

  const handleToggle = (optionId: string) => {
    if (!currentQuestion) return;
    if (currentQuestion.kind === 'multi') {
      toggleMulti(currentQuestion, optionId);
    } else {
      setSingle(currentQuestion, optionId);
    }
  };

  const handleSwitchToWizard = () => {
    navigate({ to: '/v3/project/wizard' });
  };

  return (
    <div className={styles.page}>
      <VisionStageHeader onSave={handleSave} saved={saved} />

      <div className={styles.deprecationBanner} role="status">
        <span className={styles.deprecationLabel}>Setup moved</span>
        <span className={styles.deprecationText}>
          This setup has moved. The Project Creation Wizard now captures
          site boundary, vision, and team in one flow.
        </span>
        <button
          type="button"
          className={styles.deprecationLink}
          onClick={handleSwitchToWizard}
        >
          Open the new wizard
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className={styles.body}>
        <main className={styles.main}>
          <div className={styles.progress}>
            <span className={styles.progressLabel}>
              Question {Math.min(currentIndex + 1, total)} of {total}
            </span>
            <div className={styles.progressTrack} aria-hidden="true">
              <div
                className={styles.progressFill}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          {currentQuestion ? (
            <VisionQuestionCard
              question={currentQuestion}
              selected={selectedFor(currentQuestion)}
              onToggle={handleToggle}
              onSelectAll={
                currentQuestion.kind === 'multi'
                  ? () => toggleSelectAll(currentQuestion)
                  : undefined
              }
              allSelected={
                currentQuestion.kind === 'multi'
                  ? allSelectedFor(currentQuestion)
                  : undefined
              }
            />
          ) : (
            <p className={styles.done}>All questions answered.</p>
          )}

          <div className={styles.nav}>
            <button
              type="button"
              className={styles.back}
              onClick={goBack}
              disabled={currentIndex === 0}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {isLast ? (
              <button type="button" className={styles.finish} onClick={handleFinish}>
                <Compass size={16} />
                Finish — go to Observe
              </button>
            ) : (
              <button type="button" className={styles.next} onClick={goNext}>
                Next
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          <VisionUpcomingQuestions upcoming={upcoming} onJump={goToQuestion} />
        </main>

        <div className={styles.rail}>
          <VisionProfileSidebar
            visibleQuestions={visibleQuestions}
            selectedFor={selectedFor}
            onJump={goToQuestion}
            deferredTopics={deferredTopics}
          />
        </div>
      </div>

      <VisionActivationStrip modules={activatedModules} />
    </div>
  );
}
