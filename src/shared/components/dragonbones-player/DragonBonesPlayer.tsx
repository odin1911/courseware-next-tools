import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { PixiSkItem } from '@alo7/dragonbones-pixi';
import type { PixiSkMovie } from '@alo7/dragonbones-pixi';
// pixi.js v4 无 TypeScript 声明，通过 any 访问；vite dedupe 确保全局单例
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as _PIXI from 'pixi.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PIXI = _PIXI as any;

export interface DragonBonesHandle {
  /** 播放指定动画，loop=true 无限循环，loop=false 播一次（默认 false） */
  play: (animationName?: string, loop?: boolean) => void;
  /** 播放指定名称的内嵌 armature 动画。 */
  playArmatureAnimation: (armatureName: string, animationName: string, loop?: boolean) => boolean;
  /** 切到指定动画首帧并停止，不触发播放循环 */
  showFirstFrame: (animationName?: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setPause: (paused: boolean) => void;
  renderCurrentFrame: () => void;
  /** 获取当前骨架所有动画名列表 */
  getAnimationList: () => string[];
  isPlaying: () => boolean;
  clearFadeInTime: () => void;
  /** @deprecated 仅兼容旧的 DDVK 送件实现，后续不要再新增调用。 */
  detachChildArmatures: (armatureNames?: string[]) => void;
  getDisplay: () => PixiSkMovie['display'] | null;
  getArmature: () => PixiSkMovie['armatrue'] | null;
  /** 获取 zip 内所有 armature 名列表 */
  getArmatureNames: () => string[];
  /** 工具页使用：把当前动画停在指定帧并立即渲染 */
  gotoAndStopByFrame: (animationName: string, frame: number) => void;
  /** 工具页使用：读取当前动画帧信息 */
  getAnimationMeta: (animationName: string) => {
    frameCount: number;
    duration: number;
    frameRate: number;
  } | null;
  /** 工具页使用：读取实际渲染 canvas，用于导出图片 */
  getCanvas: () => HTMLCanvasElement | null;
  isCanvasRenderer: () => boolean;
  /** 工具页使用：读取当前帧在原始骨架坐标中的内容包围盒 */
  measureCurrentBounds: () => DragonBonesBounds | null;
  /** 工具页使用：调整实际渲染 canvas 尺寸 */
  resizeCanvas: (width: number, height: number) => void;
  /** 工具页使用：按原始坐标导出时设置根 display 变换 */
  setDisplayTransform: (transform: DragonBonesDisplayTransform) => void;
}

type ChildArmature = {
  name?: string;
};

type ArmatureSlot = {
  childArmature?: ChildArmature | null;
};

type ArmatureWithSlots = {
  getSlots?: () => ArmatureSlot[];
  advanceTime?: (passedTime: number) => void;
  animation: {
    gotoAndStopByFrame: (animationName: string, frame?: number) => void;
  };
  armatureData: {
    frameRate: number;
    getAnimation: (animationName: string) => {
      frameCount: number;
      duration: number;
    } | null;
  };
};

type ChildAnimationLike = {
  animationNames?: string[];
  hasAnimation?: (animationName: string) => boolean;
  lastAnimationName?: string;
  play?: (animationName?: string, playTimes?: number) => void;
  gotoAndPlayByTime?: (animationName: string, time?: number, playTimes?: number) => void;
  gotoAndStopByFrame?: (animationName: string, frame?: number) => void;
};

type ChildArmatureLike = ChildArmature & {
  animation?: ChildAnimationLike | null;
  advanceTime?: (passedTime: number) => void;
};

type MovieWithChildArmatures = PixiSkMovie & {
  _childArmatureList?: ChildArmatureLike[];
  armatrue?: ArmatureWithSlots | null;
  play?: (playTimes?: number) => void;
  stop?: (backStart?: boolean) => void;
  curtMovement?: string;
  movementList?: string[];
};

export type DragonBonesBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DragonBonesDisplayTransform = {
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
};

type PixiDisplayLike = {
  x: number;
  y: number;
  rotation?: number;
  width?: number;
  height?: number;
  getLocalBounds?: () => DragonBonesBounds;
  getBounds?: () => DragonBonesBounds;
  scale?: {
    set?: (x: number, y?: number) => void;
    x?: number;
    y?: number;
  };
};

type ChildArmatureWithSlots = {
  getSlots?: () => Array<{
    display?: PixiDisplayLike | null;
    childArmature?: ChildArmatureWithSlots | null;
  }>;
};

type DragonBonesItemLike = {
  bgTexture?: unknown;
  getArmatureNames?: () => string[];
};

type DisplayContainerLike = {
  addChild?: (child: unknown) => void;
  addChildAt?: (child: unknown, index: number) => void;
};

export function attachBackgroundTexture(
  item: DragonBonesItemLike | null,
  display: DisplayContainerLike | null,
) {
  if (!item?.bgTexture || !display) {
    return;
  }

  const texture = new PIXI.Texture(item.bgTexture);
  const sprite = new PIXI.Sprite(texture);

  if (typeof display.addChildAt === 'function') {
    display.addChildAt(sprite, 0);
    return;
  }

  display.addChild?.(sprite);
}

function getDisplayRect(display: PixiDisplayLike | null) {
  if (!display) {
    return null;
  }

  const localBounds = display.getLocalBounds?.();

  if (localBounds && localBounds.width > 0 && localBounds.height > 0) {
    return {
      x: display.x + localBounds.x,
      y: display.y + localBounds.y,
      width: localBounds.width,
      height: localBounds.height,
    } satisfies DragonBonesBounds;
  }

  const bounds = display.getBounds?.();

  if (bounds && bounds.width > 0 && bounds.height > 0) {
    return bounds;
  }

  if (
    typeof display.width === 'number' &&
    display.width > 0 &&
    typeof display.height === 'number' &&
    display.height > 0
  ) {
    return {
      x: display.x,
      y: display.y,
      width: display.width,
      height: display.height,
    } satisfies DragonBonesBounds;
  }

  return null;
}

function getRootLocalDisplayRect(display: PixiDisplayLike | null) {
  if (!display) {
    return null;
  }

  const localBounds = display.getLocalBounds?.();

  if (localBounds && localBounds.width > 0 && localBounds.height > 0) {
    return {
      x: localBounds.x,
      y: localBounds.y,
      width: localBounds.width,
      height: localBounds.height,
    } satisfies DragonBonesBounds;
  }

  if (
    typeof display.width === 'number' &&
    display.width > 0 &&
    typeof display.height === 'number' &&
    display.height > 0
  ) {
    return {
      x: 0,
      y: 0,
      width: display.width,
      height: display.height,
    } satisfies DragonBonesBounds;
  }

  return null;
}

function mergeDisplayRects(rects: DragonBonesBounds[]) {
  if (rects.length === 0) {
    return null;
  }

  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;

  for (let index = 1; index < rects.length; index += 1) {
    const rect = rects[index];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  } satisfies DragonBonesBounds;
}

function collectArmatureDisplayRects(
  armature: ChildArmatureWithSlots | null,
  rects: DragonBonesBounds[],
  seen = new Set<ChildArmatureWithSlots>(),
) {
  if (!armature || seen.has(armature)) {
    return;
  }

  seen.add(armature);

  for (const slot of armature.getSlots?.() ?? []) {
    const rect = getDisplayRect(slot.display ?? null);

    if (rect) {
      rects.push(rect);
    }

    collectArmatureDisplayRects(slot.childArmature ?? null, rects, seen);
  }
}

function getMovieContentBounds(movie: MovieWithChildArmatures | null) {
  const display = movie?.display as PixiDisplayLike | null;

  if (!display) {
    return null;
  }

  const rects: DragonBonesBounds[] = [];
  const displayRect = getRootLocalDisplayRect(display);

  if (displayRect) {
    rects.push(displayRect);
  }

  collectArmatureDisplayRects(movie?.armatrue as ChildArmatureWithSlots | null, rects);

  return mergeDisplayRects(rects);
}

function getMovieAnimationBounds(movie: MovieWithChildArmatures, animationName: string) {
  const animationData = movie.armatrue?.armatureData.getAnimation(animationName);

  if (!animationData || animationData.frameCount <= 0) {
    return getMovieContentBounds(movie);
  }

  const rects: DragonBonesBounds[] = [];

  for (let frame = 0; frame < animationData.frameCount; frame += 1) {
    gotoMovieFrame(movie, animationName, frame);
    const bounds = getMovieContentBounds(movie);

    if (bounds) {
      rects.push(bounds);
    }
  }

  return mergeDisplayRects(rects);
}

export function fitMovieDisplayToViewport(
  movie: MovieWithChildArmatures,
  width: number,
  height: number,
) {
  const display = movie.display as PixiDisplayLike | null;

  if (!display) {
    return;
  }

  const mergedRect = getMovieContentBounds(movie);

  if (!mergedRect || mergedRect.width <= 0 || mergedRect.height <= 0) {
    return;
  }

  const scale = Math.min(width / mergedRect.width, height / mergedRect.height);

  if (!Number.isFinite(scale) || scale <= 0) {
    return;
  }

  if (display.scale?.set) {
    display.scale.set(scale);
  } else if (display.scale) {
    display.scale.x = scale;
    display.scale.y = scale;
  }

  display.x = (width - mergedRect.width * scale) / 2 - mergedRect.x * scale;
  display.y = (height - mergedRect.height * scale) / 2 - mergedRect.y * scale;

  return {
    x: display.x + mergedRect.x * scale,
    y: display.y + mergedRect.y * scale,
    width: mergedRect.width * scale,
    height: mergedRect.height * scale,
  } satisfies DragonBonesBounds;
}

export function fitMovieAnimationToViewport(
  movie: MovieWithChildArmatures,
  width: number,
  height: number,
  animationName: string,
) {
  const display = movie.display as PixiDisplayLike | null;
  const mergedRect = getMovieAnimationBounds(movie, animationName);

  if (!display || !mergedRect || mergedRect.width <= 0 || mergedRect.height <= 0) {
    return;
  }

  const padding = 16;
  const scale = Math.min(
    Math.max(width - padding * 2, 1) / mergedRect.width,
    Math.max(height - padding * 2, 1) / mergedRect.height,
    1,
  );

  if (!Number.isFinite(scale) || scale <= 0) {
    return;
  }

  if (display.scale?.set) {
    display.scale.set(scale);
  } else if (display.scale) {
    display.scale.x = scale;
    display.scale.y = scale;
  }

  display.x = (width - mergedRect.width * scale) / 2 - mergedRect.x * scale;
  display.y = (height - mergedRect.height * scale) / 2 - mergedRect.y * scale;

  return {
    x: display.x + mergedRect.x * scale,
    y: display.y + mergedRect.y * scale,
    width: mergedRect.width * scale,
    height: mergedRect.height * scale,
  } satisfies DragonBonesBounds;
}

function renderDragonBonesStage(app: any) {
  if (!app) {
    return;
  }

  if (typeof app.render === 'function') {
    app.render();
    return;
  }

  app.renderer?.render?.(app.stage);
}

function resizeDragonBonesCanvas(app: any, width: number, height: number) {
  if (!app) {
    return;
  }

  const nextWidth = Math.max(1, Math.ceil(width));
  const nextHeight = Math.max(1, Math.ceil(height));

  if (typeof app.renderer?.resize === 'function') {
    app.renderer.resize(nextWidth, nextHeight);
    return;
  }

  const view = app.view as HTMLCanvasElement | undefined;
  if (view) {
    view.width = nextWidth;
    view.height = nextHeight;
  }
}

function setMovieDisplayTransform(
  movie: MovieWithChildArmatures | null,
  transform: DragonBonesDisplayTransform,
) {
  const display = movie?.display as PixiDisplayLike | null;

  if (!display) {
    return;
  }

  if (typeof transform.scale === 'number') {
    if (display.scale?.set) {
      display.scale.set(transform.scale);
    } else if (display.scale) {
      display.scale.x = transform.scale;
      display.scale.y = transform.scale;
    }
  }

  display.x = transform.x;
  display.y = transform.y;

  if (typeof transform.rotation === 'number') {
    display.rotation = (transform.rotation * Math.PI) / 180;
  }
}

function detachMovieChildArmatures(
  movie: MovieWithChildArmatures,
  armatureNames: readonly string[] = [],
) {
  if (armatureNames.length === 0) {
    return;
  }

  const shouldDetach = (name?: string) => !!name && armatureNames.includes(name);

  const slots = movie.armatrue?.getSlots?.() ?? [];
  slots.forEach((slot) => {
    if (!slot.childArmature || !shouldDetach(slot.childArmature.name)) {
      return;
    }

    slot.childArmature = null;
  });

  if (Array.isArray(movie._childArmatureList)) {
    movie._childArmatureList = movie._childArmatureList.filter(
      (childArmature) => !shouldDetach(childArmature.name),
    );
  }
}

function resolveChildArmatureAnimationName(
  animation: ChildAnimationLike,
  requestedAnimationName?: string,
) {
  const animationNames = animation.animationNames ?? [];

  if (requestedAnimationName) {
    const hasRequestedAnimation =
      typeof animation.hasAnimation === 'function'
        ? animation.hasAnimation(requestedAnimationName)
        : animationNames.includes(requestedAnimationName);

    if (hasRequestedAnimation) {
      return requestedAnimationName;
    }
  }

  if (animation.lastAnimationName && animationNames.includes(animation.lastAnimationName)) {
    return animation.lastAnimationName;
  }

  if (animationNames.includes('1')) {
    return '1';
  }

  return animationNames[0] ?? '';
}

function syncMovieChildArmatureAnimations(
  movie: MovieWithChildArmatures,
  requestedAnimationName?: string,
  loop = false,
  forceReplay = false,
) {
  const playTimes = loop ? 0 : 1;

  for (const childArmature of movie._childArmatureList ?? []) {
    const animation = childArmature.animation;

    if (!animation) {
      continue;
    }

    const animationName = resolveChildArmatureAnimationName(animation, requestedAnimationName);

    if (!animationName) {
      continue;
    }

    if (!forceReplay && animation.lastAnimationName === animationName) {
      continue;
    }

    if (typeof animation.play === 'function') {
      animation.play(animationName, playTimes);
      continue;
    }

    animation.gotoAndPlayByTime?.(animationName, 0, playTimes);
  }
}

function gotoMovieFrame(movie: MovieWithChildArmatures, animationName: string, frame: number) {
  const targetFrame = Math.max(0, Math.floor(frame));

  movie.stop?.(false);
  movie.curtMovement = animationName;
  movie.armatrue?.animation.gotoAndStopByFrame(animationName, targetFrame);
  movie.armatrue?.advanceTime(0);

  for (const childArmature of movie._childArmatureList ?? []) {
    const animation = childArmature.animation;

    if (!animation) {
      continue;
    }

    const childAnimationName = resolveChildArmatureAnimationName(animation, animationName);

    if (!childAnimationName) {
      continue;
    }

    animation.gotoAndStopByFrame?.(childAnimationName, targetFrame);
    childArmature.advanceTime?.(0);
  }
}

export function playMovieAnimation(
  movie: MovieWithChildArmatures | null | undefined,
  requestedAnimationName?: string,
  loop = false,
) {
  if (!movie) {
    return;
  }

  const animationName =
    requestedAnimationName || movie.curtMovement || movie.movementList?.[0] || '';

  if (!animationName) {
    return;
  }

  const previousAnimationName = movie.curtMovement || '';
  movie.curtMovement = animationName;
  const playTimes = loop ? 0 : 1;
  const forceChildReplay = previousAnimationName === animationName;

  if (forceChildReplay) {
    movie.stop?.(false);
  }

  movie.play?.(playTimes);

  syncMovieChildArmatureAnimations(movie, animationName, loop, forceChildReplay);
}

export function showMovieAnimationFirstFrame(
  movie: MovieWithChildArmatures | null | undefined,
  requestedAnimationName?: string,
) {
  if (!movie) {
    return;
  }

  const animationName =
    requestedAnimationName || movie.curtMovement || movie.movementList?.[0] || '';

  if (!animationName) {
    return;
  }

  movie.curtMovement = animationName;
  movie.stop?.(true);
}

export interface DragonBonesPlayerProps {
  zipUrl: string;
  width?: number;
  height?: number;
  /** 根骨架显示比例；旧 tamic 2x 骨骼使用 0.5。 */
  displayScale?: number;
  /** 骨架名，必须显式传入 */
  armature: string;
  fitSize?: boolean;
  /** 默认保持旧版当前帧适配；工具预览可按完整动作范围适配。 */
  fitMode?: 'current-frame' | 'animation-bounds';
  /** 调试用：显示 fitSize 采用的全帧范围和画布中心线 */
  showDebugBounds?: boolean;
  forceCanvas?: boolean;
  excludedChildArmatureNames?: readonly string[];
  /** 加载完成后自动循环播放第一个动画，默认 true */
  autoPlay?: boolean;
  /** autoPlay=false 时，先渲染到指定动作首帧，避免暴露骨架默认姿态 */
  initialAnimation?: string;
  transparent?: boolean;
  transparentMode?: 'premultiplied' | 'notMultiplied';
  onComplete?: (animationName: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  className?: string;
  style?: CSSProperties;
}

const DragonBonesPlayer = forwardRef<DragonBonesHandle, DragonBonesPlayerProps>(
  function DragonBonesPlayer(
    {
      zipUrl,
      width = 480,
      height = 270,
      displayScale = 1,
      armature,
      fitSize = false,
      fitMode = 'current-frame',
      showDebugBounds = false,
      forceCanvas = false,
      excludedChildArmatureNames = [],
      autoPlay = true,
      initialAnimation = '',
      transparent = true,
      transparentMode = 'premultiplied',
      onComplete,
      onReady,
      onError,
      className,
      style,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRef = useRef<InstanceType<typeof PixiSkItem> | null>(null);
    const movieRef = useRef<PixiSkMovie | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appRef = useRef<any>(null);
    const destroyedRef = useRef(false);
    const firstAnimRef = useRef('');
    const fitFrameRef = useRef<number | null>(null);
    const fitViewportBoundsRef = useRef<DragonBonesBounds | null>(null);
    const showDebugBoundsRef = useRef(false);
    const [debugViewportBounds, setDebugViewportBounds] = useState<DragonBonesBounds | null>(null);
    const onCompleteRef = useRef(onComplete);
    const onReadyRef = useRef(onReady);
    const onErrorRef = useRef(onError);
    const excludedChildArmatureNamesKey = excludedChildArmatureNames.join('\u0001');

    useEffect(() => {
      onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
      onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
      const wasShown = showDebugBoundsRef.current;
      showDebugBoundsRef.current = showDebugBounds;

      if (showDebugBounds) {
        setDebugViewportBounds(fitViewportBoundsRef.current);
      } else if (wasShown) {
        setDebugViewportBounds(null);
      }
    }, [showDebugBounds]);

    const recordFitBounds = (bounds: DragonBonesBounds | null) => {
      fitViewportBoundsRef.current = bounds;
      if (showDebugBoundsRef.current) {
        setDebugViewportBounds(bounds);
      }
    };

    const scheduleFit = () => {
      if (!fitSize || fitMode !== 'current-frame') {
        return;
      }

      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current);
      }

      fitFrameRef.current = window.requestAnimationFrame(() => {
        fitFrameRef.current = null;

        if (destroyedRef.current || !movieRef.current) {
          return;
        }

        recordFitBounds(
          fitMovieDisplayToViewport(movieRef.current as MovieWithChildArmatures, width, height) ??
            null,
        );
      });
    };

    useImperativeHandle(ref, () => ({
      play(animationName?: string, loop = false) {
        const movie = movieRef.current;
        const app = appRef.current;
        const name = animationName ?? firstAnimRef.current;
        if (!movie || !name) return;
        if (fitSize && fitMode === 'animation-bounds') {
          recordFitBounds(
            fitMovieAnimationToViewport(
              movie as MovieWithChildArmatures,
              width,
              height,
              name,
            ) ?? null,
          );
        }
        playMovieAnimation(movie as MovieWithChildArmatures, name, loop);
        app?.start();
        scheduleFit();
      },
      playArmatureAnimation(armatureName: string, animationName: string, loop = false) {
        const movie = movieRef.current as MovieWithChildArmatures | null;
        const shortArmatureName = armatureName.split('/').pop() ?? armatureName;
        const childArmature = movie?._childArmatureList?.find(
          (child) =>
            child.name === armatureName ||
            child.name === shortArmatureName ||
            child.name?.endsWith(`/${shortArmatureName}`),
        );
        const animation = childArmature?.animation;
        if (!animation || !animationName) return false;
        const hasAnimation =
          typeof animation.hasAnimation === 'function'
            ? animation.hasAnimation(animationName)
            : animation.animationNames?.includes(animationName);
        if (!hasAnimation) return false;
        const playTimes = loop ? 0 : 1;
        if (typeof animation.play === 'function') animation.play(animationName, playTimes);
        else animation.gotoAndPlayByTime?.(animationName, 0, playTimes);
        appRef.current?.start();
        return true;
      },
      showFirstFrame(animationName?: string) {
        const movie = movieRef.current as MovieWithChildArmatures | null;
        const app = appRef.current;
        const name = animationName ?? firstAnimRef.current;
        if (!movie || !name) return;
        if (fitSize && fitMode === 'animation-bounds') {
          recordFitBounds(fitMovieAnimationToViewport(movie, width, height, name) ?? null);
        }
        showMovieAnimationFirstFrame(movie, name);
        scheduleFit();
        if (typeof app?.render === 'function') {
          app.render();
        } else {
          app?.renderer?.render?.(app.stage);
        }
        app?.stop();
      },
      stop() {
        movieRef.current?.stop();
        appRef.current?.stop();
      },
      pause() {
        appRef.current?.stop();
      },
      resume() {
        if (movieRef.current?.isPlaying) {
          appRef.current?.start();
        }
      },
      setPause(paused: boolean) {
        if (paused) {
          appRef.current?.stop();
          return;
        }

        if (movieRef.current?.isPlaying) {
          appRef.current?.start();
        }
      },
      renderCurrentFrame() {
        renderDragonBonesStage(appRef.current);
      },
      getAnimationList() {
        return movieRef.current?.movementList ?? [];
      },
      isPlaying() {
        return Boolean(movieRef.current?.isPlaying);
      },
      clearFadeInTime() {
        movieRef.current?.clearFadeInTime();
      },
      detachChildArmatures(armatureNames = []) {
        const movie = movieRef.current as MovieWithChildArmatures | null;
        if (!movie) {
          return;
        }

        detachMovieChildArmatures(movie, armatureNames);
      },
      getDisplay() {
        return movieRef.current?.display ?? null;
      },
      getArmature() {
        return movieRef.current?.armatrue ?? null;
      },
      getArmatureNames() {
        try {
          return itemRef.current?.getArmatureNames() ?? [];
        } catch {
          return [];
        }
      },
      gotoAndStopByFrame(animationName: string, frame: number) {
        const movie = movieRef.current as MovieWithChildArmatures | null;
        if (!movie || !animationName) {
          return;
        }

        appRef.current?.stop();
        gotoMovieFrame(movie, animationName, frame);
        renderDragonBonesStage(appRef.current);
      },
      getAnimationMeta(animationName: string) {
        const armature = movieRef.current?.armatrue;
        if (!armature) {
          return null;
        }

        const animationData = armature.armatureData.getAnimation(animationName);

        if (!animationData) {
          return null;
        }

        return {
          frameCount: animationData.frameCount,
          duration: animationData.duration,
          frameRate: armature.armatureData.frameRate,
        };
      },
      getCanvas() {
        return (appRef.current?.view as HTMLCanvasElement | undefined) ?? null;
      },
      isCanvasRenderer() {
        const renderer = appRef.current?.renderer;
        if (!renderer) {
          return false;
        }

        const constructorName = renderer.constructor?.name ?? '';
        if (constructorName.includes('Canvas')) {
          return true;
        }

        return renderer.type === PIXI.RENDERER_TYPE?.CANVAS;
      },
      measureCurrentBounds() {
        return getMovieContentBounds(movieRef.current as MovieWithChildArmatures | null);
      },
      resizeCanvas(width: number, height: number) {
        resizeDragonBonesCanvas(appRef.current, width, height);
        renderDragonBonesStage(appRef.current);
      },
      setDisplayTransform(transform: DragonBonesDisplayTransform) {
        setMovieDisplayTransform(movieRef.current as MovieWithChildArmatures | null, transform);
        renderDragonBonesStage(appRef.current);
      },
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      destroyedRef.current = false;
      recordFitBounds(null);

      PixiSkItem.loadUrl(zipUrl)
        .then((item) => {
          if (destroyedRef.current) {
            item.destroy();
            return;
          }

          const pixiTransparent = transparent
            ? transparentMode === 'notMultiplied'
              ? 'notMultiplied'
              : true
            : false;

          const app = new PIXI.Application({
            width,
            height,
            transparent: pixiTransparent,
            forceCanvas,
          });

          app.view.style.display = 'block';
          app.view.style.background = 'transparent';
          app.view.style.border = '0';
          app.view.style.pointerEvents = 'none';

          container.appendChild(app.view);
          appRef.current = app;
          itemRef.current = item;

          let armatureNames: string[] = [];
          try {
            armatureNames = item.getArmatureNames?.() ?? [];
          } catch {
            armatureNames = [];
          }
          const tryCreateMovie = (armatureName: string) => {
            if (!armatureName) {
              return null;
            }

            try {
              return item.createMovie(armatureName);
            } catch {
              return null;
            }
          };

          let movie = tryCreateMovie(armature);
          if (!movie) {
            const fallbackArmature = armatureNames[0] ?? '';
            if (fallbackArmature && fallbackArmature !== armature) {
              movie = tryCreateMovie(fallbackArmature);
            }
          }
          if (!movie) {
            onErrorRef.current?.(`Failed to create movie for armature: ${armature}`);
            return;
          }

          movieRef.current = movie;
          setMovieDisplayTransform(movie as MovieWithChildArmatures, {
            x: 0,
            y: 0,
            scale: displayScale,
          });
          detachMovieChildArmatures(movie as MovieWithChildArmatures, excludedChildArmatureNames);
          firstAnimRef.current = movie.movementList[0] ?? '';
          const initialAnimationName =
            initialAnimation && movie.movementList.includes(initialAnimation)
              ? initialAnimation
              : '';

          attachBackgroundTexture(
            item as DragonBonesItemLike,
            movie.display as DisplayContainerLike,
          );

          app.stage.addChild(movie.display);

          movie.setCompleteCallback(() => {
            if (!destroyedRef.current) {
              onCompleteRef.current?.(movie.curtMovement);
            }
          });

          if (autoPlay && firstAnimRef.current) {
            if (fitSize && fitMode === 'animation-bounds') {
              recordFitBounds(
                fitMovieAnimationToViewport(
                  movie as MovieWithChildArmatures,
                  width,
                  height,
                  firstAnimRef.current,
                ) ?? null,
              );
            }
            playMovieAnimation(movie as MovieWithChildArmatures, firstAnimRef.current, true);
            app.start();
          } else if (initialAnimationName) {
            if (fitSize && fitMode === 'animation-bounds') {
              recordFitBounds(
                fitMovieAnimationToViewport(
                  movie as MovieWithChildArmatures,
                  width,
                  height,
                  initialAnimationName,
                ) ?? null,
              );
            }
            gotoMovieFrame(movie as MovieWithChildArmatures, initialAnimationName, 0);
            renderDragonBonesStage(app);
          } else {
            renderDragonBonesStage(app);
          }

          scheduleFit();
          onReadyRef.current?.();
        })
        .catch((err) => {
          if (!destroyedRef.current) {
            onErrorRef.current?.(String(err));
          }
        });

      return () => {
        destroyedRef.current = true;
        if (fitFrameRef.current !== null) {
          window.cancelAnimationFrame(fitFrameRef.current);
          fitFrameRef.current = null;
        }
        movieRef.current?.destroy();
        movieRef.current = null;
        itemRef.current?.destroy();
        itemRef.current = null;
        if (appRef.current) {
          const view = appRef.current.view as HTMLCanvasElement;
          appRef.current.destroy(true);
          appRef.current = null;
          view.parentNode?.removeChild(view);
        }
        firstAnimRef.current = '';
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      zipUrl,
      armature,
      excludedChildArmatureNamesKey,
      width,
      height,
      forceCanvas,
      transparent,
      transparentMode,
      fitSize,
      fitMode,
      displayScale,
    ]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width, height, ...(showDebugBounds ? { position: 'relative' } : {}), ...style }}
      >
        {showDebugBounds && debugViewportBounds && (
          <svg
            aria-hidden="true"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
              width: '100%',
              height: 'auto',
              pointerEvents: 'none',
            }}
          >
            <line
              x1={width / 2}
              y1={0}
              x2={width / 2}
              y2={height}
              stroke="#ec3f8c"
              strokeDasharray="4 4"
            />
            <line
              x1={0}
              y1={height / 2}
              x2={width}
              y2={height / 2}
              stroke="#ec3f8c"
              strokeDasharray="4 4"
            />
            <rect
              x={debugViewportBounds.x}
              y={debugViewportBounds.y}
              width={debugViewportBounds.width}
              height={debugViewportBounds.height}
              fill="none"
              stroke="#00aeca"
              strokeWidth={2}
            />
          </svg>
        )}
      </div>
    );
  },
);

export default DragonBonesPlayer;
