/**
 * @vitest-environment happy-dom
 *
 * MonitoringStreamPanel (a11y) — the Plan-side (Mode-4 Design) display-only
 * monitoring panel: key indicators, response triggers, and the Observe-stage
 * feed. Audit item F3. lucide icons are stubbed (decorative, aria-hidden) so axe
 * sees the same accessibility tree the real icons present at runtime.
 */

import { describe, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { buildLucideStub } from '../../../../test/lucideStub.js';
import { expectNoA11yViolations } from '../../../../test/a11y.js';

vi.mock('lucide-react', async (importOriginal) =>
  buildLucideStub(await importOriginal<Record<string, unknown>>()),
);

import MonitoringStreamPanel from '../MonitoringStreamPanel.js';

describe('MonitoringStreamPanel (a11y)', () => {
  it('has no axe violations (allowlisted rules)', async () => {
    const { container } = render(
      <MonitoringStreamPanel
        indicators={[
          { metric: 'Greywater flow rate', frequency: 'weekly' },
          { metric: 'Reed-bed tank level', frequency: 'daily' },
        ]}
        triggers={['If flow stalls for 48h, inspect the reed bed.']}
        feeds="hydrology"
      />,
    );
    await expectNoA11yViolations(container);
  });
});
