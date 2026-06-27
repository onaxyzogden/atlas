// @vitest-environment happy-dom
/**
 * RingRadiiFields — the seed-tool "Both" sizing control: an overall-scale
 * slider plus an expandable per-ring panel (home centre + Z1–Z5). It is
 * deliberately PURE / CONTROLLED — it renders the given `value` and reports
 * every edit verbatim via `onChange`, with NO live validation ("let the
 * steward type freely; the monotonic clamp runs once on commit"). So these
 * tests lock two layers:
 *
 *   1. Component contract — what it renders and the exact shapes it emits:
 *      the slider → `scaleRadii(s)` (an already-valid ascending set), and a
 *      per-ring field → the merged patch `{ ...value, [key]: Number(input) }`
 *      forwarded UNTOUCHED, including non-ascending / overlapping / negative /
 *      cleared values (proving the boundary where validation does NOT happen).
 *
 *   2. Store update path — wiring that `onChange` into
 *      `zoneRingConfigStore.setRadii` (as `ZoneSeedAnchorTool` does on commit)
 *      corrects those raw edits (strictly-increasing clamp, non-finite
 *      fallback), persists them to localStorage, and reverts on reset.
 *
 * The pure radii math (clampRingRadii / scaleRadii / get/set/reset) is
 * unit-tested directly in `store/__tests__/zoneRingConfigStore.test.ts`;
 * here it is exercised end-to-end from the field's emitted values — the
 * deferred audit item F2 (ATLAS_DEEP_AUDIT_2026-06-26).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RingRadiiFields from '../RingRadiiFields.js';
import {
  useZoneRingConfigStore,
  type ZoneRingRadii,
} from '../../../../store/zoneRingConfigStore.js';
import { DEFAULT_RING_RADII } from '../../layers/zoneRingConstants.js';

const PID = 'ring-fields-proj';
const STORAGE_KEY = 'ogden-atlas-zone-ring-config';

const ROW_LABELS: Record<keyof ZoneRingRadii, string> = {
  homeM: 'Home radius (metres)',
  z1M: 'Z1 radius (metres)',
  z2M: 'Z2 radius (metres)',
  z3M: 'Z3 radius (metres)',
  z4M: 'Z4 radius (metres)',
  z5M: 'Z5 radius (metres)',
};

/** Open the collapsed per-ring panel so the six number fields render. */
function openPerRingPanel(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Per-ring sizes' }));
}

function field(key: keyof ZoneRingRadii): HTMLInputElement {
  return screen.getByLabelText(ROW_LABELS[key]) as HTMLInputElement;
}

/**
 * Minimal host that mirrors the real call site (`ZoneSeedAnchorTool`): it
 * keeps the steward's RAW input visible in local state while committing each
 * edit through `zoneRingConfigStore.setRadii` (which clamps + persists). Lets
 * the tests assert the corrected/persisted store value, not the raw field.
 */
function StoreHarness({ projectId }: { projectId: string }) {
  const [radii, setLocal] = useState<ZoneRingRadii>(() =>
    useZoneRingConfigStore.getState().getRadii(projectId),
  );
  return (
    <RingRadiiFields
      value={radii}
      onChange={(next) => {
        setLocal(next); // raw input stays visible to the steward
        useZoneRingConfigStore.getState().setRadii(projectId, next); // store clamps
      }}
    />
  );
}

function persistedRadii(projectId: string): ZoneRingRadii | undefined {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return undefined;
  return JSON.parse(raw).state?.byProject?.[projectId];
}

beforeEach(() => {
  // Singleton store + persisted localStorage both reset so every test starts
  // from "no project overrides" (untouched ⇒ default ladder).
  useZoneRingConfigStore.setState({ byProject: {} });
  localStorage.clear();
});

describe('RingRadiiFields — component contract (pure / controlled)', () => {
  it('renders the scale slider at 1.0× with the documented range bounds', () => {
    const { container } = render(
      <RingRadiiFields value={DEFAULT_RING_RADII} onChange={() => {}} />,
    );
    const slider = screen.getByLabelText('Overall ring scale') as HTMLInputElement;
    expect(slider.getAttribute('type')).toBe('range');
    expect(slider.getAttribute('min')).toBe('0.5');
    expect(slider.getAttribute('max')).toBe('2');
    expect(slider.getAttribute('step')).toBe('0.1');
    expect(slider.value).toBe('1');
    expect(container.textContent).toContain('1.0×');
  });

  it('keeps the per-ring fields collapsed until the toggle is opened', () => {
    render(<RingRadiiFields value={DEFAULT_RING_RADII} onChange={() => {}} />);
    const toggle = screen.getByRole('button', { name: 'Per-ring sizes' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText(ROW_LABELS.homeM)).toBeNull();

    fireEvent.click(toggle);
    const opened = screen.getByRole('button', { name: 'Hide per-ring sizes' });
    expect(opened.getAttribute('aria-expanded')).toBe('true');

    // Toggling again re-collapses the panel.
    fireEvent.click(opened);
    expect(
      screen.getByRole('button', { name: 'Per-ring sizes' }).getAttribute('aria-expanded'),
    ).toBe('false');
    expect(screen.queryByLabelText(ROW_LABELS.homeM)).toBeNull();
  });

  it('reveals six labelled per-ring inputs (Home + Z1–Z5) when expanded', () => {
    render(<RingRadiiFields value={DEFAULT_RING_RADII} onChange={() => {}} />);
    openPerRingPanel();
    (Object.keys(ROW_LABELS) as (keyof ZoneRingRadii)[]).forEach((key) => {
      const input = field(key);
      expect(input.getAttribute('type')).toBe('number');
      expect(input.getAttribute('min')).toBe('1');
      expect(input.getAttribute('step')).toBe('1');
    });
  });

  it('displays each radius rounded to a whole metre', () => {
    render(
      <RingRadiiFields
        value={{ ...DEFAULT_RING_RADII, z2M: 145.7, z3M: 299.4 }}
        onChange={() => {}}
      />,
    );
    openPerRingPanel();
    expect(field('homeM').value).toBe('15');
    expect(field('z2M').value).toBe('146'); // 145.7 → 146
    expect(field('z3M').value).toBe('299'); // 299.4 → 299
    expect(field('z5M').value).toBe('1200');
  });

  it('emits scaleRadii() — a valid ascending set — when the slider is raised', () => {
    const onChange = vi.fn();
    render(<RingRadiiFields value={DEFAULT_RING_RADII} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Overall ring scale'), {
      target: { value: '2' },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as ZoneRingRadii;
    // Canonical ladder multiplied ×2, still strictly increasing.
    expect(next).toEqual({
      homeM: 30,
      z1M: 60,
      z2M: 200,
      z3M: 600,
      z4M: 1200,
      z5M: 2400,
    });
  });

  it('emits the down-scaled ladder at the slider minimum (0.5×)', () => {
    const onChange = vi.fn();
    render(<RingRadiiFields value={DEFAULT_RING_RADII} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Overall ring scale'), {
      target: { value: '0.5' },
    });

    const next = onChange.mock.calls[0]![0] as ZoneRingRadii;
    expect(next.homeM).toBe(7.5);
    expect(next.z5M).toBe(600);
    expect(next.z1M).toBeGreaterThan(next.homeM);
    expect(next.z5M).toBeGreaterThan(next.z4M);
  });

  it('emits the merged set when a valid ascending per-ring value is entered', () => {
    const onChange = vi.fn();
    render(<RingRadiiFields value={DEFAULT_RING_RADII} onChange={onChange} />);
    openPerRingPanel();

    fireEvent.change(field('z3M'), { target: { value: '400' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toEqual({
      ...DEFAULT_RING_RADII,
      z3M: 400,
    });
  });

  it('forwards a non-ascending (overlapping) per-ring value verbatim — no live clamp', () => {
    const onChange = vi.fn();
    render(<RingRadiiFields value={DEFAULT_RING_RADII} onChange={onChange} />);
    openPerRingPanel();

    // Z1 dropped below the home disc (15 m) — would collapse the band. The
    // component MUST NOT correct it; it reports exactly what was typed.
    fireEvent.change(field('z1M'), { target: { value: '5' } });

    const next = onChange.mock.calls[0]![0] as ZoneRingRadii;
    expect(next.z1M).toBe(5);
    expect(next.homeM).toBe(DEFAULT_RING_RADII.homeM); // siblings untouched
    expect(next.z2M).toBe(DEFAULT_RING_RADII.z2M);
  });

  it('forwards a negative per-ring value verbatim — no live clamp', () => {
    const onChange = vi.fn();
    render(<RingRadiiFields value={DEFAULT_RING_RADII} onChange={onChange} />);
    openPerRingPanel();

    fireEvent.change(field('z2M'), { target: { value: '-10' } });

    expect((onChange.mock.calls[0]![0] as ZoneRingRadii).z2M).toBe(-10);
  });

  it('forwards a cleared (non-numeric / empty) field as 0 — no live clamp', () => {
    const onChange = vi.fn();
    render(<RingRadiiFields value={DEFAULT_RING_RADII} onChange={onChange} />);
    openPerRingPanel();

    // An emptied number field yields '' → Number('') === 0, forwarded as-is.
    fireEvent.change(field('homeM'), { target: { value: '' } });

    expect((onChange.mock.calls[0]![0] as ZoneRingRadii).homeM).toBe(0);
  });
});

describe('RingRadiiFields — store update path (zoneRingConfigStore)', () => {
  it('persists a valid edit through setRadii (in-memory + localStorage)', () => {
    render(<StoreHarness projectId={PID} />);
    openPerRingPanel();

    fireEvent.change(field('z3M'), { target: { value: '400' } });

    expect(useZoneRingConfigStore.getState().getRadii(PID).z3M).toBe(400);
    expect(persistedRadii(PID)?.z3M).toBe(400);
  });

  it('corrects a non-ascending / overlapping edit to strictly increasing radii', () => {
    render(<StoreHarness projectId={PID} />);
    openPerRingPanel();

    // Steward types Z1 below the home disc; the store update path lifts it.
    fireEvent.change(field('z1M'), { target: { value: '5' } });

    const r = useZoneRingConfigStore.getState().getRadii(PID);
    expect(r.homeM).toBe(DEFAULT_RING_RADII.homeM);
    expect(r.z1M).toBeGreaterThan(r.homeM);
    expect(r.z2M).toBeGreaterThan(r.z1M);
    expect(r.z3M).toBeGreaterThan(r.z2M);
    expect(r.z4M).toBeGreaterThan(r.z3M);
    expect(r.z5M).toBeGreaterThan(r.z4M);
  });

  it('corrects a negative edit to a positive, ascending value', () => {
    render(<StoreHarness projectId={PID} />);
    openPerRingPanel();

    fireEvent.change(field('z2M'), { target: { value: '-10' } });

    const r = useZoneRingConfigStore.getState().getRadii(PID);
    expect(r.z2M).toBeGreaterThan(0);
    expect(r.z2M).toBeGreaterThan(r.z1M);
  });

  it('corrects a cleared field by falling back to the slot default', () => {
    render(<StoreHarness projectId={PID} />);
    openPerRingPanel();

    // Emptied Home ⇒ 0 ⇒ non-positive ⇒ store restores the default home disc.
    fireEvent.change(field('homeM'), { target: { value: '' } });

    expect(useZoneRingConfigStore.getState().getRadii(PID).homeM).toBe(
      DEFAULT_RING_RADII.homeM,
    );
  });

  it('persists the scaled ladder when the steward drags the scale slider', () => {
    render(<StoreHarness projectId={PID} />);

    fireEvent.change(screen.getByLabelText('Overall ring scale'), {
      target: { value: '2' },
    });

    const r = useZoneRingConfigStore.getState().getRadii(PID);
    expect(r.homeM).toBe(30);
    expect(r.z5M).toBe(2400);
    expect(r.z1M).toBeGreaterThan(r.homeM);
    expect(persistedRadii(PID)?.homeM).toBe(30);
  });
});

describe('RingRadiiFields — default & reset behaviour', () => {
  it('renders the default Mollison ladder for an untouched project', () => {
    render(
      <RingRadiiFields
        value={useZoneRingConfigStore.getState().getRadii('untouched-proj')}
        onChange={() => {}}
      />,
    );
    openPerRingPanel();
    expect(field('homeM').value).toBe('15');
    expect(field('z1M').value).toBe('30');
    expect(field('z2M').value).toBe('100');
    expect(field('z3M').value).toBe('300');
    expect(field('z4M').value).toBe('600');
    expect(field('z5M').value).toBe('1200');
  });

  it('reverts a customised project to the default ladder on resetRadii', () => {
    render(<StoreHarness projectId={PID} />);
    openPerRingPanel();

    fireEvent.change(field('homeM'), { target: { value: '99' } });
    expect(useZoneRingConfigStore.getState().getRadii(PID).homeM).toBe(99);

    useZoneRingConfigStore.getState().resetRadii(PID);
    expect(useZoneRingConfigStore.getState().getRadii(PID)).toEqual(
      DEFAULT_RING_RADII,
    );
  });
});
