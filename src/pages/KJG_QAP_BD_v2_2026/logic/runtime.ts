import type { BDFoodBeltState } from '../sceneTypes';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const MALU_CHARS = ['ola', 'laki', 'lele', 'nani', 'pili'] as const;
export const MALU_ENTRY_START_X = -160;
export const MALU_EXIT_END_X = 1184;
export const FOOD_VIEW_FRAMES = [
  'KJG_QAP_BD_v2_hamburger_bottom',
  'KJG_QAP_BD_v2_pork_chops',
  'KJG_QAP_BD_v2_hamburger_top',
  'KJG_QAP_BD_v2_butter',
  'KJG_QAP_BD_v2_cucumber',
  'KJG_QAP_BD_v2_egg',
  'KJG_QAP_BD_v2_meat',
  'KJG_QAP_BD_v2_onion',
  'KJG_QAP_BD_v2_orange',
  'KJG_QAP_BD_v2_sausage',
  'KJG_QAP_BD_v2_spinach',
  'KJG_QAP_BD_v2_tomato',
  'KJG_QAP_BD_v2_spinach',
] as const;
export const FOOD_THEME_FRAMES = FOOD_VIEW_FRAMES.slice(3, 12);

export const BD_DRAGONBONES_ARMATURE = 'armatures/skeleton_movie_1';

const MALU_ANIMATION_ALIASES = {
  enter: ['enter', 'walk', 'start'],
  idle: ['wait_1', 'wait', 'idle', 'end'],
  angry: ['angry'],
  happy: ['happy_eating', 'eat_yes', 'happy'],
  sad: ['sad_eating', 'eat_no', 'sad'],
  pay: ['pay_2', 'pay'],
  turn: ['turn_round', 'turn'],
} as const;

const DAY_CURTAIN_ANIMATION_ALIASES = {
  enter: ['start', 'open', 'close'],
  hold: ['end', 'idle'],
} as const;

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total;
}

export function generateCharList(targetLetter: string): string[] {
  const normalizedTarget = targetLetter.toLowerCase();
  const fillerPool = ALPHABET.filter((char) => char !== normalizedTarget);
  const charColumns = Array.from({ length: 5 }, () => '');
  const targetColumnIndex = Math.min(4, Math.floor(Math.random() * 5));

  charColumns[targetColumnIndex] = targetLetter;

  for (let columnIndex = 0; columnIndex < charColumns.length; columnIndex += 1) {
    if (charColumns[columnIndex]) {
      continue;
    }

    const nextFillerIndex = Math.floor(Math.random() * fillerPool.length);
    const [nextLetter = 'z'] = fillerPool.splice(nextFillerIndex, 1);
    charColumns[columnIndex] = nextLetter;
  }

  return charColumns
    .flatMap((char) => [char, char, char])
    .reduce<string[]>(
      (rows, char, index) => {
        const rowIndex = index % 3;
        rows[rowIndex * 5 + Math.floor(index / 3)] = char;
        return rows;
      },
      Array.from({ length: 15 }, () => ''),
    );
}

export function getSelectedLetter(
  charList: string[],
  centerIndex: number,
  touchCount: number,
): string {
  if (charList.length === 0 || touchCount <= 0) {
    return '';
  }

  return charList[wrapIndex(centerIndex, charList.length)] ?? '';
}

export function checkAnswer(selectedLetters: string[], word: string): boolean {
  return selectedLetters.join('').toLowerCase() === word.toLowerCase();
}

export function getMaluPosX(columnIndex: number): number {
  return 137 + columnIndex * 187.5;
}

export function getMaluMoveDuration(startX: number, endX: number): number {
  return Math.abs(endX - startX) * 10;
}

export function getMaluEntryDuration(posX: number): number {
  return getMaluMoveDuration(MALU_ENTRY_START_X, posX);
}

export function getEatYesWait(charName: string): number {
  return charName === 'pili' ? 3000 : 2500;
}

export function allColumnsSelected(beltStates: BDFoodBeltState[]): boolean {
  return beltStates.length > 0 && beltStates.every((beltState) => beltState.touchCount > 0);
}

export function getRandomMaluChar(exclude?: string): string {
  const pool = MALU_CHARS.filter((charName) => charName !== exclude);
  const options = pool.length > 0 ? pool : [...MALU_CHARS];
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex] ?? options[0];
}

export function resolveAnimationName(
  animationList: string[],
  aliases: readonly string[],
  fallback = '',
): string {
  for (const candidate of aliases) {
    if (animationList.includes(candidate)) {
      return candidate;
    }
  }

  if (fallback && animationList.includes(fallback)) {
    return fallback;
  }

  return animationList[0] ?? fallback;
}

export function resolveMaluAnimation(
  animationList: string[],
  phase: keyof typeof MALU_ANIMATION_ALIASES,
): string {
  return resolveAnimationName(animationList, MALU_ANIMATION_ALIASES[phase]);
}

export function shouldLoopMaluAnimation(
  phase: keyof typeof MALU_ANIMATION_ALIASES,
  resolvedAnimationName: string,
): boolean {
  if (phase === 'enter') {
    return true;
  }

  return ['wait', 'wait_1', 'idle', 'end'].includes(resolvedAnimationName);
}

export function resolveDayCurtainAnimation(
  animationList: string[],
  phase: keyof typeof DAY_CURTAIN_ANIMATION_ALIASES,
): string {
  return resolveAnimationName(animationList, DAY_CURTAIN_ANIMATION_ALIASES[phase]);
}

export function getHintMode(module: string): 'audio' | 'image' {
  return module === 'KJG_A' ? 'audio' : 'image';
}

export function buildFoodFrames(wordLength: number, selectedThemeFrame: string | null): string[] {
  if (wordLength <= 0) {
    return [];
  }

  const frames = Array.from({ length: wordLength }, () => '');

  frames[wordLength - 1] = FOOD_VIEW_FRAMES[0];
  frames[0] = FOOD_VIEW_FRAMES[2];

  const occupiedSlots = new Set<number>([0, wordLength - 1]);

  if (wordLength > 2) {
    const condimentSlot = Math.floor(1 + Math.random() * (wordLength - 2));
    frames[condimentSlot] = FOOD_VIEW_FRAMES[1];
    occupiedSlots.add(condimentSlot);
  }

  if (wordLength > 3 && selectedThemeFrame) {
    let themeSlot = Math.floor(1 + Math.random() * (wordLength - 2));

    while (occupiedSlots.has(themeSlot)) {
      themeSlot = Math.floor(1 + Math.random() * (wordLength - 2));
    }

    frames[themeSlot] = selectedThemeFrame;
    occupiedSlots.add(themeSlot);
  }

  let fillerFrameIndex = 3;

  for (let index = 0; index < wordLength; index += 1) {
    if (frames[index]) {
      continue;
    }

    frames[index] =
      FOOD_VIEW_FRAMES[fillerFrameIndex] ?? FOOD_VIEW_FRAMES[FOOD_VIEW_FRAMES.length - 1] ?? '';
    fillerFrameIndex += 1;
  }

  return frames;
}
