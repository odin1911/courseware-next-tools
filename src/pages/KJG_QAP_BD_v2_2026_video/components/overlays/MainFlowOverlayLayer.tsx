import RasterCountdownOverlay from './RasterCountdownOverlay';
import {
  FixedStageContentFrameLayer,
  FixedStageLayer,
  type FixedStageContentFrame,
  type FixedStagePresetKey,
} from '@/shared/components/fixed-stage-shell';
import type { BDMainSubstate } from '../../sceneTypes';
import DayCurtain from '../MainSceneParts/DayCurtain';
import ChooseFoodOverlay from './ChooseFoodOverlay';

export interface MainFlowOverlayLayerProps {
  presetKey: FixedStagePresetKey;
  legacyContentFrame: FixedStageContentFrame;
  mainSubstate: BDMainSubstate;
  countdownValue: number;
  chooseFoodOptions: [string, string];
  onCountdownComplete(): void;
  onChooseFood(frameName: string): void;
}

export default function MainFlowOverlayLayer({
  presetKey,
  legacyContentFrame,
  mainSubstate,
  countdownValue,
  chooseFoodOptions,
  onCountdownComplete,
  onChooseFood,
}: MainFlowOverlayLayerProps) {
  if (mainSubstate === 'countdown') {
    return (
      <FixedStageLayer
        data-main-flow-overlay-host="true"
        data-overlay="countdown"
        data-render-mode="dragonbones"
        data-asset-source="skeleton"
        zIndex={10}
        pointerEvents="auto"
      >
        <RasterCountdownOverlay
          countdownValue={countdownValue}
          onComplete={onCountdownComplete}
        />
      </FixedStageLayer>
    );
  }

  if (mainSubstate === 'day-opening' || mainSubstate === 'day-closing') {
    return (
      <FixedStageLayer
        data-main-flow-overlay-host="true"
        data-overlay="day-switch"
        zIndex={10}
        pointerEvents="auto"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      >
        <FixedStageContentFrameLayer presetKey={presetKey} contentFrame={legacyContentFrame}>
          <DayCurtain phase={mainSubstate === 'day-opening' ? 'opening' : 'closing'} />
        </FixedStageContentFrameLayer>
      </FixedStageLayer>
    );
  }

  if (mainSubstate === 'choose-food') {
    return (
      <FixedStageLayer
        data-main-flow-overlay-host="true"
        data-overlay="choose-food"
        zIndex={10}
        pointerEvents="auto"
        style={{ background: 'rgba(7, 24, 31, 0.45)' }}
      >
        <FixedStageContentFrameLayer presetKey={presetKey} contentFrame={legacyContentFrame}>
          <ChooseFoodOverlay options={chooseFoodOptions} onChoose={onChooseFood} />
        </FixedStageContentFrameLayer>
      </FixedStageLayer>
    );
  }

  return null;
}
