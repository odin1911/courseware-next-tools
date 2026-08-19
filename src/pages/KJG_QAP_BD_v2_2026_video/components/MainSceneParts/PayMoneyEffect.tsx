import { useRef } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import { BD_DRAGONBONES_ARMATURE, resolveAnimationName } from '../../logic/runtime';
import { fitPlayerToViewport } from './mainSceneGeometry';
import type { PayMoneyState } from './mainSceneTypes';

const PAY_MONEY_ZIP_URL = new URL('../../assets/skeleton/BD_pay_money.zip', import.meta.url).href;

export const PAY_MONEY_START_OFFSET_X = 30;
export const PAY_MONEY_START_Y = 212;
export const PAY_MONEY_END_X = 602;
export const PAY_MONEY_END_Y = 31;
export const PAY_MONEY_DROP_HOLD_MS = 500;
export const PAY_MONEY_FLY_MS = 500;

const PAY_MONEY_WIDTH = 48;
const PAY_MONEY_HEIGHT = 36;
const PAY_MONEY_CANVAS_PADDING = 18;
const PAY_MONEY_CANVAS_WIDTH = PAY_MONEY_WIDTH + PAY_MONEY_CANVAS_PADDING * 2;
const PAY_MONEY_CANVAS_HEIGHT = PAY_MONEY_HEIGHT + PAY_MONEY_CANVAS_PADDING * 2;

export default function PayMoneyEffect({ state }: { state: PayMoneyState }) {
  const playerRef = useRef<DragonBonesHandle | null>(null);

  return (
    <div
      data-role="pay-money-effect"
      data-pay-phase={state.phase}
      style={{
        position: 'absolute',
        left: state.phase === 'to-top' ? state.endX : state.startX,
        top: state.phase === 'to-top' ? state.endY : state.startY,
        width: PAY_MONEY_WIDTH,
        height: PAY_MONEY_HEIGHT,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 15,
        transition:
          state.phase === 'to-top'
            ? `left ${PAY_MONEY_FLY_MS}ms linear, top ${PAY_MONEY_FLY_MS}ms linear`
            : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -PAY_MONEY_CANVAS_PADDING,
          top: -PAY_MONEY_CANVAS_PADDING,
          width: PAY_MONEY_CANVAS_WIDTH,
          height: PAY_MONEY_CANVAS_HEIGHT,
          overflow: 'visible',
        }}
      >
        <DragonBonesPlayer
          ref={playerRef}
          zipUrl={PAY_MONEY_ZIP_URL}
          armature={BD_DRAGONBONES_ARMATURE}
          width={PAY_MONEY_CANVAS_WIDTH}
          height={PAY_MONEY_CANVAS_HEIGHT}
          autoPlay={false}
          onReady={() => {
            fitPlayerToViewport(
              playerRef.current,
              PAY_MONEY_CANVAS_WIDTH,
              PAY_MONEY_CANVAS_HEIGHT,
              0,
            );
            const animationList = playerRef.current?.getAnimationList() ?? [];
            const animationName = resolveAnimationName(
              animationList,
              ['start'],
              animationList[0] ?? '',
            );
            if (animationName) {
              playerRef.current?.play(animationName, false);
            }
          }}
        />
      </div>
    </div>
  );
}
