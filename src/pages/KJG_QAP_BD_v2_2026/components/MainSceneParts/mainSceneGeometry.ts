import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import type { BDFoodBeltState, BDWordItem } from '../../sceneTypes';
import { FOOD_THEME_FRAMES, generateCharList, getSelectedLetter } from '../../logic/runtime';
import { FOOD_ITEM_HEIGHT, FOOD_ITEM_STEP, FOOD_ITEM_WIDTH, FOOD_MASK_LEFT } from './FoodBelt';
import { FOOD_ROW_MOVE_MS, FOOD_ROW_STAGGER_MS } from './FoodBelts';
import type {
  ChildArmatureLike,
  MergeDisplayPosition,
  MergeFoodItem,
  PixiDisplayLike,
} from './mainSceneTypes';

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

function getDisplayRect(display: PixiDisplayLike | null) {
  if (!display) {
    return null;
  }

  const localBounds = display.getLocalBounds?.();

  if (localBounds && localBounds.width > 0 && localBounds.height > 0) {
    return {
      x: display.x + localBounds.x,
      y: display.y + localBounds.y,
      width: localBounds.width,
      height: localBounds.height,
    };
  }

  const bounds = display.getBounds?.();

  if (bounds && bounds.width > 0 && bounds.height > 0) {
    return bounds;
  }

  if (
    typeof display.width === 'number' &&
    display.width > 0 &&
    typeof display.height === 'number' &&
    display.height > 0
  ) {
    return {
      x: display.x,
      y: display.y,
      width: display.width,
      height: display.height,
    };
  }

  return null;
}

function mergeDisplayRects(rects: Array<{ x: number; y: number; width: number; height: number }>) {
  if (rects.length === 0) {
    return null;
  }

  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;

  for (let index = 1; index < rects.length; index += 1) {
    const rect = rects[index];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function collectArmatureDisplayRects(
  armature: ChildArmatureLike | null,
  rects: Array<{ x: number; y: number; width: number; height: number }>,
  seen = new Set<ChildArmatureLike>(),
) {
  if (!armature || seen.has(armature)) {
    return;
  }

  seen.add(armature);

  for (const slot of armature.getSlots?.() ?? []) {
    const rect = getDisplayRect(slot.display ?? null);

    if (rect) {
      rects.push(rect);
    }

    collectArmatureDisplayRects(slot.childArmature ?? null, rects, seen);
  }
}

export function fitPlayerToViewport(
  player: DragonBonesHandle | null,
  width: number,
  height: number,
  padding = 10,
) {
  const display = player?.getDisplay() as PixiDisplayLike | null;

  if (!display) {
    return;
  }

  const rects: Array<{ x: number; y: number; width: number; height: number }> = [];
  const rootRect = getDisplayRect(display);

  if (rootRect) {
    rects.push(rootRect);
  }

  collectArmatureDisplayRects(player?.getArmature() as ChildArmatureLike | null, rects);

  const bounds = mergeDisplayRects(rects);

  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return;
  }

  const safeWidth = Math.max(width - padding * 2, 1);
  const safeHeight = Math.max(height - padding * 2, 1);
  const fitScale = Math.min(safeWidth / bounds.width, safeHeight / bounds.height, 1);

  display.scale?.set?.(fitScale, fitScale);
  display.x = width / 2 - (bounds.x + bounds.width / 2) * fitScale;
  display.y = height / 2 - (bounds.y + bounds.height / 2) * fitScale;
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
