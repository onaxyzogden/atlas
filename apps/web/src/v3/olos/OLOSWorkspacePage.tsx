/**
 * OLOSWorkspacePage — the entry surface for the new OLOS workspace.
 *
 * Layout: Stage selector (3-segment toggle) sits above a 16-card Domain
 * grid. Clicking a Domain navigates to /v3/project/$projectId/olos/$stage/
 * $domain, which mounts the ObjectiveWorkspace (Phase 1.3).
 *
 * Mounted alongside the existing /v3/project/$projectId/observe|plan|act
 * routes — those legacy compass surfaces stay intact per
 * feedback_no_deletion. The 3-stage IA is the forward path; this page is
 * the canonical Stage × Domain index inside that IA.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  Stage,
  STAGE_LABELS,
  UNIVERSAL_DOMAINS,
  type UniversalDomain,
} from '@ogden/shared';
import StageSelector from './components/StageSelector.js';
import DomainGrid from './components/DomainGrid.js';
import css from './OLOSWorkspacePage.module.css';

function parseStageParam(raw: unknown): Stage {
  const result = Stage.safeParse(raw);
  return result.success ? result.data : 'observe';
}

export default function OLOSWorkspacePage() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    stage?: string;
  };
  const search = useSearch({ strict: false }) as { stage?: string };
  const navigate = useNavigate();

  const initialStage = useMemo(
    () => parseStageParam(params.stage ?? search.stage ?? 'observe'),
    [params.stage, search.stage],
  );
  const [stage, setStage] = useState<Stage>(initialStage);

  const handleDomain = (domain: UniversalDomain) => {
    if (!params.projectId) return;
    navigate({
      to: '/v3/project/$projectId/olos/$stage/$domain',
      params: { projectId: params.projectId, stage, domain },
    });
  };

  return (
    <div className={css.page}>
      <header className={css.header}>
        <p className={css.eyebrow}>OLOS · Universal Domains</p>
        <h1 className={css.title}>
          {STAGE_LABELS[stage]} — pick a domain to work on
        </h1>
        <StageSelector value={stage} onChange={setStage} />
      </header>
      <main className={css.main}>
        <DomainGrid stage={stage} onDomainSelect={handleDomain} />
        <p className={css.footnote}>
          {UNIVERSAL_DOMAINS.length} universal domains · one focused
          Objective per Stage × Domain in the universal catalogue.
        </p>
      </main>
    </div>
  );
}
