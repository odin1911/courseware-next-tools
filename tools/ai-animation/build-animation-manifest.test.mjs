import { describe, expect, test } from 'vitest';

async function loadManifestBuilder() {
  return import('./build-animation-manifest.mjs').catch(() => null);
}

describe('animation asset manifest', () => {
  test('splits large frame sequences into 4096px atlas pages', async () => {
    const builder = await loadManifestBuilder();

    expect(
      builder?.createActionEntry({
        name: 'wait',
        frameCount: 146,
        fps: 24,
        loop: true,
        width: 653,
        height: 674,
        maxTextureSize: 4096,
      }),
    ).toEqual({
      frameCount: 146,
      duration: 146 / 24,
      loop: true,
      webm: 'wait.webm',
      mov: 'wait.mov',
      atlases: [
        { src: 'wait-atlas-01.png', columns: 6, rows: 6, startFrame: 0, frameCount: 36 },
        { src: 'wait-atlas-02.png', columns: 6, rows: 6, startFrame: 36, frameCount: 36 },
        { src: 'wait-atlas-03.png', columns: 6, rows: 6, startFrame: 72, frameCount: 36 },
        { src: 'wait-atlas-04.png', columns: 6, rows: 6, startFrame: 108, frameCount: 36 },
        { src: 'wait-atlas-05.png', columns: 6, rows: 1, startFrame: 144, frameCount: 2 },
      ],
    });
  });

  test('uses one PNG for a single-frame action', async () => {
    const builder = await loadManifestBuilder();

    expect(
      builder?.createActionEntry({
        name: 'end',
        frameCount: 1,
        fps: 24,
        loop: false,
        width: 653,
        height: 674,
      }),
    ).toEqual({
      frameCount: 1,
      duration: 1 / 24,
      loop: false,
      still: 'end.png',
    });
  });

  test('uses a 2048px target and removes unused rows from a short atlas', async () => {
    const builder = await loadManifestBuilder();

    expect(
      builder?.createActionEntry({
        name: 'start',
        frameCount: 10,
        fps: 24,
        loop: true,
        width: 364,
        height: 230,
      }).atlases,
    ).toEqual([
      { src: 'start-atlas-01.png', columns: 5, rows: 2, startFrame: 0, frameCount: 10 },
    ]);
  });

  test('rejects invalid canvas and frame metadata', async () => {
    const builder = await loadManifestBuilder();

    expect(() =>
      builder?.buildManifest({
        asset: 'BD_laki',
        fps: 24,
        canvas: { width: 0, height: 674 },
        anchor: { x: 240, y: 365 },
        actions: [{ name: 'wait', frameCount: 146, loop: true }],
      }),
    ).toThrow('canvas.width');
  });
});
