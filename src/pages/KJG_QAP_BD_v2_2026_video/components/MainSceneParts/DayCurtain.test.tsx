// @vitest-environment jsdom

import { act, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import DayCurtain from './DayCurtain';

vi.mock('@/shared/components/dragonbones-player', () => ({
  default: forwardRef(() => <div data-testid="legacy-dragonbones" />),
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DayCurtain raster resources', () => {
  test('keeps the current curtain visible until the next phase is ready', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/?renderer=webm');
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(<DayCurtain phase="opening" />));
    expect(container.querySelector('video')?.src).toContain('/BD_open/start.webm');
    expect(container.querySelector('[data-testid="legacy-dragonbones"]')).toBeNull();

    act(() => root.render(<DayCurtain phase="closing" />));
    const videos = [...container.querySelectorAll('video')];
    expect(videos).toHaveLength(2);
    expect(videos[0]?.src).toContain('/BD_open/start.webm');
    expect(videos[1]?.src).toContain('/BD_close/start.webm');

    act(() => videos[1]?.dispatchEvent(new Event('loadeddata')));
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(container.querySelector('video')?.src).toContain('/BD_close/start.webm');

    act(() => root.unmount());
  });
});
