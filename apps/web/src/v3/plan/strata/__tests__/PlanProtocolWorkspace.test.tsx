/**
 * @vitest-environment happy-dom
 *
 * PlanProtocolWorkspace — the center canvas for Plan Protocols mode: a two-pane
 * workspace (mechanics editor + meaning context). Proves:
 *   1. It mounts the editor (mechanics card + threshold editor) AND the MEANING
 *      pane side by side.
 *   2. The editor card is the `mechanics` strip — no Amanah caution / status
 *      footer in the editor; the Amanah caution lives in the MEANING pane.
 *   3. An unknown templateId renders the empty cue.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import { usePlanStratumProgressStore } from '../../../../store/planStratumStore.js';
import PlanProtocolWorkspace from '../PlanProtocolWorkspace.js';

const PROJECT_ID = 'proj-workspace';
const PRIMARY = 'market_garden' as const;
// Universal protocol carrying a token (so the threshold editor renders).
const SINGLE_ID = 'u-s5-water-store-low';
// market_garden advance-sale protocol — carries a verbatim Amanah scopeNote.
const SCOPED_ID = 'mg-market-channel-advance-sale';

function renderWorkspace(templateId: string) {
  return render(
    <PlanProtocolWorkspace
      projectId={PROJECT_ID}
      primaryTypeId={PRIMARY}
      secondaryTypeIds={[]}
      templateId={templateId}
    />,
  );
}

beforeEach(() => {
  useProtocolStore.setState({ records: [], expectationsByProject: {} });
  usePlanStratumProgressStore.setState({ protocolTokenOverridesByProject: {} });
});
afterEach(() => cleanup());

describe('PlanProtocolWorkspace', () => {
  it('mounts the editor (card + threshold editor) and the meaning pane together', () => {
    renderWorkspace(SINGLE_ID);

    const workspace = screen.getByTestId('plan-protocol-workspace');
    expect(workspace.getAttribute('data-template-id')).toBe(SINGLE_ID);

    // Editor pane: the mechanics card + the editable threshold editor.
    expect(within(workspace).getByTestId('protocol-template-card')).toBeTruthy();
    expect(within(workspace).getByTestId('protocol-threshold-editor')).toBeTruthy();
    // Meaning pane.
    expect(within(workspace).getByTestId('protocol-meaning-pane')).toBeTruthy();
  });

  it('shows the Amanah caution in the meaning pane, not in the mechanics editor card', () => {
    renderWorkspace(SCOPED_ID);

    // Exactly one Amanah caution, and it lives inside the meaning pane.
    const cautions = screen.getAllByTestId('protocol-amanah-caution');
    expect(cautions).toHaveLength(1);
    const meaning = screen.getByTestId('protocol-meaning-pane');
    expect(within(meaning).getByTestId('protocol-amanah-caution')).toBeTruthy();
    // The mechanics editor card carries no caution.
    const card = screen.getByTestId('protocol-template-card');
    expect(within(card).queryByTestId('protocol-amanah-caution')).toBeNull();
  });

  it('renders the empty cue for an unknown templateId', () => {
    renderWorkspace('does-not-exist');
    expect(screen.getByTestId('plan-protocol-workspace-empty')).toBeTruthy();
    expect(screen.queryByTestId('plan-protocol-workspace')).toBeNull();
    expect(screen.queryByTestId('protocol-meaning-pane')).toBeNull();
  });
});
