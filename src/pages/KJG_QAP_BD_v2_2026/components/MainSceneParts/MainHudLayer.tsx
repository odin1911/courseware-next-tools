import AtlasSprite from '@/shared/components/atlas-sprite';
import commonGameAtlas from '@/shared/assets/common/commonGame.json';
import type { BDMainSubstate } from '../../sceneTypes';
import atlasData from '../../assets/textures/KJG_QAP_BD_v2.json';
import HeartHud from './HeartHud';

const ATLAS_URL = new URL('../../assets/textures/KJG_QAP_BD_v2.png', import.meta.url).href;
const COMMON_GAME_ATLAS_URL = new URL(
  '../../../../shared/assets/common/commonGame.png',
  import.meta.url,
).href;
const HEART_BROKEN_URL = new URL(
  '../../../../shared/assets/audios/heart_break.mp3',
  import.meta.url,
).href;

export interface MainScoreHudProps {
  displayDayIndex: number;
  goldCount: number;
}

export function MainScoreHud({ displayDayIndex, goldCount }: MainScoreHudProps) {
  return (
    <>
      <div style={{ position: 'absolute', left: 375, top: 19, width: 121, height: 63 }}>
        <AtlasSprite atlasUrl={ATLAS_URL} atlasData={atlasData} frameName="KJG_QAP_BD_v2_day_bg" />
      </div>
      <div style={{ position: 'absolute', left: 550, top: 19, width: 114, height: 62 }}>
        <AtlasSprite atlasUrl={ATLAS_URL} atlasData={atlasData} frameName="KJG_QAP_BD_v2_gold_bg" />
      </div>
      <div
        data-role="day-text"
        style={{
          position: 'absolute',
          left: 466,
          top: 38,
          fontSize: 25,
          color: '#fff',
          fontWidth: 'bold',
        }}
      >
        {displayDayIndex + 1}
      </div>
      <div
        data-role="gold-text"
        style={{
          position: 'absolute',
          left: 620,
          top: 38,
          fontSize: 25,
          color: '#fff',
          fontWidth: 'bold',
        }}
      >
        {goldCount}
      </div>
    </>
  );
}

export interface MainControlHudProps {
  hearts: number;
  maxHearts: number;
  isWrongFeedback: boolean;
  soundVolume: number;
  isPaused: boolean;
  mainSubstate: BDMainSubstate;
  onPauseRequest(): void;
}

export function MainControlHud({
  hearts,
  maxHearts,
  isWrongFeedback,
  soundVolume,
  isPaused,
  mainSubstate,
  onPauseRequest,
}: MainControlHudProps) {
  return (
    <>
      <button
        type="button"
        data-role="pause"
        aria-label="暂停游戏"
        onClick={onPauseRequest}
        disabled={isPaused || mainSubstate === 'finished'}
        style={{
          position: 'absolute',
          left: 925,
          top: 19,
          width: 64,
          height: 64,
          border: 'none',
          background: 'transparent',
          opacity: isPaused || mainSubstate === 'finished' ? 0.45 : 1,
          zIndex: 6,
        }}
      >
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_pause"
        />
      </button>

      <HeartHud
        hearts={hearts}
        maxHearts={maxHearts}
        isWrongFeedback={isWrongFeedback}
        soundVolume={soundVolume}
        heartBreakAudioUrl={HEART_BROKEN_URL}
      />
    </>
  );
}
