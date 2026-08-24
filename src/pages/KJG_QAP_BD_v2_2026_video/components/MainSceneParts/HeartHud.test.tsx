// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import HeartHud from './HeartHud';

vi.mock('@/shared/components/animated-heart-hud/AnimatedHeartHud', () => ({
  default: () => <div data-testid="legacy-heart-hud" />,
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('HeartHud raster break animation', () => {
  test('plays the generated heart animation after a wrong answer', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/?renderer=webm');
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const props = { hearts: 2, maxHearts: 3, soundVolume: 1 };

    act(() => root.render(<HeartHud {...props} isWrongFeedback={false} />));
    act(() => root.render(<HeartHud {...props} isWrongFeedback />));
    act(() => vi.advanceTimersByTime(500));

    expect(container.querySelector('video')?.src).toContain('/heart/start.webm');
    expect(container.querySelector('[data-anim-phase="breaking"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="legacy-heart-hud"]')).toBeNull();

    act(() => vi.advanceTimersByTime(500));
    expect(container.querySelector('[data-anim-phase="returning"]')).not.toBeNull();

    act(() => root.unmount());
  });
});
