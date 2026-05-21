// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SceneEngine } from '../components/SceneEngine';

describe('SceneEngine', () => {
  it('renders all children as scene panels', () => {
    render(
      <SceneEngine tier="dreaming">
        <section data-scene-id="hero">Hero</section>
        <section data-scene-id="y2-current">Y2</section>
      </SceneEngine>,
    );
    expect(screen.getByText('Hero')).toBeTruthy();
    expect(screen.getByText('Y2')).toBeTruthy();
  });
});
