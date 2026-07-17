import type {
  ResolveSpineBackgroundDrawRectOptions,
  ResolveSpineBackgroundRenderSizeOptions,
  ResolveSpineBackgroundWorldRectOptions,
  ResolveSpineViewportTransformOptions,
  SpineFitMode,
  SpineGlobal,
  SpineRect,
  SpineSkeleton,
  SpineViewportTransform,
} from './spineTypes';

function isFiniteRectValue(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function resolveSpineStageRect(
  x: number,
  y: number,
  width: number,
  height: number,
): SpineRect | null {
  if (!isFiniteRectValue(width) || !isFiniteRectValue(height)) {
    return null;
  }

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    width,
    height,
  };
}

export function mergeSpineRects(rects: Array<SpineRect | null | undefined>) {
  const validRects = rects.filter(
    (rect): rect is SpineRect =>
      !!rect &&
      Number.isFinite(rect.x) &&
      Number.isFinite(rect.y) &&
      isFiniteRectValue(rect.width) &&
      isFiniteRectValue(rect.height),
  );

  if (!validRects.length) {
    return null;
  }

  let minX = validRects[0].x;
  let minY = validRects[0].y;
  let maxX = validRects[0].x + validRects[0].width;
  let maxY = validRects[0].y + validRects[0].height;

  for (let index = 1; index < validRects.length; index += 1) {
    const rect = validRects[index];
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
  } satisfies SpineRect;
}

export function resolveSpineBackgroundWorldRect({
  stageX = 0,
  stageY = 0,
  stageWidth,
  stageHeight,
  backgroundNaturalWidth,
  backgroundNaturalHeight,
}: ResolveSpineBackgroundWorldRectOptions) {
  const stageRect = resolveSpineStageRect(stageX, stageY, stageWidth, stageHeight);

  if (!stageRect) {
    return null;
  }

  if (!isFiniteRectValue(backgroundNaturalWidth) || !isFiniteRectValue(backgroundNaturalHeight)) {
    return null;
  }

  return {
    x: stageRect.x,
    y: stageRect.y + stageRect.height - backgroundNaturalHeight,
    width: backgroundNaturalWidth,
    height: backgroundNaturalHeight,
  } satisfies SpineRect;
}

export function resolveSpineViewportTransform({
  viewWidth,
  viewHeight,
  contentBounds,
  fitRatio = 1,
  fitMode = 'stage',
}: ResolveSpineViewportTransformOptions) {
  if (!contentBounds || viewWidth <= 0 || viewHeight <= 0) {
    return null;
  }

  const scale =
    fitMode === 'native'
      ? fitRatio
      : Math.min(
          (viewWidth * fitRatio) / contentBounds.width,
          (viewHeight * fitRatio) / contentBounds.height,
        );

  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }

  return {
    scale,
    x: -(contentBounds.x + contentBounds.width / 2) * scale,
    y: -(contentBounds.y + contentBounds.height / 2) * scale,
  } satisfies SpineViewportTransform;
}

export function resolveSpineRectDrawRect(
  rect: SpineRect | null,
  transform: SpineViewportTransform | null,
) {
  if (!rect || !transform) {
    return null;
  }

  return {
    x: rect.x * transform.scale + transform.x,
    y: rect.y * transform.scale + transform.y,
    width: rect.width * transform.scale,
    height: rect.height * transform.scale,
  };
}

function resolveSpineRectDomRect(
  rect: SpineRect | null,
  transform: SpineViewportTransform | null,
  viewWidth: number,
  viewHeight: number,
  flipY = false,
) {
  const drawRect = resolveSpineRectDrawRect(rect, transform);

  if (!drawRect) {
    return null;
  }

  return {
    x: drawRect.x + viewWidth / 2,
    y: flipY ? drawRect.y + viewHeight / 2 : viewHeight / 2 - drawRect.y - drawRect.height,
    width: drawRect.width,
    height: drawRect.height,
  } satisfies SpineRect;
}

export function resolveSpineBackgroundRenderSize({
  backgroundNaturalWidth,
  backgroundNaturalHeight,
  stageWidth,
  stageHeight,
  viewWidth,
  viewHeight,
  fitRatio = 1,
}: ResolveSpineBackgroundRenderSizeOptions) {
  if (
    backgroundNaturalWidth <= 0 ||
    backgroundNaturalHeight <= 0 ||
    stageWidth <= 0 ||
    stageHeight <= 0 ||
    viewWidth <= 0 ||
    viewHeight <= 0
  ) {
    return null;
  }

  const stageRect = resolveSpineStageRect(0, 0, stageWidth, stageHeight);
  const backgroundRect = resolveSpineBackgroundWorldRect({
    stageX: 0,
    stageY: 0,
    stageWidth,
    stageHeight,
    backgroundNaturalWidth,
    backgroundNaturalHeight,
  });
  const transform = resolveSpineViewportTransform({
    viewWidth,
    viewHeight,
    fitRatio,
    contentBounds: stageRect,
  });
  const drawRect = resolveSpineRectDrawRect(backgroundRect, transform);

  if (!drawRect) {
    return null;
  }

  return {
    width: drawRect.width,
    height: drawRect.height,
  };
}

export function resolveSpineBackgroundDrawRect({
  backgroundNaturalWidth,
  backgroundNaturalHeight,
  stageWidth,
  stageHeight,
  viewWidth,
  viewHeight,
  fitRatio = 1,
}: ResolveSpineBackgroundDrawRectOptions) {
  const stageRect = resolveSpineStageRect(0, 0, stageWidth, stageHeight);
  const backgroundRect = resolveSpineBackgroundWorldRect({
    stageX: 0,
    stageY: 0,
    stageWidth,
    stageHeight,
    backgroundNaturalWidth,
    backgroundNaturalHeight,
  });
  const transform = resolveSpineViewportTransform({
    viewWidth,
    viewHeight,
    fitRatio,
    contentBounds: stageRect,
  });

  return resolveSpineRectDrawRect(backgroundRect, transform);
}

export function resolveSpineSkeletonWorldBounds(spineLib: SpineGlobal, skeleton: SpineSkeleton) {
  const Vector2 = spineLib.Vector2;

  if (!Vector2 || typeof skeleton.getBounds !== 'function') {
    return null;
  }

  try {
    const offset = new Vector2();
    const size = new Vector2();
    skeleton.getBounds(offset, size);

    if (!isFiniteRectValue(size.x) || !isFiniteRectValue(size.y)) {
      return null;
    }

    return {
      x: offset.x,
      y: offset.y,
      width: size.x,
      height: size.y,
    } satisfies SpineRect;
  } catch {
    return null;
  }
}

export function resolveSpineFitBounds({
  fitMode,
  stageRect,
  backgroundRect,
  skeletonRect,
}: {
  fitMode: SpineFitMode;
  stageRect: SpineRect | null;
  backgroundRect: SpineRect | null;
  skeletonRect: SpineRect | null;
}) {
  if (!stageRect) {
    return null;
  }

  if (fitMode === 'native') {
    return skeletonRect ?? backgroundRect ?? stageRect;
  }

  if (fitMode !== 'content') {
    return stageRect;
  }

  return mergeSpineRects([backgroundRect, skeletonRect]) ?? stageRect;
}
