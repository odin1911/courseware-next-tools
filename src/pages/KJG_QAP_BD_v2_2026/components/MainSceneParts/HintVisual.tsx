import GameQuestionVisual from '@/shared/components/game-question-visual';
import type { BDWordItem } from '../../sceneTypes';
import { BD_DRAGONBONES_ARMATURE } from '../../logic/runtime';

export function ImageHintVisual({
  imageUrl,
  skeletonUrl,
  animationType,
  size,
}: {
  imageUrl: string;
  skeletonUrl: string;
  animationType: BDWordItem['animationType'];
  size: number;
}) {
  return (
    <GameQuestionVisual
      imageUrl={imageUrl}
      skeletonUrl={skeletonUrl}
      animationType={animationType}
      armature={BD_DRAGONBONES_ARMATURE}
      width={size}
      height={size}
      fitSize={animationType === 'dragonbones'}
      style={{
        width: size,
        height: size,
        background: 'transparent',
      }}
    />
  );
}
