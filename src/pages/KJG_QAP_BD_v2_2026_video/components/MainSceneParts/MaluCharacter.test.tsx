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

    act(() => root.unmount());
  });
});
