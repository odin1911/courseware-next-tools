import type { BDFoodBeltState, BDWordItem } from '../../sceneTypes';
import { FOOD_THEME_FRAMES, generateCharList, getSelectedLetter } from '../../logic/runtime';
import { FOOD_ITEM_HEIGHT, FOOD_ITEM_STEP, FOOD_ITEM_WIDTH, FOOD_MASK_LEFT } from './FoodBelt';
import { FOOD_ROW_MOVE_MS, FOOD_ROW_STAGGER_MS } from './FoodBelts';
import type { MergeDisplayPosition, MergeFoodItem } from './mainSceneTypes';

const FOOD_BELTS_TOP = 223;
const FOOD_ROW_HEIGHT = 60;

export function getFoodRowMotionTotalMs(rowCount: number) {
  if (rowCount <= 0) {
    return 0;
  }

  return FOOD_ROW_MOVE_MS + (rowCount - 1) * FOOD_ROW_STAGGER_MS;
}

export function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createBeltStates(wordItem: BDWordItem): BDFoodBeltState[] {
  return wordItem.letters.map((letter) => ({
    charList: generateCharList(letter),
    currentCenterIndex: 5,
    touchCount: 0,
  }));
}

export function toSelectedLetters(beltStates: BDFoodBeltState[]) {
  return beltStates.map((beltState) =>
    getSelectedLetter(beltState.charList, beltState.currentCenterIndex, beltState.touchCount),
  );
}

export function pickFoodOptions(): [string, string] {
  const leftIndex = Math.floor(Math.random() * FOOD_THEME_FRAMES.length);
  let rightIndex = Math.floor(Math.random() * FOOD_THEME_FRAMES.length);

  while (rightIndex === leftIndex) {
    rightIndex = Math.floor(Math.random() * FOOD_THEME_FRAMES.length);
  }

  return [
    FOOD_THEME_FRAMES[leftIndex] ?? FOOD_THEME_FRAMES[0] ?? 'KJG_QAP_BD_v2_butter',
    FOOD_THEME_FRAMES[rightIndex] ?? FOOD_THEME_FRAMES[1] ?? 'KJG_QAP_BD_v2_cucumber',
  ];
}

export function buildMergeFoodItems(
  beltStates: BDFoodBeltState[],
  activeColumnIndex: number,
  foodFrames: string[],
  selectedLetters: string[],
): { items: MergeFoodItem[]; finalCenterX: number; finalCenterY: number } {
  const startIndex = Math.max(0, Math.floor((8 - beltStates.length) / 2));
  const selectedLeft = FOOD_MASK_LEFT + activeColumnIndex * FOOD_ITEM_STEP;
  const rowTopList = beltStates.map(
    (_, rowIndex) => FOOD_BELTS_TOP + (startIndex + rowIndex) * FOOD_ROW_HEIGHT,
  );
  const targetTop =
    rowTopList.reduce((sum, rowTop) => sum + rowTop, 0) / Math.max(rowTopList.length, 1);

  return {
    items: rowTopList.map((rowTop, rowIndex) => ({
      id: `merge-food-${rowIndex}`,
      letter: selectedLetters[rowIndex] ?? '',
      frameName: foodFrames[rowIndex] ?? foodFrames[0] ?? 'KJG_QAP_BD_v2_hamburger_bottom',
      fromLeft: selectedLeft,
      fromTop: rowTop,
      toLeft: selectedLeft,
      toTop: targetTop,
    })),
    finalCenterX: selectedLeft + FOOD_ITEM_WIDTH / 2,
    finalCenterY: targetTop + FOOD_ITEM_HEIGHT / 2,
  };
}

export function buildMergePositionMap(
  items: MergeFoodItem[],
  phase: 'from' | 'to',
): Record<string, MergeDisplayPosition> {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      phase === 'from'
        ? { left: item.fromLeft, top: item.fromTop }
        : { left: item.toLeft, top: item.toTop },
    ]),
  );
}

export function interpolateMergePositionMap(
  fromPositions: Record<string, MergeDisplayPosition>,
  toPositions: Record<string, MergeDisplayPosition>,
  progress: number,
): Record<string, MergeDisplayPosition> {
  return Object.fromEntries(
    Object.entries(fromPositions).map(([itemId, fromPosition]) => {
      const toPosition = toPositions[itemId] ?? fromPosition;
      return [
        itemId,
        {
          left: fromPosition.left + (toPosition.left - fromPosition.left) * progress,
          top: fromPosition.top + (toPosition.top - fromPosition.top) * progress,
        },
      ];
    }),
  );
}
