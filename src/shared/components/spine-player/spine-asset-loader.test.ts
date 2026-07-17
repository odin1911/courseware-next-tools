import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadSpineDecodedAssets } from './spine-asset-loader';
import type { SpineZipBundle } from './spine-zip';

describe('spine-asset-loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function createBundle(): SpineZipBundle {
    return {
      entries: [],
      ignoredEntries: [],
      atlasEntry: {
        entryPath: 'spine.atlas',
        fileName: 'spine.atlas',
        bytes: new Uint8Array(),
      },
      atlasFileName: 'spine.atlas',
      atlasText: 'atlas-text',
      jsonEntry: {
        entryPath: 'spine.json',
        fileName: 'spine.json',
        bytes: new Uint8Array(),
      },
      jsonFileName: 'spine.json',
      jsonText: '{"skeleton":{}}',
      textureEntries: [
        {
          entryPath: 'images/bg.png',
          fileName: 'bg.png',
          bytes: new Uint8Array([1]),
        },
        {
          entryPath: 'images/atlas.png',
          fileName: 'atlas.png',
          bytes: new Uint8Array([2]),
        },
      ],
      textureFiles: [
        {
          entryPath: 'images/bg.png',
          fileName: 'bg.png',
          bytes: new Uint8Array([1]),
        },
        {
          entryPath: 'images/atlas.png',
          fileName: 'atlas.png',
          bytes: new Uint8Array([2]),
        },
      ],
      backgroundEntry: {
        entryPath: 'images/bg.png',
        fileName: 'bg.png',
        bytes: new Uint8Array([1]),
      },
    };
  }

  it('生成 textureUrlMap、imageMap、backgroundImageUrl，并在 cleanup 中回收全部 blob URL', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (() => {
        let index = 0;

        return () => `blob:test-${++index}`;
      })(),
    );

    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 870;
      naturalHeight = 470;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image);

    const bundle = createBundle();

    const assets = await loadSpineDecodedAssets(bundle);

    expect(assets.atlasText).toBe('atlas-text');
    expect(assets.jsonText).toBe('{"skeleton":{}}');
    expect(assets.textureUrlMap.get('images/bg.png')).toBe('blob:test-1');
    expect(assets.textureUrlMap.get('images/atlas.png')).toBe('blob:test-2');
    expect(assets.imageMap.get('images/bg.png')).toBeInstanceOf(MockImage);
    expect(assets.imageMap.get('images/atlas.png')).toBeInstanceOf(MockImage);
    expect(assets.backgroundImageUrl).toBe('blob:test-1');
    expect(assets.backgroundImageSize).toEqual({ width: 870, height: 470 });
    expect(assets.blobUrls).toEqual(['blob:test-1', 'blob:test-2']);

    assets.cleanup();

    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenNthCalledWith(1, 'blob:test-1');
    expect(revokeSpy).toHaveBeenNthCalledWith(2, 'blob:test-2');
  });

  it('image 加载失败时会 cleanup 已创建的 blob URL', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (() => {
        let index = 0;

        return () => `blob:test-${++index}`;
      })(),
    );

    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image);

    await expect(loadSpineDecodedAssets(createBundle())).rejects.toThrow(
      'Failed to load image: images/bg.png',
    );

    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenNthCalledWith(1, 'blob:test-1');
    expect(revokeSpy).toHaveBeenNthCalledWith(2, 'blob:test-2');
  });

  it('createObjectURL 中途失败时会 cleanup 已创建的 blob URL', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const createError = new Error('createObjectURL failed');

    vi.spyOn(URL, 'createObjectURL')
      .mockImplementationOnce(() => 'blob:test-1')
      .mockImplementationOnce(() => {
        throw createError;
      });

    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image);

    await expect(loadSpineDecodedAssets(createBundle())).rejects.toThrow(createError);

    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:test-1');
  });
});
