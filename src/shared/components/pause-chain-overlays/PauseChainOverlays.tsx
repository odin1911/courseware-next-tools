import type { CSSProperties } from 'react';
import AtlasSprite from '@/shared/components/atlas-sprite';
import {
  getLobbySoundSliderValue,
  getLobbySoundThumbLeft,
  getLobbySoundTrackFillOffset,
  getLobbySoundVolumeFromSliderValue,
} from '@/shared/components/lobby-sound-control';
import SoundBarTrack from '@/shared/components/lobby-sound-control/SoundBarTrack';
import commonGameAtlas from '@/shared/assets/common/commonGame.json';

const COMMON_GAME_ATLAS_URL = new URL('../../assets/common/commonGame.png', import.meta.url).href;
const COMMON_GAME_BG_SMALL_URL = new URL(
  '../../assets/common/commonGamebg_small.png',
  import.meta.url,
).href;
const PAUSE_POP_WIDTH = 548;
const PAUSE_POP_HEIGHT = 418;
const RESET_BUTTON_SCALE_X = 99 / 76;
const RESET_BUTTON_SCALE_Y = 99 / 71;

export interface SharedPauseOverlayProps {
  soundVolume: number;
  onSoundVolumeChange(nextValue: number): void;
  onHome(): void;
  onReset(): void;
  onResume(): void;
  onActivateSound?(): void;
  overlayTestId?: string;
  containerStyle?: CSSProperties;
  cardStyle?: CSSProperties;
}

export interface SharedSecondConfirmOverlayProps {
  onConfirm(): void;
  onCancel(): void;
  overlayTestId?: string;
  containerStyle?: CSSProperties;
  cardStyle?: CSSProperties;
}

export function PauseOverlay({
  soundVolume,
  onSoundVolumeChange,
  onHome,
  onReset,
  onResume,
  onActivateSound,
  overlayTestId,
  containerStyle,
  cardStyle,
}: SharedPauseOverlayProps) {
  const pauseSoundSliderValue = getLobbySoundSliderValue(soundVolume);
  const pauseSoundTrackFillOffset = getLobbySoundTrackFillOffset(soundVolume);
  const pauseSoundThumbLeft = getLobbySoundThumbLeft(soundVolume);

  return (
    <div
      data-testid={overlayTestId}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 60, 92, 0.42)',
        backdropFilter: 'blur(12px)',
        zIndex: 20,
        ...containerStyle,
      }}
    >
      <div
        style={{
          width: PAUSE_POP_WIDTH,
          height: PAUSE_POP_HEIGHT,
          position: 'relative',
          ...cardStyle,
        }}
      >
        <img
          src={COMMON_GAME_BG_SMALL_URL}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: PAUSE_POP_WIDTH,
            height: PAUSE_POP_HEIGHT,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 61,
            top: 86,
            width: 426,
            height: 47,
          }}
        >
          <SoundBarTrack
            sliderValue={pauseSoundSliderValue}
            trackFillOffset={pauseSoundTrackFillOffset}
            thumbLeft={pauseSoundThumbLeft}
            sliderTestId="pause-volume-slider"
            ariaLabel="暂停音量"
            onSliderChange={(nextValue) => {
              onActivateSound?.();
              onSoundVolumeChange(getLobbySoundVolumeFromSliderValue(Number(nextValue)));
            }}
          />
        </div>
        <button
          type="button"
          onClick={onHome}
          data-testid="pause-home-button"
          style={{
            position: 'absolute',
            left: 77,
            top: 220.5,
            width: 99,
            height: 99,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          aria-label="暂停返回大厅"
        >
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName="gameCommon_home_big"
          />
        </button>
        <button
          type="button"
          onClick={onReset}
          data-testid="pause-reset-button"
          style={{
            position: 'absolute',
            left: 213,
            top: 219.5,
            width: 99,
            height: 99,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          aria-label="暂停重开游戏"
        >
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName="gameCommon_reset"
            style={{
              transform: `scale(${RESET_BUTTON_SCALE_X}, ${RESET_BUTTON_SCALE_Y})`,
              transformOrigin: 'top left',
            }}
          />
        </button>
        <button
          type="button"
          onClick={onResume}
          data-testid="pause-play-button"
          style={{
            position: 'absolute',
            left: 358,
            top: 209,
            width: 125,
            height: 120,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          aria-label="继续游戏"
        >
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName="gameCommon_play"
          />
        </button>
      </div>
    </div>
  );
}

export function SecondConfirmOverlay({
  onConfirm,
  onCancel,
  overlayTestId,
  containerStyle,
  cardStyle,
}: SharedSecondConfirmOverlayProps) {
  return (
    <div
      data-testid={overlayTestId}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 60, 92, 0.42)',
        backdropFilter: 'blur(12px)',
        ...containerStyle,
      }}
    >
      <div
        style={{
          width: PAUSE_POP_WIDTH,
          height: PAUSE_POP_HEIGHT,
          position: 'relative',
          ...cardStyle,
        }}
      >
        <img
          src={COMMON_GAME_BG_SMALL_URL}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: PAUSE_POP_WIDTH,
            height: PAUSE_POP_HEIGHT,
          }}
        />
        <AtlasSprite
          atlasUrl={COMMON_GAME_ATLAS_URL}
          atlasData={commonGameAtlas}
          frameName="gameCommon_text0001"
          style={{
            position: 'absolute',
            left: 121,
            top: 105,
          }}
        />
        <button
          type="button"
          onClick={onConfirm}
          data-testid="second-confirm-ok-button"
          style={{
            position: 'absolute',
            left: 65,
            top: 280,
            width: 187,
            height: 64,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          aria-label="确认重开游戏"
        >
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName="gameCommon_BtnOK"
          />
        </button>
        <button
          type="button"
          onClick={onCancel}
          data-testid="second-confirm-cancel-button"
          style={{
            position: 'absolute',
            left: 293,
            top: 280,
            width: 187,
            height: 64,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          aria-label="取消重开游戏"
        >
          <AtlasSprite
            atlasUrl={COMMON_GAME_ATLAS_URL}
            atlasData={commonGameAtlas}
            frameName="gameCommon_cancel"
          />
        </button>
      </div>
    </div>
  );
}
