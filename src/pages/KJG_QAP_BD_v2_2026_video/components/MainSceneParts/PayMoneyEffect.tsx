import { getRasterAsset } from '../../rasterAssets';
import RasterAnimationPlayer from '../raster-animation/RasterAnimationPlayer';
import type { PayMoneyState } from './mainSceneTypes';

const PAY_MONEY_ASSET = getRasterAsset('BD_pay_money');

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
  const fitScale = Math.min(
    PAY_MONEY_CANVAS_WIDTH / PAY_MONEY_ASSET.manifest.canvas.width,
    PAY_MONEY_CANVAS_HEIGHT / PAY_MONEY_ASSET.manifest.canvas.height,
    1,
  );

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
        <RasterAnimationPlayer
          manifest={PAY_MONEY_ASSET.manifest}
          files={PAY_MONEY_ASSET.files}
          action="start"
          restartKey={state.token}
          style={{
            left:
              (PAY_MONEY_CANVAS_WIDTH - PAY_MONEY_ASSET.manifest.canvas.width * fitScale) / 2,
            top:
              (PAY_MONEY_CANVAS_HEIGHT - PAY_MONEY_ASSET.manifest.canvas.height * fitScale) / 2,
            transform: `scale(${fitScale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  );
}
