// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import RasterLobbyTitle from './RasterLobbyTitle';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('RasterLobbyTitle', () => {
  test('plays the generated title intro then starts floating', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.history.replaceState({}, '', '/?renderer=webm');
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const onStartPhaseChange = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <RasterLobbyTitle
          width={1024}
          height={768}
          floatAnimation="title-float 6s infinite"
          onStartPhaseChange={onStartPhaseChange}
        />,
      );
    });

    const video = container.querySelector('video');
    expect(video?.src).toContain('/BD_title/start.webm');
    act(() => video?.dispatchEvent(new Event('ended')));
    expect(onStartPhaseChange).toHaveBeenCalledWith('enter');
    expect(container.querySelector<HTMLElement>('[data-role="raster-lobby-title"]')?.style.animation)
      .toBe('title-float 6s infinite');

    act(() => root.unmount());
  });
});
