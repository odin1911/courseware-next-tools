import type { DragonBonesBounds } from '@/shared/components/dragonbones-player/DragonBonesPlayer';

export function buildExportGeometry(
  bounds: DragonBonesBounds[],
  padding: number,
) {
  if (bounds.length === 0) {
    throw new Error('asset has no visible frame bounds');
  }

  const minX = Math.min(...bounds.map((item) => item.x));
  const minY = Math.min(...bounds.map((item) => item.y));
  const maxX = Math.max(...bounds.map((item) => item.x + item.width));
  const maxY = Math.max(...bounds.map((item) => item.y + item.height));
  const sourceBounds = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
  const canvasWidth = Math.ceil(sourceBounds.width + padding * 2);
  const canvasHeight = Math.ceil(sourceBounds.height + padding * 2);

  return {
    canvas: {
      width: canvasWidth + (canvasWidth % 2),
      height: canvasHeight + (canvasHeight % 2),
    },
    anchor: {
      x: minX - padding,
      y: minY - padding,
    },
    transform: {
      x: padding - minX,
      y: padding - minY,
    },
    sourceBounds,
  };
}
