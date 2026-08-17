import type { GameQuestionAnimationType } from '@/shared/core/game/GameExerciseDataProvider';

export type BDPageScene = 'lobby' | 'main';
export type BDMainModalScene = null | 'pause' | 'second-confirm' | 'result' | 'word-list';
export type BDMainSubstate =
  | 'countdown'
  | 'day-opening'
  | 'malu-entering'
  | 'answering'
  | 'submitting'
  | 'correct-feedback'
  | 'wrong-feedback'
  | 'timeout-feedback'
  | 'day-closing'
  | 'choose-food'
  | 'finished';

export interface BDWordItem {
  word: string;
  audioUrl: string;
  imageUrl: string;
  skeletonUrl: string;
  animationType: GameQuestionAnimationType;
  letters: string[];
  module: string;
}

export interface BDGameState {
  wordBanks: BDWordItem[];
  wordIndex: number;
  hearts: number;
  maxHearts: number;
  goldCount: number;
  dayIndex: number;
  dayThresholds: number[];
  waitTimes: number[];
}

export interface BDFoodBeltState {
  charList: string[];
  currentCenterIndex: number;
  touchCount: number;
}
