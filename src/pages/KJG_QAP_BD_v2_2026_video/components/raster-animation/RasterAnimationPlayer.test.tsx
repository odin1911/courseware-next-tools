// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const manifest = {
  version: 1,
  asset: 'fixture',
  fps: 24,
  canvas: { width: 100, height: 80 },
  anchor: { x: 5, y: 7 },
  actions: {
    start: {
      frameCount: 2,
      duration: 2 / 24,
      webm: 'start.webm',
      mov: 'start.mov',
      atlases: [
        { src: 'start-atlas-01.png', columns: 2, rows: 1, startFrame: 0, frameCount: 2 },
      ],
    },
    end: {
      frameCount: 1,
      duration: 1 / 24,
      still: 'end.png',
    },
  },
} as const;

const files = {
  'start.webm': '/start.webm',
  'start.mov': '/start.mov',
  'start-atlas-01.png': '/start-atlas-01.png',
  'end.png': '/end.png',
};

let container: HTMLDivElement;
let root: Root;
let imageLoadCount: number;
let drawImage: ReturnType<typeof vi.fn>;
let autoLoadImages: boolean;
let pendingImageLoads: Array<() => void>;

beforeEach(() => {
  imageLoadCount = 0;
  autoLoadImages = true;
  pendingImageLoads = [];
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    drawImage,
  } as unknown as CanvasRenderingContext2D);

  class LoadedImage {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    constructor() {
      imageLoadCount += 1;
    }
    set src(_value: string) {
      const load = () => this.onload?.();
      if (autoLoadImages) queueMicrotask(load);
      else pendingImageLoads.push(load);
    }
  }
  vi.stubGlobal('Image', LoadedImage);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function loadPlayer() {
  return import('./RasterAnimationPlayer').then((module) => module.default).catch(() => null);
}

describe('RasterAnimationPlayer', () => {
  test('actively switches from a failed video to Canvas atlas', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;

    await act(async () => {
      root.render(
        <Player
          manifest={manifest}
          files={files}
          action="start"
          paused
          renderer="webm"
        />,
      );
    });
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    if (video) video.currentTime = 0.05;

    await act(async () => {
      video?.dispatchEvent(new Event('error'));
      await Promise.resolve();
    });

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(container.querySelector('[data-raster-status="atlas"]')).not.toBeNull();
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      100,
      0,
      100,
      80,
      0,
      0,
      100,
      80,
    );
  });

  test('fires a non-looping video completion only once', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;
    const onComplete = vi.fn();

    await act(async () => {
      root.render(
        <Player
          manifest={manifest}
          files={files}
          action="start"
          renderer="webm"
          onComplete={onComplete}
        />,
      );
    });
    const video = container.querySelector('video');

    act(() => {
      video?.dispatchEvent(new Event('ended'));
      video?.dispatchEvent(new Event('ended'));
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('keeps the current video visible until the next still frame is ready', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;
    autoLoadImages = false;

    await act(async () => {
      root.render(<Player manifest={manifest} files={files} action="start" renderer="webm" />);
    });
    const video = container.querySelector('video');
    act(() => video?.dispatchEvent(new Event('loadeddata')));

    await act(async () => {
      root.render(<Player manifest={manifest} files={files} action="end" renderer="webm" />);
      await Promise.resolve();
    });

    expect(container.querySelector('video')?.getAttribute('src')).toBe('/start.webm');
    expect(container.querySelectorAll('canvas')).toHaveLength(1);

    await act(async () => {
      pendingImageLoads.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('[data-raster-action="end"]')?.getAttribute('style')).not.toContain(
      'visibility: hidden',
    );
  });

  test('combines template origin with the asset anchor and loops video on request', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;

    await act(async () => {
      root.render(
        <Player
          manifest={manifest}
          files={files}
          action="start"
          renderer="webm"
          origin={{ x: 10, y: 20 }}
          loop
        />,
      );
    });

    const player = container.querySelector<HTMLElement>('[data-raster-action="start"]');
    expect(player?.style.left).toBe('15px');
    expect(player?.style.top).toBe('27px');
    expect(container.querySelector('video')?.loop).toBe(true);
  });

  test('keeps Canvas running when the current playback requests looping', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;
    const onComplete = vi.fn();
    let nextFrame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });

    await act(async () => {
      root.render(
        <Player
          manifest={manifest}
          files={files}
          action="start"
          renderer="atlas"
          loop
          onComplete={onComplete}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      nextFrame?.(performance.now() + 100);
      await Promise.resolve();
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  test('does not redraw the same Canvas frame on faster display refreshes', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;
    let nextFrame: FrameRequestCallback | undefined;
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });

    await act(async () => {
      root.render(
        <Player manifest={manifest} files={files} action="start" renderer="atlas" loop />,
      );
      await Promise.resolve();
    });
    expect(drawImage).toHaveBeenCalledTimes(1);

    await act(async () => {
      nextFrame?.(1010);
      await Promise.resolve();
      nextFrame?.(1020);
      await Promise.resolve();
    });
    expect(drawImage).toHaveBeenCalledTimes(1);

    await act(async () => {
      nextFrame?.(1050);
      await Promise.resolve();
    });
    expect(drawImage).toHaveBeenCalledTimes(2);
  });

  test('pauses and resumes Canvas without reloading its atlas', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;

    await act(async () => {
      root.render(
        <Player manifest={manifest} files={files} action="start" renderer="atlas" paused />,
      );
      await Promise.resolve();
    });
    expect(imageLoadCount).toBe(1);

    await act(async () => {
      root.render(
        <Player manifest={manifest} files={files} action="start" renderer="atlas" paused={false} />,
      );
      await Promise.resolve();
    });
    await act(async () => {
      root.render(
        <Player manifest={manifest} files={files} action="start" renderer="atlas" paused />,
      );
      await Promise.resolve();
    });

    expect(imageLoadCount).toBe(1);
  });

  test('restartKey rewinds the current video action', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;

    await act(async () => {
      root.render(
        <Player
          manifest={manifest}
          files={files}
          action="start"
          renderer="webm"
          restartKey={0}
        />,
      );
    });
    const video = container.querySelector('video');
    if (!video) throw new Error('video was not rendered');
    video.currentTime = 1;

    await act(async () => {
      root.render(
        <Player
          manifest={manifest}
          files={files}
          action="start"
          renderer="webm"
          restartKey={1}
        />,
      );
    });

    expect(video.currentTime).toBe(0);
  });

  test('returns to atlas status after lazily loading the next page', async () => {
    const Player = await loadPlayer();
    expect(Player).not.toBeNull();
    if (!Player) return;
    let nextFrame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextFrame = callback;
      return 1;
    });
    const pagedManifest = {
      ...manifest,
      actions: {
        start: {
          ...manifest.actions.start,
          atlases: [
            { src: 'page-01.png', columns: 1, rows: 1, startFrame: 0, frameCount: 1 },
            { src: 'page-02.png', columns: 1, rows: 1, startFrame: 1, frameCount: 1 },
          ],
        },
      },
    } as const;

    await act(async () => {
      root.render(
        <Player
          manifest={pagedManifest}
          files={{ ...files, 'page-01.png': '/page-01.png', 'page-02.png': '/page-02.png' }}
          action="start"
          renderer="atlas"
        />,
      );
      await Promise.resolve();
    });
    expect(container.querySelector('[data-raster-status="atlas"]')).not.toBeNull();

    await act(async () => {
      nextFrame?.(performance.now() + 100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(imageLoadCount).toBe(2);
    expect(container.querySelector('[data-raster-status="atlas"]')).not.toBeNull();
  });
});
