import AtlasSprite from '@/shared/components/atlas-sprite';
import type { BDFoodBeltState } from '../../sceneTypes';
import atlasData from '../../assets/textures/KJG_QAP_BD_v2.json';
import FoodBelt from './FoodBelt';

const ATLAS_URL = new URL('../../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;

export const FOOD_ROW_MOVE_MS = 500;
export const FOOD_ROW_STAGGER_MS = 100;

export type FoodBeltMotionPhase = 'idle' | 'entering' | 'exiting';

export interface FoodBeltsProps {
  beltStates: BDFoodBeltState[];
  activeColumnIndex: number;
  frozen: boolean;
  paused: boolean;
  showColumnHighlight: boolean;
  hideSelectedItems: boolean;
  foodFrames: string[];
  motionPhase: FoodBeltMotionPhase;
  onSlotClick(rowIndex: number, itemIndex: number): void;
  onLeftArrow(rowIndex: number): void;
  onRightArrow(rowIndex: number): void;
}

export default function FoodBelts({
  beltStates,
  activeColumnIndex,
  frozen,
  paused,
  showColumnHighlight,
  hideSelectedItems,
  foodFrames,
  motionPhase,
  onSlotClick,
  onLeftArrow,
  onRightArrow,
}: FoodBeltsProps) {
  const startIndex = Math.max(0, Math.floor((8 - beltStates.length) / 2));
  const focusX = 137 + activeColumnIndex * 187.5;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 223,
        width: 1024,
        height: 480,
        zIndex: 6,
      }}
      data-role="food-belts"
      data-motion-phase={motionPhase}
    >
      {showColumnHighlight ? (
        <div
          aria-hidden="true"
          data-role="food-column-highlight"
          style={{
            position: 'absolute',
            left: focusX - 107,
            top: 0,
            width: 214,
            height: 480,
            pointerEvents: 'none',
          }}
        >
          <AtlasSprite
            atlasUrl={ATLAS_URL}
            atlasData={atlasData}
            frameName="KJG_QAP_BD_v2_food_bg"
          />
        </div>
      ) : null}
      {beltStates.map((beltState, rowIndex) => {
        const top = (startIndex + rowIndex) * 60;
        const animationName =
          motionPhase === 'entering'
            ? 'bdv2FoodRowEnter'
            : motionPhase === 'exiting'
              ? 'bdv2FoodRowExit'
              : undefined;

        return (
          <div
            key={`belt-row-${rowIndex}`}
            data-role="food-row-shell"
            data-motion-phase={motionPhase}
            style={{
              position: 'absolute',
              left: 12,
              top,
              width: 1000,
              height: 60,
              animationName,
              animationDuration: animationName ? `${FOOD_ROW_MOVE_MS}ms` : undefined,
              animationDelay: animationName ? `${rowIndex * FOOD_ROW_STAGGER_MS}ms` : undefined,
              animationFillMode: animationName ? 'both' : undefined,
              animationTimingFunction: animationName ? 'ease-in-out' : undefined,
              animationPlayState: animationName ? (paused ? 'paused' : 'running') : undefined,
              willChange: animationName ? 'transform' : undefined,
            }}
          >
            <FoodBelt
              rowIndex={rowIndex}
              state={beltState}
              focusX={focusX}
              frozen={frozen}
              hideSelectedItem={hideSelectedItems}
              foodFrameName={foodFrames[rowIndex] ?? foodFrames[0] ?? 'KJG_QAP_BD_v2_food_2'}
              onSlotClick={(itemIndex) => onSlotClick(rowIndex, itemIndex)}
              onLeftArrow={() => onLeftArrow(rowIndex)}
              onRightArrow={() => onRightArrow(rowIndex)}
            />
          </div>
        );
      })}
    </div>
  );
}
