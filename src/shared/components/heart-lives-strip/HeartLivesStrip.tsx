import type { CSSProperties } from 'react';
import AtlasSprite from '@/shared/components/atlas-sprite';
import commonGame3Atlas from '../../assets/common/commonGame3.json';

const COMMON_GAME3_ATLAS_URL = new URL('../../assets/common/commonGame3.png', import.meta.url).href;

export const HEART_LIFE_WIDTH = 65;
export const HEART_LIFE_HEIGHT = 46;
export const HEART_LIFE_GAP = 5;
export const HEART_LIFE_OFFSETS = [0, 70, 140] as const;
export const HEART_LIFE_STRIP_WIDTH =
  HEART_LIFE_WIDTH * HEART_LIFE_OFFSETS.length + HEART_LIFE_GAP * (HEART_LIFE_OFFSETS.length - 1);

export function getHeartLifeOffset(index: number) {
  return HEART_LIFE_OFFSETS[index] ?? index * (HEART_LIFE_WIDTH + HEART_LIFE_GAP);
}

export interface HeartLifeSpriteProps {
  broken?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function HeartLifeSprite({ broken = false, className, style }: HeartLifeSpriteProps) {
  return (
    <AtlasSprite
      atlasUrl={COMMON_GAME3_ATLAS_URL}
      atlasData={commonGame3Atlas}
      frameName={broken ? 'commonGame3_broken' : 'commonGame3_heart'}
      className={className}
      style={style}
    />
  );
}

export interface HeartLivesStripProps {
  remainingLives: number;
  totalLives?: number;
  hiddenIndexes?: number[];
  className?: string;
  style?: CSSProperties;
  testId?: string;
}

export default function HeartLivesStrip({
  remainingLives,
  totalLives = HEART_LIFE_OFFSETS.length,
  hiddenIndexes,
  className,
  style,
  testId,
}: HeartLivesStripProps) {
  const clampedLives = Math.max(0, Math.min(remainingLives, totalLives));
  const hiddenIndexSet = hiddenIndexes ? new Set(hiddenIndexes) : null;
  const containerWidth =
    HEART_LIFE_WIDTH * totalLives + HEART_LIFE_GAP * Math.max(0, totalLives - 1);

  return (
    <div
      className={className}
      data-testid={testId}
      data-current-lives={String(clampedLives)}
      style={{
        position: 'relative',
        width: containerWidth,
        height: HEART_LIFE_HEIGHT,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {Array.from({ length: totalLives }, (_, index) => (
        <HeartLifeSprite
          key={index}
          broken={index >= clampedLives}
          style={{
            position: 'absolute',
            left: getHeartLifeOffset(index),
            top: 0,
            visibility: hiddenIndexSet?.has(index) ? 'hidden' : 'visible',
          }}
        />
      ))}
    </div>
  );
}
