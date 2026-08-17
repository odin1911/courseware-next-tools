import AtlasSprite from '@/shared/components/atlas-sprite';
import atlasData from '../../assets/textures/KJG_QAP_BD_v2.json';

const ATLAS_URL = new URL('../../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;
export const SLOT_SIZE = 51;
export const SLOT_GAP = 50;
export const SLOT_STEP = SLOT_SIZE + SLOT_GAP;
export const SLOT_TOP = 700;

export function getLetterSlotStartX(letterCount: number) {
  return (1024 - SLOT_SIZE * letterCount - SLOT_GAP * Math.max(letterCount - 1, 0)) / 2;
}

export function getLetterSlotLeft(letterCount: number, index: number) {
  return getLetterSlotStartX(letterCount) + index * SLOT_STEP;
}

export interface LetterSlotsProps {
  letters: string[];
}

export default function LetterSlots({ letters }: LetterSlotsProps) {
  const startX = getLetterSlotStartX(letters.length);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1024,
        height: 768,
        zIndex: 11,
        pointerEvents: 'none',
      }}
    >
      {letters.map((letter, index) => {
        const left = startX + index * SLOT_STEP;
        const isFilled = Boolean(letter);

        return (
          <div
            key={`answer-slot-${index}`}
            data-role="answer-slot"
            data-char-index={index}
            style={{
              position: 'absolute',
              left,
              top: SLOT_TOP,
              width: SLOT_SIZE,
              height: SLOT_SIZE,
            }}
          >
            <AtlasSprite
              atlasUrl={ATLAS_URL}
              atlasData={atlasData}
              frameName={isFilled ? 'KJG_QAP_BD_v2_letter_frame2' : 'KJG_QAP_BD_v2_letter_frame'}
            />
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: 8,
                width: SLOT_SIZE,
                textAlign: 'center',
                fontSize: 28,
                fontWeight: 700,
                color: '#6a2a0e',
              }}
            >
              {letter}
            </span>
          </div>
        );
      })}
    </div>
  );
}
