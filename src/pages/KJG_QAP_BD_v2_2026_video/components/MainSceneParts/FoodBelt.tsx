import AtlasSprite from '@/shared/components/atlas-sprite';
import type { BDFoodBeltState } from '../../sceneTypes';
import atlasData from '../../assets/textures/KJG_QAP_BD_v2.json';

const ATLAS_URL = new URL('../../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;
export const FOOD_ITEM_WIDTH = 150;
export const FOOD_ITEM_HEIGHT = 60;
export const FOOD_ITEM_STEP = 187.5;
export const FOOD_MASK_LEFT = 50;
const MASK_WIDTH = 900;
export const FOOD_FOCUS_X_BASE = 137;
const TRACK_RENDER_OFFSET = 25000;
const TRACK_RENDER_WIDTH = 50000;
const DISPLAY_ITEMS_BEFORE_CENTER = 5;
const DISPLAY_ITEMS_AFTER_CENTER = 9;

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total;
}

export interface FoodItemVisualProps {
  char: string;
  foodFrameName: string;
  selected?: boolean;
}

export function FoodItemVisual({ char, foodFrameName, selected = false }: FoodItemVisualProps) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: FOOD_ITEM_WIDTH,
          height: FOOD_ITEM_HEIGHT,
        }}
      >
        <AtlasSprite
          atlasUrl={ATLAS_URL}
          atlasData={atlasData}
          frameName={foodFrameName}
          style={{
            position: 'absolute',
            left: FOOD_ITEM_WIDTH / 2,
            top: FOOD_ITEM_HEIGHT / 2,
            transform: 'translate(-50%, -50%)',
            transformOrigin: 'center center',
            filter: selected ? 'drop-shadow(0 6px 10px rgba(126, 78, 24, 0.22))' : 'none',
          }}
        />
      </div>
      <span
        style={{
          position: 'absolute',
          left: 18,
          top: 17,
          width: 112,
          textAlign: 'center',
          fontSize: 25,
          fontWeight: 700,
          letterSpacing: 1,
          color: '#2e170a',
          textShadow: selected
            ? '0 1px 0 rgba(255, 245, 199, 0.75)'
            : '0 1px 0 rgba(255, 248, 219, 0.56)',
        }}
      >
        {char}
      </span>
    </>
  );
}

export interface FoodBeltProps {
  rowIndex: number;
  state: BDFoodBeltState;
  focusX: number;
  frozen: boolean;
  hideSelectedItem: boolean;
  foodFrameName: string;
  onSlotClick(itemIndex: number): void;
  onLeftArrow(): void;
  onRightArrow(): void;
}

export default function FoodBelt({
  rowIndex,
  state,
  focusX,
  frozen,
  hideSelectedItem,
  foodFrameName,
  onSlotClick,
  onLeftArrow,
  onRightArrow,
}: FoodBeltProps) {
  const translateX = focusX - FOOD_FOCUS_X_BASE - state.currentCenterIndex * FOOD_ITEM_STEP;
  const virtualIndexes = Array.from(
    { length: DISPLAY_ITEMS_BEFORE_CENTER + DISPLAY_ITEMS_AFTER_CENTER + 1 },
    (_, offset) => state.currentCenterIndex - DISPLAY_ITEMS_BEFORE_CENTER + offset,
  );

  return (
    <div
      data-role="food-row"
      data-row-index={rowIndex}
      data-touch-count={state.touchCount}
      data-center-index={state.currentCenterIndex}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1000,
        height: FOOD_ITEM_HEIGHT,
      }}
    >
      <button
        type="button"
        onClick={onLeftArrow}
        disabled={frozen}
        aria-label={`第 ${rowIndex + 1} 行向左滚动`}
        style={{
          position: 'absolute',
          left: 8,
          top: 11,
          width: 36,
          height: 37,
          padding: 0,
          border: 'none',
          background: 'transparent',
        }}
      >
        <AtlasSprite
          atlasUrl={ATLAS_URL}
          atlasData={atlasData}
          frameName="KJG_QAP_BD_v2_left_arrow"
        />
      </button>
      <div
        data-role="food-mask"
        style={{
          position: 'absolute',
          left: FOOD_MASK_LEFT,
          top: 0,
          width: MASK_WIDTH,
          height: FOOD_ITEM_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <div
          data-role="food-track"
          style={{
            position: 'absolute',
            left: translateX - TRACK_RENDER_OFFSET,
            top: 0,
            width: TRACK_RENDER_WIDTH,
            height: FOOD_ITEM_HEIGHT,
            transition: 'left 300ms ease',
          }}
        >
          {virtualIndexes.map((virtualIndex) => {
            const itemIndex = wrapIndex(virtualIndex, state.charList.length);
            const char = state.charList[itemIndex] ?? '';
            const isSelected = state.touchCount > 0 && virtualIndex === state.currentCenterIndex;

            return (
              <button
                key={`${rowIndex}-${virtualIndex}-${char}`}
                type="button"
                data-role="food-item"
                data-row-index={rowIndex}
                data-item-index={itemIndex}
                data-virtual-index={virtualIndex}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => onSlotClick(virtualIndex)}
                disabled={frozen}
                style={{
                  position: 'absolute',
                  left: TRACK_RENDER_OFFSET + virtualIndex * FOOD_ITEM_STEP,
                  top: 0,
                  width: FOOD_ITEM_WIDTH,
                  height: FOOD_ITEM_HEIGHT,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: '#fff9ea',
                  transform: isSelected ? 'translateY(-1px)' : 'none',
                  visibility: hideSelectedItem && isSelected ? 'hidden' : 'visible',
                }}
              >
                <FoodItemVisual char={char} foodFrameName={foodFrameName} selected={isSelected} />
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={onRightArrow}
        disabled={frozen}
        aria-label={`第 ${rowIndex + 1} 行向右滚动`}
        style={{
          position: 'absolute',
          right: 8,
          top: 11,
          width: 36,
          height: 37,
          padding: 0,
          border: 'none',
          background: 'transparent',
        }}
      >
        <AtlasSprite
          atlasUrl={ATLAS_URL}
          atlasData={atlasData}
          frameName="KJG_QAP_BD_v2_right_arrow"
        />
      </button>
    </div>
  );
}
