import { useEffect, useState } from 'react';
import AtlasSprite from '@/shared/components/atlas-sprite';
import atlasData from '../../assets/textures/KJG_QAP_BD_v2.json';
import type { AnswerFeedbackState } from './mainSceneTypes';
import {
  getLetterSlotLeft,
  SLOT_SIZE as LETTER_SLOT_SIZE,
  SLOT_TOP as LETTER_SLOT_TOP,
} from './LetterSlots';

const ATLAS_URL = new URL('../../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;
const FEEDBACK_BG_WIDTH = 710;
const FEEDBACK_BG_HEIGHT = 258;
const FEEDBACK_BG_LEFT = (1024 - FEEDBACK_BG_WIDTH) / 2;
const FEEDBACK_BG_TOP = 300;
const FEEDBACK_TEXT_TOP = 95;
const FEEDBACK_CHAR_WIDTH = 51;
const FEEDBACK_CHAR_HEIGHT = 51;
const FEEDBACK_CHAR_OVERLAP = 10;
const ANSWER_FEEDBACK_MOVE_MS = 1000;
const ANSWER_FEEDBACK_BG_DELAY_MS = 500;
const ANSWER_FEEDBACK_BG_SHOW_MS = 500;

function getFeedbackLettersLeft(letterCount: number, index: number) {
  const totalWidth =
    FEEDBACK_CHAR_WIDTH * letterCount - FEEDBACK_CHAR_OVERLAP * Math.max(letterCount - 1, 0);
  const startX = FEEDBACK_BG_LEFT + (FEEDBACK_BG_WIDTH - totalWidth) / 2;
  return startX + index * (FEEDBACK_CHAR_WIDTH - FEEDBACK_CHAR_OVERLAP);
}

export default function AnswerFeedbackOverlay({ state }: { state: AnswerFeedbackState }) {
  const [entered, setEntered] = useState(false);
  const letters = state.revealCorrectAnswer ? state.targetLetters : state.shownLetters;

  useEffect(() => {
    setEntered(false);
    const rafId = window.requestAnimationFrame(() => {
      setEntered(true);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [state.token]);

  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1024,
        height: 768,
        pointerEvents: 'none',
        zIndex: 14,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: FEEDBACK_BG_LEFT,
          top: entered ? FEEDBACK_BG_TOP : FEEDBACK_BG_TOP + 100,
          width: FEEDBACK_BG_WIDTH,
          height: FEEDBACK_BG_HEIGHT,
          opacity: entered ? 1 : 0,
          transitionProperty: 'top, opacity',
          transitionDuration: `${ANSWER_FEEDBACK_BG_SHOW_MS}ms, ${ANSWER_FEEDBACK_BG_SHOW_MS}ms`,
          transitionDelay: `${ANSWER_FEEDBACK_BG_DELAY_MS}ms, ${ANSWER_FEEDBACK_BG_DELAY_MS}ms`,
          transitionTimingFunction: 'ease-out, linear',
        }}
      >
        <AtlasSprite atlasUrl={ATLAS_URL} atlasData={atlasData} frameName="KJG_QAP_BD_v2_word_bg" />
      </div>
      {letters.map((char, index) => (
        <span
          key={`${state.token}-${index}`}
          style={{
            position: 'absolute',
            left: entered
              ? getFeedbackLettersLeft(letters.length, index)
              : getLetterSlotLeft(letters.length, index),
            top: entered ? FEEDBACK_BG_TOP + FEEDBACK_TEXT_TOP : LETTER_SLOT_TOP + 8,
            width: LETTER_SLOT_SIZE,
            height: FEEDBACK_CHAR_HEIGHT,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 50,
            fontWeight: 700,
            lineHeight: 1,
            color: '#000000',
            transition: `left ${ANSWER_FEEDBACK_MOVE_MS}ms linear, top ${ANSWER_FEEDBACK_MOVE_MS}ms linear`,
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
