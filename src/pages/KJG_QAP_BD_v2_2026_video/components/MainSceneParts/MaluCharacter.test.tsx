// @vitest-environment jsdom

import { act, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import MaluCharacter from './MaluCharacter';

vi.mock('@/shared/components/dragonbones-player', () => ({
  default: forwardRef(() => <div data-testid="legacy-dragonbones" />),
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('MaluCharacter raster resources', () => {
  test('renders every character with its generated raster asset', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.history.replaceState({}, '', '/?renderer=webm');
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <>
          {['laki', 'lele', 'nani', 'ola', 'pili'].map((charName) => (
            <MaluCharacter
              key={charName}
              charName={charName}
              animationName="idle"
              posX={137}
              entryKey={1}
              paused
            />
          ))}
        </>,
      );
    });

    expect(container.querySelectorAll('[data-role="malu"][data-render-mode="raster"]')).toHaveLength(5);
    expect(container.querySelectorAll('[data-raster-action="wait"]')).toHaveLength(5);
    expect(container.querySelector('[data-testid="legacy-dragonbones"]')).toBeNull();
    const expectedTop = {
      laki: 34.66999816894531,
      lele: 45.339996337890625,
      nani: 45.149993896484375,
      ola: 53.69,
      pili: 41.44,
    };

    for (const malu of container.querySelectorAll<HTMLElement>('[data-role="malu"]')) {
      const name = malu.dataset.maluName as keyof typeof expectedTop;
      const player = malu.querySelector<HTMLElement>('[data-raster-action="wait"]');
      expect(Number.parseFloat(player?.style.top ?? '')).toBeCloseTo(expectedTop[name]);
      expect(player?.querySelector('video')?.loop).toBe(true);
    }

    act(() => root.unmount());
  });
});
