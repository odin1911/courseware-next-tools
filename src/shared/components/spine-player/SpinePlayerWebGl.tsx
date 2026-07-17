import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { SpinePlayerWebGlShell } from './SpinePlayerWebGlShell';
import {
  createRunTokenGate,
  createSpineAsyncRunController,
  type SpineAsyncRun,
  type SpinePlayerRunToken,
} from './spineAsyncRun';
import {
  mergeSpineRects,
  resolveSpineBackgroundWorldRect,
  resolveSpineBackgroundDrawRect,
  resolveSpineBackgroundRenderSize,
  resolveSpineFitBounds,
  resolveSpineRectDrawRect,
  resolveSpineSkeletonWorldBounds,
  resolveSpineStageRect,
  resolveSpineViewportTransform,
} from './spineLayout';
import {
  applyChildPlaybackPose,
  createChildPlaybackRuntime,
  resolveSlotRectFromSkeleton,
  resolveChildRectsFromRequests,
  type SpineChildPlayback,
  type SpineChildPlaybackRuntime,
} from './spineChildRuntime';
import type {
  ResolveSpineBackgroundDrawRectOptions,
  ResolveSpineBackgroundRenderSizeOptions,
  ResolveSpineBackgroundWorldRectOptions,
  ResolveSpineViewportTransformOptions,
  SpineAnimationState,
  SpineAnimationStateData,
  SpineAnimationStateListener,
  SpineAssetManager,
  SpineAtlasAttachmentLoader,
  SpineChildRectRequest,
  SpineChildRectResult,
  SpineChildTarget,
  SpineFitMode,
  SpineGlobal,
  SpineManagedWebGLRenderingContext,
  SpinePlayerHandle,
  SpinePlayerProps,
  SpinePlayerWebGlShellProps,
  SpineRawBone,
  SpineRawData,
  SpineRect,
  SpineSceneRenderer,
  SpineSkeleton,
  SpineSkeletonData,
  SpineSkeletonJson,
  SpineSlotRectResult,
  SpineTextureAtlas,
  SpineTrackEntry,
} from './spineTypes';
import { resolveSpineTextureEntryPath } from './spine-zip';
import {
  getSpineGlobal,
  isWebGLSupported,
  loadSpineRuntimeScript,
  releaseWebGLContext,
} from './spineRuntimeLoader';
import {
  extractSpineZip,
  findSpineBackgroundEntryPath,
  resolveZipAtlasImageEntryPath,
  spineZipRunRuntime,
  startSpineZipRun,
  type SpineZipRunHandle,
} from './spineZipRuntime';
import { hideSkeletonSlots } from './spineSlotVisibility';

export type {
  ResolveSpineBackgroundDrawRectOptions,
  ResolveSpineBackgroundRenderSizeOptions,
  ResolveSpineBackgroundWorldRectOptions,
  ResolveSpineViewportTransformOptions,
  SpineChildRectRequest,
  SpineChildRectResult,
  SpineChildTarget,
  SpineFitMode,
  SpineGlobal,
  SpinePlayerHandle,
  SpinePlayerProps,
  SpinePlayerWebGlShellProps,
  SpineRect,
  SpineSlotRectResult,
} from './spineTypes';

export {
  SpinePlayerWebGlShell,
  createRunTokenGate,
  createSpineAsyncRunController,
  extractSpineZip,
  findSpineBackgroundEntryPath,
  loadSpineRuntimeScript,
  mergeSpineRects,
  resolveZipAtlasImageEntryPath,
  resolveSpineBackgroundWorldRect,
  resolveSpineBackgroundDrawRect,
  resolveSpineBackgroundRenderSize,
  resolveSpineRectDrawRect,
  resolveSpineViewportTransform,
  spineZipRunRuntime,
  startSpineZipRun,
};

export type { SpineAsyncRun, SpinePlayerRunToken, SpineZipRunHandle };

const DEFAULT_RUNTIME =
  'https://web-assets.alo7.com/assets/scripts/spine-runtime/spine-3.8/spine-webgl.js';
const LOAD_TIMEOUT_MS = 30_000;
const EMPTY_CHILD_TARGETS: SpineChildTarget[] = [];

function resolveDefaultAnimationName(
  animations: SpineSkeletonData['animations'],
  defaultAnimationName?: string,
) {
  if (!animations.length) {
    return '';
  }

  if (
    defaultAnimationName &&
    animations.some((animation) => animation.name === defaultAnimationName)
  ) {
    return defaultAnimationName;
  }

  return animations[0]?.name ?? '';
}

const SpinePlayerWebGl = forwardRef<SpinePlayerHandle, SpinePlayerProps>(function SpinePlayerWebGl(
  {
    zipUrl,
    atlasUrl: atlasUrlProp,
    jsonUrl: jsonUrlProp,
    runtimeUrl = DEFAULT_RUNTIME,
    width = 500,
    height = 500,
    onComplete,
    onReady,
    onError,
    className,
    style,
    fitRatio = 1,
    fitMode = 'stage',
    showBackground = true,
    autoPlay = true,
    defaultAnimationName,
    loop = false,
    flipY = false,
    hiddenSlotNames = [],
    childTargets = EMPTY_CHILD_TARGETS,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skeletonRef = useRef<SpineSkeleton | null>(null);
  const animStateRef = useRef<SpineAnimationState | null>(null);
  const glCtxRef = useRef<SpineManagedWebGLRenderingContext | null>(null);
  const sceneRendererRef = useRef<SpineSceneRenderer | null>(null);
  const skDataRef = useRef<SpineSkeletonData | null>(null);
  const backgroundTextureRef = useRef<unknown | null>(null);
  const backgroundTextureSizeRef = useRef<{ width: number; height: number } | null>(null);
  const backgroundWorldRectRef = useRef<SpineRect | null>(null);
  const contentBoundsRef = useRef<SpineRect | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const destroyedRef = useRef(false);
  const blobUrlsRef = useRef<string[]>([]);
  const firstAnimationRef = useRef<string>('');
  const currentAnimationRef = useRef<string>('');
  const currentLoopRef = useRef(loop);
  const isFrozenRef = useRef(false);
  const showBackgroundRef = useRef(showBackground);
  const fitRatioRef = useRef(fitRatio);
  const fitModeRef = useRef<SpineFitMode>(fitMode);
  const defaultAnimationNameRef = useRef(defaultAnimationName);
  const childTargetsRef = useRef(childTargets);
  const hiddenSlotNamesRef = useRef(hiddenSlotNames);
  const rawDataRef = useRef<SpineRawData | null>(null);
  const childPlaybackStateRef = useRef(new Map<string, boolean>());
  const childPlaybackRuntimeRef = useRef(new Map<string, SpineChildPlaybackRuntime>());
  const nextChildPlaybackIdRef = useRef(1);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const runControllerRef = useRef(
    createSpineAsyncRunController({
      onReady: () => onReadyRef.current?.(),
      onError: (message) => onErrorRef.current?.(message),
    }),
  );
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [backgroundImageSize, setBackgroundImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [backgroundStageSize, setBackgroundStageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [childPlaybacks, setChildPlaybacks] = useState<SpineChildPlayback[]>([]);
  const childPlaybacksRef = useRef<SpineChildPlayback[]>([]);

  showBackgroundRef.current = showBackground;
  fitRatioRef.current = fitRatio;
  fitModeRef.current = fitMode;
  childTargetsRef.current = childTargets;
  hiddenSlotNamesRef.current = hiddenSlotNames;

  useEffect(() => {
    childPlaybacksRef.current = childPlaybacks;
  }, [childPlaybacks]);

  useEffect(() => {
    const allowedChildNames = new Set(childTargets.map((target) => target.childName));

    childPlaybackStateRef.current = new Map(
      [...childPlaybackStateRef.current].filter(([childName]) => allowedChildNames.has(childName)),
    );
    childPlaybackRuntimeRef.current = new Map(
      [...childPlaybackRuntimeRef.current].filter(([childName]) =>
        allowedChildNames.has(childName),
      ),
    );
    setChildPlaybacks((prev) =>
      prev.filter((playback) => allowedChildNames.has(playback.childName)),
    );
  }, [childTargets]);

  useEffect(() => {
    childPlaybackStateRef.current.clear();
    childPlaybackRuntimeRef.current.clear();
    setChildPlaybacks([]);
    rawDataRef.current = null;
  }, [atlasUrlProp, jsonUrlProp, runtimeUrl, zipUrl]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useImperativeHandle(ref, () => ({
    play(animationName?: string, loop = false) {
      const state = animStateRef.current;
      const name = animationName ?? firstAnimationRef.current;

      if (!state || !name) {
        return;
      }

      state.setAnimation(0, name, loop);
      currentAnimationRef.current = name;
      currentLoopRef.current = loop;
      isFrozenRef.current = false;
      syncSkeletonLayoutFromCurrentPose();
    },

    playChild(childName: string, animationName: string, loop = 0, stopBackStart = false) {
      const spineLib = getSpineGlobal();
      const skeletonData = skDataRef.current;
      const rawData = rawDataRef.current;
      const target = childTargetsRef.current.find((item) => item.childName === childName);
      const resolvedAnimationName = target?.animationName || animationName;

      if (!target || !resolvedAnimationName || !spineLib || !skeletonData) {
        return;
      }

      const nextPlayback = {
        childName,
        animationName: resolvedAnimationName,
        loop,
        stopBackStart,
        playbackId: nextChildPlaybackIdRef.current++,
      } satisfies SpineChildPlayback;
      const playbackRuntime = createChildPlaybackRuntime({
        spineLib,
        skeletonData,
        rawData,
        playback: nextPlayback,
      });

      if (!playbackRuntime) {
        return;
      }

      childPlaybackStateRef.current.set(childName, true);
      childPlaybackRuntimeRef.current.set(childName, playbackRuntime);
      setChildPlaybacks((prev) => [
        ...prev.filter((playback) => playback.childName !== childName),
        nextPlayback,
      ]);
    },

    stopChild(childName: string) {
      childPlaybackStateRef.current.set(childName, false);
      childPlaybackRuntimeRef.current.delete(childName);
      setChildPlaybacks((prev) => prev.filter((playback) => playback.childName !== childName));
    },

    ischildPlaying(childName: string) {
      return childPlaybackStateRef.current.get(childName) ?? false;
    },

    getChildRects(requests: SpineChildRectRequest[]) {
      const spineLib = getSpineGlobal();
      const skeletonData = skDataRef.current;
      const canvas = canvasRef.current;

      if (!spineLib || !skeletonData || !canvas || requests.length === 0) {
        return [];
      }

      return resolveChildRectsFromRequests({
        spineLib,
        skeletonData,
        rawData: rawDataRef.current,
        requests,
        viewWidth: canvas.width,
        viewHeight: canvas.height,
        contentBounds: contentBoundsRef.current,
        fitRatio: fitRatioRef.current,
        fitMode: fitModeRef.current,
        flipY,
      });
    },

    getSlotRect(slotName: string) {
      const skeleton = skeletonRef.current;
      const canvas = canvasRef.current;

      if (!skeleton || !canvas || !slotName) {
        return null;
      }

      return resolveSlotRectFromSkeleton({
        skeleton,
        slotName,
        viewWidth: canvas.width,
        viewHeight: canvas.height,
        contentBounds: contentBoundsRef.current,
        fitRatio: fitRatioRef.current,
        fitMode: fitModeRef.current,
        flipY,
        worldRectSpace: 'viewport',
      });
    },

    hasAnimation(animationName: string) {
      if (!animationName) {
        return false;
      }

      return Boolean(
        skDataRef.current?.animations.some((animation) => animation.name === animationName),
      );
    },

    getAnimationDuration(animationName: string) {
      if (!animationName) {
        return null;
      }

      const duration = skDataRef.current?.animations.find(
        (animation) => animation.name === animationName,
      )?.duration;

      return typeof duration === 'number' && Number.isFinite(duration) ? duration : null;
    },

    gotoAndStop(animationName: string, time = 0) {
      const state = animStateRef.current;
      const name = animationName;

      if (!state || !name) {
        return;
      }

      state.setAnimation(0, name, false);
      state.update(Math.max(0, time));
      currentAnimationRef.current = name;
      currentLoopRef.current = false;
      isFrozenRef.current = true;
      syncSkeletonLayoutFromCurrentPose();
    },

    stop() {
      const skeleton = skeletonRef.current;
      const state = animStateRef.current;

      if (!skeleton || !state) {
        return;
      }

      (state as unknown as { clearTracks?: () => void }).clearTracks?.();
      skeleton.setToSetupPose();
      skeleton.updateWorldTransform();
      currentAnimationRef.current = '';
      currentLoopRef.current = false;
      isFrozenRef.current = false;
      childPlaybackStateRef.current.clear();
      childPlaybackRuntimeRef.current.clear();
      setChildPlaybacks([]);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const runToken = runControllerRef.current.nextRun();
    let zipRun: SpineZipRunHandle | null = null;
    destroyedRef.current = false;
    backgroundTextureRef.current = null;
    backgroundTextureSizeRef.current = null;
    backgroundWorldRectRef.current = null;
    contentBoundsRef.current = null;
    setBackgroundImageUrl('');
    setBackgroundImageSize(null);
    setBackgroundStageSize(null);

    const run = async () => {
      try {
        await loadSpineRuntimeScript(runtimeUrl);
      } catch (err) {
        runToken.fail(err);
        return;
      }

      if (!runToken.checkpoint()) {
        return;
      }

      if (!isWebGLSupported()) {
        runToken.fail('Current browser does not support WebGL');
        return;
      }

      const spineLib = getSpineGlobal();
      const ManagedCtx = spineLib?.webgl?.ManagedWebGLRenderingContext;
      const SceneRenderer = spineLib?.webgl?.SceneRenderer;

      if (!ManagedCtx || !SceneRenderer) {
        runToken.fail('WebGL runtime API not found after script load');
        return;
      }

      try {
        const glCtx = new ManagedCtx(canvas, { alpha: true });
        const sceneRenderer = new SceneRenderer(canvas, glCtx, false);
        glCtxRef.current = glCtx;
        sceneRendererRef.current = sceneRenderer;
      } catch (err) {
        runToken.fail(
          `Failed to initialize WebGL renderer: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }

      let atlasUrl = atlasUrlProp ?? '';
      let jsonUrl = jsonUrlProp ?? '';

      if (zipUrl) {
        zipRun = spineZipRunRuntime.startSpineZipRun({
          zipUrl,
          createRun: () => runToken,
          loadDecodedAssets: spineZipRunRuntime.loadDecodedAssetsFromZipUrl,
          initSpineFromZip,
          setBackgroundImageUrl,
          setBackgroundImageSize,
          setBlobUrls: (blobUrls) => {
            blobUrlsRef.current = blobUrls;
          },
        });
        return;
      }

      if (!atlasUrl || !jsonUrl) {
        setBackgroundImageUrl('');
        runToken.fail('atlasUrl and jsonUrl are required when zipUrl is not provided');
        return;
      }

      setBackgroundImageUrl('');
      initSpine(atlasUrl, jsonUrl, runToken);
    };

    run();

    return () => {
      const gl = glCtxRef.current?.gl ?? null;
      destroyedRef.current = true;
      if (zipRun) {
        zipRun.abort();
      } else {
        setBackgroundImageUrl('');
        setBackgroundImageSize(null);
        setBackgroundStageSize(null);
        runToken.abort();
      }
      cancelAnimationFrame(rafRef.current);
      skeletonRef.current = null;
      animStateRef.current = null;
      skDataRef.current = null;
      releaseWebGLContext(gl);
      backgroundTextureRef.current = null;
      backgroundTextureSizeRef.current = null;
      backgroundWorldRectRef.current = null;
      contentBoundsRef.current = null;
      glCtxRef.current = null;
      sceneRendererRef.current = null;
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipUrl, atlasUrlProp, jsonUrlProp, runtimeUrl]);

  // 当 width/height/fitRatio/fitMode 变化时，重算统一 transform 并更新相机视口
  useEffect(() => {
    const skeleton = skeletonRef.current;
    const skData = skDataRef.current;
    if (!skeleton || !skData) return;
    syncSkeletonLayoutFromCurrentPose(width, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, fitRatio, fitMode, flipY]);

  useEffect(() => {
    const state = animStateRef.current;
    const animationName = currentAnimationRef.current;

    if (!state || !animationName || isFrozenRef.current || currentLoopRef.current === loop) {
      currentLoopRef.current = loop;
      return;
    }

    state.setAnimation(0, animationName, loop);
    currentLoopRef.current = loop;
    syncSkeletonLayoutFromCurrentPose();
  }, [loop]);

  useEffect(() => {
    defaultAnimationNameRef.current = defaultAnimationName;

    const skData = skDataRef.current;
    if (!skData) {
      return;
    }

    firstAnimationRef.current = resolveDefaultAnimationName(
      skData.animations,
      defaultAnimationNameRef.current,
    );
  }, [defaultAnimationName]);

  function initSpine(atlasUrl: string, jsonUrl: string, runToken: SpineAsyncRun) {
    if (!runToken.isCurrent()) {
      return;
    }

    const spineLib = getSpineGlobal();
    const glCtx = glCtxRef.current;
    const AMClass = spineLib?.webgl?.AssetManager;

    if (!spineLib || !glCtx || !AMClass) {
      if (runToken.isCurrent()) {
        onError?.('WebGL AssetManager not found in runtime');
      }
      return;
    }

    const assetManager = new AMClass(glCtx, '');
    assetManager.loadTextureAtlas(atlasUrl);
    assetManager.loadText(jsonUrl);

    const loadStart = performance.now();
    pollLoad(assetManager, atlasUrl, jsonUrl, loadStart, runToken);
  }

  function initSpineFromZip(
    atlasText: string,
    jsonText: string,
    imageElements: Map<string, HTMLImageElement>,
    runToken: SpineAsyncRun,
  ) {
    if (!runToken.isCurrent()) {
      return;
    }

    const spineLib = getSpineGlobal();
    const glCtx = glCtxRef.current;
    const TextureAtlas = spineLib?.TextureAtlas;
    const GLTexture = spineLib?.webgl?.GLTexture;

    if (!spineLib || !glCtx || !TextureAtlas || !GLTexture) {
      runToken.fail('TextureAtlas or GLTexture not found in runtime');
      return;
    }

    let atlas: SpineTextureAtlas;
    try {
      atlas = new TextureAtlas(atlasText, (path: string) => {
        const resolvedEntryPath = resolveSpineTextureEntryPath(path, [...imageElements.keys()]);

        if (!resolvedEntryPath) {
          throw new Error(`Texture not found in zip atlas: ${path}`);
        }

        const image = imageElements.get(resolvedEntryPath);
        if (!image) {
          throw new Error(`Texture not found in zip atlas: ${path}`);
        }

        return new GLTexture(glCtx, image, false);
      });

      const backgroundEntryPath = findSpineBackgroundEntryPath(imageElements.keys());
      const backgroundImage = backgroundEntryPath
        ? (imageElements.get(backgroundEntryPath) ?? null)
        : null;

      if (backgroundImage) {
        backgroundTextureRef.current = new GLTexture(glCtx, backgroundImage, false);
        backgroundTextureSizeRef.current = {
          width: backgroundImage.naturalWidth,
          height: backgroundImage.naturalHeight,
        };
      }
    } catch (err) {
      runToken.fail(
        `Failed to create atlas from zip: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    buildSkeleton(atlas, jsonText, runToken);
  }

  function pollLoad(
    assetManager: SpineAssetManager,
    atlasUrl: string,
    jsonUrl: string,
    loadStart: number,
    runToken: SpineAsyncRun,
  ) {
    if (destroyedRef.current || !runToken.checkpoint({ revokeOnSkip: false })) {
      return;
    }

    if (performance.now() - loadStart > LOAD_TIMEOUT_MS) {
      runToken.fail('Asset loading timeout');
      return;
    }

    if (!assetManager.isLoadingComplete()) {
      rafRef.current = requestAnimationFrame(() => {
        runToken.commit(() => pollLoad(assetManager, atlasUrl, jsonUrl, loadStart, runToken), {
          revokeOnSkip: false,
        });
      });
      return;
    }

    const hasErr = assetManager.hasErrors
      ? assetManager.hasErrors()
      : Object.keys(assetManager.errors ?? {}).length > 0;

    if (hasErr) {
      const firstKey = Object.keys(assetManager.errors ?? {})[0] ?? 'unknown';
      runToken.fail(`Failed to load asset: ${firstKey}`);
      return;
    }

    setupSkeleton(assetManager, atlasUrl, jsonUrl, runToken);
  }

  function setupSkeleton(
    assetManager: SpineAssetManager,
    atlasUrl: string,
    jsonUrl: string,
    runToken: SpineAsyncRun,
  ) {
    if (!runToken.isCurrent()) {
      return;
    }

    const atlas = assetManager.get(atlasUrl) as SpineTextureAtlas | null;
    const jsonText = assetManager.get(jsonUrl) as string | null;

    if (!atlas || !jsonText) {
      runToken.fail('Asset manager returned null for atlas or json');
      return;
    }

    backgroundTextureRef.current = null;
    backgroundTextureSizeRef.current = null;

    buildSkeleton(atlas, jsonText, runToken);
  }

  /**
   * 直接用 canvas 帧缓冲区尺寸设置 GL viewport 和 Spine 相机，
   * 绕过 sceneRenderer.resize()（它读 getBoundingClientRect，会被父级 CSS transform 缩放污染）。
   */
  function applyViewport(w: number, h: number) {
    const canvas = canvasRef.current;
    const glCtx = glCtxRef.current;
    const sceneRenderer = sceneRendererRef.current as any;
    if (!canvas || !glCtx || !sceneRenderer) return;

    canvas.width = w;
    canvas.height = h;
    glCtx.gl.viewport(0, 0, w, h);

    if (typeof sceneRenderer.camera?.setViewport === 'function') {
      sceneRenderer.camera.setViewport(w, h);
      sceneRenderer.camera.update?.();
    }
  }

  function syncSkeletonLayoutFromCurrentPose(
    nextViewWidth = canvasRef.current?.width ?? width,
    nextViewHeight = canvasRef.current?.height ?? height,
  ) {
    const skeleton = skeletonRef.current;
    const skData = skDataRef.current;
    const state = animStateRef.current;
    const spineLib = getSpineGlobal();

    if (!skeleton || !skData || !spineLib) {
      return;
    }

    applyViewport(nextViewWidth, nextViewHeight);

    const stageRect = resolveSpineStageRect(
      skData.x,
      skData.y,
      skData.width || nextViewWidth,
      skData.height || nextViewHeight,
    );

    if (!stageRect) {
      return;
    }

    backgroundWorldRectRef.current = backgroundTextureSizeRef.current
      ? resolveSpineBackgroundWorldRect({
          stageX: stageRect.x,
          stageY: stageRect.y,
          stageWidth: stageRect.width,
          stageHeight: stageRect.height,
          backgroundNaturalWidth: backgroundTextureSizeRef.current.width,
          backgroundNaturalHeight: backgroundTextureSizeRef.current.height,
        })
      : null;

    skeleton.scaleX = 1;
    skeleton.scaleY = 1;
    skeleton.x = 0;
    skeleton.y = 0;
    skeleton.setToSetupPose();
    state?.apply(skeleton);
    hideSkeletonSlots(skeleton, hiddenSlotNamesRef.current);
    skeleton.updateWorldTransform();

    const fitBounds = resolveSpineFitBounds({
      fitMode: fitModeRef.current,
      stageRect,
      backgroundRect: backgroundWorldRectRef.current,
      skeletonRect: resolveSpineSkeletonWorldBounds(spineLib, skeleton),
    });
    const transform = resolveSpineViewportTransform({
      viewWidth: nextViewWidth,
      viewHeight: nextViewHeight,
      fitRatio: fitRatioRef.current,
      contentBounds: fitBounds,
      fitMode: fitModeRef.current,
    });

    if (!fitBounds || !transform) {
      return;
    }

    contentBoundsRef.current = fitBounds;
    setBackgroundStageSize({
      width: fitBounds.width,
      height: fitBounds.height,
    });

    skeleton.scaleX = transform.scale;
    skeleton.scaleY = flipY ? -transform.scale : transform.scale;
    skeleton.x = transform.x;
    skeleton.y = flipY ? -transform.y : transform.y;
    skeleton.updateWorldTransform();
  }

  function buildSkeleton(atlas: SpineTextureAtlas, jsonText: string, runToken: SpineAsyncRun) {
    if (!runToken.isCurrent()) {
      return;
    }

    const spineLib = getSpineGlobal();
    const canvas = canvasRef.current;

    if (!spineLib || !canvas) {
      return;
    }

    const loader = new spineLib.AtlasAttachmentLoader(atlas);
    const skJson = new spineLib.SkeletonJson(loader);
    const skData = skJson.readSkeletonData(jsonText);
    try {
      rawDataRef.current = JSON.parse(jsonText) as SpineRawData;
    } catch {
      rawDataRef.current = null;
    }
    skDataRef.current = skData;
    const skeleton = new spineLib.Skeleton(skData);

    // 直接读取 HTML attribute（帧缓冲区真实尺寸），不受父级 CSS transform 影响
    const viewW = canvas.width;
    const viewH = canvas.height;

    setBackgroundStageSize({
      width: skData.width || viewW,
      height: skData.height || viewH,
    });
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform();

    const stateData = new spineLib.AnimationStateData(skData);
    const animState = new spineLib.AnimationState(stateData);

    animState.addListener({
      complete(entry) {
        if (!destroyedRef.current && runToken.isCurrent()) {
          onComplete?.(entry.animation.name);
        }
      },
    });

    skeletonRef.current = skeleton;
    animStateRef.current = animState;

    const firstName = resolveDefaultAnimationName(
      skData.animations,
      defaultAnimationNameRef.current,
    );
    firstAnimationRef.current = firstName;
    if (firstName && autoPlay) {
      animState.setAnimation(0, firstName, loop);
      currentAnimationRef.current = firstName;
      currentLoopRef.current = loop;
      isFrozenRef.current = false;
    } else if (firstName) {
      animState.setAnimation(0, firstName, false);
      animState.update(0);
      currentAnimationRef.current = firstName;
      currentLoopRef.current = false;
      isFrozenRef.current = true;
    } else {
      currentAnimationRef.current = '';
      currentLoopRef.current = false;
      isFrozenRef.current = false;
    }

    runToken.notifyReady();
    syncSkeletonLayoutFromCurrentPose(viewW, viewH);
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(renderLoop);
  }

  function renderLoop(timestamp: number) {
    if (destroyedRef.current) {
      return;
    }

    const skeleton = skeletonRef.current;
    const animState = animStateRef.current;
    const glCtx = glCtxRef.current;
    const sceneRenderer = sceneRendererRef.current;
    const skData = skDataRef.current;
    const canvas = canvasRef.current;

    if (!skeleton || !animState || !glCtx || !sceneRenderer || !skData) {
      return;
    }

    const delta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    animState.update(isFrozenRef.current ? 0 : delta);
    animState.apply(skeleton);
    hideSkeletonSlots(skeleton, hiddenSlotNamesRef.current);
    skeleton.updateWorldTransform();

    const gl = glCtx.gl;
    const viewWidth = canvas?.width ?? width;
    const viewHeight = canvas?.height ?? height;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    sceneRenderer.begin();

    if (
      showBackgroundRef.current &&
      backgroundTextureRef.current &&
      backgroundWorldRectRef.current &&
      contentBoundsRef.current
    ) {
      const backgroundDrawRect = resolveSpineRectDrawRect(
        backgroundWorldRectRef.current,
        resolveSpineViewportTransform({
          viewWidth,
          viewHeight,
          fitRatio: fitRatioRef.current,
          contentBounds: contentBoundsRef.current,
          fitMode: fitModeRef.current,
        }),
      );

      if (backgroundDrawRect) {
        sceneRenderer.drawTexture(
          backgroundTextureRef.current,
          backgroundDrawRect.x,
          backgroundDrawRect.y,
          backgroundDrawRect.width,
          backgroundDrawRect.height,
        );
      }
    }

    sceneRenderer.drawSkeleton(skeleton, false);

    childPlaybacksRef.current.forEach((playback) => {
      const playbackRuntime = childPlaybackRuntimeRef.current.get(playback.childName);

      if (!playbackRuntime) {
        return;
      }

      const wasPlaying = childPlaybackStateRef.current.get(playback.childName) ?? false;

      applyChildPlaybackPose({
        playback: playbackRuntime,
        sourceSkeleton: skeleton,
        delta,
      });

      if (wasPlaying && playbackRuntime.loop !== 0 && playbackRuntime.completed) {
        childPlaybackStateRef.current.set(playback.childName, false);
      }

      sceneRenderer.drawSkeleton(playbackRuntime.scratchSkeleton, false);
    });

    sceneRenderer.end();

    rafRef.current = requestAnimationFrame(renderLoop);
  }

  return (
    <SpinePlayerWebGlShell
      backgroundImageUrl={backgroundImageUrl}
      showBackground={showBackground}
      backgroundNaturalSize={backgroundImageSize}
      width={width}
      height={height}
      stageWidth={backgroundStageSize?.width}
      stageHeight={backgroundStageSize?.height}
      fitRatio={fitRatio}
      className={className}
      style={style}
      canvasRef={canvasRef}
    />
  );
});

export default SpinePlayerWebGl;
