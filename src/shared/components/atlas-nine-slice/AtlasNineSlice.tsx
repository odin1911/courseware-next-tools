import React, { CSSProperties, useEffect, useState } from 'react';

type Slice = [top: number, right: number, bottom: number, left: number];
type SourceRect = [x: number, y: number, width: number, height: number];
type SourceSize = [width: number, height: number];
type SourceOffset = [x: number, y: number];

export interface AtlasNineSliceProps {
  atlasUrl: string;
  sourceRect: SourceRect;
  sourceSize?: SourceSize;
  sourceOffset?: SourceOffset;
  slice: Slice;
  width: number;
  height: number;
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  tintColor?: string;
  tintOpacity?: number;
}

const atlasImagePromiseCache = new Map<string, Promise<HTMLImageElement>>();

function loadAtlasImage(atlasUrl: string) {
  const cachedPromise = atlasImagePromiseCache.get(atlasUrl);
  if (cachedPromise) {
    return cachedPromise;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      atlasImagePromiseCache.delete(atlasUrl);
      reject(new Error(`Failed to load atlas image: ${atlasUrl}`));
    };
    image.src = atlasUrl;
  });

  atlasImagePromiseCache.set(atlasUrl, promise);
  return promise;
}

export default function AtlasNineSlice({
  atlasUrl,
  sourceRect,
  sourceSize,
  sourceOffset,
  slice,
  width,
  height,
  children,
  className,
  style,
  tintColor,
  tintOpacity = 1,
}: AtlasNineSliceProps) {
  const [frameSrc, setFrameSrc] = useState('');
  const sourceRectKey = sourceRect.join(',');
  const sourceSizeKey = sourceSize?.join(',') ?? '';
  const sourceOffsetKey = sourceOffset?.join(',') ?? '';
  const sliceKey = slice.join(',');

  useEffect(() => {
    let cancelled = false;
    const [sourceX, sourceY, sourceWidth, sourceHeight] = sourceRect;
    const [naturalSourceWidth, naturalSourceHeight] = sourceSize ?? [sourceWidth, sourceHeight];
    const [sourceOffsetX, sourceOffsetY] = sourceOffset ?? [0, 0];
    const [top, right, bottom, left] = slice;

    loadAtlasImage(atlasUrl)
      .then((image) => {
        if (cancelled) {
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return;
        }

        let sliceSource: CanvasImageSource = image;
        let sliceSourceX = sourceX;
        let sliceSourceY = sourceY;

        if (
          naturalSourceWidth !== sourceWidth ||
          naturalSourceHeight !== sourceHeight ||
          sourceOffsetX !== 0 ||
          sourceOffsetY !== 0
        ) {
          const sourceCanvas = document.createElement('canvas');
          const sourceCtx = sourceCanvas.getContext('2d');

          if (!sourceCtx) {
            return;
          }

          sourceCanvas.width = Math.max(1, Math.round(naturalSourceWidth));
          sourceCanvas.height = Math.max(1, Math.round(naturalSourceHeight));
          sourceCtx.clearRect(0, 0, naturalSourceWidth, naturalSourceHeight);
          sourceCtx.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            sourceOffsetX,
            sourceOffsetY,
            sourceWidth,
            sourceHeight,
          );

          sliceSource = sourceCanvas;
          sliceSourceX = 0;
          sliceSourceY = 0;
        }

        const centerWidth = Math.max(0, width - left - right);
        const middleHeight = Math.max(0, height - top - bottom);
        const sourceWidths = [left, Math.max(0, naturalSourceWidth - left - right), right];
        const sourceHeights = [top, Math.max(0, naturalSourceHeight - top - bottom), bottom];
        const targetWidths = [left, centerWidth, right];
        const targetHeights = [top, middleHeight, bottom];
        const sourceOffsetsX = [
          sliceSourceX,
          sliceSourceX + left,
          sliceSourceX + naturalSourceWidth - right,
        ];
        const sourceOffsetsY = [
          sliceSourceY,
          sliceSourceY + top,
          sliceSourceY + naturalSourceHeight - bottom,
        ];
        const targetOffsetsX = [0, left, width - right];
        const targetOffsetsY = [0, top, height - bottom];
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;

        for (let row = 0; row < 3; row += 1) {
          for (let column = 0; column < 3; column += 1) {
            const sw = sourceWidths[column];
            const sh = sourceHeights[row];
            const tw = targetWidths[column];
            const th = targetHeights[row];

            if (sw <= 0 || sh <= 0 || tw <= 0 || th <= 0) {
              continue;
            }

            ctx.drawImage(
              sliceSource,
              sourceOffsetsX[column],
              sourceOffsetsY[row],
              sw,
              sh,
              targetOffsetsX[column],
              targetOffsetsY[row],
              tw,
              th,
            );
          }
        }

        setFrameSrc(canvas.toDataURL('image/png'));
      })
      .catch(() => {
        if (!cancelled) {
          setFrameSrc('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [atlasUrl, height, sliceKey, sourceOffsetKey, sourceRectKey, sourceSizeKey, width]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        ...style,
      }}
    >
      {frameSrc && tintColor ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            background: tintColor,
            opacity: tintOpacity,
            pointerEvents: 'none',
            WebkitMaskImage: `url(${frameSrc})`,
            WebkitMaskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskImage: `url(${frameSrc})`,
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
          }}
        />
      ) : null}
      {frameSrc && !tintColor ? (
        <img
          src={frameSrc}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
}
