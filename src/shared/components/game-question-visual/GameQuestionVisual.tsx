import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import SpinePlayerWebGl from '@/shared/components/spine-player';
import type { GameQuestionAnimationType } from '@/shared/core/game/GameExerciseDataProvider';
// ponytail: dormant fallback import; keep with the commented branch below until visual QA decides.
// import ContainedDragonBonesPlayer from './ContainedDragonBonesPlayer';

const DEFAULT_DRAGONBONES_ARMATURE = 'armatures/skeleton_movie_1';

export interface GameQuestionVisualProps {
  imageUrl: string;
  skeletonUrl: string;
  animationType?: GameQuestionAnimationType;
  width: number;
  height: number;
  armature?: string;
  fitSize?: boolean;
  forceCanvas?: boolean;
  autoPlay?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function GameQuestionVisual({
  imageUrl,
  skeletonUrl,
  animationType,
  width,
  height,
  armature = DEFAULT_DRAGONBONES_ARMATURE,
  fitSize = false,
  forceCanvas = false,
  autoPlay = true,
  className,
  style,
}: GameQuestionVisualProps) {
  const [useFallbackImage, setUseFallbackImage] = useState(!skeletonUrl);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setUseFallbackImage(!skeletonUrl);
  }, [animationType, imageUrl, skeletonUrl]);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (!useFallbackImage && skeletonUrl) {
    if (animationType === 'dragonbones') {
      // ponytail: dormant contain fallback; restore only behind an explicit per-template opt-in.
      // if (useContainedDragonBonesPlayer) {
      //   return (
      //     <ContainedDragonBonesPlayer
      //       zipUrl={skeletonUrl}
      //       armature={armature}
      //       width={width}
      //       height={height}
      //       autoPlay={autoPlay}
      //       forceCanvas={forceCanvas}
      //       className={className}
      //       style={style}
      //       onError={() => setUseFallbackImage(true)}
      //     />
      //   );
      // }

      return (
        <DragonBonesPlayer
          zipUrl={skeletonUrl}
          armature={armature}
          width={width}
          height={height}
          fitSize={fitSize}
          forceCanvas={forceCanvas}
          autoPlay={autoPlay}
          className={className}
          style={style}
          onError={() => setUseFallbackImage(true)}
        />
      );
    }

    return (
      <SpinePlayerWebGl
        zipUrl={skeletonUrl}
        width={width}
        height={height}
        autoPlay={autoPlay}
        loop={true}
        className={className}
        style={style}
        onError={() => setUseFallbackImage(true)}
      />
    );
  }

  if (!imageUrl || imageFailed) {
    return null;
  }

  return (
    <img
      className={className}
      src={imageUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={style}
      onError={() => setImageFailed(true)}
    />
  );
}
