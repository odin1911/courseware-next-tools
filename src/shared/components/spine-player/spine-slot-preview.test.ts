import { readFileSync } from 'node:fs';

import { zipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  exportRegionBitmapFromImageMap,
  exportRegionBitmapFromZipBundle,
  parseSpineAtlas,
  parseSpineZipBytes,
  resolveSlotAttachment,
  resolveSlotRegionDescriptor,
  type SpineSlotRegionDescriptor,
} from './spine-slot-preview';

function createZipBytes(entries: Record<string, string | Uint8Array>) {
  return zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([fileName, content]) => [
        fileName,
        typeof content === 'string' ? new TextEncoder().encode(content) : content,
      ]),
    ),
  );
}

const atlasText = `rebuilt_spine.png
size: 256,256
format: RGBA8888
filter: Linear,Linear
repeat: none
draw2
  rotate: false
  xy: 10, 20
  size: 30, 40
  orig: 30, 40
  offset: 0, 0
  index: -1
draw3
  rotate: false
  xy: 60, 20
  size: 30, 40
  orig: 30, 40
  offset: 0, 0
  index: -1
draw
  rotate: false
  xy: 110, 20
  size: 30, 40
  orig: 30, 40
  offset: 2, 3
  index: -1`;

const spineJson = {
  animations: { start: {}, animation: {}, end: {} },
  slots: [
    { name: 'draw', attachment: 'draw' },
    { name: 'draw2', attachment: 'draw2' },
    { name: 'draw3', attachment: 'draw3' },
  ],
  skins: [
    {
      name: 'default',
      attachments: {
        draw: { draw: { type: 'region', path: 'draw' } },
        draw2: { draw2: { type: 'region', path: 'draw2' } },
        draw3: { draw3: { type: 'region', path: 'draw3' } },
      },
    },
  ],
} as const;

function createDescriptor(imageName: string): SpineSlotRegionDescriptor {
  return {
    slotName: 'draw',
    attachmentName: 'draw',
    attachmentType: 'region',
    attachmentPath: 'draw',
    regionName: 'draw',
    name: 'draw',
    imageName,
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    origWidth: 30,
    origHeight: 40,
    offsetX: 2,
    offsetY: 3,
    rotate: false,
  };
}

function createConflictingTextureZipBundle() {
  return parseSpineZipBytes(
    createZipBytes({
      'skeleton.atlas': atlasText,
      'skeleton.json': JSON.stringify(spineJson),
      'nested/shared/page.png': new Uint8Array([1, 2, 3]),
      'other/page.png': new Uint8Array([9, 8, 7, 6]),
    }),
  );
}

function installCanvasPreviewMock() {
  vi.stubGlobal('document', {
    createElement: vi.fn((tagName: string) => {
      if (tagName !== 'canvas') {
        throw new Error(`Unexpected element requested in test: ${tagName}`);
      }

      const context = {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        restore: vi.fn(),
      };

      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => context),
        toDataURL: vi.fn(() => 'data:image/png;base64,preview'),
      } as unknown as HTMLCanvasElement;
    }),
  });
}

function installLoadedImageMock() {
  const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-preview');
  const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  class MockImage {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }

  vi.stubGlobal('Image', MockImage as unknown as typeof Image);

  return {
    createObjectUrlSpy,
    revokeObjectUrlSpy,
  };
}

describe('spine-slot-preview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('从 atlas 和 skeleton 中解析 draw/draw2/draw3 默认 attachment 与 region', () => {
    const atlas = parseSpineAtlas(atlasText);

    expect(resolveSlotAttachment(spineJson, 'draw2')).toMatchObject({
      slotName: 'draw2',
      attachmentName: 'draw2',
      attachmentType: 'region',
    });

    expect(resolveSlotRegionDescriptor(spineJson, atlas, 'draw')).toMatchObject({
      slotName: 'draw',
      regionName: 'draw',
      offsetX: 2,
      offsetY: 3,
    });
  });

  it('slot 默认 attachment 不是 region 时返回显式 unsupported 错误', () => {
    const atlas = parseSpineAtlas(atlasText);
    const meshJson = {
      ...spineJson,
      skins: [
        {
          name: 'default',
          attachments: {
            draw: { draw: { type: 'mesh', path: 'draw' } },
          },
        },
      ],
    } as const;

    expect(() => resolveSlotRegionDescriptor(meshJson, atlas, 'draw')).toThrow(
      'Spine slot "draw" attachment "draw" type "mesh" is unsupported',
    );
  });

  it('atlas 含非法数值时显式报错，不产出伪造 region', () => {
    const invalidAtlasText = `rebuilt_spine.png
size: 256,256
format: RGBA8888
filter: Linear,Linear
repeat: none
draw
  rotate: false
  xy: nope, 20
  size: 30, 40
  orig: 30, 40
  offset: 0, 0
  index: -1`;

    expect(() => parseSpineAtlas(invalidAtlasText)).toThrow(
      'Spine atlas region "draw" field "xy" contains invalid number pair: nope, 20',
    );
  });

  it('缺 default skin 时显式报错，不回退到第一个 skin', () => {
    const noDefaultSkinJson = {
      ...spineJson,
      skins: [
        {
          name: 'alt',
          attachments: {
            draw: { draw: { type: 'region', path: 'draw' } },
          },
        },
      ],
    } as const;

    expect(() => resolveSlotAttachment(noDefaultSkinJson, 'draw')).toThrow(
      'Spine default skin not found',
    );
  });

  it('slot 没有默认 attachment 且 attachmentsBySlot 为空时显式报错', () => {
    const noDefaultAttachmentJson = {
      ...spineJson,
      slots: [{ name: 'draw' }],
      skins: [
        {
          name: 'default',
          attachments: {
            draw: {},
          },
        },
      ],
    } as const;

    expect(() => resolveSlotAttachment(noDefaultAttachmentJson, 'draw')).toThrow(
      'Spine slot "draw" has no default attachment',
    );
  });

  it('slot 默认 attachment 不匹配时显式报错，不回退到第一个 attachment', () => {
    const missingDefaultAttachmentJson = {
      ...spineJson,
      slots: [{ name: 'draw', attachment: 'missing' }],
      skins: [
        {
          name: 'default',
          attachments: {
            draw: {
              fallback: { type: 'region', path: 'draw' },
            },
          },
        },
      ],
    } as const;

    expect(() => resolveSlotAttachment(missingDefaultAttachmentJson, 'draw')).toThrow(
      'Spine slot "draw" default attachment "missing" not found in default skin',
    );
  });

  it('atlas 缺 region 时显式报错', () => {
    const atlas = parseSpineAtlas(atlasText);
    const missingRegionJson = {
      ...spineJson,
      skins: [
        {
          name: 'default',
          attachments: {
            draw: { draw: { type: 'region', path: 'missing-region' } },
          },
        },
      ],
    } as const;

    expect(() => resolveSlotRegionDescriptor(missingRegionJson, atlas, 'draw')).toThrow(
      'Spine slot "draw" region "missing-region" not found in atlas',
    );
  });

  it('zip 缺 atlas/json/纹理时显式报错', () => {
    expect(() =>
      parseSpineZipBytes(
        createZipBytes({
          'skeleton.json': JSON.stringify(spineJson),
          'texture.png': new Uint8Array([1, 2, 3]),
        }),
      ),
    ).toThrow('Spine zip missing .atlas file');

    expect(() =>
      parseSpineZipBytes(
        createZipBytes({
          'skeleton.atlas': atlasText,
          'texture.png': new Uint8Array([1, 2, 3]),
        }),
      ),
    ).toThrow('Spine zip missing .json file');

    expect(() =>
      parseSpineZipBytes(
        createZipBytes({
          'skeleton.atlas': atlasText,
          'skeleton.json': JSON.stringify(spineJson),
        }),
      ),
    ).toThrow('Spine zip missing texture image file');
  });

  it('可从真实 zip 中取出 atlas/json/纹理文件名，不依赖浏览器环境', () => {
    const zipBytes = new Uint8Array(
      readFileSync(new URL('../../../pages/spine-tool/assets/count2_farm.zip', import.meta.url)),
    );

    const bundle = parseSpineZipBytes(zipBytes);

    expect(bundle.atlasFileName.endsWith('.atlas')).toBe(true);
    expect(bundle.jsonFileName.endsWith('.json')).toBe(true);
    expect(bundle.textureFiles.length).toBeGreaterThan(0);
  });

  it('imageMap 在 basename 冲突时不会模糊命中错误图片', () => {
    installCanvasPreviewMock();

    const descriptor = createDescriptor('page.png');
    const imageMap = new Map<string, HTMLImageElement>([
      ['nested/shared/page.png', {} as HTMLImageElement],
      ['other/page.png', {} as HTMLImageElement],
    ]);

    expect(() => exportRegionBitmapFromImageMap(imageMap, descriptor)).toThrow(
      'Spine atlas image "page.png" not found in decoded image map',
    );
  });

  it('zip bundle 在 basename 冲突时不会模糊命中错误纹理 entry', async () => {
    installCanvasPreviewMock();
    const { createObjectUrlSpy } = installLoadedImageMock();

    const zipBundle = createConflictingTextureZipBundle();

    await expect(
      exportRegionBitmapFromZipBundle(zipBundle, createDescriptor('page.png')),
    ).rejects.toThrow('Spine atlas image "page.png" not found in zip textures');

    expect(createObjectUrlSpy).not.toHaveBeenCalled();
  });

  it('zip bundle 仅在提供完整路径时稳定命中冲突组中的 exact entry', async () => {
    installCanvasPreviewMock();
    const { createObjectUrlSpy } = installLoadedImageMock();

    const zipBundle = createConflictingTextureZipBundle();

    await expect(
      exportRegionBitmapFromZipBundle(zipBundle, createDescriptor('nested/shared/page.png')),
    ).resolves.toMatchObject({
      descriptor: expect.objectContaining({ imageName: 'nested/shared/page.png' }),
      dataUrl: 'data:image/png;base64,preview',
      width: 30,
      height: 40,
    });

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);

    const firstCall = createObjectUrlSpy.mock.calls[0];
    const blob = firstCall?.[0];

    if (!(blob instanceof Blob)) {
      throw new Error('Expected URL.createObjectURL to receive a Blob');
    }

    const blobBytes = new Uint8Array(await blob.arrayBuffer());

    expect(Array.from(blobBytes)).toEqual([1, 2, 3]);
  });
});
