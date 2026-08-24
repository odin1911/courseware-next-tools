import { describe, expect, test } from 'vitest';
import { getRasterAsset, getRasterAssetNames } from './rasterAssets';

describe('raster asset registry', () => {
  test('loads generated manifest and media by asset name', () => {
    const asset = getRasterAsset('BD_ola');

    expect(asset.manifest.asset).toBe('BD_ola');
    expect(Object.keys(asset.manifest.actions)).toEqual([
      'enter',
      'turn_round',
      'wait',
      'angry',
      'happy_eating',
      'sad_eating',
      'pay_1',
      'pay_2',
      'end',
    ]);
    expect(asset.files['enter.webm']).toMatch(/\.webm(?:\?|$)/);
    expect(asset.files['enter.mov']).toMatch(/\.mov(?:\?|$)/);
    expect(asset.files['end.png']).toMatch(/\.png(?:\?|$)/);
  });

  test('rejects unknown asset names', () => {
    expect(() => getRasterAsset('missing')).toThrow('unknown raster asset: missing');
  });

  test('lists every generated resource in stable order', () => {
    expect(getRasterAssetNames()).toHaveLength(14);
    expect(getRasterAssetNames()[0]).toBe('BD_close');
    expect(getRasterAssetNames().at(-1)).toBe('heart');
  });
});
