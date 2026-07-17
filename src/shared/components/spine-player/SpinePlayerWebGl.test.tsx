import { strToU8, zipSync } from 'fflate';
import { JSDOM } from 'jsdom';
import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as spinePlayerWebGlModule from './SpinePlayerWebGl';
import { createSpineAsyncRunController, createRunTokenGate } from './spineAsyncRun';
import { loadSpineRuntimeScript } from './spineRuntimeLoader';
import {
  extractSpineZip,
  findSpineBackgroundEntryPath,
  resolveZipAtlasImageEntryPath,
  startSpineZipRun,
} from './spineZipRuntime';

import {
  default as SpinePlayerWebGl,
  type SpinePlayerHandle,
  type SpineChildRectResult,
  type SpineChildRectRequest,
} from './SpinePlayerWebGl';
import { SpinePlayerWebGlShell } from './SpinePlayerWebGlShell';
import {
  mergeSpineRects,
  resolveSpineBackgroundWorldRect,
  resolveSpineBackgroundDrawRect,
  resolveSpineBackgroundRenderSize,
  resolveSpineRectDrawRect,
  resolveSpineViewportTransform,
} from './spineLayout';

const RUNTIME_URL = '/spine-runtime.js';

function createSpineZipBytes(backgroundContent: string) {
  return zipSync({
    'bg.png': strToU8(backgroundContent),
    'spine.atlas': strToU8('atlas-text'),
    'spine.json': strToU8('{"skeleton":{"hash":"test"}}'),
  });
}

function createChildRectZipBytes(backgroundContent: string) {
  return zipSync({
    'bg.png': strToU8(backgroundContent),
    'spine.atlas': strToU8('atlas-text'),
    'spine.json': strToU8(
      JSON.stringify({
        skeleton: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
        bones: [{ name: 'root' }, { name: 'mc-1-1', parent: 'root' }],
        slots: [{ name: 'mc-1-1-slot', bone: 'mc-1-1', attachment: 'item_1' }],
        skins: {
          default: {
            'mc-1-1-slot': {
              item_1: { width: 30, height: 40 },
            },
          },
        },
        animations: {
          start: {
            bones: {
              'mc-1-1': {
                translate: [{ time: 0, x: 10, y: 20 }],
              },
            },
          },
          click_item_1: {
            bones: {
              'mc-1-1': {
                translate: [
                  { time: 0, x: 10, y: 20 },
                  { time: 1, x: 10, y: 20 },
                ],
              },
            },
          },
        },
      }),
    ),
  });
}

function createChildRectWithEmptySlotZipBytes(backgroundContent: string) {
  return zipSync({
    'bg.png': strToU8(backgroundContent),
    'spine.atlas': strToU8('atlas-text'),
    'spine.json': strToU8(
      JSON.stringify({
        skeleton: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
        bones: [{ name: 'root' }, { name: 'mc-1-1', parent: 'root' }],
        slots: [
          { name: 'mc-1-1-slot', bone: 'mc-1-1', attachment: 'item_1' },
          { name: 'mc-1-1-empty-slot', bone: 'mc-1-1', attachment: null },
        ],
        skins: {
          default: {
            'mc-1-1-slot': {
              item_1: { width: 30, height: 40 },
            },
          },
        },
        animations: {
          start: {
            bones: {
              'mc-1-1': {
                translate: [{ time: 0, x: 10, y: 20 }],
              },
            },
          },
        },
      }),
    ),
  });
}

function createZipResponse(zipBytes: Uint8Array) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: async () =>
      zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength),
  } as Response;
}

function installImmediateImageMock() {
  class MockImage {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    private currentSrc = '';

    get src() {
      return this.currentSrc;
    }

    set src(value: string) {
      this.currentSrc = value;
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  vi.stubGlobal('Image', MockImage as unknown as typeof Image);
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function getBackgroundImage(container: HTMLElement) {
  return container.querySelector('img[alt="spine background"]') as HTMLImageElement | null;
}

type CapturedStartSpineZipRunOptions = {
  zipUrl: string;
  loadDecodedAssets?: (zipUrl: string) => Promise<unknown>;
};

function installSpineRuntimeMocks() {
  const animationStateUpdate = vi.fn();
  const animationStateApply = vi.fn();
  const animationStateSetAnimation = vi.fn((_track: number, name: string, _loop: boolean) => ({
    animation: { name },
  }));
  const skeletonSetToSetupPose = vi.fn();
  const skeletonUpdateWorldTransform = vi.fn();
  const gl = {
    COLOR_BUFFER_BIT: 0x4000,
    clearColor: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
  } as unknown as WebGLRenderingContext;

  class MockManagedWebGLRenderingContext {
    gl = gl;

    constructor(_canvas: HTMLCanvasElement, _options?: Record<string, unknown>) {}
  }

  class MockSceneRenderer {
    camera = {
      setViewport: vi.fn(),
      update: vi.fn(),
    };

    constructor(
      _canvas: HTMLCanvasElement,
      _ctx: MockManagedWebGLRenderingContext,
      _twoColorTint?: boolean,
    ) {}

    resize() {}

    begin() {}

    drawSkeleton() {}

    end() {}
  }

  class MockTextureAtlas {
    [key: string]: unknown;

    constructor(_atlasText: string, _textureLoader: (path: string) => unknown) {}
  }

  class MockAtlasAttachmentLoader {
    [key: string]: unknown;

    constructor(_atlas: MockTextureAtlas) {}
  }

  class MockSkeletonJson {
    constructor(_loader: MockAtlasAttachmentLoader) {}

    readSkeletonData(json: string) {
      const raw = JSON.parse(json) as {
        skeleton?: { x?: number; y?: number; width?: number; height?: number };
        animations?: Record<string, unknown>;
      };

      return {
        x: raw.skeleton?.x ?? 0,
        y: raw.skeleton?.y ?? 0,
        width: raw.skeleton?.width ?? 100,
        height: raw.skeleton?.height ?? 100,
        animations: Object.keys(raw.animations ?? { idle: {}, start: {} }).map((name) => ({
          name,
        })),
        __rawJson: raw,
      };
    }
  }

  class MockSkeleton {
    scaleX = 1;
    scaleY = 1;
    x = 0;
    y = 0;
    slots: Array<{
      bone: { data: { name: string }; skeleton: MockSkeleton };
      getAttachment: () => {
        computeWorldVertices: (
          bone: { data: { name: string }; skeleton: MockSkeleton },
          vertices: Float32Array,
          offset: number,
          stride: number,
        ) => void;
      } | null;
    }>;
    __currentAnimationName = '';
    __currentAnimationTime = 0;

    constructor(data: {
      x: number;
      y: number;
      width: number;
      height: number;
      animations?: Array<{ name: string }>;
      __rawJson?: {
        slots?: Array<{ name: string; bone: string; attachment?: string | null }>;
      };
    }) {
      this.slots = (data.__rawJson?.slots ?? []).map((slotDef) => ({
        bone: { data: { name: slotDef.bone }, skeleton: this },
        getAttachment: () => {
          if (slotDef.attachment === null) {
            return null;
          }

          return {
            computeWorldVertices: (
              bone: { data: { name: string }; skeleton: MockSkeleton },
              vertices: Float32Array,
              offset: number,
              stride: number,
            ) => {
              const animationName = bone.skeleton.__currentAnimationName;
              const time = bone.skeleton.__currentAnimationTime;
              const rect =
                animationName === 'click_item_1' && time >= 1
                  ? { x: 10, y: 20, width: 50, height: 60 }
                  : { x: 10, y: 20, width: 30, height: 40 };
              const corners = [
                [rect.x, rect.y],
                [rect.x + rect.width, rect.y],
                [rect.x + rect.width, rect.y + rect.height],
                [rect.x, rect.y + rect.height],
              ];

              corners.forEach(([x, y], index) => {
                const base = offset + index * stride;
                vertices[base] = x;
                vertices[base + 1] = y;
              });
            },
          };
        },
      }));
    }

    setToSetupPose() {
      skeletonSetToSetupPose();
    }

    updateWorldTransform() {
      skeletonUpdateWorldTransform();
    }
  }

  class MockAnimationStateData {
    [key: string]: unknown;

    constructor(_data: unknown) {}
  }

  class MockAnimationState {
    currentAnimationName = '';
    currentTime = 0;

    constructor(_data: MockAnimationStateData) {}

    update(delta: number) {
      this.currentTime = delta;
      animationStateUpdate(delta);
    }

    apply(skeleton: unknown) {
      (skeleton as MockSkeleton).__currentAnimationName = this.currentAnimationName;
      (skeleton as MockSkeleton).__currentAnimationTime = this.currentTime;
      animationStateApply(skeleton);
    }

    setAnimation(track: number, name: string, loop: boolean) {
      this.currentAnimationName = name;
      this.currentTime = 0;
      return animationStateSetAnimation(track, name, loop);
    }

    addListener(_listener: unknown) {}
  }

  class MockGLTexture {
    constructor(
      _ctx: MockManagedWebGLRenderingContext | WebGLRenderingContext,
      _image: HTMLImageElement,
      _useMipMaps?: boolean,
    ) {}
  }

  (window as Window & { spine?: unknown }).spine = {
    TextureAtlas: MockTextureAtlas,
    AtlasAttachmentLoader: MockAtlasAttachmentLoader,
    SkeletonJson: MockSkeletonJson,
    Skeleton: MockSkeleton,
    AnimationState: MockAnimationState,
    AnimationStateData: MockAnimationStateData,
    webgl: {
      ManagedWebGLRenderingContext: MockManagedWebGLRenderingContext,
      SceneRenderer: MockSceneRenderer,
      GLTexture: MockGLTexture,
    },
  };

  return {
    gl,
    animationStateUpdate,
    animationStateApply,
    animationStateSetAnimation,
    skeletonSetToSetupPose,
    skeletonUpdateWorldTransform,
  };
}

function installComponentMountMocks(zipBodies: Record<string, Uint8Array>) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost/',
  });
  const pendingImages = new Map<string, { onload: null | (() => void) }>();
  const domWindow = dom.window as unknown as Window & typeof globalThis;
  let objectUrlIndex = 0;

  vi.stubGlobal('window', domWindow);
  vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('navigator', dom.window.navigator);
  vi.stubGlobal('self', domWindow);
  vi.stubGlobal('Node', dom.window.Node);
  vi.stubGlobal('Event', dom.window.Event);
  vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
  vi.stubGlobal('HTMLCanvasElement', dom.window.HTMLCanvasElement);
  vi.stubGlobal('HTMLScriptElement', dom.window.HTMLScriptElement);
  const runtimeSpies = installSpineRuntimeMocks();
  const { gl } = runtimeSpies;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let nextRafId = 1;
  const rafCallbacks = new Map<number, FrameRequestCallback>();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      const id = nextRafId;
      nextRafId += 1;
      rafCallbacks.set(id, callback);
      return id;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      rafCallbacks.delete(id);
    }),
  );
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test-${++objectUrlIndex}`);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const body = zipBodies[url];

    if (!body) {
      throw new Error(`Unexpected fetch: ${url}`);
    }

    return createZipResponse(body);
  });

  const originalAppendChild = document.head.appendChild.bind(document.head);
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    const appended = originalAppendChild(node);

    if (node instanceof HTMLScriptElement) {
      queueMicrotask(() => {
        node.onload?.(new Event('load'));
      });
    }

    return appended;
  });

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
    if (contextId === 'webgl' || contextId === 'experimental-webgl') {
      return gl;
    }

    return null;
  });

  class MockImage {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    private currentSrc = '';

    get src() {
      return this.currentSrc;
    }

    set src(value: string) {
      this.currentSrc = value;
      pendingImages.set(value, this);
    }
  }

  vi.stubGlobal('Image', MockImage as unknown as typeof Image);

  return {
    async resolveImage(url: string) {
      let image = pendingImages.get(url);

      for (let attempt = 0; !image && attempt < 8; attempt += 1) {
        await flushAsyncWork();
        image = pendingImages.get(url);
      }

      if (!image) {
        throw new Error(`Pending image not found: ${url}`);
      }

      pendingImages.delete(url);
      image.onload?.();
      await flushAsyncWork();
    },
    async flushFrame(timestamp = 1000) {
      const callbacks = [...rafCallbacks.values()];
      rafCallbacks.clear();

      callbacks.forEach((callback) => {
        callback(timestamp);
      });
      await flushAsyncWork();
    },
    runtimeSpies,
  };
}

function createMountedPlayer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    container,
    async render(zipUrl?: string) {
      await act(async () => {
        root.render(
          <SpinePlayerWebGl zipUrl={zipUrl} runtimeUrl={RUNTIME_URL} width={320} height={180} />,
        );
        await flushAsyncWork();
      });
    },
    async unmount() {
      await act(async () => {
        root.unmount();
        await flushAsyncWork();
      });
      container.remove();
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('SpinePlayerWebGl bg.png support', () => {
  afterEach(() => {
    const currentWindow = globalThis.window as (Window & { spine?: unknown }) | undefined;

    if (currentWindow) {
      delete currentWindow.spine;
    }

    if (globalThis.document) {
      globalThis.document.body.innerHTML = '';
    }

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('背景图会跟随 skeleton 逻辑舞台使用同一套 contain 缩放', () => {
    expect(
      resolveSpineBackgroundRenderSize({
        backgroundNaturalWidth: 870,
        backgroundNaturalHeight: 470,
        stageWidth: 1024,
        stageHeight: 768,
        viewWidth: 520,
        viewHeight: 320,
        fitRatio: 1,
      }),
    ).toEqual({
      width: 362.5,
      height: 195.83333333333334,
    });
  });

  it('背景图按逻辑舞台左上角对齐，而不是按背景自身中心居中', () => {
    const rect = resolveSpineBackgroundDrawRect({
      backgroundNaturalWidth: 870,
      backgroundNaturalHeight: 470,
      stageWidth: 1024,
      stageHeight: 768,
      viewWidth: 520,
      viewHeight: 320,
      fitRatio: 1,
    });

    expect(rect).not.toBeNull();
    expect(rect?.x).toBeCloseTo(-213.33333333333334);
    expect(rect?.y).toBeCloseTo(-35.83333333333334);
    expect(rect?.width).toBeCloseTo(362.5);
    expect(rect?.height).toBeCloseTo(195.83333333333334);
  });

  it('背景图 world rect 会贴齐逻辑舞台左上角', () => {
    expect(
      resolveSpineBackgroundWorldRect({
        stageX: 0,
        stageY: 0,
        stageWidth: 1024,
        stageHeight: 768,
        backgroundNaturalWidth: 870,
        backgroundNaturalHeight: 470,
      }),
    ).toEqual({
      x: 0,
      y: 298,
      width: 870,
      height: 470,
    });
  });

  it('merged bounds 会让背景和骨架共用同一套 viewport transform', () => {
    const backgroundRect = resolveSpineBackgroundWorldRect({
      stageX: 0,
      stageY: 0,
      stageWidth: 1000,
      stageHeight: 700,
      backgroundNaturalWidth: 800,
      backgroundNaturalHeight: 400,
    });
    const mergedBounds = mergeSpineRects([
      backgroundRect,
      {
        x: -100,
        y: 100,
        width: 1000,
        height: 600,
      },
    ]);

    expect(mergedBounds).toEqual({
      x: -100,
      y: 100,
      width: 1000,
      height: 600,
    });

    const transform = resolveSpineViewportTransform({
      viewWidth: 500,
      viewHeight: 300,
      contentBounds: mergedBounds,
      fitRatio: 1,
    });

    expect(transform).toEqual({
      scale: 0.5,
      x: -200,
      y: -200,
    });

    expect(resolveSpineRectDrawRect(backgroundRect, transform)).toEqual({
      x: -200,
      y: -50,
      width: 400,
      height: 200,
    });
  });

  it('按原始 zip entry 路径识别 bg.png', () => {
    expect(findSpineBackgroundEntryPath(['atlas.png', 'bg.png'])).toBe('bg.png');
    expect(findSpineBackgroundEntryPath(['images/bg.png', 'atlas.png'])).toBe('images/bg.png');
    expect(findSpineBackgroundEntryPath(['nested/assets/bg.png', 'bg.webp'])).toBe(
      'nested/assets/bg.png',
    );
    expect(findSpineBackgroundEntryPath(['atlas.png', 'foo.webp'])).toBe('');
  });

  it('extractSpineZip 在 basename 冲突时仍返回 helper 选中的原始 entry URL', async () => {
    const zipEntries = {
      'images/bg.png': strToU8('nested-background'),
      'bg.png': strToU8('root'),
      'atlas.png': strToU8('atlas-image'),
      'spine.atlas': strToU8('atlas-text'),
      'spine.json': strToU8('{"skeleton":{"hash":"test"}}'),
    };
    const zipBytes = zipSync(zipEntries);
    const expectedEntryPath = findSpineBackgroundEntryPath(Object.keys(zipEntries));
    const expectedUrl = `blob:${zipEntries[expectedEntryPath as keyof typeof zipEntries].byteLength}:image/png`;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createZipResponse(zipBytes));
    installImmediateImageMock();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (blob) => `blob:${(blob as Blob).size}:${(blob as Blob).type}`,
    );

    await expect(extractSpineZip('/test-spine.zip')).resolves.toMatchObject({
      backgroundImageUrl: expectedUrl,
    });
  });

  it('extractSpineZip 保留原始 zip entry 路径作为 imageMap 主键', async () => {
    const zipEntries = {
      'images/atlas.png': strToU8('nested-atlas'),
      'fallback/atlas.png': strToU8('fallback-atlas'),
      'backgrounds/bg.png': strToU8('background-image'),
      'spine.atlas': strToU8('atlas-text'),
      'spine.json': strToU8('{"skeleton":{"hash":"test"}}'),
    };
    const zipBytes = zipSync(zipEntries);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createZipResponse(zipBytes));
    installImmediateImageMock();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (blob) => `blob:${(blob as Blob).size}:${(blob as Blob).type}`,
    );

    await expect(extractSpineZip('/test-entry-paths.zip')).resolves.toMatchObject({
      imageMap: new Map([
        ['images/atlas.png', 'blob:12:image/png'],
        ['fallback/atlas.png', 'blob:14:image/png'],
        ['backgrounds/bg.png', 'blob:16:image/png'],
      ]),
      backgroundImageUrl: 'blob:16:image/png',
    });
  });

  it('atlas 贴图解析优先命中精确 entryPath，仅在必要时才 basename fallback', () => {
    const entryPaths = [
      'images/atlas.png',
      'fallback/atlas.png',
      'nested/portrait.webp',
      'shared/backgrounds/bg.png',
    ];

    expect(resolveZipAtlasImageEntryPath('images/atlas.png', entryPaths)).toBe('images/atlas.png');
    expect(resolveZipAtlasImageEntryPath('./images/atlas.png', entryPaths)).toBe(
      'images/atlas.png',
    );
    expect(resolveZipAtlasImageEntryPath('portrait.webp', entryPaths)).toBe('nested/portrait.webp');
    expect(resolveZipAtlasImageEntryPath('atlas.png', entryPaths)).toBe('');
    expect(resolveZipAtlasImageEntryPath('missing.png', entryPaths)).toBe('');
  });

  it('run token gate 会让旧轮异步结果在新轮开始后失效', () => {
    const gate = createRunTokenGate();
    const writes: string[] = [];
    const firstRun = gate.nextRun();

    if (firstRun.isCurrent()) {
      writes.push('first-before-switch');
    }

    const secondRun = gate.nextRun();

    if (firstRun.isCurrent()) {
      writes.push('first-after-switch');
    }

    if (secondRun.isCurrent()) {
      writes.push('second-current');
    }

    expect(firstRun.runId).not.toBe(secondRun.runId);
    expect(writes).toEqual(['first-before-switch', 'second-current']);
  });

  it('run token gate 在 cleanup abort 后会阻止当前轮继续推进', () => {
    const gate = createRunTokenGate();
    const writes: string[] = [];
    const runToken = gate.nextRun();

    runToken.abort();

    if (runToken.isCurrent()) {
      writes.push('should-not-write');
    }

    const nextRun = gate.nextRun();

    if (nextRun.isCurrent()) {
      writes.push('next-run');
    }

    expect(writes).toEqual(['next-run']);
  });

  it('异步控制器会阻止旧 run 在新 run 开始后触发回写', () => {
    const writes: string[] = [];
    const onReady = vi.fn(() => {
      writes.push('ready');
    });
    const revoke = vi.fn();
    const controller = createSpineAsyncRunController({ onReady, revoke });
    const staleRun = controller.nextRun();

    staleRun.trackBlobUrls(['blob:stale']);
    controller.nextRun();

    expect(staleRun.checkpoint()).toBe(false);
    staleRun.notifyReady();

    expect(writes).toEqual([]);
    expect(onReady).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:stale');
  });

  it('异步控制器在失败或过期路径会统一回收 blob URL', () => {
    const onError = vi.fn();
    const revoke = vi.fn();
    const controller = createSpineAsyncRunController({ onError, revoke });
    const failedRun = controller.nextRun();

    failedRun.trackBlobUrls(['blob:a', 'blob:b']);
    failedRun.fail(new Error('load images failed'));

    const staleRun = controller.nextRun();
    staleRun.trackBlobUrls(['blob:c']);
    controller.nextRun();
    staleRun.fail(new Error('stale result'));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('load images failed');
    expect(revoke).toHaveBeenCalledTimes(3);
    expect(revoke).toHaveBeenNthCalledWith(1, 'blob:a');
    expect(revoke).toHaveBeenNthCalledWith(2, 'blob:b');
    expect(revoke).toHaveBeenNthCalledWith(3, 'blob:c');
  });

  it('异步控制器在 cleanup abort 后会阻止轮询和后续异步结果继续推进', () => {
    const writes: string[] = [];
    const onReady = vi.fn(() => {
      writes.push('ready');
    });
    const onError = vi.fn(() => {
      writes.push('error');
    });
    const revoke = vi.fn();
    const controller = createSpineAsyncRunController({ onReady, onError, revoke });
    const run = controller.nextRun();

    run.trackBlobUrls(['blob:cleanup']);
    run.abort();

    expect(run.checkpoint()).toBe(false);
    expect(
      run.commit(() => {
        writes.push('poll');
      }),
    ).toBe(false);

    run.notifyReady();
    run.fail(new Error('after abort'));

    expect(writes).toEqual([]);
    expect(onReady).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:cleanup');
  });

  it('异步控制器在 cleanup abort 时会同步触发背景清空回调', () => {
    const backgroundWrites: string[] = [];
    const controller = createSpineAsyncRunController({
      onAbort: () => {
        backgroundWrites.push('clear-background');
      },
    } as Parameters<typeof createSpineAsyncRunController>[0] & {
      onAbort: () => void;
    });
    const run = controller.nextRun();

    run.abort();

    expect(backgroundWrites).toEqual(['clear-background']);
  });

  it('zip runner 在 cleanup abort 时会清空旧背景，并阻止旧异步结果回写', async () => {
    const backgroundWrites: string[] = [];
    let currentBackground = '';
    const setBackgroundImageUrl = vi.fn((url: string) => {
      currentBackground = url;
      backgroundWrites.push(url);
    });
    const initSpineFromZip = vi.fn();
    const controller = createSpineAsyncRunController();

    const firstRun = startSpineZipRun({
      zipUrl: '/old.zip',
      createRun: () => controller.nextRun(),
      loadDecodedAssets: async () => ({
        atlasText: 'old-atlas',
        jsonText: 'old-json',
        textureUrlMap: new Map([['bg.png', 'blob:old-bg']]),
        imageMap: new Map(),
        blobUrls: ['blob:old-bg'],
        backgroundImageUrl: 'blob:old-bg',
        backgroundImageSize: { width: 870, height: 470 },
        cleanup: vi.fn(),
      }),
      initSpineFromZip,
      setBackgroundImageUrl,
    });

    await firstRun.done;

    expect(currentBackground).toBe('blob:old-bg');

    const decodeDeferred = createDeferred<{
      atlasText: string;
      jsonText: string;
      textureUrlMap: Map<string, string>;
      imageMap: Map<string, HTMLImageElement>;
      blobUrls: string[];
      backgroundImageUrl: string;
      backgroundImageSize: { width: number; height: number } | null;
      cleanup: () => void;
    }>();
    const secondRun = startSpineZipRun({
      zipUrl: '/new.zip',
      createRun: () => controller.nextRun(),
      loadDecodedAssets: () => decodeDeferred.promise,
      initSpineFromZip,
      setBackgroundImageUrl,
    });

    secondRun.abort();

    expect(currentBackground).toBe('');

    decodeDeferred.resolve({
      atlasText: 'new-atlas',
      jsonText: 'new-json',
      textureUrlMap: new Map([['bg.png', 'blob:new-bg']]),
      imageMap: new Map(),
      blobUrls: ['blob:new-bg'],
      backgroundImageUrl: 'blob:new-bg',
      backgroundImageSize: { width: 870, height: 470 },
      cleanup: vi.fn(),
    });

    await secondRun.done;

    expect(currentBackground).toBe('');
    expect(backgroundWrites).toEqual(['blob:old-bg', '']);
    expect(initSpineFromZip).toHaveBeenCalledTimes(1);
    expect(initSpineFromZip).toHaveBeenCalledWith(
      'old-atlas',
      'old-json',
      new Map(),
      expect.objectContaining({ runId: expect.any(Number) }),
    );
  });

  it('zip runner 支持注入 shared decoded assets 主链，且不会回退到本地 fetch + loadImages', async () => {
    const setBackgroundImageUrl = vi.fn();
    const setBlobUrls = vi.fn();
    const initSpineFromZip = vi.fn();
    const controller = createSpineAsyncRunController();
    const decodedImage = { src: 'blob:atlas' } as HTMLImageElement;
    const decodedImageMap = new Map<string, HTMLImageElement>([['images/atlas.png', decodedImage]]);
    const cleanup = vi.fn();
    const loadDecodedAssets = vi.fn(async (requestedZipUrl: string) => {
      expect(requestedZipUrl).toBe('/shared.zip');

      return {
        atlasText: 'shared-atlas',
        jsonText: 'shared-json',
        textureUrlMap: new Map([['images/atlas.png', 'blob:atlas']]),
        imageMap: decodedImageMap,
        backgroundImageUrl: 'blob:bg',
        backgroundImageSize: { width: 870, height: 470 },
        blobUrls: ['blob:atlas', 'blob:bg'],
        cleanup,
      };
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('legacy fetch should not run'));

    const run = startSpineZipRun({
      zipUrl: '/shared.zip',
      createRun: () => controller.nextRun(),
      loadDecodedAssets,
      initSpineFromZip,
      setBackgroundImageUrl,
      setBlobUrls,
    } as Parameters<typeof startSpineZipRun>[0] & {
      loadDecodedAssets: (zipUrl: string) => Promise<{
        atlasText: string;
        jsonText: string;
        textureUrlMap: Map<string, string>;
        imageMap: Map<string, HTMLImageElement>;
        backgroundImageUrl: string;
        backgroundImageSize: { width: number; height: number } | null;
        blobUrls: string[];
        cleanup: () => void;
      }>;
    });

    await run.done;

    expect(loadDecodedAssets).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setBlobUrls).toHaveBeenCalledWith(['blob:atlas', 'blob:bg']);
    expect(setBackgroundImageUrl).toHaveBeenCalledWith('blob:bg');
    expect(initSpineFromZip).toHaveBeenCalledWith(
      'shared-atlas',
      'shared-json',
      decodedImageMap,
      expect.objectContaining({ runId: expect.any(Number) }),
    );
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('extractSpineZip 按扩展名区分图片 Blob MIME', async () => {
    const zipEntries = {
      'photo.png': strToU8('png1'),
      'photo.jpg': strToU8('jpg22'),
      'photo.jpeg': strToU8('jpeg33'),
      'photo.webp': strToU8('webp444'),
      'spine.atlas': strToU8('atlas-text'),
      'spine.json': strToU8('{"skeleton":{"hash":"test"}}'),
    };
    const zipBytes = zipSync(zipEntries);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createZipResponse(zipBytes));
    installImmediateImageMock();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (blob) => `blob:${(blob as Blob).type}:${(blob as Blob).size}`,
    );

    await expect(extractSpineZip('/test-images.zip')).resolves.toMatchObject({
      imageMap: new Map([
        ['photo.png', 'blob:image/png:4'],
        ['photo.jpg', 'blob:image/jpeg:5'],
        ['photo.jpeg', 'blob:image/jpeg:6'],
        ['photo.webp', 'blob:image/webp:7'],
      ]),
    });
  });

  it('即使有背景图也只输出 wrapper + canvas，由 WebGL 负责背景绘制', () => {
    const markup = renderToStaticMarkup(
      <SpinePlayerWebGlShell
        backgroundImageUrl="blob:bg"
        backgroundNaturalSize={{ width: 870, height: 470 }}
        stageWidth={1024}
        stageHeight={768}
        width={320}
        height={180}
        className="spine-player"
        style={{ borderRadius: 16 }}
      />,
    );

    expect(markup).toContain('<div class="spine-player"');
    expect(markup).toContain('border-radius:16px');
    expect(markup).toContain('<canvas');
    expect(markup).toContain('width="320"');
    expect(markup).toContain('height="180"');
    expect(markup).not.toContain('<img');
  });

  it('没有背景图时静态结构只输出 wrapper + canvas', () => {
    const markup = renderToStaticMarkup(
      <SpinePlayerWebGlShell
        backgroundImageUrl=""
        width={320}
        height={180}
        className="spine-player"
        style={{ borderRadius: 16 }}
      />,
    );

    expect(markup).toContain('<div class="spine-player"');
    expect(markup).toContain('<canvas');
    expect(markup).not.toContain('<img');
  });

  it('显式关闭背景图时即使存在 bgUrl 也只输出 wrapper + canvas', () => {
    const markup = renderToStaticMarkup(
      <SpinePlayerWebGlShell
        backgroundImageUrl="blob:bg"
        showBackground={false}
        width={320}
        height={180}
        className="spine-player"
        style={{ borderRadius: 16 }}
      />,
    );

    expect(markup).toContain('<div class="spine-player"');
    expect(markup).toContain('<canvas');
    expect(markup).not.toContain('<img');
  });

  it('真实挂载后 zipUrl 切换与 unmount 不会输出 DOM 背景层', async () => {
    const oldBackgroundUrl = 'blob:test-1';
    const nextBackgroundUrl = 'blob:test-2';
    const { resolveImage } = installComponentMountMocks({
      '/old.zip': createSpineZipBytes('old-bg'),
      '/next.zip': createSpineZipBytes('next-bg-01'),
    });
    const player = createMountedPlayer();

    await player.render('/old.zip');
    await act(async () => {
      await resolveImage(oldBackgroundUrl);
    });

    expect(getBackgroundImage(player.container)).toBeNull();

    await player.render('/next.zip');

    expect(getBackgroundImage(player.container)).toBeNull();

    await player.unmount();
    await act(async () => {
      await resolveImage(nextBackgroundUrl);
    });

    expect(getBackgroundImage(player.container)).toBeNull();
  });

  it('真实挂载后旧 zip 的异步结果不会重新插入 DOM 背景层', async () => {
    const firstBackgroundUrl = 'blob:test-1';
    const secondBackgroundUrl = 'blob:test-2';
    const { resolveImage } = installComponentMountMocks({
      '/first.zip': createSpineZipBytes('first-bg-001'),
      '/second.zip': createSpineZipBytes('second-bg-001'),
    });
    const player = createMountedPlayer();

    await player.render('/first.zip');
    await player.render('/second.zip');

    await act(async () => {
      await resolveImage(secondBackgroundUrl);
    });

    expect(getBackgroundImage(player.container)).toBeNull();

    await act(async () => {
      await resolveImage(firstBackgroundUrl);
    });

    expect(getBackgroundImage(player.container)).toBeNull();

    await player.unmount();
  });

  it('真实组件路径会显式把 shared decoded assets provider 传给 zip runner', async () => {
    installComponentMountMocks({});
    const player = createMountedPlayer();
    const runtimeBridge = (
      spinePlayerWebGlModule as unknown as {
        spineZipRunRuntime?: {
          startSpineZipRun: typeof startSpineZipRun;
          loadDecodedAssetsFromZipUrl: (zipUrl: string) => Promise<unknown>;
        };
      }
    ).spineZipRunRuntime;

    expect(runtimeBridge).toBeDefined();

    if (!runtimeBridge) {
      await player.unmount();
      return;
    }

    let capturedOptions!: CapturedStartSpineZipRunOptions;
    const startSpy = vi.spyOn(runtimeBridge, 'startSpineZipRun').mockImplementation((options) => {
      capturedOptions = {
        zipUrl: options.zipUrl,
        loadDecodedAssets: options.loadDecodedAssets,
      };

      return {
        abort: vi.fn(),
        done: Promise.resolve(),
      };
    });

    await player.render('/shared.zip');
    await act(async () => {
      await flushAsyncWork();
    });

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(capturedOptions.zipUrl).toBe('/shared.zip');
    expect(capturedOptions.loadDecodedAssets).toBe(runtimeBridge.loadDecodedAssetsFromZipUrl);

    startSpy.mockRestore();
    await player.unmount();
  });

  it('页面已存在同一个 runtime 脚本且 window.spine 可用时不会重复注入脚本', async () => {
    installComponentMountMocks({
      '/dup-runtime.zip': createSpineZipBytes('dup-runtime-bg'),
    });
    const existingScript = document.createElement('script');
    existingScript.src = RUNTIME_URL;
    document.head.appendChild(existingScript);

    const player = createMountedPlayer();

    await player.render('/dup-runtime.zip');

    expect(document.head.querySelectorAll(`script[src="${RUNTIME_URL}"]`)).toHaveLength(1);

    await player.unmount();
  });

  it('容器缩小时保持 canvas 逻辑尺寸，不通过 CSS width/height 拉伸画面', async () => {
    installComponentMountMocks({
      '/resize.zip': createSpineZipBytes('resize-bg'),
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <div style={{ width: '160px', height: '240px' }}>
          <SpinePlayerWebGl
            zipUrl="/resize.zip"
            runtimeUrl={RUNTIME_URL}
            width={320}
            height={180}
            style={{ width: '100%', height: '100%' }}
          />
        </div>,
      );
      await flushAsyncWork();
    });

    const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;

    expect(canvas?.width).toBe(320);
    expect(canvas?.height).toBe(180);
    expect(canvas?.style.width || '').toBe('');
    expect(canvas?.style.height || '').toBe('');

    await act(async () => {
      root.unmount();
      await flushAsyncWork();
    });
    container.remove();
  });

  it('gotoAndStop 会把动作切到首帧并在后续帧保持冻结', async () => {
    const { resolveImage, flushFrame, runtimeSpies } = installComponentMountMocks({
      '/pose.zip': createSpineZipBytes('pose-bg'),
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const playerRef = createRef<SpinePlayerHandle>();

    await act(async () => {
      root.render(
        <SpinePlayerWebGl
          ref={playerRef}
          zipUrl="/pose.zip"
          runtimeUrl={RUNTIME_URL}
          width={320}
          height={180}
          autoPlay={false}
        />,
      );
      await flushAsyncWork();
    });

    await act(async () => {
      await resolveImage('blob:test-1');
    });

    runtimeSpies.animationStateSetAnimation.mockClear();
    runtimeSpies.animationStateUpdate.mockClear();

    await act(async () => {
      (
        playerRef.current as unknown as {
          gotoAndStop?: (animationName?: string) => void;
        } | null
      )?.gotoAndStop?.('start');
      await flushAsyncWork();
    });

    expect(runtimeSpies.animationStateSetAnimation).toHaveBeenCalledWith(0, 'start', false);
    expect(runtimeSpies.animationStateUpdate).toHaveBeenCalledWith(0);

    runtimeSpies.animationStateUpdate.mockClear();

    await act(async () => {
      await flushFrame(1000);
    });

    expect(runtimeSpies.animationStateUpdate).toHaveBeenCalledWith(0);

    await act(async () => {
      root.unmount();
      await flushAsyncWork();
    });
    container.remove();
  });

  it('autoPlay=false 时会在初始化后冻结到 defaultAnimationName 的首帧', async () => {
    const { resolveImage, runtimeSpies } = installComponentMountMocks({
      '/default-pose.zip': createSpineZipBytes('default-pose-bg'),
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SpinePlayerWebGl
          zipUrl="/default-pose.zip"
          runtimeUrl={RUNTIME_URL}
          width={320}
          height={180}
          autoPlay={false}
          defaultAnimationName="start"
        />,
      );
      await flushAsyncWork();
    });

    runtimeSpies.animationStateSetAnimation.mockClear();
    runtimeSpies.animationStateUpdate.mockClear();

    await act(async () => {
      await resolveImage('blob:test-1');
    });

    expect(runtimeSpies.animationStateSetAnimation).toHaveBeenCalledWith(0, 'start', false);
    expect(runtimeSpies.animationStateUpdate).toHaveBeenCalledWith(0);

    await act(async () => {
      root.unmount();
      await flushAsyncWork();
    });
    container.remove();
  });

  it('playChild 会在共享播放器内部播放 child，并可通过 stopChild 回收', async () => {
    const { resolveImage, flushFrame, runtimeSpies } = installComponentMountMocks({
      '/child-pose.zip': createChildRectZipBytes('child-pose-bg'),
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const playerRef = createRef<SpinePlayerHandle>();

    await act(async () => {
      root.render(
        <SpinePlayerWebGl
          ref={playerRef}
          zipUrl="/child-pose.zip"
          runtimeUrl={RUNTIME_URL}
          width={320}
          height={180}
          autoPlay={false}
          childTargets={[
            {
              childName: 'mc-1-1',
              x: 10,
              y: 20,
              width: 30,
              height: 40,
            },
          ]}
        />,
      );
      await flushAsyncWork();
    });

    await act(async () => {
      await resolveImage('blob:test-1');
    });

    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(
      (
        playerRef.current as unknown as {
          ischildPlaying?: (childName: string) => boolean;
        } | null
      )?.ischildPlaying?.('mc-1-1'),
    ).toBe(false);
    runtimeSpies.animationStateSetAnimation.mockClear();

    await act(async () => {
      (
        playerRef.current as unknown as {
          playChild?: (
            childName: string,
            animationName: string,
            loop?: number,
            stopBackStart?: boolean,
          ) => void;
        } | null
      )?.playChild?.('mc-1-1', 'start', 1, false);
      await flushAsyncWork();
    });

    expect(
      (
        playerRef.current as unknown as {
          ischildPlaying?: (childName: string) => boolean;
        } | null
      )?.ischildPlaying?.('mc-1-1'),
    ).toBe(true);

    await act(async () => {
      await flushFrame();
    });

    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(runtimeSpies.animationStateSetAnimation).toHaveBeenCalledWith(0, 'start', false);

    await act(async () => {
      (
        playerRef.current as unknown as {
          stopChild?: (childName: string) => void;
        } | null
      )?.stopChild?.('mc-1-1');
      await flushAsyncWork();
    });

    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(
      (
        playerRef.current as unknown as {
          ischildPlaying?: (childName: string) => boolean;
        } | null
      )?.ischildPlaying?.('mc-1-1'),
    ).toBe(false);

    await act(async () => {
      root.unmount();
      await flushAsyncWork();
    });
    container.remove();
  });

  it('getChildRects 会按请求中的动画集合返回 child 最大热区', async () => {
    const { resolveImage } = installComponentMountMocks({
      '/child-rects.zip': createChildRectZipBytes('child-rects-bg'),
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const playerRef = createRef<SpinePlayerHandle>();

    await act(async () => {
      root.render(
        <SpinePlayerWebGl
          ref={playerRef}
          zipUrl="/child-rects.zip"
          runtimeUrl={RUNTIME_URL}
          width={320}
          height={180}
          autoPlay={false}
          defaultAnimationName="start"
        />,
      );
      await flushAsyncWork();
    });

    await act(async () => {
      await resolveImage('blob:test-1');
    });

    const rects = (
      playerRef.current as unknown as {
        getChildRects?: (requests: SpineChildRectRequest[]) => SpineChildRectResult[];
      } | null
    )?.getChildRects?.([
      {
        childName: 'mc-1-1',
        animationNames: ['start', 'click_item_1'],
      },
    ]);

    expect(rects).toEqual([
      expect.objectContaining({
        childName: 'mc-1-1',
        animationNames: ['start', 'click_item_1'],
        worldRect: {
          x: 10,
          y: 20,
          width: 50,
          height: 60,
        },
        screenRect: {
          x: 88,
          y: 36,
          width: 90,
          height: 108,
        },
      }),
    ]);

    await act(async () => {
      root.unmount();
      await flushAsyncWork();
    });
    container.remove();
  });

  it('getChildRects 遇到空 attachment slot 时会跳过而不是抛错', async () => {
    const { resolveImage } = installComponentMountMocks({
      '/child-rects-empty-slot.zip': createChildRectWithEmptySlotZipBytes('child-rects-bg'),
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const playerRef = createRef<SpinePlayerHandle>();

    await act(async () => {
      root.render(
        <SpinePlayerWebGl
          ref={playerRef}
          zipUrl="/child-rects-empty-slot.zip"
          runtimeUrl={RUNTIME_URL}
          width={320}
          height={180}
          autoPlay={false}
          defaultAnimationName="start"
        />,
      );
      await flushAsyncWork();
    });

    await act(async () => {
      await resolveImage('blob:test-1');
    });

    expect(() =>
      (
        playerRef.current as unknown as {
          getChildRects?: (requests: SpineChildRectRequest[]) => SpineChildRectResult[];
        } | null
      )?.getChildRects?.([
        {
          childName: 'mc-1-1',
          animationNames: ['start'],
        },
      ]),
    ).not.toThrow();

    await act(async () => {
      root.unmount();
      await flushAsyncWork();
    });
    container.remove();
  });
});
