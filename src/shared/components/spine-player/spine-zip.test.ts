import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { parseSpineZipBytes } from './spine-zip';
import * as spineZipModule from './spine-zip';

function createZipBytes(entries: Record<string, string | Uint8Array>) {
  return zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([entryPath, content]) => [
        entryPath,
        typeof content === 'string' ? new TextEncoder().encode(content) : content,
      ]),
    ),
  );
}

describe('spine-zip', () => {
  it('保留 atlas/json/纹理的原始 entryPath，并记录 backgroundEntry 与 ignoredEntries', () => {
    const bundle = parseSpineZipBytes(
      createZipBytes({
        'nested/assets/hero.atlas': 'page.png\nbody\n',
        'nested/data/hero.json': '{"skeleton":{"hash":"test"}}',
        'nested/textures/page.png': new Uint8Array([1, 2, 3]),
        'nested/background/bg.png': new Uint8Array([4, 5, 6]),
        '__MACOSX/nested/._hero.atlas': new Uint8Array([7]),
        'nested/.DS_Store': new Uint8Array([8]),
        'nested/textures/._page.png': new Uint8Array([9]),
      }),
    ) as {
      entries?: Array<{ entryPath: string; fileName: string }>;
      ignoredEntries?: string[];
      atlasEntry?: { entryPath: string; fileName: string };
      jsonEntry?: { entryPath: string; fileName: string };
      textureEntries?: Array<{ entryPath: string; fileName: string }>;
      backgroundEntry?: { entryPath: string; fileName: string } | null;
    };

    expect(bundle.entries?.map((entry) => entry.entryPath)).toEqual([
      'nested/assets/hero.atlas',
      'nested/data/hero.json',
      'nested/textures/page.png',
      'nested/background/bg.png',
    ]);
    expect(bundle.atlasEntry).toMatchObject({
      entryPath: 'nested/assets/hero.atlas',
      fileName: 'hero.atlas',
    });
    expect(bundle.jsonEntry).toMatchObject({
      entryPath: 'nested/data/hero.json',
      fileName: 'hero.json',
    });
    expect(bundle.textureEntries?.map((entry) => entry.entryPath)).toEqual([
      'nested/textures/page.png',
      'nested/background/bg.png',
    ]);
    expect(bundle.backgroundEntry).toMatchObject({
      entryPath: 'nested/background/bg.png',
      fileName: 'bg.png',
    });
    expect(bundle.ignoredEntries).toEqual([
      '__MACOSX/nested/._hero.atlas',
      'nested/.DS_Store',
      'nested/textures/._page.png',
    ]);
  });

  it('缺少 atlas 时抛出明确错误', () => {
    expect(() =>
      parseSpineZipBytes(
        createZipBytes({
          'nested/data/hero.json': '{"skeleton":{"hash":"test"}}',
          'nested/textures/page.png': new Uint8Array([1, 2, 3]),
        }),
      ),
    ).toThrowError('Spine zip missing .atlas file');
  });

  it('缺少 json 时抛出明确错误', () => {
    expect(() =>
      parseSpineZipBytes(
        createZipBytes({
          'nested/assets/hero.atlas': 'page.png\nbody\n',
          'nested/textures/page.png': new Uint8Array([1, 2, 3]),
        }),
      ),
    ).toThrowError('Spine zip missing .json file');
  });

  it('缺少纹理时抛出明确错误', () => {
    expect(() =>
      parseSpineZipBytes(
        createZipBytes({
          'nested/assets/hero.atlas': 'page.png\nbody\n',
          'nested/data/hero.json': '{"skeleton":{"hash":"test"}}',
        }),
      ),
    ).toThrowError('Spine zip missing texture image file');
  });

  it('存在多个 atlas 时拒绝依赖 zip 顺序并抛出歧义错误', () => {
    expect(() =>
      parseSpineZipBytes(
        createZipBytes({
          'nested/assets/hero.atlas': 'page.png\nbody\n',
          'nested/assets/hero-alt.atlas': 'page-alt.png\nbody\n',
          'nested/data/hero.json': '{"skeleton":{"hash":"test"}}',
          'nested/textures/page.png': new Uint8Array([1, 2, 3]),
        }),
      ),
    ).toThrowError('Spine zip must contain exactly one .atlas file');
  });

  it('存在多个 json 时拒绝依赖 zip 顺序并抛出歧义错误', () => {
    expect(() =>
      parseSpineZipBytes(
        createZipBytes({
          'nested/assets/hero.atlas': 'page.png\nbody\n',
          'nested/data/hero.json': '{"skeleton":{"hash":"test"}}',
          'nested/data/hero-alt.json': '{"skeleton":{"hash":"test-alt"}}',
          'nested/textures/page.png': new Uint8Array([1, 2, 3]),
        }),
      ),
    ).toThrowError('Spine zip must contain exactly one .json file');
  });

  it('纹理路径解析优先完整路径精确匹配，唯一 basename 才回退，冲突时返回空字符串', () => {
    const resolveSpineTextureEntryPath = (
      spineZipModule as {
        resolveSpineTextureEntryPath?: (
          requestPath: string,
          entryPaths: readonly string[],
        ) => string;
      }
    ).resolveSpineTextureEntryPath;

    expect(
      resolveSpineTextureEntryPath?.('nested/shared/page.png', [
        'nested/shared/page.png',
        'other/page.png',
        'textures/unique.png',
      ]),
    ).toBe('nested/shared/page.png');

    expect(
      resolveSpineTextureEntryPath?.('unique.png', [
        'nested/shared/page.png',
        'textures/unique.png',
      ]),
    ).toBe('textures/unique.png');

    expect(
      resolveSpineTextureEntryPath?.('page.png', [
        'nested/shared/page.png',
        'other/page.png',
        'textures/unique.png',
      ]),
    ).toBe('');
  });
});
