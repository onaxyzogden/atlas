/**
 * @vitest-environment happy-dom
 *
 * BentoBox primitive — render contract.
 *
 * Canonical surface for OLOS/Atlas. Outer `.bento` is the panel shell
 * (color-mix surface 96%/white, hairline border, soft shadow, --radius-lg);
 * inner `.group` is the recessed inset (var(--color-bg), --radius-md).
 * Values lifted verbatim from PlanTools.module.css `.toolbox`/`.group`
 * (the canonical implementation cited by the Observe Command Centre ADR).
 *
 * See: atlas/wiki/decisions/2026-05-27-atlas-bento-box-canonical-surface.md
 *      (filed in Phase 5 of the bento canonicalisation plan).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { render, cleanup } from '@testing-library/react';
import { BentoBox } from './BentoBox.js';
import styles from './BentoBox.module.css';

afterEach(() => cleanup());

describe('BentoBox', () => {
  describe('root', () => {
    it('renders children with the canonical bento outer class', () => {
      const { container } = render(<BentoBox>hi</BentoBox>);
      const root = container.firstChild as HTMLElement;
      expect(root).toBeTruthy();
      expect(root.className).toContain(styles.bento);
      expect(root.textContent).toBe('hi');
    });

    it('forwards ref to the underlying div', () => {
      const ref = createRef<HTMLDivElement>();
      render(<BentoBox ref={ref}>x</BentoBox>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies outer variant classes (default | flat | elevated)', () => {
      const { container, rerender } = render(<BentoBox>x</BentoBox>);
      let root = container.firstChild as HTMLElement;
      expect(root.className).toContain(styles['outer-default']);

      rerender(<BentoBox outer="flat">x</BentoBox>);
      root = container.firstChild as HTMLElement;
      expect(root.className).toContain(styles['outer-flat']);

      rerender(<BentoBox outer="elevated">x</BentoBox>);
      root = container.firstChild as HTMLElement;
      expect(root.className).toContain(styles['outer-elevated']);
    });

    it('applies padding scale classes (none | sm | md | lg)', () => {
      const { container, rerender } = render(<BentoBox>x</BentoBox>);
      let root = container.firstChild as HTMLElement;
      expect(root.className).toContain(styles['padding-md']);

      for (const p of ['none', 'sm', 'lg'] as const) {
        rerender(<BentoBox padding={p}>x</BentoBox>);
        root = container.firstChild as HTMLElement;
        expect(root.className).toContain(styles[`padding-${p}`]);
      }
    });

    it('merges a caller-supplied className', () => {
      const { container } = render(<BentoBox className="my-extra">x</BentoBox>);
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('my-extra');
      expect(root.className).toContain(styles.bento);
    });

    it('passes through arbitrary HTML attributes via ...rest', () => {
      const { container } = render(
        <BentoBox data-testid="bx" aria-label="panel">x</BentoBox>,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('data-testid')).toBe('bx');
      expect(root.getAttribute('aria-label')).toBe('panel');
    });
  });

  describe('Group', () => {
    it('renders with the canonical inner class', () => {
      const { container } = render(
        <BentoBox><BentoBox.Group>g</BentoBox.Group></BentoBox>,
      );
      const inner = container.querySelector(`.${styles.group}`);
      expect(inner).toBeTruthy();
      expect(inner!.textContent).toBe('g');
    });

    it('applies accent variant classes (none | gold | sage | warning | danger)', () => {
      const { container, rerender } = render(
        <BentoBox><BentoBox.Group>g</BentoBox.Group></BentoBox>,
      );
      let inner = container.querySelector(`.${styles.group}`)!;
      // default `none` should not carry an accent class
      expect(inner.className).not.toMatch(/accent-/);

      for (const a of ['gold', 'sage', 'warning', 'danger'] as const) {
        rerender(
          <BentoBox><BentoBox.Group accent={a}>g</BentoBox.Group></BentoBox>,
        );
        inner = container.querySelector(`.${styles.group}`)!;
        expect(inner.className).toContain(styles[`accent-${a}`]);
      }
    });

    it('forwards ref to the underlying div', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <BentoBox><BentoBox.Group ref={ref}>g</BentoBox.Group></BentoBox>,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Header / Body / Footer (Card-parity slots)', () => {
    it('renders all three with their canonical classes', () => {
      const { container } = render(
        <BentoBox>
          <BentoBox.Header>h</BentoBox.Header>
          <BentoBox.Body>b</BentoBox.Body>
          <BentoBox.Footer>f</BentoBox.Footer>
        </BentoBox>,
      );
      expect(container.querySelector(`.${styles.header}`)?.textContent).toBe('h');
      expect(container.querySelector(`.${styles.body}`)?.textContent).toBe('b');
      expect(container.querySelector(`.${styles.footer}`)?.textContent).toBe('f');
    });
  });

  describe('compound export shape', () => {
    it('exposes Group / Header / Body / Footer as static members', () => {
      expect(typeof BentoBox).toBe('object');
      expect(BentoBox.Group).toBeTruthy();
      expect(BentoBox.Header).toBeTruthy();
      expect(BentoBox.Body).toBeTruthy();
      expect(BentoBox.Footer).toBeTruthy();
    });
  });
});
