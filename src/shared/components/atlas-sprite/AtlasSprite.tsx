import type { CSSProperties } from 'react';
import { getTextureAtlasFrame, type TextureAtlasData } from '@/shared/core/atlas';

export interface AtlasSpriteProps {
  atlasUrl: string;
  atlasData: TextureAtlasData;
  frameName: string;
  /** 资源像素到逻辑像素的比例；旧 tamic 2x 图集传 0.5。 */
  displayScale?: number;
  atlasSize?: { width: number; height: number };
  style?: CSSProperties;
  className?: string;
}

export default function AtlasSprite({
  atlasUrl,
  atlasData,
  frameName,
  displayScale = 1,
  atlasSize,
  style,
  className,
}: AtlasSpriteProps) {
  const frame = getTextureAtlasFrame(atlasData, frameName);
  const sourceFrame = atlasData.frames[frameName];
  const sourceWidth = sourceFrame.sourceW ?? frame.width;
  const sourceHeight = sourceFrame.sourceH ?? frame.height;
  const offsetX = sourceFrame.offX ?? 0;
  const offsetY = sourceFrame.offY ?? 0;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width: sourceWidth * displayScale,
        height: sourceHeight * displayScale,
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          left: offsetX * displayScale,
          top: offsetY * displayScale,
          width: frame.width * displayScale,
          height: frame.height * displayScale,
          backgroundImage: `url(${atlasUrl})`,
          backgroundPosition: `-${frame.x * displayScale}px -${frame.y * displayScale}px`,
          backgroundSize: atlasSize
            ? `${atlasSize.width * displayScale}px ${atlasSize.height * displayScale}px`
            : undefined,
          backgroundRepeat: 'no-repeat',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
