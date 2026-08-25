import { describe, expect, test } from 'vitest';

async function loadFrameExporter() {
  return import('./frameExporter').catch(() => null);
}

describe('DragonBones frame export geometry', () => {
  test('uses one cropped canvas and anchor for every action frame', async () => {
    const exporter = await loadFrameExporter();

    expect(
      exporter?.buildExportGeometry(
        [
          { x: -10, y: 5, width: 80, height: 50 },
          { x: 20, y: -15, width: 100, height: 90 },
        ],
        2,
      ),
    ).toEqual({
      canvas: { width: 134, height: 94 },
      anchor: { x: -12, y: -17 },
      transform: { x: 12, y: 17 },
      sourceBounds: { x: -10, y: -15, width: 130, height: 90 },
    });
  });

  test('rejects an asset with no visible frame bounds', async () => {
    const exporter = await loadFrameExporter();

    expect(() => exporter?.buildExportGeometry([], 2)).toThrow('visible frame bounds');
  });

  test('pads odd canvas dimensions so all video formats keep the same size', async () => {
    const exporter = await loadFrameExporter();

    expect(
      exporter?.buildExportGeometry(
        [{ x: 0, y: 0, width: 73, height: 80 }],
        2,
      ).canvas,
    ).toEqual({ width: 78, height: 84 });
  });
});
