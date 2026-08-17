import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import AtlasSprite from '@/shared/components/atlas-sprite';
import { createAudioManager } from '@/shared/components/audio-manager';
import { AudioButtonView } from '@/shared/components/audio-button';
import {
  FixedStageContentFrameLayer,
  FixedStageLayer,
  FixedStageSceneFrame,
  type FixedStageContentFrame,
  type FixedStagePresetKey,
} from '@/shared/components/fixed-stage-shell';
import type { BDGameState, BDMainSubstate, BDFoodBeltState, BDWordItem } from '../sceneTypes';
import {
  allColumnsSelected,
  buildFoodFrames,
  FOOD_THEME_FRAMES,
  checkAnswer,
  getEatYesWait,
  getHintMode,
  getMaluEntryDuration,
  getMaluMoveDuration,
  getMaluPosX,
  getRandomMaluChar,
  MALU_EXIT_END_X,
} from '../logic/runtime';
import FoodBelts, { type FoodBeltMotionPhase } from './MainSceneParts/FoodBelts';
import { FOOD_ITEM_HEIGHT, FOOD_ITEM_WIDTH, FoodItemVisual } from './MainSceneParts/FoodBelt';
import LetterSlots from './MainSceneParts/LetterSlots';
import MaluLayer from './MainSceneParts/MaluLayer';
import CountdownClock from './MainSceneParts/CountdownClock';
import BellButton from './MainSceneParts/BellButton';
import { MainControlHud, MainScoreHud } from './MainSceneParts/MainHudLayer';
import { ImageHintVisual } from './MainSceneParts/HintVisual';
import FinalFoodFlash from './MainSceneParts/FinalFoodFlash';
import AnswerFeedbackOverlay from './MainSceneParts/AnswerFeedbackOverlay';
import PayMoneyEffect, {
  PAY_MONEY_DROP_HOLD_MS,
  PAY_MONEY_END_X,
  PAY_MONEY_END_Y,
  PAY_MONEY_FLY_MS,
  PAY_MONEY_START_OFFSET_X,
  PAY_MONEY_START_Y,
} from './MainSceneParts/PayMoneyEffect';
import {
  buildMergeFoodItems,
  buildMergePositionMap,
  clamp,
  createBeltStates,
  getFoodRowMotionTotalMs,
  interpolateMergePositionMap,
  pickFoodOptions,
  toSelectedLetters,
} from './MainSceneParts/mainSceneGeometry';
import type {
  AdvanceAfterQuestionOptions,
  AnswerFeedbackState,
  FinalFoodState,
  LeavingMaluState,
  MergeDisplayPosition,
  MergeFoodItem,
  MergeMotionState,
  PayMoneyState,
  ScheduledTask,
} from './MainSceneParts/mainSceneTypes';
import MainFlowOverlayLayer from './overlays/MainFlowOverlayLayer';
import atlasData from '../assets/textures/KJG_QAP_BD_v2.json';
import { BurgerDinerStageBackgroundImage } from '../stage-backgrounds';

const ATLAS_URL = new URL('../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;
const MAIN_BGM_URL = new URL('../assets/sounds/BD_main_bgm.mp3', import.meta.url).href;
const WALKING_URL = new URL('../assets/sounds/BD_walking.mp3', import.meta.url).href;
const BELL_URL = new URL('../assets/sounds/BD_bell.mp3', import.meta.url).href;
const HAPPY_URL = new URL('../assets/sounds/BD_happy_eating.mp3', import.meta.url).href;
const SAD_URL = new URL('../assets/sounds/BD_sad_eating.mp3', import.meta.url).href;
const CLOCK_TICKING_URL = new URL('../assets/sounds/BD_clock_ticking.mp3', import.meta.url).href;
const DAY_START_URL = new URL('../assets/sounds/BD_day_start.mp3', import.meta.url).href;
const DAY_END_URL = new URL('../assets/sounds/BD_day_end.mp3', import.meta.url).href;
const MONEY_DROP_URL = new URL('../assets/sounds/BD_money_drop.mp3', import.meta.url).href;
const MONEY_ADD_URL = new URL('../assets/sounds/BD_money_add.mp3', import.meta.url).href;
const FOOD_SQUISH_URL = new URL('../assets/sounds/BD_food_squish.mp3', import.meta.url).href;
const SHOW_CORRECT_URL = new URL('../../../shared/assets/audios/show_correct.mp3', import.meta.url)
  .href;
const WRONG_AUDIO_URL = new URL('../../../shared/assets/audios/wrong.mp3', import.meta.url).href;

const COUNTDOWN_STEP_MS = 700;
const DAY_SWITCH_TOTAL_MS = 2100;
const FOOD_MERGE_MS = 800;
const FINAL_FOOD_HOLD_MS = 1000;
const FINAL_FOOD_LIFT_MS = 1000;
const GOLD_REWARD = 10;
const TIMER_STEP_MS = 100;
const HINT_BUBBLE_SIZE = 128;
const HINT_CONTENT_INSET = 22;
const HINT_CONTENT_SIZE = 84;
const FINAL_FOOD_CENTER_Y = 195;
const FINAL_FOOD_FRAME = 'KJG_QAP_BD_v2_food_2';
const FINAL_FOOD_ANCHOR_X = 55.5;
const FINAL_FOOD_ANCHOR_Y = 46;
const FINAL_FOOD_OFFSET_X = 10;
const FINAL_FOOD_OFFSET_Y = -10;
const FINAL_FOOD_IDLE_SCALE = 1.18;
const HEART_BREAK_TOTAL_MS = 1500;
const EAT_NO_WAIT_MS = 3000;
const AI_ANGER_WAIT_MS = 3000;
const ANSWER_FEEDBACK_PROMPT_DELAY_MS = 500;
const ANSWER_FEEDBACK_CORRECT_TOTAL_MS = 2000;
const ANSWER_FEEDBACK_WRONG_SWAP_MS = 2200;
const ANSWER_FEEDBACK_WRONG_TOTAL_MS = 3200;

export interface BDMainCompletionSnapshot {
  result: 'success' | 'fail';
  goldCount: number;
  hearts: number;
  maxHearts: number;
  completedWords: number;
  totalWords: number;
}

export interface MainSceneProps {
  presetKey: FixedStagePresetKey;
  legacyContentFrame: FixedStageContentFrame;
  wordBanks: BDWordItem[];
  initialGameState: BDGameState;
  soundVolume: number;
  isPaused: boolean;
  onPauseRequest(): void;
  onSubstateChange(nextState: BDMainSubstate): void;
  onGameStateChange(nextState: BDGameState): void;
  onFinish(snapshot: BDMainCompletionSnapshot): void;
}

export default function MainScene({
  presetKey,
  legacyContentFrame,
  initialGameState,
  soundVolume,
  isPaused,
  onPauseRequest,
  onSubstateChange,
  onGameStateChange,
  onFinish,
}: MainSceneProps) {
  const bgmManagerRef = useRef(createAudioManager());
  const effectManagerRef = useRef(createAudioManager());
  const promptManagerRef = useRef(createAudioManager());
  const scheduledRef = useRef<ScheduledTask[]>([]);
  const scheduledTokenRef = useRef(0);
  const mergeFrameRef = useRef<number | null>(null);
  const previousMaluRef = useRef('');
  const timeoutHandledRef = useRef(false);
  const warningPlayedRef = useRef(false);
  const currentWordRef = useRef<BDWordItem | null>(null);
  const gameStateRef = useRef(initialGameState);
  const isPausedRef = useRef(isPaused);
  const mergeMotionRef = useRef<MergeMotionState>({
    fromPositions: {},
    toPositions: {},
    remainingMs: 0,
    startedAt: 0,
    active: false,
    pendingStart: false,
  });
  const [gameState, setGameState] = useState(initialGameState);
  const [displayDayIndex, setDisplayDayIndex] = useState(initialGameState.dayIndex);
  const [mainSubstate, setMainSubstate] = useState<BDMainSubstate>('countdown');
  const [currentWord, setCurrentWord] = useState<BDWordItem | null>(null);
  const [beltStates, setBeltStates] = useState<BDFoodBeltState[]>([]);
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [countdownValue, setCountdownValue] = useState(3);
  const [chooseFoodOptions, setChooseFoodOptions] = useState<[string, string]>([
    FOOD_THEME_FRAMES[0],
    FOOD_THEME_FRAMES[1],
  ]);
  const [selectedFoodFrame, setSelectedFoodFrame] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(initialGameState.waitTimes[0] * 1000);
  const [warningActive, setWarningActive] = useState(false);
  const [currentMaluName, setCurrentMaluName] = useState('ola');
  const [currentMaluAnimation, setCurrentMaluAnimation] = useState('idle');
  const [showCurrentMalu, setShowCurrentMalu] = useState(true);
  const [entryToken, setEntryToken] = useState(0);
  const [leavingMalus, setLeavingMalus] = useState<LeavingMaluState[]>([]);
  const [foodBeltsMotionPhase, setFoodBeltsMotionPhase] = useState<FoodBeltMotionPhase>('idle');
  const [mergedFoodHidden, setMergedFoodHidden] = useState(false);
  const [isPromptAudioPlaying, setPromptAudioPlaying] = useState(false);
  const [promptPlayCount, setPromptPlayCount] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedbackState | null>(null);
  const [heartBreakActive, setHeartBreakActive] = useState(false);
  const [payMoneyState, setPayMoneyState] = useState<PayMoneyState | null>(null);
  const [mergeFoodItems, setMergeFoodItems] = useState<MergeFoodItem[]>([]);
  const [mergeTransitionMs, setMergeTransitionMs] = useState(0);
  const [mergeDisplayPositions, setMergeDisplayPositions] = useState<
    Record<string, MergeDisplayPosition>
  >({});
  const [finalFoodState, setFinalFoodState] = useState<FinalFoodState | null>(null);
  const answerFeedbackTokenRef = useRef(0);
  const payMoneyTokenRef = useRef(0);
  const leavingMaluTokenRef = useRef(0);

  const stageStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1024,
    height: 768,
    overflow: 'hidden',
  };

  const selectedLetters = useMemo(() => toSelectedLetters(beltStates), [beltStates]);
  const bellEnabled = useMemo(() => allColumnsSelected(beltStates), [beltStates]);
  const foodFrames = useMemo(
    () => buildFoodFrames(beltStates.length, selectedFoodFrame),
    [beltStates.length, selectedFoodFrame, gameState.wordIndex],
  );
  const totalWaitMs =
    (gameState.waitTimes[gameState.dayIndex] ?? gameState.waitTimes[0] ?? 90) * 1000;

  const startMergeMotion = useCallback(() => {
    if (!mergeMotionRef.current.pendingStart || mergeMotionRef.current.remainingMs <= 0) {
      return;
    }

    mergeMotionRef.current.pendingStart = false;
    mergeMotionRef.current.active = true;
    mergeMotionRef.current.startedAt = Date.now();
    setMergeTransitionMs(mergeMotionRef.current.remainingMs);
    setMergeDisplayPositions(mergeMotionRef.current.toPositions);
  }, []);

  const startScheduledTask = useCallback((task: ScheduledTask) => {
    task.startedAt = Date.now();
    task.timerId = window.setTimeout(
      () => {
        scheduledRef.current = scheduledRef.current.filter(
          (currentTask) => currentTask.token !== task.token,
        );
        task.timerId = null;
        task.callback();
      },
      Math.max(0, task.remainingMs),
    );
  }, []);

  const clearScheduled = useCallback(() => {
    scheduledRef.current.forEach((task) => {
      if (task.timerId !== null) {
        window.clearTimeout(task.timerId);
      }
    });
    scheduledRef.current = [];
    if (mergeFrameRef.current !== null) {
      window.cancelAnimationFrame(mergeFrameRef.current);
      mergeFrameRef.current = null;
    }
    mergeMotionRef.current = {
      fromPositions: {},
      toPositions: {},
      remainingMs: 0,
      startedAt: 0,
      active: false,
      pendingStart: false,
    };
  }, []);

  const schedule = useCallback(
    (callback: () => void, delay: number) => {
      const nextTask: ScheduledTask = {
        token: scheduledTokenRef.current + 1,
        callback,
        remainingMs: delay,
        startedAt: 0,
        timerId: null,
      };

      scheduledTokenRef.current = nextTask.token;
      scheduledRef.current.push(nextTask);

      if (!isPausedRef.current) {
        startScheduledTask(nextTask);
      }
    },
    [startScheduledTask],
  );

  const syncGameState = useCallback((nextState: BDGameState) => {
    gameStateRef.current = nextState;
    setGameState(nextState);
  }, []);

  const queueLeavingMalu = useCallback(
    (charName: string, startX: number) => {
      const nextToken = leavingMaluTokenRef.current + 1;
      const endX = MALU_EXIT_END_X;
      const duration = getMaluMoveDuration(startX, endX);
      leavingMaluTokenRef.current = nextToken;
      setLeavingMalus((previous) => [...previous, { token: nextToken, charName, startX, endX }]);
      schedule(() => {
        setLeavingMalus((previous) => previous.filter((item) => item.token !== nextToken));
      }, duration);
    },
    [schedule],
  );

  const playPromptAudio = useCallback(() => {
    const currentWord = currentWordRef.current;

    if (!currentWord) {
      return;
    }

    if (!currentWord.audioUrl) {
      return;
    }

    setPromptPlayCount((count) => count + 1);
    promptManagerRef.current.play({
      src: currentWord.audioUrl,
      html5: true,
      interrupt: true,
      volume: 1,
    });
  }, []);

  useEffect(() => {
    return promptManagerRef.current.subscribe((snapshot) => {
      setPromptAudioPlaying(snapshot.playing);
    });
  }, []);

  const startCurrentMaluLeaving = useCallback(() => {
    setShowCurrentMalu(false);
    queueLeavingMalu(currentMaluName, getMaluPosX(activeColumnIndex));
  }, [activeColumnIndex, currentMaluName, queueLeavingMalu]);

  const prepareQuestion = useCallback(
    (nextState: BDGameState) => {
      const nextWord = nextState.wordBanks[nextState.wordIndex] ?? null;

      currentWordRef.current = nextWord;
      setCurrentWord(nextWord);
      setAnswerFeedback(null);
      setHeartBreakActive(false);
      setPayMoneyState(null);
      setMergeFoodItems([]);
      setMergeTransitionMs(0);
      setMergeDisplayPositions({});
      setMergedFoodHidden(false);
      setFinalFoodState(null);
      setWarningActive(false);
      warningPlayedRef.current = false;
      timeoutHandledRef.current = false;
      promptManagerRef.current.stop();
      effectManagerRef.current.stop();

      if (!nextWord) {
        return;
      }

      const nextBeltStates = createBeltStates(nextWord);
      const nextColumnIndex = Math.min(3, Math.max(0, Math.floor(Math.random() * 4)));
      const nextMaluName = getRandomMaluChar(previousMaluRef.current);
      const entryDuration = getMaluEntryDuration(getMaluPosX(nextColumnIndex));
      previousMaluRef.current = nextMaluName;

      setBeltStates(nextBeltStates);
      setFoodBeltsMotionPhase('entering');
      setActiveColumnIndex(nextColumnIndex);
      setCurrentMaluName(nextMaluName);
      setCurrentMaluAnimation('enter');
      setShowCurrentMalu(true);
      setRemainingMs(
        (nextState.waitTimes[nextState.dayIndex] ?? nextState.waitTimes[0] ?? 90) * 1000,
      );
      setMainSubstate('malu-entering');
      setEntryToken((token) => token + 1);

      effectManagerRef.current.play({
        src: WALKING_URL,
        html5: true,
        loop: true,
        volume: 1,
      });

      schedule(() => {
        effectManagerRef.current.stop();
        setCurrentMaluAnimation('idle');
        setMainSubstate('answering');
        playPromptAudio();
      }, entryDuration);
    },
    [playPromptAudio, schedule],
  );

  const startDayOpening = useCallback(() => {
    setMainSubstate('day-opening');

    effectManagerRef.current.play({ src: DAY_START_URL, html5: true, interrupt: true });

    const currentSound = bgmManagerRef.current.getCurrentSound();
    const currentSrc = bgmManagerRef.current.getState().src[0];
    if (!currentSound || currentSrc !== MAIN_BGM_URL) {
      bgmManagerRef.current.play({
        src: MAIN_BGM_URL,
        html5: true,
        loop: true,
        volume: soundVolume,
      });
    } else {
      bgmManagerRef.current.setVolume(soundVolume);
      bgmManagerRef.current.setLoop(true);
      bgmManagerRef.current.resume();
    }

    schedule(() => {
      prepareQuestion(gameStateRef.current);
    }, DAY_SWITCH_TOTAL_MS);
  }, [prepareQuestion, schedule, soundVolume]);

  const startCountdown = useCallback(() => {
    clearScheduled();
    syncGameState(initialGameState);
    setDisplayDayIndex(initialGameState.dayIndex);
    setCurrentWord(null);
    currentWordRef.current = null;
    setBeltStates([]);
    setFoodBeltsMotionPhase('idle');
    setCountdownValue(3);
    setSelectedFoodFrame(null);
    setAnswerFeedback(null);
    setHeartBreakActive(false);
    setPayMoneyState(null);
    setLeavingMalus([]);
    setMergeFoodItems([]);
    setMergeTransitionMs(0);
    setMergeDisplayPositions({});
    setMergedFoodHidden(false);
    setFinalFoodState(null);
    setWarningActive(false);
    setCurrentMaluAnimation('idle');
    setShowCurrentMalu(true);
    bgmManagerRef.current.stop();
    effectManagerRef.current.stop();
    promptManagerRef.current.stop();
    setMainSubstate('countdown');

    schedule(() => setCountdownValue(2), COUNTDOWN_STEP_MS);
    schedule(() => setCountdownValue(1), COUNTDOWN_STEP_MS * 2);
  }, [clearScheduled, initialGameState, schedule, syncGameState]);

  const handleCountdownComplete = useCallback(() => {
    if (mainSubstate !== 'countdown') {
      return;
    }

    startDayOpening();
  }, [mainSubstate, startDayOpening]);

  const finishRun = useCallback(
    (result: 'success' | 'fail', nextState: BDGameState) => {
      setMainSubstate('finished');
      bgmManagerRef.current.stop();
      effectManagerRef.current.stop();
      promptManagerRef.current.stop();
      onFinish({
        result,
        goldCount: nextState.goldCount,
        hearts: nextState.hearts,
        maxHearts: nextState.maxHearts,
        completedWords: nextState.wordIndex,
        totalWords: nextState.wordBanks.length,
      });
    },
    [onFinish],
  );

  const advanceAfterQuestion = useCallback(
    (nextState: BDGameState, options?: AdvanceAfterQuestionOptions) => {
      syncGameState(nextState);
      setFoodBeltsMotionPhase('exiting');

      const finishQuestionTransition = () => {
        if (nextState.hearts <= 0) {
          setShowCurrentMalu(false);
          setLeavingMalus([]);
          finishRun('fail', nextState);
          return;
        }

        if (nextState.wordIndex >= nextState.wordBanks.length) {
          setShowCurrentMalu(false);
          setLeavingMalus([]);
          finishRun('success', nextState);
          return;
        }

        if (nextState.dayThresholds.includes(nextState.wordIndex)) {
          setShowCurrentMalu(false);
          setLeavingMalus([]);
          const nextDayState: BDGameState = {
            ...nextState,
            dayIndex: Math.min(nextState.dayIndex + 1, nextState.waitTimes.length - 1),
          };
          syncGameState(nextDayState);
          setMainSubstate('day-closing');
          setCurrentMaluAnimation('idle');
          effectManagerRef.current.play({ src: DAY_END_URL, html5: true, interrupt: true });
          schedule(() => {
            setChooseFoodOptions(pickFoodOptions());
            setMainSubstate('choose-food');
          }, DAY_SWITCH_TOTAL_MS);
          return;
        }

        prepareQuestion(nextState);
      };

      if (
        !options?.skipQueueLeaving &&
        nextState.hearts > 0 &&
        nextState.wordIndex < nextState.wordBanks.length &&
        !nextState.dayThresholds.includes(nextState.wordIndex)
      ) {
        startCurrentMaluLeaving();
      }

      const questionExitDuration = getFoodRowMotionTotalMs(beltStates.length);

      if (questionExitDuration <= 0) {
        finishQuestionTransition();
        return;
      }

      schedule(finishQuestionTransition, questionExitDuration);
    },
    [
      beltStates.length,
      finishRun,
      prepareQuestion,
      schedule,
      startCurrentMaluLeaving,
      syncGameState,
    ],
  );

  const triggerHeartBreak = useCallback(
    (nextState: BDGameState) => {
      syncGameState(nextState);
      startCurrentMaluLeaving();
      setHeartBreakActive(true);
      schedule(() => {
        setHeartBreakActive(false);
        advanceAfterQuestion(nextState, { skipQueueLeaving: true });
      }, HEART_BREAK_TOTAL_MS);
    },
    [advanceAfterQuestion, schedule, startCurrentMaluLeaving, syncGameState],
  );

  const startAnswerFeedback = useCallback(
    (kind: 'correct' | 'wrong', shownLetters: string[], targetWord: string) => {
      const token = answerFeedbackTokenRef.current + 1;
      answerFeedbackTokenRef.current = token;
      const targetLetters = targetWord.split('');

      setAnswerFeedback({
        token,
        kind,
        shownLetters,
        targetLetters,
        revealCorrectAnswer: false,
      });
      effectManagerRef.current.play({
        src: kind === 'correct' ? SHOW_CORRECT_URL : WRONG_AUDIO_URL,
        html5: true,
        interrupt: true,
      });
      schedule(() => {
        playPromptAudio();
      }, ANSWER_FEEDBACK_PROMPT_DELAY_MS);

      if (kind === 'wrong') {
        schedule(() => {
          setAnswerFeedback((previous) =>
            previous?.token === token ? { ...previous, revealCorrectAnswer: true } : previous,
          );
        }, ANSWER_FEEDBACK_WRONG_SWAP_MS);
      }

      schedule(
        () => {
          setAnswerFeedback((previous) => (previous?.token === token ? null : previous));
        },
        kind === 'correct' ? ANSWER_FEEDBACK_CORRECT_TOTAL_MS : ANSWER_FEEDBACK_WRONG_TOTAL_MS,
      );
    },
    [playPromptAudio, schedule],
  );

  const handleTimeout = useCallback(() => {
    if (timeoutHandledRef.current) {
      return;
    }

    timeoutHandledRef.current = true;
    promptManagerRef.current.stop();
    effectManagerRef.current.stop();
    setCurrentMaluAnimation('angry');
    setMainSubstate('timeout-feedback');
    const currentState = gameStateRef.current;
    const nextState: BDGameState = {
      ...currentState,
      hearts: Math.max(0, currentState.hearts - 1),
      wordIndex: currentState.wordIndex + 1,
    };
    schedule(() => triggerHeartBreak(nextState), AI_ANGER_WAIT_MS);
  }, [schedule, triggerHeartBreak]);

  const handleCorrect = useCallback(
    (submittedLetters: string[]) => {
      const currentState = gameStateRef.current;
      const nextState: BDGameState = {
        ...currentState,
        goldCount: currentState.goldCount + GOLD_REWARD,
        wordIndex: currentState.wordIndex + 1,
      };
      const answerWord = currentWordRef.current?.word ?? '';
      const eatYesWait = getEatYesWait(currentMaluName);
      const payMoneyStartX = getMaluPosX(activeColumnIndex) + PAY_MONEY_START_OFFSET_X;

      setCurrentMaluAnimation('happy');
      effectManagerRef.current.play({ src: HAPPY_URL, html5: true, interrupt: true });

      schedule(() => {
        startAnswerFeedback('correct', submittedLetters, answerWord);
      }, eatYesWait);
      schedule(() => {
        setCurrentMaluAnimation('pay');
        const nextToken = payMoneyTokenRef.current + 1;
        payMoneyTokenRef.current = nextToken;
        setPayMoneyState({
          token: nextToken,
          startX: payMoneyStartX,
          startY: PAY_MONEY_START_Y,
          endX: PAY_MONEY_END_X,
          endY: PAY_MONEY_END_Y,
          phase: 'desk',
        });
        effectManagerRef.current.play({ src: MONEY_DROP_URL, html5: true, interrupt: true });
      }, eatYesWait + ANSWER_FEEDBACK_CORRECT_TOTAL_MS);
      schedule(
        () => {
          setPayMoneyState((previous) =>
            previous?.token === payMoneyTokenRef.current
              ? { ...previous, phase: 'to-top' }
              : previous,
          );
        },
        eatYesWait + ANSWER_FEEDBACK_CORRECT_TOTAL_MS + PAY_MONEY_DROP_HOLD_MS,
      );
      schedule(
        () => {
          setPayMoneyState(null);
          setShowCurrentMalu(false);
          effectManagerRef.current.play({ src: MONEY_ADD_URL, html5: true, interrupt: true });
          advanceAfterQuestion(nextState);
        },
        eatYesWait + ANSWER_FEEDBACK_CORRECT_TOTAL_MS + PAY_MONEY_DROP_HOLD_MS + PAY_MONEY_FLY_MS,
      );
    },
    [activeColumnIndex, advanceAfterQuestion, currentMaluName, schedule, startAnswerFeedback],
  );

  const handleWrong = useCallback(
    (submittedLetters: string[]) => {
      const currentState = gameStateRef.current;
      const nextState: BDGameState = {
        ...currentState,
        hearts: Math.max(0, currentState.hearts - 1),
        wordIndex: currentState.wordIndex + 1,
      };
      const answerWord = currentWordRef.current?.word ?? '';

      setCurrentMaluAnimation('sad');
      effectManagerRef.current.play({ src: SAD_URL, html5: true, interrupt: true });

      schedule(() => {
        startAnswerFeedback('wrong', submittedLetters, answerWord);
      }, EAT_NO_WAIT_MS);
      schedule(() => {
        setCurrentMaluAnimation('angry');
      }, EAT_NO_WAIT_MS + ANSWER_FEEDBACK_WRONG_TOTAL_MS);
      schedule(
        () => {
          triggerHeartBreak(nextState);
        },
        EAT_NO_WAIT_MS + ANSWER_FEEDBACK_WRONG_TOTAL_MS + AI_ANGER_WAIT_MS,
      );
    },
    [schedule, startAnswerFeedback, triggerHeartBreak],
  );

  const handleBell = useCallback(() => {
    if (!currentWordRef.current || !bellEnabled || mainSubstate !== 'answering') {
      return;
    }

    promptManagerRef.current.stop();
    effectManagerRef.current.play({ src: BELL_URL, html5: true, interrupt: true });
    setMainSubstate('submitting');
    setMergedFoodHidden(true);

    const submittedLetters = [...selectedLetters];
    const isCorrect = checkAnswer(submittedLetters, currentWordRef.current.word);
    const mergeSnapshot = buildMergeFoodItems(
      beltStates,
      activeColumnIndex,
      foodFrames,
      submittedLetters,
    );
    const initialMergePositions = buildMergePositionMap(mergeSnapshot.items, 'from');

    setFinalFoodState(null);
    setMergeFoodItems(mergeSnapshot.items);
    setMergeTransitionMs(0);
    setMergeDisplayPositions(initialMergePositions);
    mergeMotionRef.current = {
      fromPositions: initialMergePositions,
      toPositions: buildMergePositionMap(mergeSnapshot.items, 'to'),
      remainingMs: FOOD_MERGE_MS,
      startedAt: 0,
      active: false,
      pendingStart: true,
    };
    mergeFrameRef.current = window.requestAnimationFrame(() => {
      mergeFrameRef.current = null;
      if (!isPausedRef.current) {
        startMergeMotion();
      }
    });

    schedule(() => {
      setMergeFoodItems([]);
      setMergeTransitionMs(0);
      setMergeDisplayPositions({});
      mergeMotionRef.current = {
        fromPositions: {},
        toPositions: {},
        remainingMs: 0,
        startedAt: 0,
        active: false,
        pendingStart: false,
      };
      setFinalFoodState({
        centerX: mergeSnapshot.finalCenterX,
        centerY: mergeSnapshot.finalCenterY,
        lifting: false,
      });
      effectManagerRef.current.play({ src: FOOD_SQUISH_URL, html5: true, interrupt: true });
    }, FOOD_MERGE_MS);

    schedule(() => {
      setFinalFoodState((previous) => (previous ? { ...previous, lifting: true } : previous));
    }, FOOD_MERGE_MS + FINAL_FOOD_HOLD_MS);

    schedule(
      () => {
        setFinalFoodState(null);
        if (isCorrect) {
          setMainSubstate('correct-feedback');
          handleCorrect(submittedLetters);
          return;
        }

        setMainSubstate('wrong-feedback');
        handleWrong(submittedLetters);
      },
      FOOD_MERGE_MS + FINAL_FOOD_HOLD_MS + FINAL_FOOD_LIFT_MS,
    );
  }, [
    activeColumnIndex,
    bellEnabled,
    beltStates,
    foodFrames,
    handleCorrect,
    handleWrong,
    mainSubstate,
    schedule,
    selectedLetters,
    startMergeMotion,
  ]);

  const handleChooseFood = useCallback(
    (frameName: string) => {
      setSelectedFoodFrame(frameName);
      setDisplayDayIndex(gameStateRef.current.dayIndex);
      startDayOpening();
    },
    [startDayOpening],
  );

  const updateRowCenter = useCallback((rowIndex: number, nextCenterIndex: number) => {
    setBeltStates((previous) =>
      previous.map((beltState, index) => {
        if (index !== rowIndex) {
          return beltState;
        }

        return {
          ...beltState,
          currentCenterIndex: nextCenterIndex,
          touchCount: beltState.touchCount + 1,
        };
      }),
    );
  }, []);

  useEffect(() => {
    gameStateRef.current = gameState;
    onGameStateChange(gameState);
  }, [gameState, onGameStateChange]);

  useEffect(() => {
    onSubstateChange(mainSubstate);
  }, [mainSubstate, onSubstateChange]);

  useEffect(() => {
    currentWordRef.current = currentWord;
  }, [currentWord]);

  useEffect(() => {
    bgmManagerRef.current.setVolume(soundVolume);
  }, [soundVolume]);

  useEffect(() => {
    isPausedRef.current = isPaused;

    if (isPaused) {
      scheduledRef.current.forEach((task) => {
        if (task.timerId === null) {
          return;
        }

        window.clearTimeout(task.timerId);
        task.remainingMs = Math.max(0, task.remainingMs - (Date.now() - task.startedAt));
        task.timerId = null;
        task.startedAt = 0;
      });

      if (mergeFrameRef.current !== null) {
        window.cancelAnimationFrame(mergeFrameRef.current);
        mergeFrameRef.current = null;
      }

      if (mergeMotionRef.current.active) {
        const elapsedMs = Date.now() - mergeMotionRef.current.startedAt;
        const remainingMs = Math.max(0, mergeMotionRef.current.remainingMs - elapsedMs);
        const progress =
          mergeMotionRef.current.remainingMs > 0
            ? clamp(elapsedMs / mergeMotionRef.current.remainingMs, 0, 1)
            : 1;
        const frozenPositions = interpolateMergePositionMap(
          mergeMotionRef.current.fromPositions,
          mergeMotionRef.current.toPositions,
          progress,
        );

        mergeMotionRef.current = {
          fromPositions: frozenPositions,
          toPositions: mergeMotionRef.current.toPositions,
          remainingMs,
          startedAt: 0,
          active: false,
          pendingStart: remainingMs > 0,
        };
        setMergeTransitionMs(0);
        setMergeDisplayPositions(frozenPositions);
      }

      bgmManagerRef.current.pause();
      effectManagerRef.current.pause();
      promptManagerRef.current.pause();
      return;
    }

    scheduledRef.current.forEach((task) => {
      if (task.timerId === null) {
        startScheduledTask(task);
      }
    });

    if (mergeMotionRef.current.pendingStart && mergeFrameRef.current === null) {
      mergeFrameRef.current = window.requestAnimationFrame(() => {
        mergeFrameRef.current = null;
        startMergeMotion();
      });
    }

    bgmManagerRef.current.resume();
    effectManagerRef.current.resume();
    promptManagerRef.current.resume();
  }, [isPaused, mainSubstate, startMergeMotion, startScheduledTask]);

  useEffect(() => {
    startCountdown();

    return () => {
      clearScheduled();
      bgmManagerRef.current.destroy();
      effectManagerRef.current.destroy();
      promptManagerRef.current.destroy();
    };
  }, [clearScheduled, startCountdown]);

  useEffect(() => {
    if (mainSubstate !== 'answering' || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingMs((previous) => {
        const next = Math.max(0, previous - TIMER_STEP_MS);

        if (next > 0 && next <= 3000 && !warningPlayedRef.current) {
          warningPlayedRef.current = true;
          setWarningActive(true);
          effectManagerRef.current.play({ src: CLOCK_TICKING_URL, html5: true, interrupt: true });
        }

        if (next === 0) {
          window.setTimeout(() => {
            handleTimeout();
          }, 0);
        }

        return next;
      });
    }, TIMER_STEP_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [handleTimeout, isPaused, mainSubstate]);

  const focusX = getMaluPosX(activeColumnIndex);
  const hintLeft = clamp(focusX + 70, 24, 1024 - HINT_BUBBLE_SIZE - 24);

  return (
    <FixedStageSceneFrame presetKey={presetKey}>
      <FixedStageLayer data-stage-background-host="true" zIndex={0}>
        <BurgerDinerStageBackgroundImage presetKey={presetKey} backgroundKey="mainBottom" />
      </FixedStageLayer>
      <FixedStageContentFrameLayer
        presetKey={presetKey}
        contentFrame={legacyContentFrame}
        zIndex={1}
      >
        <div
          data-scene="main"
          data-page-scene-host="main"
          data-main-substate={mainSubstate}
          data-prompt-play-count={promptPlayCount}
          data-warning-active={warningActive ? 'true' : 'false'}
          style={stageStyle}
        >
          <MainScoreHud displayDayIndex={displayDayIndex} goldCount={gameState.goldCount} />

          <MaluLayer
            hasCurrentWord={Boolean(currentWord)}
            leavingMalus={leavingMalus}
            showCurrentMalu={showCurrentMalu}
            currentMaluName={currentMaluName}
            currentMaluAnimation={
              currentMaluAnimation as 'enter' | 'idle' | 'angry' | 'happy' | 'sad' | 'pay' | 'turn'
            }
            focusX={focusX}
            entryToken={entryToken}
            paused={isPaused}
          />
        </div>
      </FixedStageContentFrameLayer>

      <FixedStageLayer data-stage-midground-host="true" zIndex={2}>
        <BurgerDinerStageBackgroundImage presetKey={presetKey} backgroundKey="mainTop" />
      </FixedStageLayer>

      <FixedStageContentFrameLayer
        presetKey={presetKey}
        contentFrame={legacyContentFrame}
        zIndex={3}
      >
        <div style={stageStyle}>
          <MainControlHud
            hearts={gameState.hearts}
            maxHearts={gameState.maxHearts}
            isWrongFeedback={heartBreakActive}
            soundVolume={soundVolume}
            isPaused={isPaused}
            mainSubstate={mainSubstate}
            onPauseRequest={onPauseRequest}
          />

          {currentWord ? (
            <>
              {getHintMode(currentWord.module) === 'image' ? (
                <button
                  type="button"
                  data-role="hint-bubble"
                  onClick={playPromptAudio}
                  disabled={mainSubstate !== 'answering' || isPaused}
                  style={{
                    position: 'absolute',
                    left: hintLeft,
                    top: 85,
                    width: 128,
                    height: 128,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    zIndex: 5,
                    visibility: mainSubstate === 'answering' ? 'visible' : 'hidden',
                    pointerEvents: mainSubstate === 'answering' && !isPaused ? 'auto' : 'none',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {mainSubstate === 'answering' ? (
                    <CountdownClock
                      totalMs={totalWaitMs}
                      remainingMs={remainingMs}
                      warning={warningActive}
                      left={0}
                      top={0}
                      size={HINT_BUBBLE_SIZE}
                      showDigits={false}
                    />
                  ) : null}
                  <div
                    style={{
                      position: 'absolute',
                      left: HINT_CONTENT_INSET,
                      top: HINT_CONTENT_INSET,
                      width: HINT_CONTENT_SIZE,
                      height: HINT_CONTENT_SIZE,
                    }}
                  >
                    <ImageHintVisual
                      imageUrl={currentWord.imageUrl}
                      skeletonUrl={currentWord.skeletonUrl}
                      animationType={currentWord.animationType}
                      size={HINT_CONTENT_SIZE}
                    />
                  </div>
                </button>
              ) : (
                <>
                  {mainSubstate === 'answering' ? (
                    <CountdownClock
                      totalMs={totalWaitMs}
                      remainingMs={remainingMs}
                      warning={warningActive}
                      left={hintLeft}
                      top={85}
                      size={HINT_BUBBLE_SIZE}
                      showDigits={false}
                    />
                  ) : null}
                  <AudioButtonView
                    data-role="hint-bubble"
                    aria-label="播放题目音频"
                    isPlaying={isPromptAudioPlaying}
                    onClick={playPromptAudio}
                    disabled={mainSubstate !== 'answering' || isPaused}
                    style={{
                      position: 'absolute',
                      left: hintLeft,
                      top: 85,
                      width: 128,
                      height: 128,
                      boxSizing: 'border-box',
                      padding: HINT_CONTENT_INSET,
                      zIndex: 5,
                      visibility: mainSubstate === 'answering' ? 'visible' : 'hidden',
                      pointerEvents: mainSubstate === 'answering' && !isPaused ? 'auto' : 'none',
                    }}
                  />
                </>
              )}
              <FoodBelts
                beltStates={beltStates}
                activeColumnIndex={activeColumnIndex}
                frozen={isPaused || mainSubstate !== 'answering'}
                paused={isPaused}
                showColumnHighlight={mainSubstate === 'answering'}
                hideSelectedItems={mergedFoodHidden}
                foodFrames={foodFrames}
                motionPhase={foodBeltsMotionPhase}
                onSlotClick={(rowIndex, itemIndex) => updateRowCenter(rowIndex, itemIndex)}
                onLeftArrow={(rowIndex) => {
                  const currentIndex = beltStates[rowIndex]?.currentCenterIndex ?? 0;
                  updateRowCenter(rowIndex, currentIndex + 1);
                }}
                onRightArrow={(rowIndex) => {
                  const currentIndex = beltStates[rowIndex]?.currentCenterIndex ?? 0;
                  updateRowCenter(rowIndex, currentIndex - 1);
                }}
              />
              <LetterSlots
                letters={answerFeedback ? selectedLetters.map(() => '') : selectedLetters}
              />
            </>
          ) : null}

          {currentWord ? (
            <div
              data-role="bell-layer"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 1024,
                height: 768,
                pointerEvents: 'none',
                zIndex: 12,
                transform: 'translateZ(0)',
                willChange: 'transform',
              }}
            >
              <BellButton
                enabled={bellEnabled}
                frozen={isPaused || mainSubstate !== 'answering'}
                onClick={handleBell}
              />
            </div>
          ) : null}

          {mergeFoodItems.length > 0 ? (
            <div
              data-role="food-merge-overlay"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 1024,
                height: 768,
                pointerEvents: 'none',
                zIndex: 12,
              }}
            >
              {mergeFoodItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: mergeDisplayPositions[item.id]?.left ?? item.fromLeft,
                    top: mergeDisplayPositions[item.id]?.top ?? item.fromTop,
                    width: FOOD_ITEM_WIDTH,
                    height: FOOD_ITEM_HEIGHT,
                    transition:
                      mergeTransitionMs > 0
                        ? `left ${mergeTransitionMs}ms linear, top ${mergeTransitionMs}ms linear`
                        : 'none',
                  }}
                >
                  <FoodItemVisual char={item.letter} foodFrameName={item.frameName} />
                </div>
              ))}
            </div>
          ) : null}

          {finalFoodState ? (
            <div
              data-role="final-food"
              style={{
                position: 'absolute',
                left: finalFoodState.centerX + FINAL_FOOD_OFFSET_X,
                top:
                  (finalFoodState.lifting ? FINAL_FOOD_CENTER_Y : finalFoodState.centerY) +
                  FINAL_FOOD_OFFSET_Y,
                width: 0,
                height: 0,
                pointerEvents: 'none',
                zIndex: 13,
                overflow: 'visible',
                transform: `scale(${finalFoodState.lifting ? 0.1 : FINAL_FOOD_IDLE_SCALE})`,
                transformOrigin: '0 0',
                transition: `top ${FINAL_FOOD_LIFT_MS}ms linear, transform ${FINAL_FOOD_LIFT_MS}ms linear`,
              }}
            >
              <FinalFoodFlash />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 111,
                  height: 92,
                  transform: `translate(${-FINAL_FOOD_ANCHOR_X}px, ${-FINAL_FOOD_ANCHOR_Y}px)`,
                }}
              >
                <AtlasSprite
                  atlasUrl={ATLAS_URL}
                  atlasData={atlasData}
                  frameName={FINAL_FOOD_FRAME}
                />
              </div>
            </div>
          ) : null}

          {answerFeedback ? <AnswerFeedbackOverlay state={answerFeedback} /> : null}

          {payMoneyState ? <PayMoneyEffect state={payMoneyState} /> : null}
        </div>
      </FixedStageContentFrameLayer>

      <MainFlowOverlayLayer
        presetKey={presetKey}
        legacyContentFrame={legacyContentFrame}
        mainSubstate={mainSubstate}
        countdownValue={countdownValue}
        chooseFoodOptions={chooseFoodOptions}
        onCountdownComplete={handleCountdownComplete}
        onChooseFood={handleChooseFood}
      />
    </FixedStageSceneFrame>
  );
}
