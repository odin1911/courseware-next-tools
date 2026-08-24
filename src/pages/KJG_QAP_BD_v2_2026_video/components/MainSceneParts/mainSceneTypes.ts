export type MergeFoodItem = {
  id: string;
  letter: string;
  frameName: string;
  fromLeft: number;
  fromTop: number;
  toLeft: number;
  toTop: number;
};

export type FinalFoodState = {
  centerX: number;
  centerY: number;
  lifting: boolean;
};

export type AnswerFeedbackState = {
  token: number;
  kind: 'correct' | 'wrong';
  shownLetters: string[];
  targetLetters: string[];
  revealCorrectAnswer: boolean;
};

export type PayMoneyState = {
  token: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  phase: 'desk' | 'to-top';
};

export type LeavingMaluState = {
  token: number;
  charName: string;
  startX: number;
  endX: number;
};

export type ScheduledTask = {
  token: number;
  callback: () => void;
  remainingMs: number;
  startedAt: number;
  timerId: number | null;
};

export type MergeDisplayPosition = {
  left: number;
  top: number;
};

export type AdvanceAfterQuestionOptions = {
  skipQueueLeaving?: boolean;
};

export type MergeMotionState = {
  fromPositions: Record<string, MergeDisplayPosition>;
  toPositions: Record<string, MergeDisplayPosition>;
  remainingMs: number;
  startedAt: number;
  active: boolean;
  pendingStart: boolean;
};
