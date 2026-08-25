import { describe, expect, test } from 'vitest';

async function loadPlayback() {
  return import('./rasterPlayback').catch(() => null);
}

describe('raster animation playback', () => {
  test.each([
    ['Mozilla/5.0 Chrome/56.0.2924.87 Safari/537.36', 'webm'],
    ['Mozilla/5.0 (Linux; Android 9) Chrome/56.0.2924.87 Mobile Safari/537.36', 'webm'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) Version/13.0 Mobile Safari/604.1', 'mov'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 12_5 like Mac OS X) Version/12.0 Mobile Safari/604.1', 'atlas'],
  ])('selects the expected renderer for %s', async (userAgent, expected) => {
    const playback = await loadPlayback();

    expect(
      playback?.selectRasterRenderer({
        preference: 'auto',
        userAgent,
        canPlayWebm: true,
        canPlayMov: true,
      }),
    ).toBe(expected);
  });

  test('calculates a final frame and completion from elapsed time', async () => {
    const playback = await loadPlayback();

    expect(
      playback?.getFrameState(
        { frameCount: 10, duration: 10 / 24 },
        0.5,
        24,
        false,
      ),
    ).toEqual({ frame: 9, complete: true });
  });

  test('wraps frames when the current playback requests looping', async () => {
    const playback = await loadPlayback();

    expect(
      playback?.getFrameState({ frameCount: 10, duration: 10 / 24 }, 0.5, 24, true),
    ).toEqual({ frame: 2, complete: false });
  });

  test('locates a frame in the lazily loaded atlas page', async () => {
    const playback = await loadPlayback();
    const atlases = [
      { src: 'wait-atlas-01.png', columns: 6, rows: 6, startFrame: 0, frameCount: 36 },
      { src: 'wait-atlas-02.png', columns: 6, rows: 1, startFrame: 36, frameCount: 2 },
    ];

    expect(playback?.locateAtlasFrame(atlases, 37)).toEqual({
      atlas: atlases[1],
      column: 1,
      row: 0,
    });
  });
});
