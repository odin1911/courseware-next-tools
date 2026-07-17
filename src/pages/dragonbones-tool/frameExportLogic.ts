export type FrameExportBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FrameExportViewport = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  sourceX: number;
  sourceY: number;
};

export function mergeFrameExportBounds(boundsList: FrameExportBounds[]) {
  if (boundsList.length === 0) {
    return null;
  }

  let minX = boundsList[0].x;
  let minY = boundsList[0].y;
  let maxX = boundsList[0].x + boundsList[0].width;
  let maxY = boundsList[0].y + boundsList[0].height;

  for (let index = 1; index < boundsList.length; index += 1) {
    const bounds = boundsList[index];
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  } satisfies FrameExportBounds;
}

export function resolveOriginalContentViewport(
  bounds: FrameExportBounds,
  padding: number,
): FrameExportViewport {
  const safePadding = Math.max(0, Math.floor(padding));
  const sourceX = Math.floor(bounds.x) - safePadding;
  const sourceY = Math.floor(bounds.y) - safePadding;
  const sourceRight = Math.ceil(bounds.x + bounds.width) + safePadding;
  const sourceBottom = Math.ceil(bounds.y + bounds.height) + safePadding;

  return {
    width: Math.max(1, sourceRight - sourceX),
    height: Math.max(1, sourceBottom - sourceY),
    offsetX: -sourceX,
    offsetY: -sourceY,
    sourceX,
    sourceY,
  };
}
